"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Crit { id: string; name: string; why: string }
interface Values {
  params: { takeThreshold: number; passThreshold: number; coverageMin: number; a2Min: number; borderlineBand: number; unverifiedCap: number; statedAbsenceCapA3: number };
  weights: Record<string, number>;
}

const PARAM_FIELDS: { key: keyof Values["params"]; label: string; hint: string; step: number }[] = [
  { key: "takeThreshold", label: "Take a call: score at or above", hint: "0 to 10. Must be higher than the pass threshold.", step: 0.1 },
  { key: "passThreshold", label: "Pass: score at or below", hint: "0 to 10.", step: 0.1 },
  { key: "coverageMin", label: "Minimum coverage (%)", hint: "Share of applicable weight that must have evidence before a Pass or Take a call.", step: 1 },
  { key: "a2Min", label: "Owns the central risk: minimum for Take a call", hint: "0 to 10.", step: 0.5 },
  { key: "borderlineBand", label: "Borderline band", hint: "Scores within this distance of a threshold go to research. 0 switches it off.", step: 0.1 },
  { key: "unverifiedCap", label: "Highest score without verification", hint: "0 to 10.", step: 0.5 },
  { key: "statedAbsenceCapA3", label: "Highest A3 score when a key metric is stated as absent", hint: "Cannot exceed the cap above.", step: 0.5 },
];

export default function SettingsForm({ criteria, current, defaults }: { criteria: Crit[]; current: Values; defaults: Values }) {
  const router = useRouter();
  const [params, setParams] = useState(current.params);
  const [weights, setWeights] = useState(current.weights);
  const [reason, setReason] = useState("");
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const changed = JSON.stringify({ params, weights }) !== JSON.stringify(current);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params, weights, reason, by }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save.");
      setReason("");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form" style={{ maxWidth: 820 }}>
      <h2>Thresholds</h2>
      <div className="grid-fields">
        {PARAM_FIELDS.map((f) => (
          <label key={f.key}>
            {f.label}
            <input type="number" step={f.step} value={params[f.key]} onChange={(e) => setParams({ ...params, [f.key]: Number(e.target.value) })} />
            <span className="small muted">{f.hint}</span>
          </label>
        ))}
      </div>

      <h2>Weights <span className={total === 100 ? "muted" : "bad-text"}>(total {total}, must be 100)</span></h2>
      <div className="grid-fields">
        {criteria.map((c) => (
          <label key={c.id}>
            {c.id} · {c.name}
            <input type="number" min={0} max={100} step={1} value={weights[c.id]} onChange={(e) => setWeights({ ...weights, [c.id]: Math.round(Number(e.target.value)) })} />
            <span className="small muted">{c.why}</span>
          </label>
        ))}
      </div>

      <button type="button" className="secondary" onClick={() => { setParams(defaults.params); setWeights(defaults.weights); }}>
        Fill in the framework&apos;s starting values
      </button>

      <h2>Record the change</h2>
      <label>
        Why, in a sentence (kept in the history)
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} placeholder="e.g. partners agreed 6.5 is the right bar after reviewing the trial" />
      </label>
      <label>
        Your name (no login; self-declared)
        <input value={by} onChange={(e) => setBy(e.target.value)} maxLength={60} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="small">Saved. New scoring runs use these values. Existing results keep theirs until you recompute them on the application page.</p>}
      <button type="button" onClick={save} disabled={busy || !changed || total !== 100 || reason.trim().length < 10}>
        {busy ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
