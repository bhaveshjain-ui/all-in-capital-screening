"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

interface Current {
  status: "scored" | "stated_absence" | "unknown" | "na";
  score: number | null;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "The request failed.");
}

/**
 * Reviewer name is typed, not logged in: there is no login, so it is self-declared. One shared value so the
 * name typed at the top reaches every correction form and the decision form straight away.
 */
let current: string | null = null;
const listeners = new Set<() => void>();
function readName(): string {
  if (current === null) {
    try { current = localStorage.getItem("reviewerName") ?? ""; } catch { current = ""; }
  }
  return current;
}
function writeName(v: string) {
  current = v;
  try { localStorage.setItem("reviewerName", v); } catch { /* storage can be unavailable */ }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function useReviewerName() {
  const name = useSyncExternalStore(subscribe, readName, () => "");
  return [name, writeName] as const;
}

export function ReviewerName() {
  const [name, setName] = useReviewerName();
  return (
    <label className="inline-field">
      Your name (recorded with your changes; no login)
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Riya" />
    </label>
  );
}

export interface MemoryItem { company: string; by: string; at: string; original: string; corrected: string; reason: string; reasons: string[] }

export function CriterionReview({
  id, criterion, current, accepted, corrected, memory = [],
}: { id: string; criterion: string; current: Current; accepted: boolean; corrected: boolean; memory?: MemoryItem[] }) {
  const router = useRouter();
  const [by] = useReviewerName();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Current["status"]>(current.status);
  const [score, setScore] = useState<string>(current.score === null ? "" : String(current.score));
  const [reason, setReason] = useState("");
  const [verification, setVerification] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsScore = status === "scored" || status === "stated_absence";
  const numeric = score === "" ? null : Number(score);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const accept = () => run(() => post(`/api/applications/${id}/review/accept`, { criteria: [criterion], by }));
  const correct = () =>
    run(() =>
      post(`/api/applications/${id}/review/correct`, {
        criterion, status, score: needsScore ? numeric : null, reason, by,
        verification: verification || undefined,
      }),
    );

  return (
    <div>
      {accepted && !corrected && <div className="small muted">Accepted</div>}
      {memory.length > 0 && (
        <details className="memory">
          <summary>{memory.length} past correction{memory.length > 1 ? "s" : ""} on similar companies</summary>
          <p className="small muted">Precedent, not a rule: the evidence in this application decides.</p>
          {memory.map((m, i) => (
            <div key={i} className="memory-item small">
              <strong>{m.company}</strong>: {m.original} → {m.corrected} ({m.by}, {new Date(m.at).toLocaleDateString("en-IN")})
              <div>{m.reason}</div>
              <div className="muted">Similar because: {m.reasons.join("; ")}</div>
            </div>
          ))}
        </details>
      )}
      {!open ? (
        <div className="row-actions">
          <button type="button" className="secondary small-btn" onClick={accept} disabled={busy || accepted}>Accept</button>
          <button type="button" className="secondary small-btn" onClick={() => setOpen(true)} disabled={busy}>Correct</button>
        </div>
      ) : (
        <div className="correct-form">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Current["status"])}>
              <option value="scored">Scored</option>
              <option value="stated_absence">Stated absence (applicant says they lack it)</option>
              <option value="unknown">Unknown (not scored)</option>
              <option value="na">Not applicable</option>
            </select>
          </label>
          {needsScore && (
            <label>
              Score (0–10)
              <input type="number" min={0} max={10} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} />
            </label>
          )}
          {needsScore && numeric !== null && numeric > 8 && (
            <label>
              How was this independently verified?
              <input value={verification} onChange={(e) => setVerification(e.target.value)} maxLength={240} />
            </label>
          )}
          <label>
            Why, in one line (shown on similar companies later)
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} placeholder="e.g. cohort sheet in the form shows repeat is 38%" />
          </label>
          {error && <p className="error small" role="alert">{error}</p>}
          <div className="row-actions">
            <button type="button" className="small-btn" onClick={correct} disabled={busy}>Save correction</button>
            <button type="button" className="secondary small-btn" onClick={() => { setOpen(false); setError(null); }} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}
      {!open && error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}

export function DecisionForm({ id, systemLean, existing }: { id: string; systemLean: string; existing?: { value: string; by: string; reason: string } }) {
  const router = useRouter();
  const [by] = useReviewerName();
  const [value, setValue] = useState(existing?.value ?? systemLean);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/applications/${id}/review/decision`, { value, reason, by });
      setReason("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form">
      <label>
        Outcome
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          <option>Take a call</option>
          <option>Further research required</option>
          <option>Pass</option>
        </select>
      </label>
      {value !== systemLean && <p className="small muted">This differs from the system&apos;s suggestion ({systemLean}). That is allowed; it is recorded as a disagreement.</p>}
      <label>
        Why
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={400} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" onClick={save} disabled={busy}>{existing ? "Update the recorded decision" : "Record decision"}</button>
    </div>
  );
}
