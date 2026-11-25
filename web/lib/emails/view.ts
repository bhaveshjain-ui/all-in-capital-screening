// What the email controls need to show a draft. Plain data only, so it can cross from server to client components.

import type { EmailDraft } from "../schemas";

export interface DraftView {
  id: string;
  status: "draft" | "approved" | "sent" | "test_logged" | "failed";
  to: string;
  subject: string;
  body: string;
  slots: { label: string; startIso: string }[];
  slotSource?: "cal.com" | "fixed rule";
  personalisation?: { sentence: string; quote: string; source: "deck" | "form" };
  precedentUsed?: { company: string; draftId: string }[];
  booking?: { label: string; mode: "test" | "live"; by: string; at: string };
  attendees: string[];
  model: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  mode?: "test" | "live";
  error?: string;
}

export function toDraftView(d: EmailDraft): DraftView {
  return {
    id: d.id, status: d.status, to: d.to, subject: d.subject, body: d.body,
    slots: d.slots.map((s) => ({ label: s.label, startIso: s.startIso })),
    slotSource: d.slotSource, personalisation: d.personalisation, precedentUsed: d.precedentUsed,
    booking: d.booking ? { label: d.booking.label, mode: d.booking.mode, by: d.booking.by, at: d.booking.at } : undefined,
    attendees: d.attendees, model: d.model, createdAt: d.createdAt,
    approvedBy: d.approvedBy, approvedAt: d.approvedAt, sentAt: d.sentAt, mode: d.mode, error: d.error,
  };
}
