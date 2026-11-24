import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import { InvalidModelOutputError, type GroundedAnswer, type Llm } from "../lib/llm";
import { classifySource, numberSources } from "../lib/research/sources";
import { findMentions } from "../lib/research/portfolio";
import { planResearch, runQuestion, ResearchStateError } from "../lib/research/run";
import type { Application } from "../lib/schemas";

describe("source classification", () => {
  it("classifies by domain", () => {
    expect(classifySource("https://inc42.com/buzz/x")).toBe("press");
    expect(classifySource("https://www.rbi.org.in/Scripts/x.aspx")).toBe("regulator");
    expect(classifySource("https://allincapital.vc/portfolio")).toBe("official");
    expect(classifySource("https://www.g2.com/products/y")).toBe("aggregator");
    expect(classifySource("https://nishithdesai.com/a")).toBe("blog");
    expect(classifySource("https://some-startup.example.io/pricing")).toBe("vendor");
  });
  it("uses the title (a domain) when the link is Google's grounding redirect", () => {
    const u = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/ABC";
    expect(classifySource(u, "inc42.com")).toBe("press");
    expect(classifySource(u, "rbi.org.in")).toBe("regulator");
    expect(classifySource(u, "Some page title")).toBe("unknown");
  });
  it("treats unlisted sites as vendor, the cautious reading", () => {
    expect(classifySource("https://random-blog.com/post")).toBe("vendor");
  });
  it("numbers sources from 1 and drops duplicates", () => {
    const n = numberSources([
      { url: "https://a.com/1", title: "a.com" }, { url: "https://a.com/1", title: "a.com" }, { url: "https://inc42.com/2", title: "inc42.com" },
    ]);
    expect(n.map((s) => s.id)).toEqual([1, 2]);
    expect(n[1].quality).toBe("press");
  });
});

describe("portfolio mentions", () => {
  it("finds names and aliases with word boundaries", () => {
    expect(findMentions("We integrate with MeetRecord and Salesforce")).toEqual(["MeetRecord"]);
    expect(findMentions("formerly known as Outdoo AI")).toEqual(["MeetRecord"]);
    expect(findMentions("a rigid framework")).toEqual([]);
    expect(findMentions("nothing here")).toEqual([]);
  });
});

const app = (): Application => ({
  id: "11111111-2222-3333-4444-555555555555", name: "Talkbook", createdAt: new Date().toISOString(),
  files: [{ kind: "deck", filename: "d.pdf", pages: 1, text: "AI call summaries and CRM updates" }],
  extraction: {
    status: "done", model: "fixture", extractedAt: new Date().toISOString(),
    result: {
      company: { name: "Talkbook", one_liner: "AI call summaries and CRM updates for Indian sales teams", founders: [] },
      claims: [{ field: "competitors_claim", label: "Competition", value: "We do not know of an India-first player", source: "form", location: "form page 1", quote: "We do not know of an India-first player" }],
      figures: { products: [], sums: [], quotients: [], paybacks: [] },
    },
  },
  recompute: [], conflicts: [],
});

function fixture(queue: unknown[], grounded?: GroundedAnswer): Llm {
  return {
    model: "fixture",
    async json<T>(_p: string, schema: ZodType<T>) {
      const next = queue.shift();
      const r = schema.safeParse(next);
      if (!r.success) throw new InvalidModelOutputError("fixture reply did not match the schema");
      return r.data;
    },
    grounded: grounded ? async () => grounded : undefined,
  };
}

const plan = {
  questions: [
    { id: "q1", type: "competition", question: "Who sells AI call summaries to Indian sales teams?", why: "context" },
    { id: "q2", type: "claim_check", question: "Is there an India-first call-intelligence vendor?", why: "tests the claim", claim_field: "competitors_claim" },
  ],
};

describe("planning", () => {
  it("stores the questions and a portfolio check on the public list", async () => {
    const out = await planResearch(app(), fixture([plan, { checks: [{ company: "meetrecord", overlap: "likely", reason: "both summarise sales calls" }] }]));
    expect(out.research!.questions).toHaveLength(2);
    expect(out.research!.portfolio!.checks[0]).toMatchObject({ company: "MeetRecord", overlap: "likely" });
    expect(out.research!.portfolio!.note).toMatch(/incomplete/);
    expect(out.research!.status).toBe("running");
  });
  it("rejects a portfolio company that is not on the list", async () => {
    await expect(planResearch(app(), fixture([plan, { checks: [{ company: "Invented Co", overlap: "possible", reason: "x" }] }])))
      .rejects.toBeInstanceOf(InvalidModelOutputError);
  });
  it("rejects repeated question ids", async () => {
    const dup = { questions: [plan.questions[0], { ...plan.questions[1], id: "q1" }] };
    await expect(planResearch(app(), fixture([dup, { checks: [] }]))).rejects.toBeInstanceOf(InvalidModelOutputError);
  });
  it("needs extracted claims first", async () => {
    const a = app();
    a.extraction = { status: "not_run" };
    await expect(planResearch(a, fixture([]))).rejects.toBeInstanceOf(ResearchStateError);
  });
});

describe("running a question", () => {
  const grounded: GroundedAnswer = {
    text: "Salesken is a Bengaluru call-intelligence vendor.",
    sources: [{ url: "https://inc42.com/a", title: "inc42.com" }, { url: "https://salesken.ai/x", title: "salesken.ai" }],
  };
  const planned = async () => planResearch(app(), fixture([plan, { checks: [] }]));

  it("maps cited ids to the sources the search returned, with quality labels", async () => {
    const a = await planned();
    const out = await runQuestion(a, 1, fixture([{
      findings: [{ statement: "Salesken sells call intelligence in India.", status: "found", source_ids: [1, 2], contradicts_claim: "no India-first player" }],
    }], grounded));
    const f = out.research!.findings[0];
    expect(f.sources.map((s) => s.quality)).toEqual(["press", "vendor"]);
    expect(f.contradictsClaim).toBe("no India-first player");
    expect(out.research!.completed).toEqual(["q2"]);
    expect(out.research!.status).toBe("running");
  });
  it("rejects a finding that cites a source the search did not return", async () => {
    const a = await planned();
    await expect(runQuestion(a, 0, fixture([{ findings: [{ statement: "x", status: "found", source_ids: [9] }] }], grounded)))
      .rejects.toBeInstanceOf(InvalidModelOutputError);
  });
  it("rejects a found finding with no source", async () => {
    const a = await planned();
    await expect(runQuestion(a, 0, fixture([{ findings: [{ statement: "x", status: "found", source_ids: [] }] }], grounded)))
      .rejects.toBeInstanceOf(InvalidModelOutputError);
  });
  it("records not-found with its cost, and requires the cost", async () => {
    const a = await planned();
    const out = await runQuestion(a, 0, fixture([{ findings: [{ statement: "No Indian vendors found.", status: "not_found", cost_of_absence: "cannot test the no-competitor claim" }] }], { text: "", sources: [] }));
    expect(out.research!.findings[0]).toMatchObject({ status: "not_found", costOfAbsence: "cannot test the no-competitor claim" });
    await expect(runQuestion(a, 0, fixture([{ findings: [{ statement: "none", status: "not_found" }] }], { text: "", sources: [] })))
      .rejects.toBeInstanceOf(InvalidModelOutputError);
  });
  it("is marked done when every question is answered, and re-running a finished question changes nothing", async () => {
    let a = await planned();
    const ok = (s: string) => fixture([{ findings: [{ statement: s, status: "found", source_ids: [1] }] }], grounded);
    a = await runQuestion(a, 0, ok("one"));
    a = await runQuestion(a, 1, ok("two"));
    expect(a.research!.status).toBe("done");
    const again = await runQuestion(a, 0, ok("changed"));
    expect(again.research!.findings.map((f) => f.statement).sort()).toEqual(["one", "two"]);
  });
  it("refuses when the model cannot search, or there is no plan", async () => {
    const a = await planned();
    await expect(runQuestion(a, 0, fixture([]))).rejects.toBeInstanceOf(ResearchStateError);
    await expect(runQuestion(app(), 0, fixture([], grounded))).rejects.toBeInstanceOf(ResearchStateError);
  });
});
