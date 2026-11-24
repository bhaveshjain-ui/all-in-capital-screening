"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  consumer: "Consumer brand",
  lending: "Lending or credit",
  deeptech: "Deeptech or hardware",
  network: "Dense network or field operations",
  regdep: "Regulation-dependent",
  other: "Other",
};

export function ScoreButton({ id, scored, ready, why, precedent = 0 }: { id: string; scored: boolean; ready: boolean; why?: string; precedent?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(useMemory = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useMemory }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Scoring failed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div>
      <button onClick={() => run(false)} disabled={busy || !ready}>
        {busy ? "Scoring… (up to a minute)" : scored ? "Score again" : "Run scoring"}
      </button>{" "}
      {scored && precedent > 0 && !busy && (
        <button onClick={() => run(true)} className="secondary" title="Shows the model the corrections reviewers made on similar companies, as precedent">
          Score again using {precedent} past correction{precedent > 1 ? "s" : ""}
        </button>
      )}
      {!ready && why && <p className="small muted">{why}</p>}
      {error && <p className="error pre-line" role="alert">{error}</p>}
    </div>
  );
}

export function BusinessTypes({ id, types }: { id: string; types: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(types);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(t: string) {
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : s.length >= 2 ? [...s.slice(1), t] : [...s, t]));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessTypes: selected }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const changed = selected.slice().sort().join() !== types.slice().sort().join();
  return (
    <div>
      <div className="chips" role="group" aria-label="Business type (choose one or two)">
        {Object.entries(TYPE_LABELS).map(([k, label]) => (
          <button key={k} type="button" className={selected.includes(k) ? "chip on" : "chip"} onClick={() => toggle(k)} aria-pressed={selected.includes(k)}>
            {label}
          </button>
        ))}
      </div>
      <button onClick={save} disabled={busy || !changed || selected.length === 0}>Apply and recompute</button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

export function RecomputeButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/recompute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not recompute.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }
  return (
    <div>
      <button onClick={run} disabled={busy}>{busy ? "Recomputing…" : "Recompute with the saved settings"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
