import { describe, it, expect } from "vitest";
import { nextStep, overview } from "../lib/overview";
import type { Application, EmailDraft } from "../lib/schemas";

const NOW = "2026-11-24T10:00:00.000Z";

function app(name: string, over: Record<string, unknown> = {}): Application {
  return {
    id: `id-${name}`, name, createdAt: NOW, files: [],
    extraction: { status: "done", model: "m", extractedAt: NOW, result: { company: { name, founders: [] }, claims: [], figures: { products: [], sums: [], quotients: [], paybacks: [] } } },
    recompute: [], conflicts: [],
    ...over,
  } as unknown as Application;
}
const research = { status: "done" };
const scoring = { evaluation: { lean: "Further research required" } };
const decision = (value: string) => ({ review: { corrections: [], accepted: [], decision: { value, reason: "r", by: "k", at: NOW, systemLean: "x", agreedWithSystem: false } } });
const draft = (status: EmailDraft["status"], extra: Partial<EmailDraft> = {}) => ({ id: "d", status, to: "", subject: "s", body: "b", slots: [], attendees: [], model: "m", createdAt: NOW, createdBy: "x", ...extra });

describe("what each application needs next", () => {
  it("walks the five steps in order", () => {
    expect(nextStep(app("A", { extraction: { status: "not_run" } }))).toMatchObject({ stage: 1, href: "/applications/id-A" });
    expect(nextStep(app("B"))).toMatchObject({ stage: 2, action: "Run the research" });
    expect(nextStep(app("C", { research }))).toMatchObject({ stage: 3, action: "Run the scoring" });
    expect(nextStep(app("D", { research, scoring }))).toMatchObject({ stage: 4, href: "/applications/id-D#review" });
  });
  it("needs nothing more after a Pass or Further research decision", () => {
    expect(nextStep(app("E", { research, scoring, ...decision("Pass") }))).toBeNull();
    expect(nextStep(app("F", { research, scoring, ...decision("Further research required") }))).toBeNull();
  });
  it("follows a Take a call through the invitation to booking", () => {
    const base = { research, scoring, ...decision("Take a call") };
    expect(nextStep(app("G", base))).toMatchObject({ stage: 5, action: "Draft the invitation", href: "/applications/id-G#invite" });
    expect(nextStep(app("H", { ...base, emails: [draft("draft")] }))).toMatchObject({ action: "Review and send the invitation", href: "/emails" });
    expect(nextStep(app("I", { ...base, emails: [draft("failed")] }))).toMatchObject({ href: "/emails" });
    expect(nextStep(app("J", { ...base, emails: [draft("test_logged")] }))).toMatchObject({ action: "Book a time once they reply", href: "/emails?tab=sent" });
    const booking = { startIso: "x", label: "l", mode: "test", uid: null, by: "k", at: NOW };
    expect(nextStep(app("K", { ...base, emails: [draft("sent", { booking } as Partial<EmailDraft>)] }))).toBeNull();
  });
  it("uses the company's own name when the extraction found one", () => {
    expect(nextStep(app("raw-upload-name", { extraction: { status: "done", result: { company: { name: "GrainKind", founders: [] }, claims: [], figures: {} } } }))!.company).toBe("GrainKind");
  });
});

describe("the dashboard numbers", () => {
  it("counts applications, decisions waiting, emails to review and invitations sent", () => {
    const o = overview([
      app("A", { research, scoring }),
      app("B", { research, scoring, ...decision("Take a call"), emails: [draft("draft"), draft("approved"), draft("test_logged")] }),
      app("C", { research, scoring, ...decision("Pass") }),
      app("D"),
    ]);
    expect(o).toMatchObject({ total: 4, waitingDecision: 1, emailsToReview: 2, invitationsSent: 1 });
  });
  it("lists the furthest-along applications first, and leaves out the finished ones", () => {
    const o = overview([app("Early"), app("Late", { research, scoring, ...decision("Take a call") }), app("Done", { research, scoring, ...decision("Pass") })]);
    expect(o.next.map((n) => n.company)).toEqual(["Late", "Early"]);
  });
  it("is all zeros with nothing uploaded", () => {
    expect(overview([])).toEqual({ total: 0, waitingDecision: 0, emailsToReview: 0, invitationsSent: 0, next: [] });
  });
});
