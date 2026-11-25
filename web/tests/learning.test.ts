import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import { CRITERIA, type BusinessType, type CriterionId } from "../lib/framework/config";
import type { Llm } from "../lib/llm";
import { memoryFor } from "../lib/memory";
import { MarkError, setMemoryMark } from "../lib/memory/marks";
import { editExamples } from "../lib/email/precedent";
import { draftInvitation } from "../lib/email/draft";
import { editDraft, approveDraft } from "../lib/email/send";
import { measureCorrections } from "../lib/evals/steps";
import { buildEmailPrompt } from "../lib/prompts/email";
import { correctCriterion, recordDecision } from "../lib/review";
import { scoreApplication } from "../lib/scoring/run";
import { proposeSlots } from "../lib/email/slots";
import type { Application, EmailDraft } from "../lib/schemas";

const NL = String.fromCharCode(10);
const NOW = new Date("2026-11-24T09:00:00Z");
const DECK = "Traction: INR 16.5 L in October. We make millet-based breakfast and snacks for urban families.";

let counter = 0;
async function scored(name: string, types: BusinessType[] = ["consumer"], sector = "Consumer brands"): Promise<Application> {
  const id = `00000000-0000-0000-0000-${String(++counter).padStart(12, "0")}`;
  const app: Application = {
    id, name, createdAt: new Date(2026, 10, counter).toISOString(),
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: DECK }],
    extraction: { status: "done", model: "fixture", extractedAt: NOW.toISOString(), result: { company: { name, sector_selected: sector, founders: [{ name: "Ritu" }] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } } },
    recompute: [], conflicts: [],
    research: { status: "done", model: "fixture", plannedAt: NOW.toISOString(), questions: [], completed: [], findings: [], portfolio: { checkedAt: NOW.toISOString(), checks: [], mentions: [], note: "incomplete" }, errors: [] },
  };
  const out = {
    business_types: { types, reason: "fixture" },
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.id, { status: "scored", score: 5, class: "S-u", evidence: [{ source: "deck", quote: "Traction: INR 16.5 L in October" }], reasoning: "ok", missing: null, cost: null }])),
    d2: { value: "not_triggered", reason: "none", evidence: [] },
  };
  const llm: Llm = { model: "fixture", async json<T>(_p: string, schema: ZodType<T>) { return schema.parse(out); } };
  return scoreApplication(app, llm);
}

describe("marking retrieved past corrections", () => {
  async function pair() {
    const past = correctCriterion(await scored("PastCo"), { criterion: "A3" as CriterionId, status: "scored", score: 7, reason: "cohort sheet in the form proves the repeat numbers", by: "Riya" });
    const target = await scored("NewCo");
    const correctionId = memoryFor(target, [past]).A3[0].correction.id;
    return { past, target, correctionId };
  }
  it("records a mark for a correction that was really shown, with an audit entry", async () => {
    const { past, target, correctionId } = await pair();
    const out = setMemoryMark(target, [past], { correctionId, criterion: "A3", useful: true, by: "Riya" });
    expect(out.memoryMarks).toHaveLength(1);
    expect(out.memoryMarks![0]).toMatchObject({ correctionId, criterion: "A3", useful: true, by: "Riya" });
    expect(out.audit!.at(-1)!.type).toBe("memory_marked");
  });
  it("replaces an earlier mark on the same correction instead of adding a second", async () => {
    const { past, target, correctionId } = await pair();
    const once = setMemoryMark(target, [past], { correctionId, criterion: "A3", useful: true });
    const twice = setMemoryMark(once, [past], { correctionId, criterion: "A3", useful: false });
    expect(twice.memoryMarks).toHaveLength(1);
    expect(twice.memoryMarks![0].useful).toBe(false);
  });
  it("refuses a correction that was not shown, a bad criterion, or an unscored application", async () => {
    const { past, target, correctionId } = await pair();
    expect(() => setMemoryMark(target, [past], { correctionId: "nope", criterion: "A3", useful: true })).toThrow(MarkError);
    expect(() => setMemoryMark(target, [past], { correctionId, criterion: "B6", useful: true })).toThrow(/not shown/);
    expect(() => setMemoryMark(target, [past], { correctionId, criterion: "ZZ", useful: true })).toThrow(MarkError);
    expect(() => setMemoryMark(target, [past], { correctionId, criterion: "A3", useful: "yes" })).toThrow(MarkError);
    expect(() => setMemoryMark({ ...target, scoring: undefined }, [past], { correctionId, criterion: "A3", useful: true })).toThrow(/Score the application/);
  });
  it("feeds the retrieval eval: share of marks that are useful, with the sample size", async () => {
    const { past, target, correctionId } = await pair();
    expect(measureCorrections([past, target]).measured).toBeNull();
    const marked = setMemoryMark(target, [past], { correctionId, criterion: "A3", useful: true });
    const r = measureCorrections([past, marked]);
    expect(r).toMatchObject({ measured: 100, n: 1 });
    expect(r.needs).toMatch(/ten marks/);
  });
});

const draft = (id: string, status: EmailDraft["status"], original: { subject: string; body: string } | undefined, edited: { subject: string; body: string }, at: string): EmailDraft => ({
  id, status, to: "a@b.in", subject: edited.subject, body: edited.body, original, slots: [], attendees: ["Kushal"], model: "m", createdAt: at, createdBy: "x", approvedAt: at,
});
const withEmails = (name: string, emails: EmailDraft[]): Application => ({ id: `id-${name}`, name, createdAt: NOW.toISOString(), files: [], extraction: { status: "not_run" }, recompute: [], conflicts: [], emails }) as unknown as Application;

describe("learning from reviewers' invitation edits", () => {
  const model = { subject: "Hello", body: "Long formal text from the model." };
  const human = { subject: "Hello", body: "Short friendly text." };
  it("takes only edits that a person approved, from other applications, newest first, two at most", () => {
    const apps = [
      withEmails("A", [draft("1", "sent", model, human, "2026-11-20T10:00:00.000Z")]),
      withEmails("B", [draft("2", "approved", model, { ...human, body: "Newer rewrite." }, "2026-11-22T10:00:00.000Z"), draft("3", "draft", model, human, "2026-11-23T10:00:00.000Z")]),
      withEmails("C", [draft("4", "sent", model, model, "2026-11-21T10:00:00.000Z")]), // never edited
      withEmails("D", [draft("5", "test_logged", undefined, human, "2026-11-21T12:00:00.000Z")]), // older draft, no original kept
      withEmails("E", [draft("6", "sent", model, human, "2026-11-19T10:00:00.000Z")]),
    ];
    const ex = editExamples(apps, "id-Z");
    expect(ex.map((e) => e.draftId)).toEqual(["2", "1"]);
    expect(ex[0]).toMatchObject({ company: "B", before: model.body, after: "Newer rewrite." });
    expect(editExamples(apps, "id-B").map((e) => e.draftId)).toEqual(["1", "6"]);
  });
  it("puts the examples in the prompt as style only, with the warning not to copy facts", async () => {
    const target = await scored("Target");
    const ex = editExamples([withEmails("A", [draft("1", "sent", model, human, "2026-11-20T10:00:00.000Z")])], target.id);
    const prompt = buildEmailPrompt(target, proposeSlots(NOW), ["Kushal"], undefined, ex);
    expect(prompt).toContain("Long formal text from the model.");
    expect(prompt).toContain("Short friendly text.");
    expect(prompt).toMatch(/never copy their names, facts/);
    expect(buildEmailPrompt(target, proposeSlots(NOW), ["Kushal"])).not.toMatch(/REWRITTEN EARLIER DRAFTS/);
  });
  it("keeps the model's first draft and what shaped it, and learns the edit once it is approved", async () => {
    const target = recordDecision(await scored("Target"), { value: "Take a call", reason: "the repeat evidence is strong enough", by: "Kushal" });
    const slots = proposeSlots(NOW);
    const sentence = "We read that you make millet-based breakfast and snacks for urban families.";
    const bodyFor = `Hi Ritu,${NL}${NL}Thank you for applying. ${sentence} We would like a 30-minute conversation.${NL}${NL}${slots.map((s) => `- ${s.label}`).join(NL)}${NL}${NL}The All In Capital team`;
    const prompts: string[] = [];
    const llm: Llm = {
      model: "fixture",
      async json<T>(p: string, schema: ZodType<T>) {
        prompts.push(p);
        return schema.parse({ subject: "A conversation with All In Capital", body: bodyFor, personal_detail: { sentence, quote: "make millet-based breakfast and snacks for urban families", source: "deck" } });
      },
    };
    const first = await draftInvitation(target, llm, "Riya", NOW);
    const d = first.emails![0];
    expect(d.original).toEqual({ subject: d.subject, body: d.body });
    expect(d.precedentUsed).toBeUndefined();

    // A reviewer rewrites it and approves.
    const withTo = editDraft(first, d.id, { to: "ritu@target.in", subject: d.subject, body: d.body.replace("Thank you for applying.", "Thanks for applying!"), by: "Riya" });
    const approved = approveDraft(withTo, d.id, "Riya", "test");
    expect(editExamples([approved], "someone-else")[0]).toMatchObject({ after: expect.stringContaining("Thanks for applying!"), before: expect.stringContaining("Thank you for applying.") });

    // The next application's draft is shown that edit and records that it was.
    const next = recordDecision(await scored("Next"), { value: "Take a call", reason: "the repeat evidence is strong enough", by: "Kushal" });
    const second = await draftInvitation(next, llm, "Riya", NOW, undefined, [approved, next]);
    expect(prompts.at(-1)).toContain("Thanks for applying!");
    expect(second.emails![0].precedentUsed).toEqual([{ company: "Target", draftId: d.id }]);
    expect(second.audit!.at(-1)!.detail).toMatch(/shaped by 1 earlier reviewer edit/);
  });
});
