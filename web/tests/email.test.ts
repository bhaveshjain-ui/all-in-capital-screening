import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import { CRITERIA, type BusinessType } from "../lib/framework/config";
import { InvalidModelOutputError, MissingConfigError, type Llm } from "../lib/llm";
import { attendeesFor, checkRecipient, proposeSlots } from "../lib/email/slots";
import { draftInvitation, EmailStateError, validateDraft } from "../lib/email/draft";
import {
  approveDraft, DAILY_LIVE_SEND_CAP, editDraft, getSender, hashDraft, LIVE_SENDS_PER_APPLICATION,
  sendDraft, sendMode, type OutgoingMessage, type Sender,
} from "../lib/email/send";
import { recordDecision } from "../lib/review";
import { scoreApplication } from "../lib/scoring/run";
import type { Application } from "../lib/schemas";

const NL = String.fromCharCode(10);

describe("slots follow the partners' rule", () => {
  it("proposes Tuesday and Thursday afternoons only, in IST, two days ahead", () => {
    const s = proposeSlots(new Date("2026-11-24T09:00:00Z")); // Tuesday 2:30 pm IST
    expect(s.map((x) => x.label)).toEqual([
      "Thursday 26 November, 2:00 pm IST", "Thursday 26 November, 3:30 pm IST",
      "Tuesday 1 December, 2:00 pm IST", "Tuesday 1 December, 3:30 pm IST",
    ]);
    expect(s[0].startIso).toBe("2026-11-26T08:30:00.000Z");
  });
  it("uses the IST date, not the UTC date, to count the lead time", () => {
    // 22:00 UTC on Monday is already Tuesday 3:30 am in India.
    expect(proposeSlots(new Date("2026-11-30T22:00:00Z"), 1)[0].label).toBe("Thursday 3 December, 2:00 pm IST");
  });
  it("rolls over a month and a year", () => {
    const labels = proposeSlots(new Date("2026-12-29T00:00:00Z")).map((x) => x.label);
    expect(labels[0]).toBe("Thursday 31 December, 2:00 pm IST");
    expect(labels[2]).toBe("Tuesday 5 January, 2:00 pm IST");
  });
  it("sends Kushal to every call and Aditya only to deeptech", () => {
    expect(attendeesFor(["consumer"])).toEqual(["Kushal"]);
    expect(attendeesFor(["lending", "deeptech"] as BusinessType[])).toEqual(["Kushal", "Aditya"]);
  });
});

describe("recipient checks", () => {
  it("accepts one plain address", () => {
    expect(checkRecipient(" founder@company.in ", true)).toEqual({ ok: true, address: "founder@company.in" });
  });
  it("rejects several addresses and header injection", () => {
    for (const bad of ["a@b.in, c@d.in", "a@b.in;c@d.in", `a@b.in${NL}Bcc: x@y.in`, "Name <a@b.in>", "a@b.in c@d.in", "", "not-an-address"]) {
      expect(checkRecipient(bad, true).ok, bad).toBe(false);
    }
  });
  it("blocks addresses that cannot receive mail in live mode only", () => {
    expect(checkRecipient("hello@yatrika.example", true).ok).toBe(false);
    expect(checkRecipient("hello@yatrika.example", false).ok).toBe(true);
  });
});

async function takeACallApp(types: BusinessType[] = ["consumer"]): Promise<Application> {
  const app: Application = {
    id: "11111111-2222-3333-4444-555555555555", name: "Demo Co", createdAt: new Date().toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "Traction: INR 16.5 L in October." }],
    extraction: {
      status: "done", model: "fixture", extractedAt: new Date().toISOString(),
      result: { company: { name: "Demo Co", one_liner: "Millet snacks", founders: [{ name: "Ritu" }, { name: "Sanjay" }] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } },
    },
    recompute: [], conflicts: [],
    research: { status: "done", model: "fixture", plannedAt: new Date().toISOString(), questions: [], completed: [], findings: [], portfolio: { checkedAt: new Date().toISOString(), checks: [], mentions: [], note: "incomplete" }, errors: [] },
  };
  const out = {
    business_types: { types, reason: "fixture" },
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, { status: "scored", score: 7, class: "S-u", evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null }])),
    d2: { value: "not_triggered", reason: "none", evidence: [] },
  };
  const llm: Llm = { model: "fixture", async json<T>(_p: string, schema: ZodType<T>) { return schema.parse(out); } };
  const scored = await scoreApplication(app, llm);
  return recordDecision(scored, { value: "Take a call", reason: "the repeat evidence is strong enough for a call", by: "Kushal" });
}

const goodBody = (slots: { label: string }[]) =>
  `Hello Ritu and Sanjay,${NL}${NL}Thank you for applying to All In Capital. We would like to set up a 30-minute conversation with Kushal.${NL}${NL}${slots.map((s) => `- ${s.label}`).join(NL)}${NL}${NL}Please reply with the slot that suits you, or suggest another time.${NL}${NL}The All In Capital team`;

function draftLlm(bodies: ((slots: { label: string }[]) => string)[], subject = "A conversation with All In Capital") {
  const seen: string[] = [];
  const slots = proposeSlots(new Date("2026-11-24T09:00:00Z"));
  const llm: Llm & { prompts: string[] } = {
    model: "fixture", prompts: seen,
    async json<T>(prompt: string, schema: ZodType<T>) {
      seen.push(prompt);
      const make = bodies.shift()!;
      const r = schema.safeParse({ subject, body: make(slots) });
      if (!r.success) throw new InvalidModelOutputError("bad shape");
      return r.data;
    },
  };
  return llm;
}
const NOW = new Date("2026-11-24T09:00:00Z");

describe("drafting", () => {
  it("is allowed only after a human records Take a call", async () => {
    const app = await takeACallApp();
    await expect(draftInvitation({ ...app, review: undefined }, draftLlm([goodBody]), "Riya", NOW)).rejects.toBeInstanceOf(EmailStateError);
    const lean = recordDecision(app, { value: "Pass", reason: "changed my mind after reading again", by: "Kushal" });
    await expect(draftInvitation(lean, draftLlm([goodBody]), "Riya", NOW)).rejects.toBeInstanceOf(EmailStateError);
  });
  it("stores an unsent draft with the slots and the right attendees, and logs it", async () => {
    const out = await draftInvitation(await takeACallApp(["deeptech"]), draftLlm([goodBody]), "Riya", NOW);
    const d = out.emails![0];
    expect(d).toMatchObject({ status: "draft", to: "", attendees: ["Kushal", "Aditya"], createdBy: "Riya" });
    expect(d.slots).toHaveLength(4);
    expect(out.audit!.at(-1)!.type).toBe("email_drafted");
  });
  it("rejects drafts that miss a slot, leak the assessment, promise money or add links", () => {
    const slots = proposeSlots(NOW);
    expect(validateDraft("Hi", goodBody(slots), slots)).toEqual([]);
    expect(validateDraft("Hi", goodBody(slots.slice(0, 2)), slots).join()).toMatch(/slot exactly as written/);
    expect(validateDraft("Hi", goodBody(slots) + " Your score was high.", slots).join()).toMatch(/score/);
    expect(validateDraft("Hi", goodBody(slots) + " This is the Take a call outcome.", slots).join()).toMatch(/lean/);
    expect(validateDraft("Hi", goodBody(slots) + " We will invest if it goes well.", slots).join()).toMatch(/investment/);
    expect(validateDraft("Hi", goodBody(slots) + " See https://example.com", slots).join()).toMatch(/links/);
    expect(validateDraft("Hi", goodBody(slots).replace("30-minute", "short"), slots).join()).toMatch(/30 minutes/);
  });
  it("retries once with the problems listed, then fails loudly", async () => {
    const llm = draftLlm([(s) => goodBody(s.slice(0, 1)), goodBody]);
    const out = await draftInvitation(await takeACallApp(), llm, "Riya", NOW);
    expect(out.emails).toHaveLength(1);
    expect(llm.prompts[1]).toMatch(/REJECTED BY CODE/);
    await expect(draftInvitation(await takeACallApp(), draftLlm([(s) => goodBody(s.slice(0, 1)), (s) => goodBody(s.slice(0, 1))]), "Riya", NOW))
      .rejects.toBeInstanceOf(InvalidModelOutputError);
  });
});

function spySender() {
  const sent: OutgoingMessage[] = [];
  const sender: Sender = { send: async (m) => { sent.push(m); return { id: "re_123" }; } };
  return { sent, sender };
}

async function draftReady(types: BusinessType[] = ["consumer"], to = "founder@company.in") {
  let app = await draftInvitation(await takeACallApp(types), draftLlm([goodBody]), "Riya", NOW);
  const d = app.emails![0];
  app = editDraft(app, d.id, { to, subject: d.subject, body: d.body, by: "Riya" });
  return { app, id: d.id };
}

describe("approving", () => {
  it("needs a valid recipient and records who approved", async () => {
    const { app, id } = await draftReady(["consumer"], "");
    expect(() => approveDraft(app, id, "Riya", "test")).toThrow(/email address/);
    const ok = (await draftReady()).app;
    const approved = approveDraft(ok, ok.emails![0].id, "Kushal", "test");
    expect(approved.emails![0]).toMatchObject({ status: "approved", approvedBy: "Kushal" });
    expect(approved.emails![0].approvedHash).toBe(hashDraft(approved.emails![0]));
    expect(approved.audit!.at(-1)!.type).toBe("email_approved");
  });
  it("blocks reserved addresses in live mode", async () => {
    const { app, id } = await draftReady(["consumer"], "hello@yatrika.example");
    expect(approveDraft(app, id, "Riya", "test").emails![0].status).toBe("approved");
    expect(() => approveDraft(app, id, "Riya", "live")).toThrow(/cannot receive mail/);
  });
  it("cancels the approval when the text changes afterwards", async () => {
    const { app, id } = await draftReady();
    const approved = approveDraft(app, id, "Riya", "test");
    const d = approved.emails![0];
    const edited = editDraft(approved, id, { to: d.to, subject: d.subject, body: d.body + " One more line.", by: "Riya" });
    expect(edited.emails![0]).toMatchObject({ status: "draft", approvedHash: undefined });
    expect(edited.audit!.at(-1)!.detail).toMatch(/approval was cancelled/);
    expect(editDraft(approved, id, { to: d.to, subject: d.subject, body: d.body })).toBe(approved); // no change, no cancel
  });
});

describe("sending", () => {
  it("test mode records what would have been sent and never calls the sender", async () => {
    const { app, id } = await draftReady();
    const spy = spySender();
    const res = await sendDraft(approveDraft(app, id, "Riya", "test"), id, "Riya", { mode: "test", ...getSender("test"), allApps: [] });
    expect(res.ok).toBe(true);
    expect(res.app.emails![0]).toMatchObject({ status: "test_logged", mode: "test" });
    expect(res.app.audit!.at(-1)!.detail).toMatch(/Nothing left the system/);
    expect(spy.sent).toHaveLength(0);
  });
  it("is test mode unless SEND_MODE is exactly live", () => {
    expect(sendMode({})).toBe("test");
    expect(sendMode({ SEND_MODE: "LIVE" })).toBe("live");
    expect(sendMode({ SEND_MODE: "true" })).toBe("test");
    expect(sendMode({ SEND_MODE: "" })).toBe("test");
  });
  it("live mode needs a key and a from-address, and test mode needs neither", () => {
    expect(() => getSender("live", {})).toThrow(MissingConfigError);
    expect(() => getSender("live", { RESEND_API_KEY: "k" })).toThrow(MissingConfigError);
    expect(getSender("live", { RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.in" }).from).toBe("a@b.in");
    expect(getSender("test", {}).from).toBe("test@localhost");
  });
  it("live mode sends exactly one plain-text message to the one recipient", async () => {
    const { app, id } = await draftReady();
    const spy = spySender();
    const res = await sendDraft(approveDraft(app, id, "Riya", "live"), id, "Riya", { mode: "live", sender: spy.sender, from: "invites@allin.test-domain.in", allApps: [] });
    expect(res.ok).toBe(true);
    expect(spy.sent).toHaveLength(1);
    expect(spy.sent[0]).toMatchObject({ to: "founder@company.in", from: "invites@allin.test-domain.in" });
    expect(spy.sent[0].text).toMatch(/30-minute/);
    expect(res.app.emails![0]).toMatchObject({ status: "sent", mode: "live", resendId: "re_123" });
  });
  it("will not send an unapproved draft, or one changed after approval, or one already sent", async () => {
    const { app, id } = await draftReady();
    const deps = { mode: "test" as const, ...getSender("test"), allApps: [] };
    await expect(sendDraft(app, id, "Riya", deps)).rejects.toThrow(/Approve the draft/);
    const approved = approveDraft(app, id, "Riya", "test");
    const tampered = { ...approved, emails: [{ ...approved.emails![0], body: approved.emails![0].body + " Extra." }] };
    await expect(sendDraft(tampered, id, "Riya", deps)).rejects.toThrow(/changed after it was approved/);
    const sent = (await sendDraft(approved, id, "Riya", deps)).app;
    await expect(sendDraft(sent, id, "Riya", deps)).rejects.toThrow(/already been sent/);
  });
  it("needs the Take a call decision at send time too", async () => {
    const { app, id } = await draftReady();
    const approved = approveDraft(app, id, "Riya", "test");
    const changed = recordDecision(approved, { value: "Pass", reason: "second thoughts after another read", by: "Kushal" });
    await expect(sendDraft(changed, id, "Riya", { mode: "test", ...getSender("test"), allApps: [] })).rejects.toBeInstanceOf(EmailStateError);
  });
  it("records a failure, keeps the draft, and allows a retry without re-approval", async () => {
    const { app, id } = await draftReady();
    const failing: Sender = { send: async () => { throw new Error("domain not verified"); } };
    const approved = approveDraft(app, id, "Riya", "live");
    const first = await sendDraft(approved, id, "Riya", { mode: "live", sender: failing, from: "a@b.in", allApps: [] });
    expect(first.ok).toBe(false);
    expect(first.app.emails![0]).toMatchObject({ status: "failed", error: "domain not verified" });
    expect(first.app.audit!.at(-1)!.type).toBe("email_failed");
    const spy = spySender();
    const retry = await sendDraft(first.app, id, "Riya", { mode: "live", sender: spy.sender, from: "a@b.in", allApps: [] });
    expect(retry.ok).toBe(true);
    expect(spy.sent).toHaveLength(1);
  });
  it("enforces the per-application and daily live limits", async () => {
    const { app, id } = await draftReady();
    const spy = spySender();
    const mkSent = (n: number, at: Date): NonNullable<Application["emails"]> =>
      Array.from({ length: n }, (_, i) => ({ id: `x${i}`, status: "sent" as const, mode: "live" as const, to: `p${i}@x.in`, subject: `s${i}`, body: "b", slots: [], attendees: [], model: "m", createdAt: at.toISOString(), createdBy: "r", sentAt: at.toISOString() }));
    const approved = approveDraft(app, id, "Riya", "live");
    const manyHere = { ...approved, emails: [...mkSent(LIVE_SENDS_PER_APPLICATION, NOW), ...approved.emails!] };
    await expect(sendDraft(manyHere, id, "Riya", { mode: "live", sender: spy.sender, from: "a@b.in", allApps: [manyHere], now: NOW })).rejects.toThrow(/limit of 3/);
    const elsewhere: Application = { ...approved, id: "other", emails: mkSent(DAILY_LIVE_SEND_CAP, NOW) };
    await expect(sendDraft(approved, id, "Riya", { mode: "live", sender: spy.sender, from: "a@b.in", allApps: [elsewhere], now: NOW })).rejects.toThrow(/daily limit/);
    const old = new Date(NOW.getTime() - 2 * 86_400_000);
    const staleElsewhere: Application = { ...approved, id: "other", emails: mkSent(DAILY_LIVE_SEND_CAP, old) };
    expect((await sendDraft(approved, id, "Riya", { mode: "live", sender: spy.sender, from: "a@b.in", allApps: [staleElsewhere], now: NOW })).ok).toBe(true);
    expect(spy.sent).toHaveLength(1);
  });
  it("blocks the same message to the same address within 24 hours", async () => {
    const { app, id } = await draftReady();
    const approved = approveDraft(app, id, "Riya", "live");
    const d = approved.emails![0];
    const earlier = { ...d, id: "earlier", status: "sent" as const, mode: "live" as const, sentAt: new Date(NOW.getTime() - 3_600_000).toISOString() };
    const withEarlier = { ...approved, emails: [earlier, d] };
    const spy = spySender();
    await expect(sendDraft(withEarlier, id, "Riya", { mode: "live", sender: spy.sender, from: "a@b.in", allApps: [withEarlier], now: NOW })).rejects.toThrow(/last 24 hours/);
    expect(spy.sent).toHaveLength(0);
  });
});
