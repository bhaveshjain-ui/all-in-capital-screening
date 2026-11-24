// A flat list of every email draft across all applications, for the Emails page and the sidebar badge.

import type { Application, EmailDraft } from "../schemas";

export type EmailTab = "awaiting" | "sent" | "failed";

export interface EmailRow {
  appId: string;
  company: string;
  draftId: string;
  tab: EmailTab;
  status: EmailDraft["status"];
  to: string;
  subject: string;
  body: string;
  attendees: string[];
  createdAt: string;
  /** The most recent thing that happened to the draft. */
  lastAt: string;
  mode?: "test" | "live";
  error?: string;
  booking?: { label: string; mode: "test" | "live" };
  slotSource?: EmailDraft["slotSource"];
}

/** Drafts and approved drafts are waiting for a person; sent and test-logged ones are done; failed ones need a look. */
export function tabOf(status: EmailDraft["status"]): EmailTab {
  if (status === "sent" || status === "test_logged") return "sent";
  if (status === "failed") return "failed";
  return "awaiting";
}

export function listEmails(apps: Application[]): EmailRow[] {
  const rows: EmailRow[] = [];
  for (const a of apps) {
    for (const d of a.emails ?? []) {
      rows.push({
        appId: a.id, company: a.extraction.result?.company.name || a.name, draftId: d.id,
        tab: tabOf(d.status), status: d.status, to: d.to, subject: d.subject, body: d.body, attendees: d.attendees,
        createdAt: d.createdAt, lastAt: d.sentAt ?? d.approvedAt ?? d.editedAt ?? d.createdAt,
        mode: d.mode, error: d.error, slotSource: d.slotSource,
        booking: d.booking ? { label: d.booking.label, mode: d.booking.mode } : undefined,
      });
    }
  }
  return rows.sort((x, y) => Date.parse(y.lastAt) - Date.parse(x.lastAt));
}

export function countByTab(rows: EmailRow[]): Record<EmailTab, number> {
  const c: Record<EmailTab, number> = { awaiting: 0, sent: 0, failed: 0 };
  for (const r of rows) c[r.tab]++;
  return c;
}
