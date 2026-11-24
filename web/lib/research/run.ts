import { InvalidModelOutputError, type Llm } from "../llm";
import {
  buildPlanPrompt, buildPortfolioPrompt, buildSearchPrompt, buildStructurePrompt,
} from "../prompts/research";
import {
  PlanSchema, PortfolioCheckSchema, StructuredFindingsSchema,
  type Application, type Finding, type PortfolioResult, type Research,
} from "../schemas";
import { findMentions, PORTFOLIO, PORTFOLIO_NOTE } from "./portfolio";
import { numberSources, resolveRedirect } from "./sources";

export class ResearchStateError extends Error {}

/** Step 1: choose the questions and check the portfolio. No web search yet. */
export async function planResearch(app: Application, llm: Llm): Promise<Application> {
  if (app.extraction.status !== "done" || !app.extraction.result) {
    throw new ResearchStateError("Extract the claims first: research is planned from them.");
  }

  const plan = await llm.json(buildPlanPrompt(app), PlanSchema);
  const ids = plan.questions.map((q) => q.id);
  if (new Set(ids).size !== ids.length) throw new InvalidModelOutputError("The research plan repeated a question id.");

  const raw = await llm.json(buildPortfolioPrompt(app), PortfolioCheckSchema);
  const byName = new Map(PORTFOLIO.map((c) => [c.name.toLowerCase(), c.name]));
  const checks: PortfolioResult["checks"] = raw.checks.map((c) => {
    const canonical = byName.get(c.company.trim().toLowerCase());
    if (!canonical) throw new InvalidModelOutputError(`The portfolio check named "${c.company}", which is not on the list.`);
    return { company: canonical, overlap: c.overlap, reason: c.reason };
  });

  const research: Research = {
    status: "running",
    model: llm.model,
    plannedAt: new Date().toISOString(),
    questions: plan.questions,
    completed: [],
    findings: [],
    portfolio: {
      checkedAt: new Date().toISOString(),
      checks,
      mentions: findMentions(app.files.map((f) => f.text).join("\n")),
      note: PORTFOLIO_NOTE,
    },
    errors: [],
  };
  return { ...app, research };
}

/**
 * Step 2 (one call per question, so each stays inside a function time limit): search the web, then turn the
 * answer into findings. Every "found" finding must cite sources the search really returned; anything else
 * is rejected, not repaired.
 */
export async function runQuestion(app: Application, index: number, llm: Llm): Promise<Application> {
  const research = app.research;
  if (!research) throw new ResearchStateError("Plan the research first.");
  const q = research.questions[index];
  if (!q) throw new ResearchStateError("There is no such question.");
  if (research.completed.includes(q.id)) return app;
  if (!llm.grounded) throw new ResearchStateError("This model setup cannot search the web.");

  const answer = await llm.grounded(buildSearchPrompt(app, q));
  const resolved = await Promise.all(answer.sources.map(async (s) => ({ ...s, url: await resolveRedirect(s.url) })));
  const sources = numberSources(resolved);

  const structured = await llm.json(buildStructurePrompt(q, answer.text, sources), StructuredFindingsSchema);
  const known = new Map(sources.map((s) => [s.id, s]));

  const findings: Finding[] = structured.findings.map((f) => {
    if (f.status === "found") {
      if (f.source_ids.length === 0) throw new InvalidModelOutputError(`A finding was marked found but cites no source: "${f.statement}"`);
      const cited = f.source_ids.map((id) => {
        const s = known.get(id);
        if (!s) throw new InvalidModelOutputError(`A finding cites source ${id}, which the search did not return.`);
        return s;
      });
      return {
        questionId: q.id, statement: f.statement, status: "found", sources: cited,
        contradictsClaim: f.contradicts_claim ?? undefined,
      };
    }
    if (!f.cost_of_absence) throw new InvalidModelOutputError(`A not-found finding gives no cost of absence: "${f.statement}"`);
    return { questionId: q.id, statement: f.statement, status: "not_found", sources: [], costOfAbsence: f.cost_of_absence };
  });

  const completed = [...research.completed, q.id];
  return {
    ...app,
    research: {
      ...research,
      status: completed.length === research.questions.length ? "done" : "running",
      completed,
      findings: [...research.findings.filter((x) => x.questionId !== q.id), ...findings],
      errors: research.errors.filter((e) => e.questionId !== q.id),
    },
  };
}
