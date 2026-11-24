"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReviewerName } from "./review-controls";
import { fmtDateTime } from "@/lib/time";
import type { ContactResult } from "@/lib/schemas";

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "The request failed.");
}

const VERIFY: Record<string, string> = { valid: "Verified", accept_all: "Domain accepts all mail", webmail: "Webmail", invalid: "Invalid", unknown: "Not verified" };

/** The point of contact found on Hunter, with a button to look it up and a choice when there are several. */
export default function ContactPanel({ appId, contact, canSearch }: { appId: string; contact?: ContactResult; canSearch: boolean }) {
  const router = useRouter();
  const [by] = useReviewerName();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const search = () => run(() => call(`/api/applications/${appId}/contact`, "POST", { by }));
  const choose = (email: string) => run(() => call(`/api/applications/${appId}/contact`, "PATCH", { by, email }));

  return (
    <div className="card contact-card">
      <div className="contact-head">
        <h3 style={{ margin: 0 }}>Point of contact</h3>
        <button type="button" className="secondary small-btn" onClick={search} disabled={busy || !canSearch}
          title={canSearch ? "Uses one Hunter search" : "Read the documents first"}>
          {busy ? "Searching…" : contact ? "Search again" : "Find the contact"}
        </button>
      </div>

      {!contact && <p className="small muted" style={{ margin: "8px 0 0" }}>Finds the founder&apos;s email address on Hunter.io from the company website. Each search uses one Hunter credit.</p>}
      {contact?.status !== "found" && contact && <p className="small" style={{ margin: "8px 0 0" }}>{contact.note}</p>}

      {contact?.status === "found" && (
        <div className="contact-list">
          {contact.candidates.map((c) => {
            const chosen = c.email === contact.chosenEmail;
            return (
              <div key={c.email} className={chosen ? "contact-row chosen" : "contact-row"}>
                <div>
                  <div className="contact-name">{c.name}{c.position ? <span className="muted"> · {c.position}</span> : null}</div>
                  <div className="contact-email">{c.email}</div>
                  <div className="small muted">{VERIFY[c.verification] ?? "Not verified"} · confidence {c.confidence}%</div>
                </div>
                {chosen ? <span className="pill pill-good">Selected</span> : (
                  <button type="button" className="secondary small-btn" onClick={() => choose(c.email)} disabled={busy}>Use this</button>
                )}
              </div>
            );
          })}
          {!contact.chosenEmail && <p className="small muted" style={{ margin: 0 }}>No address is selected yet. Pick one, or type the address yourself in the email.</p>}
        </div>
      )}

      {contact && <p className="small muted" style={{ margin: "10px 0 0" }}>Searched {fmtDateTime(contact.checkedAt)}{contact.domain ? ` · ${contact.domain}` : ""} · Hunter.io</p>}
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
