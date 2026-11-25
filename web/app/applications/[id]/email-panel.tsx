"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReviewerName } from "./review-controls";
import { fmtDateTime } from "@/lib/time";

import type { DraftView } from "@/lib/emails/view";
import { gmailComposeUrl } from "@/lib/email/compose";

export type { DraftView };

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "The request failed.");
}

const STATUS: Record<DraftView["status"], string> = {
  draft: "Draft: not approved",
  approved: "Approved: ready to send",
  sent: "Sent",
  test_logged: "Test mode: nothing was sent",
  failed: "Sending failed",
};

export function DraftCard({ appId, d, mode, compose = false, gmailAccount }: { appId: string; d: DraftView; mode: "test" | "live"; compose?: boolean; gmailAccount?: string }) {
  const router = useRouter();
  const [by] = useReviewerName();
  const [to, setTo] = useState(d.to);
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(d.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frozen = d.status === "sent" || d.status === "test_logged";
  const dirty = to !== d.to || subject !== d.subject || body !== d.body;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const save = () => run(() => call(`/api/applications/${appId}/email/${d.id}`, "PATCH", { to, subject, body, by }));
  const approve = () => run(() => call(`/api/applications/${appId}/email/${d.id}/approve`, "POST", { by }));
  const send = () => run(() => call(`/api/applications/${appId}/email/${d.id}/send`, "POST", { by }));
  const markSent = () => run(() => call(`/api/applications/${appId}/email/${d.id}/mark-sent`, "POST", { by }));
  const book = (startIso: string) => run(() => call(`/api/applications/${appId}/email/${d.id}/book`, "POST", { by, startIso }));

  const statusLine = `${STATUS[d.status]}${d.sentAt ? ` · ${fmtDateTime(d.sentAt)}` : ""}`;

  return (
    <div className="card form email-card">
      <div className="small muted">{statusLine} · On the call: {d.attendees.join(" and ")}</div>
      <label>
        To
        <input value={to} onChange={(e) => setTo(e.target.value)} disabled={frozen} maxLength={254} placeholder="founder@company.in" />
      </label>
      <label>
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={frozen} maxLength={150} />
      </label>
      <label>
        Message
        <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={frozen} rows={12} maxLength={4000} />
      </label>
      {(d.personalisation || (d.precedentUsed && d.precedentUsed.length > 0)) && (
        <details className="small">
          <summary>Why this wording</summary>
          {d.personalisation && (
            <p className="muted" style={{ margin: "6px 0 0" }}>
              The line &ldquo;{d.personalisation.sentence}&rdquo; is based on the applicant&apos;s {d.personalisation.source}: &ldquo;{d.personalisation.quote}&rdquo;
            </p>
          )}
          {d.precedentUsed && d.precedentUsed.length > 0 && (
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Wording shaped by how reviewers rewrote earlier invitations ({d.precedentUsed.map((x) => x.company).join(", ")}).
            </p>
          )}
        </details>
      )}
      {d.status === "failed" && <p className="error small" role="alert">The last send failed: {d.error}</p>}
      {frozen && !d.booking && (
        <div>
          <p className="small" style={{ marginBottom: 8 }}>Applicant replied with a time? Book it:</p>
          <div className="row-actions">
            {d.slots.map((s) => (
              <button key={s.startIso} type="button" className="secondary small-btn" disabled={busy} onClick={() => { if (mode === "test" || window.confirm(`Book ${s.label} and email the applicant a calendar invite?`)) book(s.startIso); }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {d.booking && <p className="small">Booked: {d.booking.label}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!frozen && (
        <div className="row-actions">
          <button type="button" className="secondary" onClick={save} disabled={busy || !dirty}>Save</button>
          <button type="button" onClick={approve} disabled={busy || dirty || d.status === "approved" || !d.to}>Approve</button>
          {compose ? (
            <>
              <a className={d.status === "approved" && !dirty ? "linkbtn" : "linkbtn disabled"} href={d.status === "approved" && !dirty ? gmailComposeUrl(gmailAccount, d) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!(d.status === "approved" && !dirty)}>
                Open in Gmail
              </a>
              <button type="button" onClick={markSent} disabled={busy || dirty || d.status !== "approved"}>I sent it</button>
            </>
          ) : (
            <button type="button" onClick={send} disabled={busy || dirty || !(d.status === "approved" || d.status === "failed")}>Send</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmailPanel({ appId, mode, drafts, canInvite, compose = false, gmailAccount }: { appId: string; mode: "test" | "live"; drafts: DraftView[]; canInvite: boolean; compose?: boolean; gmailAccount?: string }) {
  const router = useRouter();
  const [by] = useReviewerName();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setBusy(true);
    setError(null);
    try {
      await call(`/api/applications/${appId}/email/draft`, "POST", { by });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div>
      {!canInvite ? (
        <p className="muted">Record the outcome &quot;Take a call&quot; to draft an invitation.</p>
      ) : (
        <>
          <button onClick={draft} disabled={busy}>{busy ? "Drafting…" : drafts.length ? "Draft another invitation" : "Draft an invitation"}</button>
          {error && <p className="error pre-line" role="alert">{error}</p>}
        </>
      )}
      {drafts.map((d) => <DraftCard key={`${d.id}-${d.status}-${d.to}-${d.subject.length}-${d.body.length}`} appId={appId} d={d} mode={mode} compose={compose} gmailAccount={gmailAccount} />)}
    </div>
  );
}
