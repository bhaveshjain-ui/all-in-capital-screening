import { DEFAULT_PARAMS } from "../framework/config";
import type { Application } from "../schemas";
import type { MemoryMatch } from "../memory";

/** Rubric text given to the model. Source: docs/scoring_framework.md. Kept in one place so it can be reviewed. */
export const RUBRIC = `SCALE (every criterion, 0 to 10)
- 7-8: meets the HIGH anchor on stated, internally consistent evidence (8 only with strong, specific evidence).
- 5-6: MID anchor: partial evidence or mixed signals.
- 3-4: between LOW and MID: weak, with some mitigating evidence.
- 1-2: LOW anchor: clear evidence matching the weak pattern.
- 0: affirmative evidence of the opposite (for example an explicit refusal to own a risk). NEVER for missing information.
- Never above ${DEFAULT_PARAMS.unverifiedCap}: nothing here is independently verified from primary documents, and founder profiles are placeholders.

STATUS (exactly one per criterion)
- "scored": the material gives evidence; give a score.
- "unknown": the material gives no evidence on this criterion. Do NOT score it and do not treat it as bad: give score null, say what is missing and what the absence stops us judging. An item that is simply not mentioned is "unknown".
- "stated_absence": the applicant states they do not have or track a key item (for example "we have not measured acquisition cost yet"). This is evidence: give a score. For A3 a stated absence of a key metric is capped at ${DEFAULT_PARAMS.statedAbsenceCapA3}.
- "na": genuinely not applicable (say why in reasoning). Never use it to avoid "unknown".

EVIDENCE CLASS for each scored criterion
- "S-c": stated by the applicant, internally consistent, and recomputed where arithmetic exists.
- "S-u": stated but unreconciled, contradicted between deck and form, thin, or a single remark.
- "P": a proxy or an inference (A5 is always a proxy).
- "X": rests mainly on the external research findings.
If a claim is contradicted between deck and form, use the more conservative value and class S-u at best.

EVIDENCE QUOTES
Every scored criterion needs at least one evidence item: {"source": "deck"|"form"|"research"|"recompute"|"conflict", "quote": ...}. For deck and form, copy the words EXACTLY from the document text (at least 15 characters). For research, copy the finding's statement. For recompute, copy the figure's label. For conflict, copy the conflict's item name. Quotes are checked by code against the material; a quote that is not there makes the whole answer invalid.

BUSINESS TYPES (choose one or two) and what they imply
- consumer: a consumer brand. Central risk: growth bought rather than earned; repeat. Key metrics: cohort repeat, CAC by channel, gross margin.
- lending: lending or credit, including earned-wage advances and invoice financing. Central risk: who bears credit loss, licence and funding. Key metrics: loss and delinquency data, funding source.
- deeptech: deeptech or hardware. Central risk: customer, regulator, liability. Key metrics: named pilot or customer, regulatory or certification path.
- network: dense-network or field operations. Central risk: capital to reach density, field execution. Key metrics: contribution margin, field evidence.
- regdep: regulation-dependent business. Central risk: a rule change. Key: a plan if rules move against the business.
- other: anything else. Central risk: the main risk the applicant names. Key metrics: paying customers, retention, CAC payback.

CRITERIA (LOW is about 1-2, MID about 5, HIGH about 7-8)
A1 Founder-market fit. Parameters: relevant years or role directly in the problem area; customer or field contact with specifics and numbers (interviews, visits, pilots, manual first operations); lessons from failures or pilots. LOW: unrelated background, or the case rests on credentials or passion. MID: relevant background without specific customer contact, or contact without relevant background. HIGH: relevant background plus specific, quantified customer contact. Prestigious credentials alone do not exceed MID.
A2 Founder owns the central risk. Parameters: the central risk named by the founders; specific own mitigation (plan, hire, numbers, own capital at stake, signed agreement); delegation language ("the partner handles it", "solved later") or a deck-form contradiction on the risk itself. LOW: delegates, dismisses or contradicts. MID: names it with generic mitigation. HIGH: names it with specific own mitigation.
A3 Commercial fluency. Parameters: key metrics for the business type given; they reconcile when recomputed; unmeasured items disclosed. LOW: only top-line figures or averages, or metrics that do not reconcile. MID: some key metrics, partly measured. HIGH: key metrics given and reconciling. A stated absence of a key metric: at most ${DEFAULT_PARAMS.statedAbsenceCapA3}.
A4 Team and commitment. Parameters: technical plus commercial or operational coverage for the hard parts; founders full-time; core work outsourced or advisory only. LOW: critical gap unaddressed. MID: one named gap. HIGH: complementary cover, founders full-time.
A5 Candour and consistency (a proxy from the paperwork; it does not measure behaviour under questioning). Parameters: number and materiality of deck-versus-form conflicts; recomputation mismatches; specificity of stated risks; disclosure of unmeasured items; overstated language the form does not support. LOW: several material conflicts, a founder-background discrepancy, or overstated claims. MID: minor framing gaps. HIGH: documents agree, risks specific.
B1 Customer evidence and traction quality. Parameters: paying customers (count and trend); repeat or retention evidence; share of growth from paid channels; whether traction figures reconcile. LOW: no paying customers, or vanity metrics only. MID: some paying customers, short history. HIGH: paying customers with repeat evidence, trend and reconciling figures.
B2 Unit economics and margin path. Parameters: gross margin or contribution stated; CAC and payback recomputed; a path to positive. LOW: negative with no path. MID: partly measured. HIGH: figures reconcile with a path to positive.
B3 Regulatory and dependency path. Parameters: a material regulatory or partner dependency identified; a stated plan or milestones; whether existence depends on a favourable change. LOW: depends on a favourable change, or ignores a material exposure. MID: names it without a plan. HIGH: names it with a plan or milestones (signed agreement, licence). "na" only if there is no material exposure.
B4 Capital need against the ask. Parameters: the ask against the cost of the applicant's own 12-month milestones and use of funds; capital needed to reach scale or density on the applicant's own numbers; reliance on debt. The fund's cheque size is not known, so judge only from the applicant's plan. LOW: needs far more capital than the ask to reach its stated milestone. MID: tight or unclear. HIGH: the plan reaches its milestone within the ask. "unknown" if the plan cannot be assessed.
B5 Why now. LOW: none, or "the market is growing". MID: a generic trend. HIGH: a specific named change tied to timing. "unknown" if not mentioned.
B6 Competition and defensibility honesty. Parameters: real alternatives named; specificity of the advantage; whether the product is the person; whether a claim of "no competitors" or "no India-first player" conflicts with the research findings. LOW: "no competitors" contradicted by the findings, or the advantage is one person. MID: alternatives named, advantage vague, or notable competitors omitted. HIGH: real alternatives with a specific, checkable advantage.

D2: does the business exist only if rules change favourably? Answer "triggered" (the material says so or clearly implies it), "possible" (it mentions regulatory uncertainty that might imply it), "not_triggered", or "unknown". "triggered" or "possible" needs a quote as evidence.`;

const fmtNum = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "n/a");

export function buildScorePrompt(app: Application, feedback?: string, precedent: MemoryMatch[] = []): string {
  const r = app.extraction.result!;
  const docs = app.files.map((f) => `##### ${f.kind.toUpperCase()} (${f.filename})\n${f.text}`).join("\n\n");
  const claims = r.claims.map((c) => `- [${c.source}, ${c.location}] ${c.label}: ${c.value}${c.unit ? " " + c.unit : ""}`).join("\n") || "(none)";
  const recompute = app.recompute
    .map((x) => `- ${x.label}: claimed ${fmtNum(x.claimed)}, computed ${fmtNum(x.computed)}, ${x.match ? "matches" : "DOES NOT MATCH"}${x.note ? ` (${x.note})` : ""} [${x.location}]`)
    .join("\n") || "(nothing could be recomputed)";
  const conflicts = app.conflicts
    .map((c) => `- ${c.label}: deck says ${c.deck.value}, form says ${c.form.value} (${c.kind === "numeric" ? "numbers differ" : "wording differs"})`)
    .join("\n") || "(none found)";
  const findings = (app.research?.findings ?? [])
    .map((f) => `- ${f.status === "found" ? "FOUND" : "NOT FOUND"}: ${f.statement}${f.contradictsClaim ? ` [contradicts the application: ${f.contradictsClaim}]` : ""}${f.sources.length ? ` (sources: ${f.sources.map((s) => `${s.title || s.url} [${s.quality}]`).join(", ")})` : ""}${f.costOfAbsence ? ` [prevents us judging: ${f.costOfAbsence}]` : ""}`)
    .join("\n") || "(no research findings)";
  const portfolio = app.research?.portfolio?.checks.map((c) => `- ${c.company}: ${c.overlap} overlap, ${c.reason}`).join("\n") || "(no overlap flagged against the public list)";

  const fmtC = (e: { status: string; score: number | null }) => (e.score === null ? e.status : `${e.score} (${e.status})`);
  const precedentText = precedent.length
    ? `\nPAST REVIEWER CORRECTIONS ON SIMILAR COMPANIES (precedent, not rules)\nA human reviewer changed the model's score on other companies like this one. Use these only to calibrate how to weigh comparable evidence. Do not copy a score, and do not treat any fact about the other company as true here: every score and every quote must still come from THIS application's material.\n${precedent.map((m) => `- ${m.company}, criterion ${m.correction.criterion}: the model said ${fmtC(m.correction.original)}, the reviewer changed it to ${fmtC(m.correction.corrected)} because: ${m.correction.reason} (similar because: ${m.reasons.join("; ")})`).join("\n")}\n`
    : "";

  return `You score one startup application against a fixed rubric for an early-stage venture fund. You propose evidence-based scores for a human reviewer, who decides every outcome. You do not recommend, you do not give a total, and you never guess.

RULES
- Use ONLY the material below. Do not use outside knowledge about real companies.
- Missing information is never negative evidence: mark it "unknown" with what is missing and what the absence stops us judging.
- Score the evidence, not the pedigree. Founder claims are unverifiable placeholders.
- A stated absence is evidence; an item that is not mentioned is unknown.

${RUBRIC}
${precedentText}${feedback ? `\nYOUR PREVIOUS ANSWER WAS REJECTED BY CODE FOR THESE REASONS. Fix every one of them and answer again in full:\n${feedback}\n` : ""}
OUTPUT: only JSON of this shape, with all 11 criteria A1 A2 A3 A4 A5 B1 B2 B3 B4 B5 B6:
{
  "business_types": { "types": ["consumer"|"lending"|"deeptech"|"network"|"regdep"|"other"], "reason": string },
  "criteria": { "A1": { "status": "scored"|"unknown"|"stated_absence"|"na", "score": number|null, "class": "S-c"|"S-u"|"P"|"X"|null, "evidence": [ { "source": "deck"|"form"|"research"|"recompute"|"conflict", "quote": string } ], "reasoning": string, "missing": string|null, "cost": string|null }, ... },
  "d2": { "value": "triggered"|"possible"|"not_triggered"|"unknown", "reason": string, "evidence": [ { "source": ..., "quote": string } ] }
}

MATERIAL
Company: ${r.company.name}
Sector selected: ${r.company.sector_selected ?? "not stated"}; stage selected: ${r.company.stage_selected ?? "not stated"}; ask INR ${r.company.ask_inr ?? "not stated"}; post-money INR ${r.company.post_money_inr ?? "not stated"}

DOCUMENT TEXT
${docs}

EXTRACTED CLAIMS
${claims}

FIGURES RECOMPUTED BY CODE
${recompute}

DECK-VERSUS-FORM CONFLICTS FOUND BY CODE
${conflicts}

EXTERNAL RESEARCH FINDINGS (secondary evidence: press and vendor pages, not primary documents)
${findings}

POSSIBLE OVERLAP WITH THE FUND'S PORTFOLIO (public list only, incomplete)
${portfolio}`;
}
