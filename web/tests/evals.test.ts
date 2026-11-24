import { describe, it, expect } from "vitest";
import { feedbackLoop, measureEmail, measureExtraction, measureCorrections, measurePortfolio, measureScore, STEPS, statusOf } from "../lib/evals/steps";
import { FRAMEWORK_DEFAULTS } from "../lib/settings";
import type { Application, EmailDraft } from "../lib/schemas";

const NOW = "2026-11-24T10:00:00.000Z";

function app(over: Partial<Application> = {}, claims: { quote: string; source: "deck" | "form" }[] = []): Application {
  return {
    id: crypto.randomUUID(), name: "Demo", createdAt: NOW,
    files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "Monthly revenue grew from INR 4.8 L in June to INR 16.5 L in October." }],
    extraction: {
      status: "done", model: "fixture", extractedAt: NOW,
      result: {
        company: { name: "Demo", founders: [] },
        claims: claims.map((c) => ({ field: "x", label: "x", value: 1, unit: "n", source: c.source, location: "deck page 1", quote: c.quote })),
        figures: { products: [], sums: [], quotients: [], paybacks: [] },
      },
    },
    recompute: [], conflicts: [],
    ...over,
  } as Application;
}

const draft = (attempts: number | undefined, edited = false): EmailDraft => ({
  id: crypto.randomUUID(), status: "draft", to: "", subject: "s", body: "b", slots: [], attendees: ["Kushal"], model: "m",
  createdAt: NOW, createdBy: "x", attempts, editedAt: edited ? NOW : undefined,
});

describe("step status", () => {
  it("compares a measured result with its target, and never invents one", () => {
    const base = { id: "score" as const, n: 1, basis: "", needs: null };
    expect(statusOf({ ...base, measured: 83 }, 83)).toBe("met");
    expect(statusOf({ ...base, measured: 82.9 }, 83)).toBe("below");
    expect(statusOf({ ...base, measured: null }, 83)).toBe("unmeasured");
  });
  it("has the five steps with the slide's targets", () => {
    expect(STEPS.map((s) => s.target)).toEqual([90, 90, 83, 90, 90]);
    expect(STEPS.map((s) => s.id)).toEqual(["extract", "portfolio", "score", "corrections", "email"]);
  });
});

describe("step 1: extraction grounding", () => {
  it("is not measured with no extracted application", () => {
    expect(measureExtraction([]).measured).toBeNull();
  });
  it("counts claims whose quote is in the document, ignoring punctuation and case", () => {
    const a = app({}, [
      { quote: "revenue grew from INR 4.8 L in June", source: "deck" },
      { quote: "Revenue grew from INR 4.8 L, in June to INR 16.5 L", source: "deck" },
      { quote: "The company has 40 enterprise customers", source: "deck" }, // not in the text
      { quote: "Raising INR 2.5 Cr", source: "form" }, // there is no form file
    ]);
    const r = measureExtraction([a]);
    expect(r.n).toBe(4);
    expect(r.measured).toBe(50);
  });
});

describe("step 2 and 4 are honest about what is missing", () => {
  it("does not report a portfolio number", () => {
    expect(measurePortfolio().measured).toBeNull();
    expect(measurePortfolio().needs).toMatch(/portfolio list/);
  });
  it("counts stored corrections but reports no retrieval accuracy", () => {
    const a = app({ review: { corrections: [{ id: "1" } as never, { id: "2" } as never], accepted: [] } });
    const r = measureCorrections([a]);
    expect(r.n).toBe(2);
    expect(r.measured).toBeNull();
  });
});

describe("step 3: scoring against the fund's decisions", () => {
  it("reproduces the reported backtest: 5 of 12 match strictly", () => {
    const r = measureScore(FRAMEWORK_DEFAULTS());
    expect(r.n).toBe(12);
    expect(r.measured).toBeCloseTo(41.7, 1);
    expect(r.extra).toMatch(/6 soft/);
    expect(r.extra).toMatch(/1 hard/);
    expect(r.extra).toMatch(/91\.7%/);
  });
});

describe("step 5: email drafting", () => {
  it("is not measured until drafts carry an attempt count", () => {
    expect(measureEmail([app({ emails: [draft(undefined)] })]).measured).toBeNull();
  });
  it("is the share of drafts that passed on the first attempt, and reports edits", () => {
    const r = measureEmail([app({ emails: [draft(1), draft(1, true), draft(2), draft(1)] })]);
    expect(r.n).toBe(4);
    expect(r.measured).toBe(75);
    expect(r.extra).toMatch(/1 of 4 drafts was edited/);
  });
});

describe("feedback loop", () => {
  it("has the six stages of the slide in order", () => {
    expect(feedbackLoop([]).map((s) => s.key)).toEqual(["signal", "capture", "store", "retrieve", "apply", "act"]);
  });
  it("counts live signals, and states the gaps", () => {
    const a = app({
      review: { corrections: [{ id: "1" } as never], accepted: [], decision: { value: "Pass", reason: "r", by: "k", at: NOW, systemLean: "Pass", agreedWithSystem: true } },
      audit: [{ at: NOW, type: "email_edited", by: "k", detail: "" } as never],
      emails: [draft(1)],
    });
    const loop = feedbackLoop([a]);
    expect(loop[0].count).toBe(3); // one correction, one decision, one email edit
    expect(loop[1].gap).toMatch(/Email edits/);
    expect(loop[2].count).toBe(1);
    expect(loop[5].count).toBe(1); // one draft, nothing scored
  });
});
