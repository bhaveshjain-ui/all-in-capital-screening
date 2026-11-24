import { describe, it, expect, afterEach } from "vitest";
import type { ZodType } from "zod";
import { CRITERIA } from "../lib/framework/config";
import type { Llm } from "../lib/llm";
import { MissingConfigError } from "../lib/llm";
import { CalError, calConfig, createCalBooking, eventTypeFor, fetchCalSlots, type CalConfig } from "../lib/calendar/cal";
import { chooseSlots, draftInvitation, EmailStateError } from "../lib/email/draft";
import { bookSlot } from "../lib/email/book";
import { formatSlotLabel } from "../lib/email/slots";
import { recordDecision } from "../lib/review";
import { scoreApplication } from "../lib/scoring/run";
import type { Application, EmailDraft } from "../lib/schemas";

const NL = String.fromCharCode(10);
const CFG: CalConfig = { apiKey: "test-key", eventTypeId: 11 };
const NOW = new Date("2026-11-24T09:00:00Z"); // Tuesday; earliest allowed slot is Thursday 26 Nov

const slotEntry = (iso: string) => ({ start: iso });
const fakeFetch = (data: Record<string, { start: string }[]>, ok = true, status = 200) =>
  (async () => ({ ok, status, json: async () => ({ data }) }) as unknown as Response) as unknown as typeof fetch;

const DATA = {
  "2026-11-25": [slotEntry("2026-11-25T14:00:00.000+05:30")], // Wednesday: never
  "2026-11-26": [
    slotEntry("2026-11-26T10:00:00.000+05:30"), // Thursday morning: no
    slotEntry("2026-11-26T14:00:00.000+05:30"),
    slotEntry("2026-11-26T14:30:00.000+05:30"),
    slotEntry("2026-11-26T15:00:00.000+05:30"), // third on the day: skipped
    slotEntry("2026-11-26T18:00:00.000+05:30"), // evening: no
  ],
  "2026-12-01": [slotEntry("2026-12-01T15:30:00.000+05:30"), slotEntry("2026-12-01T16:00:00.000+05:30")],
  "2026-12-03": [slotEntry("2026-12-03T12:00:00.000+05:30")],
};

describe("Cal.com configuration", () => {
  it("is off without a key, and needs an event type when there is a key", () => {
    expect(calConfig({})).toBeNull();
    expect(() => calConfig({ CAL_API_KEY: "k" })).toThrow(MissingConfigError);
    expect(calConfig({ CAL_API_KEY: "k", CAL_EVENT_TYPE_ID: "7" })).toEqual({ apiKey: "k", eventTypeId: 7, eventTypeIdDeeptech: undefined });
  });
  it("uses the deeptech event type only when one is set", () => {
    expect(eventTypeFor(CFG, true)).toBe(11);
    expect(eventTypeFor({ ...CFG, eventTypeIdDeeptech: 22 }, true)).toBe(22);
    expect(eventTypeFor({ ...CFG, eventTypeIdDeeptech: 22 }, false)).toBe(11);
  });
});

describe("free slots from Cal.com", () => {
  it("keeps only Tuesday/Thursday afternoons, two per day at most, after the lead time", async () => {
    const s = await fetchCalSlots(CFG, 11, NOW, 4, fakeFetch(DATA));
    expect(s.map((x) => x.label)).toEqual([
      // 2:00 pm Thursday is under 48 hours after Tuesday 2:30 pm, so it is skipped.
      "Thursday 26 November, 2:30 pm IST", "Thursday 26 November, 3:00 pm IST",
      "Tuesday 1 December, 3:30 pm IST", "Tuesday 1 December, 4:00 pm IST",
    ]);
    expect(s[0].startIso).toBe("2026-11-26T09:00:00.000Z");
  });
  it("never offers a slot inside the lead time", async () => {
    const s = await fetchCalSlots(CFG, 11, new Date("2026-11-26T09:00:00Z"), 4, fakeFetch(DATA));
    expect(s.every((x) => Date.parse(x.startIso) >= Date.parse("2026-11-28T09:00:00Z"))).toBe(true);
  });
  it("fails loudly when Cal.com errors or cannot be reached", async () => {
    await expect(fetchCalSlots(CFG, 11, NOW, 4, fakeFetch({}, false, 401))).rejects.toBeInstanceOf(CalError);
    const down = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await expect(fetchCalSlots(CFG, 11, NOW, 4, down)).rejects.toThrow(/could not be reached/);
  });
  it("formats labels in India time", () => {
    expect(formatSlotLabel("2026-12-01T10:00:00.000Z")).toBe("Tuesday 1 December, 3:30 pm IST");
  });
});

describe("choosing slots for an invitation", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  it("falls back to the fixed rule when Cal.com is not set up, and says so", async () => {
    delete process.env.CAL_API_KEY;
    const r = await chooseSlots(["Kushal"], NOW);
    expect(r.source).toBe("fixed rule");
    expect(r.slots).toHaveLength(4);
  });
  it("uses Cal.com when it is set up, and refuses when nothing is free", async () => {
    process.env.CAL_API_KEY = "k"; process.env.CAL_EVENT_TYPE_ID = "11";
    const ok = await chooseSlots(["Kushal"], NOW, async () => [{ startIso: "2026-11-26T08:30:00.000Z", label: "Thursday 26 November, 2:00 pm IST" }]);
    expect(ok.source).toBe("cal.com");
    await expect(chooseSlots(["Kushal"], NOW, async () => [])).rejects.toThrow(/no free/i);
  });
  it("picks the deeptech event type for deeptech", async () => {
    process.env.CAL_API_KEY = "k"; process.env.CAL_EVENT_TYPE_ID = "11"; process.env.CAL_EVENT_TYPE_ID_DEEPTECH = "22";
    const used: number[] = [];
    const spy = async (_c: CalConfig, id: number) => { used.push(id); return [{ startIso: "2026-11-26T08:30:00.000Z", label: "Thursday 26 November, 2:00 pm IST" }]; };
    await chooseSlots(["Kushal", "Aditya"], NOW, spy);
    await chooseSlots(["Kushal"], NOW, spy);
    expect(used).toEqual([22, 11]);
  });
});

async function takeACallApp(): Promise<Application> {
  const app: Application = {
    id: "11111111-2222-3333-4444-555555555555", name: "Demo Co", createdAt: new Date().toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "Traction: INR 16.5 L in October. GrainKind makes millet-based breakfast and snacks for urban families." }],
    extraction: {
      status: "done", model: "fixture", extractedAt: new Date().toISOString(),
      result: { company: { name: "Demo Co", one_liner: "Millet snacks", founders: [{ name: "Ritu" }, { name: "Sanjay" }] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } },
    },
    recompute: [], conflicts: [],
    research: { status: "done", model: "fixture", plannedAt: new Date().toISOString(), questions: [], completed: [], findings: [], portfolio: { checkedAt: new Date().toISOString(), checks: [], mentions: [], note: "incomplete" }, errors: [] },
  };
  const out = {
    business_types: { types: ["consumer"], reason: "fixture" },
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, { status: "scored", score: 7, class: "S-u", evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null }])),
    d2: { value: "not_triggered", reason: "none", evidence: [] },
  };
  const llm: Llm = { model: "fixture", async json<T>(_p: string, schema: ZodType<T>) { return schema.parse(out); } };
  return recordDecision(await scoreApplication(app, llm), { value: "Take a call", reason: "the repeat evidence is strong enough for a call", by: "Kushal" });
}

describe("drafting with Cal.com slots", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  it("offers the Cal.com slots and records where they came from", async () => {
    process.env.CAL_API_KEY = "k"; process.env.CAL_EVENT_TYPE_ID = "11";
    const slots = [
      { startIso: "2026-11-26T08:30:00.000Z", label: "Thursday 26 November, 2:00 pm IST" },
      { startIso: "2026-12-01T10:00:00.000Z", label: "Tuesday 1 December, 3:30 pm IST" },
    ];
    const llm: Llm = {
      model: "fixture",
      async json<T>(_p: string, schema: ZodType<T>) {
        return schema.parse({ subject: "A conversation with All In Capital", body: `Hello Ritu,${NL}${NL}We read that you make millet-based breakfast and snacks for urban families. We would like a 30-minute conversation.${NL}${NL}${slots.map((s) => `- ${s.label}`).join(NL)}${NL}${NL}The All In Capital team`, personal_detail: { sentence: "We read that you make millet-based breakfast and snacks for urban families.", quote: "makes millet-based breakfast and snacks for urban families", source: "deck" } });
      },
    };
    const out = await draftInvitation(await takeACallApp(), llm, "Riya", NOW, async () => slots);
    expect(out.emails![0].slotSource).toBe("cal.com");
    expect(out.emails![0].slots).toEqual(slots);
    expect(out.audit!.at(-1)!.detail).toMatch(/from cal\.com/);
  });
});

function withSentDraft(app: Application, status: EmailDraft["status"] = "test_logged"): { app: Application; id: string; iso: string } {
  const iso = "2026-11-26T08:30:00.000Z";
  const d: EmailDraft = {
    id: "d1", status, to: "ritu@grainkind.in", subject: "Hello", body: "A 30-minute call", attendees: ["Kushal"], model: "fixture",
    slots: [{ startIso: iso, label: "Thursday 26 November, 2:00 pm IST" }], createdAt: NOW.toISOString(), createdBy: "Riya",
  };
  return { app: { ...app, emails: [d] }, id: "d1", iso };
}

describe("booking the chosen time", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  it("needs a sent invitation and one of the offered slots", async () => {
    const base = await takeACallApp();
    const unsent = withSentDraft(base, "approved");
    await expect(bookSlot(unsent.app, unsent.id, unsent.iso, "Riya", { mode: "test" })).rejects.toThrow(/Send the invitation/);
    const sent = withSentDraft(base);
    await expect(bookSlot(sent.app, sent.id, "2026-11-27T08:30:00.000Z", "Riya", { mode: "test" })).rejects.toThrow(/not one of the slots/);
    await expect(bookSlot(sent.app, "nope", sent.iso, "Riya", { mode: "test" })).rejects.toBeInstanceOf(EmailStateError);
  });
  it("in test mode records the choice and books nothing", async () => {
    const { app, id, iso } = withSentDraft(await takeACallApp());
    let called = false;
    const out = await bookSlot(app, id, iso, "Riya", { mode: "test", create: async () => { called = true; return { uid: "x" }; } });
    expect(called).toBe(false);
    expect(out.emails![0].booking).toMatchObject({ mode: "test", uid: null, by: "Riya" });
    expect(out.audit!.at(-1)!.type).toBe("booking_created");
    await expect(bookSlot(out, id, iso, "Riya", { mode: "test" })).rejects.toThrow(/already booked/);
  });
  it("in live mode books on Cal.com with the founder's name and the typed address", async () => {
    process.env.CAL_API_KEY = "k"; process.env.CAL_EVENT_TYPE_ID = "11";
    const { app, id, iso } = withSentDraft(await takeACallApp());
    const seen: unknown[] = [];
    const out = await bookSlot(app, id, iso, "Riya", { mode: "live", create: async (r) => { seen.push(r); return { uid: "bk_1" }; } });
    expect(seen).toEqual([{ eventTypeId: 11, startIso: iso, name: "Ritu", email: "ritu@grainkind.in" }]);
    expect(out.emails![0].booking).toMatchObject({ mode: "live", uid: "bk_1", eventTypeId: 11 });
  });
  it("surfaces a Cal.com refusal and leaves the draft unbooked", async () => {
    process.env.CAL_API_KEY = "k"; process.env.CAL_EVENT_TYPE_ID = "11";
    const { app, id, iso } = withSentDraft(await takeACallApp());
    await expect(bookSlot(app, id, iso, "Riya", { mode: "live", create: async () => { throw new CalError("Cal.com refused the booking: slot taken"); } })).rejects.toThrow(/slot taken/);
    expect(app.emails![0].booking).toBeUndefined();
  });
  it("sends the booking request in Cal.com's format", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const f = (async (url: string, init: RequestInit) => { captured = { url, init }; return { ok: true, status: 201, json: async () => ({ status: "success", data: { uid: "u1" } }) } as unknown as Response; }) as unknown as typeof fetch;
    const r = await createCalBooking(CFG, { eventTypeId: 11, startIso: "2026-11-26T08:30:00.000Z", name: "Ritu", email: "r@x.in" }, f);
    expect(r.uid).toBe("u1");
    expect(captured!.url).toBe("https://api.cal.com/v2/bookings");
    expect(JSON.parse(captured!.init.body as string)).toEqual({
      start: "2026-11-26T08:30:00.000Z", eventTypeId: 11,
      attendee: { name: "Ritu", email: "r@x.in", timeZone: "Asia/Kolkata", language: "en" },
    });
    const bad = (async () => ({ ok: false, status: 400, json: async () => ({ status: "error", error: { message: "taken" } }) }) as unknown as Response) as unknown as typeof fetch;
    await expect(createCalBooking(CFG, { eventTypeId: 11, startIso: "x", name: "R", email: "r@x.in" }, bad)).rejects.toThrow(/taken/);
  });
});
