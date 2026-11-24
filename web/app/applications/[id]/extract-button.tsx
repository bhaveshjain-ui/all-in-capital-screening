"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExtractButton({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/extract`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Extraction failed.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={busy}>{busy ? "Extracting… (up to a minute)" : done ? "Run extraction again" : "Extract claims"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
