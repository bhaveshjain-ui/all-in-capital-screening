import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import { CRITERIA } from "../lib/framework/config";
import type { Llm } from "../lib/llm";
import { MissingConfigError } from "../lib/llm";
import { draftInvitation } from "../lib/email/draft";
import { approveDraft, editDraft, getSender, markSentByHand, sendDraft, SmtpSender, smtpConfigured, smtpFrom, type MailTransport } from "../lib/email/send";
import { gmailComposeUrl } from "../lib/email/compose";
import { composeAccount, sendChannel } from "../lib/email/channel";
import { EmailStateError } from "../lib/email/draft";
import { proposeSlots } from "../lib/email/slots";
import { recordDecision } from "../lib/review";
import { scoreApplication } from "../lib/scoring/run";
import type { Application } from "../lib/schemas";

const NL = String.fromCharCode(10);
const NOW = new Date("2026-11-24T09:00:00Z");
const GMAIL = { SMTP_USER: "bhaveshjain.work.10@gmail.com", SMTP_PASSWORD: "abcd efgh ijkl mnop" };

function fakeTransport(fail?: { code?: string; message?: string }) {
  const sent: { from: string; to: string; subject: string; text: string }[] = [];
  const opts: unknown[] = [];
  const t: MailTransport = {
    async sendMail(msg) {
      if (fail) throw Object.assign(new Error(fail.message ?? "failed"), { code: fail.code });
      sent.push(msg);
      return { messageId: "<id-1@gmail.com>" };
    },
  };
  return { t, sent, opts, make: (o: unknown) => { opts.push(o); return t; } };
}

describe("choosing how email leaves", () => {
  it("sends from the Gmail account when its settings exist, with the app password as is", () => {
    const f = fakeTransport();
    const s = getSender("live", GMAIL, f.make as never);
    expect(s.from).toBe("All In Capital <bhaveshjain.work.10@gmail.com>");
    expect(s.via).toBe("bhaveshjain.work.10@gmail.com");
    expect(s.sender).toBeInstanceOf(SmtpSender);
    expect(f.opts[0]).toEqual({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "bhaveshjain.work.10@gmail.com", pass: "abcd efgh ijkl mnop" } });
  });
  it("uses another host and port when given, and a plain port is not secure", () => {
    const f = fakeTransport();
    getSender("live", { ...GMAIL, SMTP_HOST: "smtp.example.org", SMTP_PORT: "587" }, f.make as never);
    expect(f.opts[0]).toMatchObject({ host: "smtp.example.org", port: 587, secure: false });
  });
  it("falls back to Resend when no mailbox is set, and says what is missing otherwise", () => {
    expect(getSender("live", { RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.in" }).via).toBe("Resend");
    expect(() => getSender("live", {})).toThrow(MissingConfigError);
    expect(() => getSender("live", { SMTP_USER: "x@gmail.com" })).toThrow(MissingConfigError); // a user without a password is not enough
  });
  it("never touches the network in test mode", () => {
    const f = fakeTransport();
    const s = getSender("test", GMAIL, f.make as never);
    expect(f.opts).toHaveLength(0);
    expect(s.via).toBe("test mode");
  });
  it("tidies the display name so it cannot break the From header", () => {
    expect(smtpFrom({ SMTP_USER: "a@gmail.com", SMTP_FROM_NAME: 'Evil" <x@y.com>' })).toBe("Evil x@y.com <a@gmail.com>");
    expect(smtpFrom({ SMTP_USER: "a@gmail.com", SMTP_FROM_NAME: "  " })).toBe("a@gmail.com");
    expect(smtpConfigured({ SMTP_USER: "a@gmail.com", SMTP_PASSWORD: " " })).toBe(false);
  });
});

describe("the Gmail sender", () => {
  it("passes the message through and returns the message id", async () => {
    const f = fakeTransport();
    const r = await new SmtpSender(f.t).send({ from: "A <a@gmail.com>", to: "b@c.in", subject: "Hi", text: "Body" });
    expect(r.id).toBe("<id-1@gmail.com>");
    expect(f.sent).toEqual([{ from: "A <a@gmail.com>", to: "b@c.in", subject: "Hi", text: "Body" }]);
  });
  it("explains a refused sign-in and an unreachable server in plain words", async () => {
    await expect(new SmtpSender(fakeTransport({ code: "EAUTH" }).t).send({ from: "a", to: "b", subject: "s", text: "t" })).rejects.toThrow(/App Password/);
    await expect(new SmtpSender(fakeTransport({ code: "ETIMEDOUT" }).t).send({ from: "a", to: "b", subject: "s", text: "t" })).rejects.toThrow(/Could not reach the mail server/);
    await expect(new SmtpSender(fakeTransport({ message: "Recipient rejected" }).t).send({ from: "a", to: "b", subject: "s", text: "t" })).rejects.toThrow(/Recipient rejected/);
  });
});

async function approvedApp(): Promise<Application> {
  const app: Application = {
    id: "11111111-2222-3333-4444-555555555555", name: "Demo Co", createdAt: NOW.toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "Traction: INR 16.5 L in October. We make millet-based breakfast and snacks for urban families." }],
    extraction: { status: "done", model: "fixture", extractedAt: NOW.toISOString(), result: { company: { name: "Demo Co", founders: [{ name: "Ritu" }] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } } },
    recompute: [], conflicts: [],
    research: { status: "done", model: "fixture", plannedAt: NOW.toISOString(), questions: [], completed: [], findings: [], portfolio: { checkedAt: NOW.toISOString(), checks: [], mentions: [], note: "incomplete" }, errors: [] },
  };
  const scoredOut = {
    business_types: { types: ["consumer"], reason: "fixture" },
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, { status: "scored", score: 7, class: "S-u", evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null }])),
    d2: { value: "not_triggered", reason: "none", evidence: [] },
  };
  const scorer: Llm = { model: "fixture", async json<T>(_p: string, schema: ZodType<T>) { return schema.parse(scoredOut); } };
  const decided = recordDecision(await scoreApplication(app, scorer), { value: "Take a call", reason: "the repeat evidence is strong enough", by: "Kushal" });
  const slots = proposeSlots(NOW);
  const sentence = "We read that you make millet-based breakfast and snacks for urban families.";
  const drafter: Llm = {
    model: "fixture",
    async json<T>(_p: string, schema: ZodType<T>) {
      return schema.parse({
        subject: "A conversation with All In Capital",
        body: `Hi Ritu,${NL}${NL}Thank you for applying. ${sentence} We would like a 30-minute conversation.${NL}${NL}${slots.map((s) => `- ${s.label}`).join(NL)}${NL}${NL}The All In Capital team`,
        personal_detail: { sentence, quote: "make millet-based breakfast and snacks for urban families", source: "deck" },
      });
    },
  };
  const drafted = await draftInvitation(decided, drafter, "Riya", NOW);
  const d = drafted.emails![0];
  const edited = editDraft(drafted, d.id, { to: "ritu@founder.in", subject: d.subject, body: d.body, by: "Riya" });
  return approveDraft(edited, d.id, "Riya", "live");
}

describe("sending an approved invitation through the mailbox", () => {
  it("sends from the Gmail address to the founder and records who sent it", async () => {
    const app = await approvedApp();
    const f = fakeTransport();
    const s = getSender("live", GMAIL, f.make as never);
    const r = await sendDraft(app, app.emails![0].id, "Riya", { mode: "live", ...s, allApps: [app] });
    expect(r.ok).toBe(true);
    expect(f.sent).toHaveLength(1);
    expect(f.sent[0]).toMatchObject({ from: "All In Capital <bhaveshjain.work.10@gmail.com>", to: "ritu@founder.in", subject: "A conversation with All In Capital" });
    const d = r.app.emails![0];
    expect(d).toMatchObject({ status: "sent", mode: "live", resendId: "<id-1@gmail.com>" });
    expect(r.app.audit!.at(-1)!.detail).toMatch(/Sent to ritu@founder\.in from bhaveshjain\.work\.10@gmail\.com/);
  });
  it("records a failed sign-in as a failed send and keeps the draft sendable", async () => {
    const app = await approvedApp();
    const s = getSender("live", GMAIL, fakeTransport({ code: "EAUTH" }).make as never);
    const r = await sendDraft(app, app.emails![0].id, "Riya", { mode: "live", ...s, allApps: [app] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/App Password/);
    expect(r.app.emails![0].status).toBe("failed");
  });
});

describe("sending by hand from Gmail", () => {
  it("builds a Gmail compose link for the chosen account, with everything encoded", () => {
    const url = gmailComposeUrl("bhaveshjain.work.10@gmail.com", { to: "ritu@founder.in", subject: "A & B", body: "Line one" + NL + "Line two, 100% sure?" });
    expect(url.startsWith("https://mail.google.com/mail/u/bhaveshjain.work.10%40gmail.com/?view=cm&fs=1&")).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get("to")).toBe("ritu@founder.in");
    expect(q.get("su")).toBe("A & B");
    expect(q.get("body")).toBe("Line one" + NL + "Line two, 100% sure?");
    expect(gmailComposeUrl(undefined, { to: "a@b.in", subject: "s", body: "b" }).startsWith("https://mail.google.com/mail/?view=cm")).toBe(true);
  });
  it("hands off to Gmail unless the app can really send to outsiders itself", () => {
    expect(sendChannel({})).toBe("compose");
    expect(sendChannel({ RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "All In Capital <onboarding@resend.dev>" })).toBe("compose");
    expect(sendChannel({ RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "invites@mydomain.com" })).toBe("auto");
    expect(sendChannel({ SMTP_USER: "a@gmail.com", SMTP_PASSWORD: "p" })).toBe("auto");
    expect(sendChannel({ SMTP_USER: "a@gmail.com" })).toBe("compose"); // a user without a password cannot send
    expect(composeAccount({ SMTP_USER: " a@gmail.com " })).toBe("a@gmail.com");
    expect(composeAccount({})).toBeUndefined();
  });
  it("records an approved draft as sent by hand, with a plain note, and freezes it", async () => {
    const app = await approvedApp();
    const out = markSentByHand(app, app.emails![0].id, "Riya", NOW);
    expect(out.emails![0]).toMatchObject({ status: "sent", mode: "live", sentAt: NOW.toISOString() });
    expect(out.audit!.at(-1)).toMatchObject({ type: "email_sent", by: "Riya" });
    expect(out.audit!.at(-1)!.detail).toMatch(/sent by hand from the reviewer's own mailbox/);
    expect(() => markSentByHand(out, out.emails![0].id, "Riya")).toThrow(/already marked as sent/);
  });
  it("refuses an unapproved or changed draft, and a draft that needs a Take a call decision", async () => {
    const app = await approvedApp();
    const d = app.emails![0];
    const edited = editDraft(app, d.id, { to: d.to, subject: d.subject, body: d.body + " P.S.", by: "Riya" }); // editing cancels the approval
    expect(() => markSentByHand(edited, d.id, "Riya")).toThrow(/Approve the draft/);
    const tampered = { ...app, emails: [{ ...d, body: d.body + " changed after approval" }] };
    expect(() => markSentByHand(tampered, d.id, "Riya")).toThrow(/changed after it was approved/);
    expect(() => markSentByHand({ ...app, review: undefined }, d.id, "Riya")).toThrow(EmailStateError);
    expect(() => markSentByHand(app, "nope", "Riya")).toThrow(/does not exist/);
  });
});
