import Link from "next/link";
import { CRITERIA } from "@/lib/framework/config";
import { currentValues } from "@/lib/settings";
import { savedSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const doc = await savedSettings();
  const v = currentValues(doc);
  const total = Object.values(v.weights).reduce((a, b) => a + b, 0);
  const p = v.params;
  return (
    <>
      <h1>Application screening</h1>
      <p className="muted">
        A first read of each inbound application against the fund&apos;s thesis, with the source behind every
        claim and every gap named. It suggests; Kushal decides every outcome.
      </p>

      <div className="notice">
        Trial build. This page shows the weights and thresholds the scoring currently uses{doc ? " (changed from the starting values; see the history)" : " (the framework's starting values)"}. They are provisional until the partners decide. <Link href="/settings">Change them</Link> or <Link href="/evaluation">see how they behave</Link>.
      </div>

      <h2>Provisional thresholds</h2>
      <div className="params">
        <div className="param"><div className="v">{p.takeThreshold.toFixed(1)}</div><div className="k">Take a call: score at or above</div></div>
        <div className="param"><div className="v">{p.passThreshold.toFixed(1)}</div><div className="k">Pass: score at or below</div></div>
        <div className="param"><div className="v">{p.coverageMin}%</div><div className="k">Minimum coverage for either</div></div>
        <div className="param"><div className="v">{p.a2Min}</div><div className="k">Owns-the-risk needed for Take a call</div></div>
        <div className="param"><div className="v">{p.unverifiedCap}</div><div className="k">Highest score without verification</div></div>
      </div>

      <h2>Criteria and weights (total {total})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Criterion</th><th>Block</th><th className="num">Weight</th><th>Why this weight</th></tr>
          </thead>
          <tbody>
            {CRITERIA.map((c) => (
              <tr key={c.id}>
                <td>{c.id} · {c.name}</td>
                <td>{c.block === "founder" ? "Founder" : "Path to market"}</td>
                <td className="num">{v.weights[c.id]}</td>
                <td>{c.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
