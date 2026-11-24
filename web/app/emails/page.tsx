import Link from "next/link";
import { DraftCard } from "../applications/[id]/email-panel";
import { ReviewerName } from "../applications/[id]/review-controls";
import { sendMode } from "@/lib/email/send";
import { countByTab, listEmails, type EmailTab } from "@/lib/emails";
import { toDraftView } from "@/lib/emails/view";
import { allApplications } from "@/lib/store";

export const dynamic = "force-dynamic";

const TABS: { key: EmailTab; label: string; empty: string }[] = [
  { key: "awaiting", label: "Awaiting review", empty: "No drafts waiting. An invitation is drafted from an application page, after a reviewer records the outcome \"Take a call\"." },
  { key: "sent", label: "Sent", empty: "Nothing sent yet. In test mode a send is only recorded and shows here as \"test only\"." },
  { key: "failed", label: "Failed", empty: "No failed sends." },
];

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const raw = Array.isArray(q.tab) ? q.tab[0] : q.tab;
  const tab: EmailTab = raw === "sent" || raw === "failed" ? raw : "awaiting";

  const mode = sendMode();
  const sharedSender = /@resend\.dev\b/i.test(process.env.RESEND_FROM_EMAIL ?? "");
  const rows = listEmails(await allApplications());
  const counts = countByTab(rows);
  const shown = rows.filter((r) => r.tab === tab);
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <h1>Emails</h1>
      <p className="muted">
        Every invitation the model has drafted, across all applications. Edit, approve and send each one here, and book the
        time an applicant picks once it has gone out. Nothing is sent automatically, and an invitation exists only after a
        person records &quot;Take a call&quot;.
      </p>

      {mode === "live" ? (
        <div className="notice warn-strong">Live mode: approved emails are really sent through Resend.</div>
      ) : (
        <div className="notice">Test mode: no email will leave the system. Sending only records what would have been sent.</div>
      )}
      {mode === "live" && sharedSender && (
        <div className="notice">
          The sending address is Resend&apos;s shared test sender. It can only deliver to the email address of the Resend account itself, so an invitation to an applicant will be refused and shown as failed. To email applicants, verify a domain in Resend and set <code>RESEND_FROM_EMAIL</code> to an address on it.
        </div>
      )}
      {shown.length > 0 && <ReviewerName />}

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
          <section key={`${r.appId}-${r.draftId}`} className="email-block">
            <div className="email-row-head">
              <div className="email-company">{r.company}</div>
              <Link className="linkbtn small-btn" href={`/applications/${r.appId}?tab=email`}>Open the application</Link>
            </div>
            <DraftCard key={`${r.draftId}-${r.status}-${r.to}-${r.subject.length}-${r.body.length}-${r.booking ? 1 : 0}`} appId={r.appId} d={toDraftView(r.draft)} mode={mode} />
          </section>
        ))
      )}
    </>
  );
}
