import Link from "next/link";
import {
  liveDecisions, runBacktest, runTrial, thresholdGrid, weightSensitivity,
} from "@/lib/evaluation";
import { feedbackLoop, measureAll, STEPS, statusOf } from "@/lib/evals/steps";
import { currentValues, type SettingsValues } from "@/lib/settings";
import { allApplications, savedSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

const num = (v: string | string[] | undefined): number | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const f2 = (n: number | null) => (n === null ? "–" : n.toFixed(2));
const LABEL = { agree: "Agree", soft: "Soft disagreement", hard: "Hard disagreement" } as const;

export default async function EvaluationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const saved = currentValues(await savedSettings());

  const over = { take: num(q.take), pass: num(q.pass), cov: num(q.cov), band: num(q.band), a2: num(q.a2) };
  const whatIf = Object.values(over).some((v) => v !== undefined);
  const v: SettingsValues = {
    ...saved,
    params: {
      ...saved.params,
      takeThreshold: over.take ?? saved.params.takeThreshold,
      passThreshold: over.pass ?? saved.params.passThreshold,
      coverageMin: over.cov ?? saved.params.coverageMin,
      borderlineBand: over.band ?? saved.params.borderlineBand,
      a2Min: over.a2 ?? saved.params.a2Min,
    },
  };

  const back = runBacktest(v);
  const trial = runTrial(v);
  const grid = thresholdGrid(v);
  const flips = weightSensitivity(v);
  const apps = await allApplications();
  const live = liveDecisions(apps);
  const steps = measureAll(apps, v);
  const loop = feedbackLoop(apps);
  const firstGap = steps.map((r, i) => ({ r, d: STEPS[i] })).find(({ r, d }) => statusOf(r, d.target) !== "met");
  const p = v.params;

  return (
    <>
      <h1>Evaluation</h1>
      <p className="muted">
        How the rules behave on the results already produced: the 12 past memos and the two scoring passes on the 10 applications.
        <strong> This applies the current weights and thresholds to scores that were stored on 24 Nov 2026. It does not call the model
        again</strong>, so it shows the effect of the settings, not how good the model is. The partners are meant to agree, in numbers and in
        advance, how much disagreement with their own decisions is acceptable; that number is not set.
      </p>

      <form method="get" className="card whatif">
        <h2>Try other values (not saved)</h2>
        <div className="grid-fields">
          <label>Take a call at or above<input name="take" type="number" step="0.1" defaultValue={over.take ?? ""} placeholder={String(saved.params.takeThreshold)} /></label>
          <label>Pass at or below<input name="pass" type="number" step="0.1" defaultValue={over.pass ?? ""} placeholder={String(saved.params.passThreshold)} /></label>
          <label>Minimum coverage (%)<input name="cov" type="number" step="1" defaultValue={over.cov ?? ""} placeholder={String(saved.params.coverageMin)} /></label>
          <label>Borderline band<input name="band" type="number" step="0.1" defaultValue={over.band ?? ""} placeholder={String(saved.params.borderlineBand)} /></label>
          <label>Owns-the-risk minimum<input name="a2" type="number" step="0.5" defaultValue={over.a2 ?? ""} placeholder={String(saved.params.a2Min)} /></label>
        </div>
        <div className="row-actions">
          <button type="submit">Show</button>
          <Link href="/evaluation" className="linkbtn">Back to the saved settings</Link>
        </div>
      </form>

      <div className={whatIf ? "notice" : "muted small"}>
        {whatIf ? "These are what-if values, not the saved settings. " : "Using the saved settings. "}
        Take a call at {p.takeThreshold}+, pass at {p.passThreshold} or below, coverage at least {p.coverageMin}%, owns-the-risk at least {p.a2Min}, borderline band {p.borderlineBand}.
      </div>

      <h2>The score says something is wrong. Where?</h2>
      <p className="small muted">
        One overall number can only sound an alarm. Each pipeline step has its own eval, so a miss can be traced to the step that caused it.
        Targets come from the course slide and are provisional until the partners set their own. A step shows a number only when it was
        really measured here; otherwise it says what is needed. The example percentages on the slide are not this project&apos;s results.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Pipeline step</th><th>The eval asks</th><th className="num">Score vs target</th><th>Diagnosis</th></tr></thead>
          <tbody>
            {STEPS.map((d, i) => {
              const r = steps[i];
              const st = statusOf(r, d.target);
              return (
                <tr key={d.id}>
                  <td>{d.n}. {d.name}</td>
                  <td>{d.question}</td>
                  <td className="num">
                    {r.measured === null ? "Not measured" : `${r.measured}%`} <span className="muted">(target {d.target}%)</span>
                    <div className="small">{st === "met" ? "Meets target" : st === "below" ? `Below by ${(d.target - r.measured!).toFixed(1)} points` : ""}</div>
                    {r.measured !== null && <div className="small muted">n = {r.n}{r.n < 10 ? ": too few to judge" : ""}</div>}
                  </td>
                  <td className={st === "below" ? "bad" : ""}>
                    <div className="small">{r.basis}</div>
                    {r.extra && <div className="small muted">{r.extra}</div>}
                    {st !== "met" && r.needs && <div className="small"><strong>Needs:</strong> {r.needs}</div>}
                    {st === "below" && <div className="small">Look at the specific misses before changing anything.</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="notice">
        <strong>Diagnostic ladder.</strong> The overall score is the alarm
        ({live.decided ? `reviewers agreed with ${live.agreed} of ${live.decided} suggestions so far` : "no reviewer decision recorded yet"}; on the backtest the suggestion matched the fund in {steps[2].measured}% of cases).
        The reviewers&apos; corrections are the suspect ({steps[3].n} stored). The per-step eval is the exact location
        {firstGap ? `: the first step that is not yet shown to meet its target is step ${firstGap.d.n}, ${firstGap.d.name.toLowerCase()}.` : ": every step meets its target."}
      </div>

      <h2>The feedback loop</h2>
      <p className="small muted">Signal, capture, store, retrieve, apply, act, and back to signal. This is what each stage is in this project, with live counts and the gaps that remain.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Stage</th><th>What it means</th><th>What this project does</th><th className="num">Now</th><th>Gap</th></tr></thead>
          <tbody>
            {loop.map((st) => (
              <tr key={st.key}>
                <td>{st.name}</td>
                <td className="small">{st.slide}</td>
                <td className="small">{st.built}</td>
                <td className="num">{st.count}<div className="small muted">{st.countLabel}</div></td>
                <td className="small">{st.gap ?? "None noted."}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Backtest on the 12 past memos</h2>
      <div className="params">
        <div className="param"><div className="v">{back.tally.agree}</div><div className="k">Agree with the fund&apos;s decision</div></div>
        <div className="param"><div className="v">{back.tally.soft}</div><div className="k">Soft: the system said &quot;research&quot; where the fund decided</div></div>
        <div className="param"><div className="v">{back.tally.hard}</div><div className="k">Hard: the opposite of the fund&apos;s decision</div></div>
        <div className="param"><div className="v">{back.leans["Take a call"]}</div><div className="k">Companies given &quot;Take a call&quot;</div></div>
        <div className="param"><div className="v">{back.investedAbovePassed}/36</div><div className="k">Invested-vs-passed pairs ranked correctly</div></div>
      </div>
      <p className="small muted">Counts, not rates: twelve cases is far too few for a rate. Scores were produced from neutral fact sheets by agents that did not see the decisions; the memo text itself carries hindsight, so the ordering is not proof of skill.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Fund</th><th className="num">Score</th><th className="num">Coverage</th><th>System suggests</th><th>Result</th></tr></thead>
          <tbody>
            {back.rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td><td>{r.fund}</td><td className="num">{f2(r.score)}</td><td className="num">{r.coverage.toFixed(0)}%</td>
                <td>{r.lean}</td><td className={r.agreement === "hard" ? "bad" : ""}>{LABEL[r.agreement]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Stability: the two scoring passes on the 10 applications</h2>
      <div className="params">
        <div className="param"><div className="v">{trial.leanAgreement}/10</div><div className="k">Applications with the same suggestion in both passes</div></div>
        <div className="param"><div className="v">{trial.meanAbsDiff.toFixed(2)}</div><div className="k">Mean difference in score between passes</div></div>
        <div className="param"><div className="v">{trial.spearman.toFixed(2)}</div><div className="k">Rank correlation between passes</div></div>
      </div>
      <p className="small muted">Both passes used the same kind of model, rubric and inputs, so agreement likely overstates how stable two human reviewers would be.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Application</th><th className="num">Pass 1</th><th className="num">Pass 2</th><th>Suggestion, pass 1</th><th>Suggestion, pass 2</th></tr></thead>
          <tbody>
            {trial.rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td><td className="num">{f2(r.score1)}</td><td className="num">{f2(r.score2)}</td>
                <td>{r.lean1}</td><td className={r.lean1 === r.lean2 ? "" : "bad"}>{r.lean2}{r.lean1 === r.lean2 ? "" : " (differs)"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Real decisions recorded in this app</h2>
      <div className="params">
        <div className="param"><div className="v">{live.decided}</div><div className="k">Decisions recorded by reviewers</div></div>
        <div className="param"><div className="v">{live.decided === 0 ? "–" : `${live.agreed}/${live.decided}`}</div><div className="k">Agreed with the suggestion</div></div>
        <div className="param"><div className="v">{live.scored}</div><div className="k">Applications scored</div></div>
      </div>
      {live.rows.length === 0 ? (
        <p className="muted small">No decision has been recorded yet. This is the number the partners will want over time: how often a reviewer agrees with the suggestion.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Application</th><th>Reviewer&apos;s decision</th><th>System suggested</th><th>By</th><th>When</th></tr></thead>
            <tbody>
              {live.rows.map((r, i) => (
                <tr key={i}><td>{r.name}</td><td>{r.decision}</td><td className={r.agreed ? "" : "bad"}>{r.systemLean}{r.agreed ? "" : " (differs)"}</td><td>{r.by}</td><td>{new Date(r.at).toLocaleString("en-IN")}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>How the backtest changes with the thresholds</h2>
      <p className="small muted">Agree / soft / hard disagreements, and companies given &quot;Take a call&quot;, for each pair of thresholds, with everything else as above. Tuning on these twelve cases would overfit, so use this to see sensitivity, not to pick values.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Take a call at or above</th><th>Pass at or below</th><th className="num">Agree</th><th className="num">Soft</th><th className="num">Hard</th><th className="num">&quot;Take a call&quot;</th></tr></thead>
          <tbody>
            {grid.map((c) => (
              <tr key={`${c.take}-${c.pass}`} className={c.take === p.takeThreshold && c.pass === p.passThreshold ? "current-row" : ""}>
                <td>{c.take}</td><td>{c.pass}</td><td className="num">{c.agree}</td><td className="num">{c.soft}</td><td className="num">{c.hard}</td><td className="num">{c.takes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>If one weight moves by a point</h2>
      {flips.length === 0 ? (
        <p>No suggestion changes if any single weight moves up or down by one point (renormalised to 100), on the backtest or either trial pass. The suggestions are not sensitive to small changes in a single weight.</p>
      ) : (
        <>
          <p>{flips.length} suggestion(s) change when a single weight moves by one point:</p>
          <ul className="small">
            {flips.slice(0, 25).map((f, i) => (
              <li key={i}>{f.criterion} {f.delta > 0 ? "+1" : "-1"}: {f.name} ({f.set}) {f.from} → {f.to}</li>
            ))}
          </ul>
        </>
      )}

      <h2>What this cannot show</h2>
      <ul className="small">
        <li>How the real model behaves: no live model run was used. The stored scores came from agents in this project.</li>
        <li>Real-world outcomes: none of the companies&apos; later results are known.</li>
        <li>Deck-and-form reading, contradiction detection and the portfolio check: only the scoring rules are exercised.</li>
        <li>An acceptable level of disagreement: the partners have not set one.</li>
      </ul>
    </>
  );
}
