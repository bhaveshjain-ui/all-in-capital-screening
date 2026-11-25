// Approving and sending. Nothing is sent without: a human decision of "Take a call", an approved draft whose
// text has not changed since approval, one valid recipient, and (in live mode) the per-application and daily
// limits. Test mode, the default, sends nothing: it only records what would have been sent.

import { createHash } from "node:crypto";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { MissingConfigError } from "../llm";
import { addAudit } from "../review";
import { EmailEditSchema, type Application, type EmailDraft } from "../schemas";
import { EmailStateError, requireTakeACall } from "./draft";
import { checkRecipient } from "./slots";

export type SendMode = "test" | "live";

/** Live sending must be switched on explicitly. Anything else is test mode. */
export function sendMode(env: Record<string, string | undefined> = process.env): SendMode {
  return env.SEND_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
}

export interface OutgoingMessage { from: string; to: string; subject: string; text: string }
export interface Sender { send(msg: OutgoingMessage): Promise<{ id: string | null }> }

export class ResendSender implements Sender {
  private client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(msg: OutgoingMessage) {
    const { data, error } = await this.client.emails.send({ from: msg.from, to: [msg.to], subject: msg.subject, text: msg.text });
    if (error) throw new Error(error.message);
    return { id: data?.id ?? null };
  }
}

/** The slice of nodemailer's transport that the sender uses, so tests can supply a fake. */
export interface MailTransport {
  sendMail(msg: { from: string; to: string; subject: string; text: string }): Promise<{ messageId?: string }>;
}

/**
 * Sends through a real mailbox over SMTP (Gmail by default), so the email comes from that address and replies
 * land in that mailbox. Gmail ignores any other From address, so `from` is always the signed-in account.
 */
export class SmtpSender implements Sender {
  constructor(private transport: MailTransport) {}
  async send(msg: OutgoingMessage) {
    try {
      const info = await this.transport.sendMail({ from: msg.from, to: msg.to, subject: msg.subject, text: msg.text });
      return { id: info.messageId ?? null };
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "EAUTH") {
        throw new Error("Gmail refused the sign-in. Use a 16-character App Password for this account (2-step verification must be on), not the normal password.");
      }
      if (code === "ECONNECTION" || code === "ETIMEDOUT" || code === "ESOCKET") {
        throw new Error("Could not reach the mail server. Nothing was sent; try again.");
      }
      throw e;
    }
  }
}

export function smtpConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.SMTP_USER?.trim() && env.SMTP_PASSWORD?.trim());
}

export function smtpFrom(env: Record<string, string | undefined> = process.env): string {
  const user = env.SMTP_USER!.trim();
  const name = (env.SMTP_FROM_NAME ?? "All In Capital").replace(/["<>\r\n]/g, "").trim();
  return name ? `${name} <${user}>` : user;
}

/**
 * Live mode sends from the mailbox when SMTP_USER and SMTP_PASSWORD are set (an app password, never the
 * account password), otherwise through Resend. Test mode needs nothing and never touches the network.
 */
export function getSender(
  mode: SendMode,
  env: Record<string, string | undefined> = process.env,
  makeTransport: (opts: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }) => MailTransport = (o) => nodemailer.createTransport(o),
): { sender: Sender; from: string; via: string } {
  if (mode === "test") return { sender: { send: async () => ({ id: null }) }, from: env.SMTP_USER ? smtpFrom(env) : (env.RESEND_FROM_EMAIL ?? "test@localhost"), via: "test mode" };
  if (smtpConfigured(env)) {
    const port = Number(env.SMTP_PORT) || 465;
    const transport = makeTransport({ host: env.SMTP_HOST?.trim() || "smtp.gmail.com", port, secure: port === 465, auth: { user: env.SMTP_USER!.trim(), pass: env.SMTP_PASSWORD!.trim() } });
    return { sender: new SmtpSender(transport), from: smtpFrom(env), via: env.SMTP_USER!.trim() };
  }
  if (!env.RESEND_API_KEY) throw new MissingConfigError("SMTP_PASSWORD");
  if (!env.RESEND_FROM_EMAIL) throw new MissingConfigError("RESEND_FROM_EMAIL");
  return { sender: new ResendSender(env.RESEND_API_KEY), from: env.RESEND_FROM_EMAIL, via: "Resend" };
}

export const LIVE_SENDS_PER_APPLICATION = 3;
export const DAILY_LIVE_SEND_CAP = 10;

const nowIso = () => new Date().toISOString();
const who = (by?: string) => by?.trim() || "unnamed reviewer";

export function hashDraft(d: Pick<EmailDraft, "to" | "subject" | "body">): string {
  return createHash("sha256").update(JSON.stringify([d.to.trim(), d.subject.trim(), d.body.trim()])).digest("hex");
}

function find(app: Application, id: string): EmailDraft {
  const d = app.emails?.find((x) => x.id === id);
  if (!d) throw new EmailStateError("That draft does not exist.");
  return d;
}
function replace(app: Application, d: EmailDraft): Application {
  return { ...app, emails: (app.emails ?? []).map((x) => (x.id === d.id ? d : x)) };
}

/** Edit a draft. Any change after approval cancels the approval. Sent drafts are frozen. */
export function editDraft(app: Application, draftId: string, raw: unknown): Application {
  const d = find(app, draftId);
  if (d.status === "sent" || d.status === "test_logged") throw new EmailStateError("This email has already been sent. Draft a new one.");
  const parsed = EmailEditSchema.safeParse(raw);
  if (!parsed.success) throw new EmailStateError(parsed.error.issues.map((i) => i.message).join(" "));
  const { to, subject, body, by } = parsed.data;
  const changed = to !== d.to || subject !== d.subject || body !== d.body;
  if (!changed) return app;
  const next: EmailDraft = {
    ...d, to, subject, body, status: "draft", editedAt: nowIso(),
    approvedBy: undefined, approvedAt: undefined, approvedHash: undefined, error: undefined,
  };
  return addAudit(replace(app, next), "email_edited", who(by), `Draft edited${d.status === "approved" ? "; the earlier approval was cancelled" : ""}.`);
}

export function approveDraft(app: Application, draftId: string, by: string | undefined, mode: SendMode): Application {
  requireTakeACall(app);
  const d = find(app, draftId);
  if (d.status === "sent" || d.status === "test_logged") throw new EmailStateError("This email has already been sent.");
  const r = checkRecipient(d.to, mode === "live");
  if (!r.ok) throw new EmailStateError(r.error);
  if (d.subject.trim().length < 3 || d.body.trim().length < 20) throw new EmailStateError("The subject or message is too short.");
  const next: EmailDraft = {
    ...d, status: "approved", approvedBy: who(by), approvedAt: nowIso(), approvedHash: hashDraft(d), error: undefined,
  };
  return addAudit(replace(app, next), "email_approved", who(by), `Approved for sending to ${r.address} (${mode} mode).`);
}

export interface SendDeps { mode: SendMode; sender: Sender; from: string; via?: string; allApps: Application[]; now?: Date }

/** Returns the updated application and whether it worked; failures are recorded, not thrown. */
export async function sendDraft(app: Application, draftId: string, by: string | undefined, deps: SendDeps): Promise<{ app: Application; ok: boolean; error?: string }> {
  requireTakeACall(app);
  const d = find(app, draftId);
  const now = deps.now ?? new Date();
  const live = deps.mode === "live";

  if (d.status === "sent" || d.status === "test_logged") throw new EmailStateError("This email has already been sent.");
  if (!d.approvedHash || (d.status !== "approved" && d.status !== "failed")) throw new EmailStateError("Approve the draft before sending it.");
  if (d.approvedHash !== hashDraft(d)) throw new EmailStateError("The draft changed after it was approved. Approve it again.");
  const r = checkRecipient(d.to, live);
  if (!r.ok) throw new EmailStateError(r.error);

  const sentBefore = (a: Application) => (a.emails ?? []).filter((e) => e.status === "sent" && e.mode === "live");
  if (live) {
    if (sentBefore(app).length >= LIVE_SENDS_PER_APPLICATION) {
      throw new EmailStateError(`The limit of ${LIVE_SENDS_PER_APPLICATION} live emails for one application has been reached.`);
    }
    const since = now.getTime() - 86_400_000;
    const today = deps.allApps.flatMap(sentBefore).filter((e) => e.sentAt && new Date(e.sentAt).getTime() >= since).length;
    if (today >= DAILY_LIVE_SEND_CAP) throw new EmailStateError(`The daily limit of ${DAILY_LIVE_SEND_CAP} live emails has been reached. Try again tomorrow.`);
  }
  const dup = (app.emails ?? []).some(
    (e) => e.id !== d.id && e.status === "sent" && e.to.toLowerCase() === d.to.toLowerCase() && e.subject === d.subject && e.sentAt && new Date(e.sentAt).getTime() >= now.getTime() - 86_400_000,
  );
  if (dup) throw new EmailStateError("The same message to this address was already sent in the last 24 hours.");

  try {
    const res = await deps.sender.send({ from: deps.from, to: r.address, subject: d.subject.trim(), text: d.body.trim() });
    const next: EmailDraft = {
      ...d, status: live ? "sent" : "test_logged", mode: deps.mode, sentAt: now.toISOString(), resendId: res.id, error: undefined,
    };
    return {
      ok: true,
      app: addAudit(replace(app, next), "email_sent", who(by), live ? `Sent to ${r.address} from ${deps.via ?? "the mail provider"} (id ${res.id ?? "none"}).` : `Test mode: would have sent to ${r.address}. Nothing left the system.`),
    };
  } catch (e) {
    const message = (e as Error).message || "Sending failed.";
    const next: EmailDraft = { ...d, status: "failed", error: message };
    return { ok: false, error: message, app: addAudit(replace(app, next), "email_failed", who(by), `Sending to ${r.address} failed: ${message}`) };
  }
}
