import { describe, it, expect } from "vitest";
import { countByTab, listEmails, tabOf } from "../lib/emails";
import type { Application, EmailDraft } from "../lib/schemas";

const draft = (id: string, status: EmailDraft["status"], at: string, extra: Partial<EmailDraft> = {}): EmailDraft => ({
  id, status, to: "a@b.in", subject: `Subject ${id}`, body: "Body text for the draft.", slots: [], attendees: ["Kushal"],
  model: "m", createdAt: at, createdBy: "x", ...extra,
});

const app = (name: string, emails: EmailDraft[]): Application =>
  ({ id: `id-${name}`, name, createdAt: "2026-11-24T10:00:00.000Z", files: [], extraction: { status: "not_run" }, recompute: [], conflicts: [], emails }) as unknown as Application;

describe("emails across applications", () => {
  it("files each status under the right tab", () => {
    expect(tabOf("draft")).toBe("awaiting");
    expect(tabOf("approved")).toBe("awaiting");
    expect(tabOf("sent")).toBe("sent");
    expect(tabOf("test_logged")).toBe("sent");
    expect(tabOf("failed")).toBe("failed");
  });
  it("lists drafts from every application, newest activity first", () => {
    const rows = listEmails([
      app("Alpha", [draft("1", "draft", "2026-11-24T10:00:00.000Z"), draft("2", "sent", "2026-11-24T09:00:00.000Z", { sentAt: "2026-11-24T12:00:00.000Z", mode: "live" })]),
      app("Beta", [draft("3", "failed", "2026-11-24T11:00:00.000Z", { error: "refused" })]),
      app("Gamma", []),
    ]);
    expect(rows.map((r) => r.draftId)).toEqual(["2", "3", "1"]);
    expect(rows[0]).toMatchObject({ company: "Alpha", tab: "sent", mode: "live" });
    expect(rows[1]).toMatchObject({ company: "Beta", tab: "failed", error: "refused" });
  });
  it("counts per tab and shows the booking when there is one", () => {
    const rows = listEmails([
      app("Alpha", [
        draft("1", "draft", "2026-11-24T10:00:00.000Z"),
        draft("2", "approved", "2026-11-24T10:05:00.000Z", { approvedAt: "2026-11-24T10:06:00.000Z" }),
        draft("3", "test_logged", "2026-11-24T10:10:00.000Z", { sentAt: "2026-11-24T10:11:00.000Z", booking: { startIso: "x", label: "Tuesday 1 December, 12:00 pm IST", mode: "test", uid: null, by: "k", at: "x" } }),
      ]),
    ]);
    expect(countByTab(rows)).toEqual({ awaiting: 2, sent: 1, failed: 0 });
    expect(rows.find((r) => r.draftId === "3")!.booking).toEqual({ label: "Tuesday 1 December, 12:00 pm IST", mode: "test" });
  });
  it("is empty with no applications", () => {
    expect(listEmails([])).toEqual([]);
    expect(countByTab([])).toEqual({ awaiting: 0, sent: 0, failed: 0 });
  });
});
