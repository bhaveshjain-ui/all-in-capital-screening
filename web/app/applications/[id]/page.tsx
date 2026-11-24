import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import ExtractButton from "./extract-button";
import ResearchRunner from "./research-runner";
import { BusinessTypes, RecomputeButton, ScoreButton } from "./score-controls";
import { currentValues } from "@/lib/settings";
import { CRITERIA } from "@/lib/framework/config";
import { effectiveCriteria, effectiveEvaluation } from "@/lib/review";
import { memoryFor, toView } from "@/lib/memory";
import { sendMode } from "@/lib/email/send";
import EmailPanel from "./email-panel";
import { CriterionReview, DecisionForm, ReviewerName } from "./review-controls";

export const dynamic = "force-dynamic";

const fmt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "n/a";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let app;
  try {
    app = await getStore().get(id);
  } catch {
    notFound();
  }
  if (!app) notFound();

  const others = app.scoring ? (await getStore().all()).filter((a) => a.id !== app.id) : [];
  const memory = app.scoring ? memoryFor(app, others) : null;
  const precedentAvailable = memory ? Object.values(memory).reduce((n, m) => n + m.length, 0) : 0;

  const saved = currentValues(await getStore().getSettings());
  const ex = app.extraction;
  const res = ex.result;
  const mism = app.recompute.filter((r) => !r.match);

  return (
    <>
      <p className="small"><Link href="/applications">← All applications</Link></p>
      <h1>{app.name}</h1>
      <p className="muted">Added {new Date(app.createdAt).toLocaleString("en-IN")}</p>

      <h2>Files read</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Document</th><th>File</th><th className="num">Pages</th><th className="num">Characters read</th></tr></thead>
          <tbody>
            {app.files.map((f) => (
              <tr key={f.kind}>
                <td>{f.kind === "deck" ? "Pitch deck" : "Application form"}</td>
                <td>{f.filename}</td>
                <td className="num">{f.pages}</td>
                <td className="num">{f.text.length.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {app.files.map((f) => (
        <details key={f.kind} className="card">
          <summary>Text read from the {f.kind}</summary>
          <pre>{f.text}</pre>
        </details>
      ))}

      <h2>Claim extraction</h2>
      {ex.status === "not_run" && (
        <p className="muted">Not run yet. This reads the two documents with the model and lists the claims, with a quote and page for each.</p>
      )}
      {ex.status === "error" && <p className="error" role="alert">Last run failed: {ex.error}</p>}
      {ex.status === "done" && (
        <p className="muted">Extracted {new Date(ex.extractedAt!).toLocaleString("en-IN")} with {ex.model}. Review the quotes: the model reads, it does not judge.</p>
      )}
      <ExtractButton id={app.id} done={ex.status === "done"} />

      {res && (
        <>
          <h2>Company details as stated</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr><th>Name</th><td>{res.company.name}</td></tr>
                {res.company.one_liner && <tr><th>Description</th><td>{res.company.one_liner}</td></tr>}
                {res.company.sector_selected && <tr><th>Sector selected</th><td>{res.company.sector_selected}</td></tr>}
                {res.company.stage_selected && <tr><th>Stage selected</th><td>{res.company.stage_selected}</td></tr>}
                {res.company.location && <tr><th>Location</th><td>{res.company.location}</td></tr>}
                {res.company.ask_inr != null && <tr><th>Ask</th><td>INR {fmt(res.company.ask_inr)}</td></tr>}
                {res.company.post_money_inr != null && <tr><th>Post-money</th><td>INR {fmt(res.company.post_money_inr)}</td></tr>}
                {res.company.founders.map((f, i) => (
                  <tr key={i}><th>Founder</th><td>{f.name}{f.role ? `, ${f.role}` : ""}{f.background ? `. ${f.background}` : ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Where the deck and the form disagree ({app.conflicts.length})</h2>
          {app.conflicts.length === 0 ? (
            <p className="muted">No differences found between claims that appear in both documents.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Deck says</th><th>Form says</th><th>Kind</th></tr></thead>
                <tbody>
                  {app.conflicts.map((c) => (
                    <tr key={c.field}>
                      <td>{c.label}</td>
                      <td>{String(c.deck.value)}<div className="small muted">{c.deck.location}: “{c.deck.quote}”</div></td>
                      <td>{String(c.form.value)}<div className="small muted">{c.form.location}: “{c.form.quote}”</div></td>
                      <td>{c.kind === "numeric" ? `Numbers differ${c.relDiff ? ` by ${(c.relDiff * 100).toFixed(0)}%` : ""}` : "Wording differs: read both"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>Figures recomputed from the stated inputs ({mism.length} not matching of {app.recompute.length})</h2>
          {app.recompute.length === 0 ? (
            <p className="muted">The documents stated no figure together with all of its inputs, so nothing could be recomputed.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Figure</th><th className="num">Claimed</th><th className="num">Computed</th><th>Result</th><th>Where</th></tr></thead>
                <tbody>
                  {app.recompute.map((r, i) => (
                    <tr key={i}>
                      <td>{r.label}</td>
                      <td className="num">{fmt(r.claimed)}</td>
                      <td className="num">{fmt(r.computed)}</td>
                      <td className={r.match ? "" : "bad"}>{r.match ? "Matches" : "Does not match"}{r.note ? ` — ${r.note}` : ""}</td>
                      <td>{r.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>All claims ({res.claims.length})</h2>
          <details className="card">
            <summary>Show every claim with its quote</summary>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Claim</th><th>Value</th><th>Source</th><th>Quote</th></tr></thead>
                <tbody>
                  {res.claims.map((c, i) => (
                    <tr key={i}>
                      <td>{c.label}</td>
                      <td>{String(c.value)}{c.unit ? ` ${c.unit}` : ""}</td>
                      <td>{c.location}</td>
                      <td className="small">“{c.quote}”</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <h2>External research</h2>
          <p className="muted">
            Public-web findings with their sources, for the reviewer to read next to the application. They are secondary
            evidence: press and vendor pages, not primary documents. Source labels: <strong>press</strong> news outlet,
            <strong> regulator</strong> official body, <strong>aggregator</strong> data site, <strong>blog</strong> law-firm or
            commentary, <strong>vendor</strong> a company site or any site not on our lists (treated cautiously).
          </p>
          <ResearchRunner
            id={app.id}
            questionIds={app.research?.questions.map((q) => q.id) ?? []}
            completed={app.research?.completed ?? []}
            planned={!!app.research}
          />
          {app.research && (
            <>
              <p className="muted small">
                Planned {new Date(app.research.plannedAt!).toLocaleString("en-IN")} with {app.research.model}.{" "}
                {app.research.completed.length} of {app.research.questions.length} questions answered.
              </p>

              <h3>Possible overlap with the portfolio</h3>
              {app.research.portfolio && (
                <>
                  <div className="notice">{app.research.portfolio.note}</div>
                  {app.research.portfolio.mentions.length > 0 && (
                    <p>Named in the application itself: <strong>{app.research.portfolio.mentions.join(", ")}</strong>.</p>
                  )}
                  {app.research.portfolio.checks.length === 0 ? (
                    <p className="muted">No overlap was flagged against the public list.</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Portfolio company</th><th>Overlap</th><th>Why</th></tr></thead>
                        <tbody>
                          {app.research.portfolio.checks.map((c) => (
                            <tr key={c.company}>
                              <td>{c.company}</td>
                              <td className={c.overlap === "likely" ? "bad" : ""}>{c.overlap === "likely" ? "Likely" : "Possible"}</td>
                              <td>{c.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="small muted">A flag means a partner conversation first. It is not a decision.</p>
                </>
              )}

              {app.research.questions.map((q) => {
                const fs = app.research!.findings.filter((f) => f.questionId === q.id);
                const err = app.research!.errors.find((e) => e.questionId === q.id);
                return (
                  <div key={q.id} className="card">
                    <h3>{q.question}</h3>
                    <p className="small muted">{q.type.replace("_", " ")} · {q.why}</p>
                    {err && <p className="error" role="alert">This question failed: {err.message}</p>}
                    {!app.research!.completed.includes(q.id) && !err && <p className="muted">Not answered yet.</p>}
                    {fs.map((f, i) => (
                      <div key={i} className="finding">
                        <p>
                          <strong>{f.status === "found" ? "Found: " : "Not found: "}</strong>{f.statement}
                          {f.contradictsClaim && <span className="bad"> Contradicts the application: {f.contradictsClaim}</span>}
                        </p>
                        {f.status === "not_found" && <p className="small muted">What this prevents us judging: {f.costOfAbsence}</p>}
                        {f.sources.length > 0 && (
                          <ul className="small sources">
                            {f.sources.map((s) => (
                              <li key={s.id}>
                                <span className={`tag-q q-${s.quality}`}>{s.quality}</span>{" "}
                                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          <h2>First read and suggested lean</h2>
          <p className="muted">
            Scores come from the evidence above, one criterion at a time, with the quote behind each. The model proposes; code
            checks every quote and every rule and works out the score. <strong>This is a suggestion for Kushal. Nothing is decided,
            rejected or advanced by it.</strong> Weights and thresholds are provisional until the partners set them.
          </p>
          <ScoreButton
            id={app.id}
            scored={!!app.scoring}
            precedent={precedentAvailable}
            ready={!!app.research?.portfolio}
            why="Run the research step first: scoring needs the portfolio check."
          />
          {app.scoring && (() => {
            const sc = app.scoring!;
            const eff = effectiveCriteria(app);
            const ev = effectiveEvaluation(app);
            const corrections = app.review?.corrections ?? [];
            const unknowns = CRITERIA.filter((c) => eff[c.id].status === "unknown");
            const usedWeights = sc.weightsUsed ?? Object.fromEntries(CRITERIA.map((c) => [c.id, c.weight]));
            const settingsChanged =
              (Object.keys(saved.params) as (keyof typeof saved.params)[]).some((k) => sc.paramsUsed[k] !== saved.params[k]) ||
              JSON.stringify(CRITERIA.map((c) => usedWeights[c.id])) !== JSON.stringify(CRITERIA.map((c) => saved.weights[c.id]));
            return (
              <>
                {settingsChanged && (
                  <div className="notice">
                    <p>The saved weights or thresholds have changed since this was scored. The result below still uses the values it was scored with. Recomputing applies the saved settings to the model&apos;s existing scores; it does not call the model again.</p>
                    <RecomputeButton id={app.id} />
                  </div>
                )}
                {corrections.length > 0 && (
                  <p className="small muted">
                    Includes {corrections.length} reviewer correction{corrections.length > 1 ? "s" : ""}. The model&apos;s own result before corrections:{" "}
                    {sc.evaluation.lean}, score {sc.evaluation.score === null ? "–" : sc.evaluation.score.toFixed(2)}.
                  </p>
                )}
                <div className={`lean lean-${ev.lean === "Take a call" ? "take" : ev.lean === "Pass" ? "pass" : "research"}`}>
                  <div className="lean-k">Suggested lean</div>
                  <div className="lean-v">{ev.lean}</div>
                  <ul className="small">
                    {ev.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                <div className="params">
                  <div className="param"><div className="v">{ev.score === null ? "–" : ev.score.toFixed(2)}</div><div className="k">Weighted score (0–10, scored criteria only)</div></div>
                  <div className="param"><div className="v">{ev.coverageAdjusted.toFixed(0)}%</div><div className="k">Coverage: share of applicable weight with evidence</div></div>
                  <div className="param"><div className="v">{ev.a2 ?? "–"}</div><div className="k">Owns the central risk</div></div>
                  <div className="param"><div className="v">{sc.d1.flag}</div><div className="k">Portfolio overlap flag</div></div>
                  <div className="param"><div className="v">{sc.d2.value.replace("_", " ")}</div><div className="k">Rule-dependence flag</div></div>
                </div>
                {ev.keyMissing.length > 0 && (
                  <div className="notice">Key criteria not scored: {ev.keyMissing.join(", ")}. A call cannot be suggested until these are resolved.</div>
                )}

                <h3>Business type (changes which criteria count as key)</h3>
                <p className="small muted">
                  Proposed by the model: {sc.businessTypes.reason}
                  {sc.businessTypes.overriddenAt ? " (changed by a reviewer)" : ""}
                </p>
                <BusinessTypes id={app.id} types={sc.businessTypes.types} />

                <h3>Criteria</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Criterion</th><th className="num">Weight</th><th>Status</th><th className="num">Score</th><th>Evidence and reasoning</th><th>Review</th></tr>
                    </thead>
                    <tbody>
                      {CRITERIA.map((c) => {
                        const r = sc.criteria[c.id];
                        const e = eff[c.id];
                        const label = (st: string) => (st === "stated_absence" ? "Stated absence" : st === "na" ? "Not applicable" : st === "unknown" ? "Unknown" : "Scored");
                        return (
                          <tr key={c.id}>
                            <td>{c.id} · {c.name}</td>
                            <td className="num">{c.weight}</td>
                            <td>{label(e.status)}{!e.correction && r.class ? ` · ${r.class}` : ""}</td>
                            <td className="num">
                              {e.score === null ? "–" : e.score}
                              {e.correction && <div className="small muted">model: {r.score === null ? "–" : r.score}</div>}
                            </td>
                            <td>
                              <div>{r.reasoning}</div>
                              {r.evidence.map((e, i) => <div key={i} className="small muted">{e.source}: “{e.quote}”</div>)}
                              {r.status === "unknown" && <div className="small muted">Missing: {r.missing}</div>}
                              {e.correction && (
                                <div className="small corrected">
                                  Corrected by {e.correction.by}: {e.correction.reason}
                                  {e.correction.verification ? ` (verification: ${e.correction.verification})` : ""}
                                </div>
                              )}
                            </td>
                            <td>
                              <CriterionReview
                                id={app.id}
                                criterion={c.id}
                                current={{ status: e.status, score: e.score }}
                                accepted={app.review?.accepted.includes(c.id) ?? false}
                                corrected={!!e.correction}
                                memory={memory ? memory[c.id].map(toView) : []}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <ReviewerName />
                <p className="small muted">Evidence class: S-c stated and consistent · S-u stated but unreconciled or thin · P proxy or inference · X rests on external research.</p>

                <h3>What we could not find, and what it costs ({unknowns.length})</h3>
                {unknowns.length === 0 ? (
                  <p className="muted">Every criterion had some evidence.</p>
                ) : (
                  <ul>
                    {unknowns.map((c) => (
                      <li key={c.id}><strong>{c.name}:</strong> {sc.criteria[c.id].missing} <span className="muted">It stops us judging: {sc.criteria[c.id].cost}</span></li>
                    ))}
                  </ul>
                )}

                {sc.d2.value !== "not_triggered" && (
                  <p><strong>Rule dependence ({sc.d2.value.replace("_", " ")}):</strong> {sc.d2.reason}</p>
                )}
                <h3>Decision</h3>
                <p className="small muted">
                  The decision is the reviewer&apos;s, recorded as theirs. It can differ from the suggestion; a difference is kept as a disagreement so the partners can see how often it happens.
                </p>
                {app.review?.decision && (
                  <div className="notice">
                    Recorded: <strong>{app.review.decision.value}</strong> by {app.review.decision.by}, {new Date(app.review.decision.at).toLocaleString("en-IN")}
                    {app.review.decision.agreedWithSystem ? " (agrees with the system)" : ` (the system suggested: ${app.review.decision.systemLean})`}. {app.review.decision.reason}
                  </div>
                )}
                <DecisionForm id={app.id} systemLean={ev.lean} existing={app.review?.decision} />

                <h3>Invite to a first call</h3>
                <p className="small muted">
                  A drafted invitation, never an automatic one. The model writes it; a reviewer edits, approves and sends each email. No score or assessment is ever put in it, and it promises nothing.
                </p>
                <EmailPanel
                  appId={app.id}
                  mode={sendMode()}
                  canInvite={app.review?.decision?.value === "Take a call"}
                  drafts={(app.emails ?? []).map((d) => ({
                    id: d.id, status: d.status, to: d.to, subject: d.subject, body: d.body,
                    slots: d.slots.map((s) => ({ label: s.label, startIso: s.startIso })), slotSource: d.slotSource, booking: d.booking ? { label: d.booking.label, mode: d.booking.mode, by: d.booking.by, at: d.booking.at } : undefined, attendees: d.attendees, model: d.model,
                    createdAt: d.createdAt, approvedBy: d.approvedBy, approvedAt: d.approvedAt,
                    sentAt: d.sentAt, mode: d.mode, error: d.error,
                  }))}
                />

                <h3>Record of changes ({(app.audit ?? []).length})</h3>
                {(app.audit ?? []).length === 0 ? (
                  <p className="muted small">Nothing recorded yet.</p>
                ) : (
                  <ul className="small audit">
                    {[...(app.audit ?? [])].reverse().map((a, i) => (
                      <li key={i}><span className="muted">{new Date(a.at).toLocaleString("en-IN")}</span> · {a.by} · {a.detail}</li>
                    ))}
                  </ul>
                )}

                {sc.memoryUsed && sc.memoryUsed.length > 0 && (
                  <p className="small muted">
                    This scoring was shown {sc.memoryUsed.length} past reviewer correction(s) as precedent: {sc.memoryUsed.map((m) => `${m.company} (${m.criterion})`).join(", ")}.
                  </p>
                )}
                <p className="small muted">
                  Scored {new Date(sc.scoredAt).toLocaleString("en-IN")} with {sc.model} ({sc.attempts} attempt{sc.attempts > 1 ? "s" : ""}). Thresholds used: take a call at {sc.paramsUsed.takeThreshold}+, pass at {sc.paramsUsed.passThreshold} or below, coverage at least {sc.paramsUsed.coverageMin}%.
                </p>
              </>
            );
          })()}
        </>
      )}
    </>
  );
}
