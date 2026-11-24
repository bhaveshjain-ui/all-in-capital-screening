import Link from "next/link";
import { CRITERIA } from "@/lib/framework/config";
import { overview } from "@/lib/overview";
import { currentValues } from "@/lib/settings";
import { allApplications, savedSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const doc = await savedSettings();
  const v = currentValues(doc);
  const p = v.params;
  const o = overview(await allApplications());

  return (
    <>
      <h1>Overview</h1>
      <p className="muted">
        A first read of each application against the fund&apos;s thesis. The system suggests; Kushal decides every outcome.
      </p>

      <div className="params">
        <Link href="/applications" className="param param-link"><div className="v">{o.total}</div><div className="k">Applications received</div></Link>
        <Link href="/applications" className="param param-link"><div className="v">{o.waitingDecision}</div><div className="k">Waiting for a decision</div></Link>
        <Link href="/emails" className="param param-link"><div className="v">{o.emailsToReview}</div><div className="k">Emails to review</div></Link>
        <Link href="/emails?tab=sent" className="param param-link"><div className="v">{o.invitationsSent}</div><div className="k">Invitations sent</div></Link>
      </div>

      <h2>Needs you next</h2>
      {o.total === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No applications yet. <Link href="/applications">Upload the first one</Link>.</p>
        </div>
      ) : o.next.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Nothing is waiting for you. Every application is decided, or has its invitation booked.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>What to do</th><th className="num">Step</th><th /></tr></thead>
            <tbody>
              {o.next.map((n) => (
                <tr key={n.appId}>
                  <td><strong>{n.company}</strong></td>
                  <td>{n.action}</td>
                  <td className="num muted">{n.stage} of 5</td>
                  <td className="num"><Link className="linkbtn small-btn" href={n.href}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 8 }}>
        The five steps: read the documents, research, score, decide, then invite.
      </p>

      <details className="card scoring-details">
        <summary>How scoring is set up</summary>
        <p className="small muted" style={{ marginTop: 10 }}>
          {doc ? "These values were changed from the starting set; see the history in Settings." : "These are the framework's starting values."} They are provisional until the partners decide.{" "}
          <Link href="/settings">Change them</Link> or <Link href="/evaluation">see how they behave</Link>.
        </p>
        <div className="params">
          <div className="param"><div className="v">{p.takeThreshold.toFixed(1)}</div><div className="k">Take a call: score at or above</div></div>
          <div className="param"><div className="v">{p.passThreshold.toFixed(1)}</div><div className="k">Pass: score at or below</div></div>
          <div className="param"><div className="v">{p.coverageMin}%</div><div className="k">Minimum coverage for either</div></div>
        </div>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead><tr><th>Criterion</th><th className="num">Weight</th></tr></thead>
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c.id}><td>{c.id} · {c.name}</td><td className="num">{v.weights[c.id]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
