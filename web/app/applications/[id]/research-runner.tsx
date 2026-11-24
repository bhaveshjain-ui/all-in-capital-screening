"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  questionIds: string[];
  completed: string[];
  planned: boolean;
}

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "The request failed.");
  return json;
}

/** Plans the research, then runs one question per request so each stays inside the function time limit. */
export default function ResearchRunner({ id, questionIds, completed, planned }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;
  const unfinished = planned && completed.length < questionIds.length;

  async function run(fresh: boolean) {
    setError(null);
    try {
      let ids = questionIds;
      let done = completed;
      if (fresh) {
        setProgress("Choosing the questions and checking the portfolio…");
        await post(`/api/applications/${id}/research/plan`);
        const app = await (await fetch(`/api/applications/${id}`)).json();
        ids = app.research.questions.map((q: { id: string }) => q.id);
        done = [];
      }
      for (let i = 0; i < ids.length; i++) {
        if (done.includes(ids[i])) continue;
        setProgress(`Researching question ${i + 1} of ${ids.length}…`);
        await post(`/api/applications/${id}/research/run`, { index: i });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      router.refresh();
    }
  }

  return (
    <div>
      <button onClick={() => run(true)} disabled={busy}>
        {busy ? progress : planned ? "Re-plan and run research again" : "Run research"}
      </button>{" "}
      {unfinished && !busy && (
        <button onClick={() => run(false)} className="secondary">Continue unfinished questions</button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
