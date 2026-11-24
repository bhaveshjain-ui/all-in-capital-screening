import Link from "next/link";
import { countByTab, listEmails, type EmailRow, type EmailTab } from "@/lib/emails";
import { allApplications } from "@/lib/store";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const TABS: { key: EmailTab; label: string; empty: string }[] = [
  { key: "awaiting", label: "Awaiting review", empty: "No drafts waiting. An invitation is drafted from an application page, after a reviewer records the outcome \"Take a call\"." },
  { key: "sent", label: "Sent", empty: "Nothing sent yet. In test mode a send is only recorded and shows here as \"test only\"." },
  { key: "failed", label: "Failed", empty: "No failed sends." },
];

function statusPill(r: EmailRow) {
  switch (r.status) {
    case "draft": return <span className="pill pill-test">Draft: not approved</span>;
    case "approved": return <span className="pill pill-good">Approved: ready to send</span>;
    case "sent": return <span className="pill pill-good">Sent</span>;
    case "test_logged": return <span className="pill pill-test">Test only: nothing was sent</span>;
    case "failed": return <span className="pill pill-live">Failed</span>;
  }
}

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const raw = Array.isArray(q.tab) ? q.tab[0] : q.tab;
  const tab: EmailTab = raw === "sent" || raw === "failed" ? raw : "awaiting";

  const rows = listEmails(await allApplications());
  const counts = countByTab(rows);
  const shown = rows.filter((r) => r.tab === tab);
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <h1>Emails</h1>
      <p className="muted">
        Every invitation the model has drafted, across all applications. A reviewer edits, approves and sends each one from its
        application page; nothing is sent automatically, and an invitation exists only after a person records &quot;Take a call&quot;.
      </p>

      <div className="tabs" role="tablist" aria-label="Email status">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "awaiting" ? "/emails" : `/emails?tab=${t.key}`} role="tab" aria-selected={t.key === tab} className={t.key === tab ? "tab on" : "tab"}>
            {t.label} <span className="count">{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>{current.empty}</p></div>
      ) : (
        shown.map((r) => (
          <div className="card email-row" key={`${r.appId}-${r.draftId}`}>
            <div className="email-row-head">
              <div>
                <div className="email-company">{r.company}</div>
                <div className="small muted">
                  To: {r.to || "no recipient yet"} · on the call: {r.attendees.join(" and ")} · {fmtDateTime(r.lastAt)}
                </div>
              </div>
              {statusPill(r)}
            </div>
            <div className="email-subject">{r.subject}</div>
            {r.error && <p className="error small">{r.error}</p>}
            {r.booking && (
              <p className="small">{r.booking.mode === "live" ? "Booked" : "Booking recorded in test mode"}: {r.booking.label}</p>
            )}
            <details>
              <summary className="small">Read the message</summary>
              <pre className="email-body">{r.body}</pre>
            </details>
            <div className="row-actions" style={{ marginTop: 10 }}>
              <Link className="linkbtn small-btn" href={`/applications/${r.appId}#invite`}>
                {r.tab === "awaiting" ? "Open to edit, approve and send" : "Open the application"}
              </Link>
            </div>
          </div>
        ))
      )}
    </>
  );
}
