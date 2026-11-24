"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", { method: "POST", body: new FormData(e.currentTarget) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      router.push(`/applications/${body.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card form">
      <h2>Add an application</h2>
      <label>
        Company name
        <input name="name" required maxLength={120} placeholder="e.g. GrainKind" />
      </label>
      <label>
        Pitch deck (PDF)
        <input name="deck" type="file" accept="application/pdf" />
      </label>
      <label>
        Application form (PDF)
        <input name="form" type="file" accept="application/pdf" />
      </label>
      <p className="muted small">PDFs up to 4 MB each, with selectable text. Upload the deck, the form, or both.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Reading the PDFs…" : "Upload"}</button>
    </form>
  );
}
