"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReviewerName } from "./review-controls";
import { fmtDateTime } from "@/lib/time";

import type { DraftView } from "@/lib/emails/view";

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

export function DraftCard({ appId, d, mode }: { appId: string; d: DraftView; mode: "test" | "live" }) {
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
  const book = (startIso: string) => run(() => call(`/api/applications/${appId}/email/${d.id}/book`, "POST", { by, startIso }));

  return (
    <div className="card form email-card">
      <div className="small muted">
        {STATUS[d.status]} · drafted {fmtDateTime(d.createdAt)} with {d.model} · on the call: {d.attendees.join(" and ")}
      </div>
      <label>
        To (one address; type the applicant&apos;s email, none was given)
        <input value={to} onChange={(e) => setTo(e.target.value)} disabled={frozen} maxLength={254} placeholder="founder@company.in" />
      </label>
      <label>
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={frozen} maxLength={150} />
      </label>
      <label>
        Message (plain text)
        <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={frozen} rows={12} maxLength={4000} />
      </label>
      <p className="small muted">
        Slots offered: {d.slots.map((s) => s.label).join("; ")}.{" "}
        {d.slotSource === "cal.com"
          ? "These were free on Cal.com when the invitation was drafted (Tuesday or Thursday afternoons). Check them again if some time has passed."
          : "These come from the fixed Tuesday/Thursday afternoon rule and do not check anyone's calendar: confirm availability before sending."}
      </p>
      {d.personalisation && (
        <p className="small muted">
          Specific to this company: &ldquo;{d.personalisation.sentence}&rdquo; Based on the applicant&apos;s {d.personalisation.source}: &ldquo;{d.personalisation.quote}&rdquo; (checked against the document). Edit it if it is not right.
        </p>
      )}
      {d.status === "approved" && <p className="small">Approved by {d.approvedBy} at {fmtDateTime(d.approvedAt!)}. Editing the text cancels the approval.</p>}
      {frozen && <p className="small">{d.status === "sent" ? "Sent" : "Recorded in test mode"} at {fmtDateTime(d.sentAt!)}.</p>}
      {d.status === "failed" && <p className="error small" role="alert">The last send failed: {d.error}</p>}
      {frozen && !d.booking && (
        <div>
          <p className="small">When the applicant replies with a time, book it here. {mode === "live" ? "This creates a Cal.com booking and Cal.com emails the applicant a calendar invite." : "Test mode: nothing is booked; it only records the choice."}</p>
          <div className="row-actions">
            {d.slots.map((s) => (
              <button key={s.startIso} type="button" className="secondary" disabled={busy} onClick={() => { if (mode === "test" || window.confirm(`Book ${s.label} and email the applicant a calendar invite?`)) book(s.startIso); }}>
                Book {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {d.booking && <p className="small">{d.booking.mode === "live" ? "Booked" : "Recorded in test mode (no calendar entry)"}: {d.booking.label}, by {d.booking.by} at {fmtDateTime(d.booking.at)}.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!frozen && (
        <div className="row-actions">
          <button type="button" className="secondary" onClick={save} disabled={busy || !dirty}>Save changes</button>
          <button type="button" onClick={approve} disabled={busy || dirty || d.status === "approved" || !d.to}>Approve</button>
          <button type="button" onClick={send} disabled={busy || dirty || !(d.status === "approved" || d.status === "failed")}>
            {mode === "live" ? "Send email" : "Send (test mode: nothing is sent)"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function EmailPanel({ appId, mode, drafts, canInvite, sharedSender = false }: { appId: string; mode: "test" | "live"; drafts: DraftView[]; canInvite: boolean; sharedSender?: boolean }) {
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
      {mode === "test" ? (
        <div className="notice">Test mode: no email will leave the system. Sending only records what would have been sent. Live sending needs <code>SEND_MODE=live</code>, a Resend key and a verified from-address.</div>
      ) : (
        <div className="notice warn-strong">Live mode: approved emails are really sent through Resend.</div>
      )}
      {mode === "live" && sharedSender && (
        <div className="notice">
          The sending address is Resend&apos;s shared test sender. It can only deliver to the email address of the Resend account itself, so an invitation to an applicant will be refused and shown as failed. To email applicants, verify a domain in Resend and set <code>RESEND_FROM_EMAIL</code> to an address on it.
        </div>
      )}
      {!canInvite ? (
        <p className="muted">Available once a reviewer records the outcome &quot;Take a call&quot;. An invitation is never drafted or sent for any other outcome.</p>
      ) : (
        <>
          <button onClick={draft} disabled={busy}>{busy ? "Drafting…" : drafts.length ? "Draft another invitation" : "Draft an invitation"}</button>
          {error && <p className="error pre-line" role="alert">{error}</p>}
        </>
      )}
      {drafts.map((d) => <DraftCard key={`${d.id}-${d.status}-${d.to}-${d.subject.length}-${d.body.length}`} appId={appId} d={d} mode={mode} />)}
    </div>
  );
}
