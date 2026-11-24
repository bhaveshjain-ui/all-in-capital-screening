import { describe, it, expect } from "vitest";
import { domainFromApplication, findContact, founderMatch, hunterKey, HunterError, rank } from "../lib/contacts/hunter";
import { MissingConfigError } from "../lib/llm";
import type { Application, ContactCandidate } from "../lib/schemas";

function app(formText: string, deckText = "", founders: { name: string; role?: string }[] = [{ name: "Ritu Hegde", role: "CEO" }, { name: "Sanjay Kulkarni" }]): Application {
  return {
    id: "a1", name: "GrainKind", createdAt: "2026-11-24T10:00:00.000Z",
    files: [{ kind: "form", filename: "f.pdf", pages: 1, text: formText }, { kind: "deck", filename: "d.pdf", pages: 1, text: deckText }],
    extraction: { status: "done", model: "m", extractedAt: "x", result: { company: { name: "GrainKind", founders }, claims: [], figures: {} } },
    recompute: [], conflicts: [],
  } as unknown as Application;
}

const cand = (over: Partial<ContactCandidate>): ContactCandidate => ({ email: "x@y.com", name: "A B", confidence: 50, verification: "unknown", via: "domain-search", ...over });

/** A fake Hunter that records every call, so tests can count credits. */
function fakeHunter(responses: Record<string, { status?: number; body: unknown }>) {
  const calls: string[] = [];
  const f = (async (url: string, init: { headers: Record<string, string> }) => {
    calls.push(url);
    expect(init.headers["X-API-KEY"]).toBe("k");
    expect(url).not.toContain("api_key");
    const path = new URL(url).pathname.split("/").pop()!;
    const r = responses[path] ?? { status: 404, body: { errors: [{ details: "nothing" }] } };
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, json: async () => r.body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("the company website from the application", () => {
  it("takes the website from the form first, then the deck, and strips www and paths", () => {
    expect(domainFromApplication(app("Website: https://www.grainkind.in/about", "www.other.com"))).toMatchObject({ domain: "grainkind.in", from: "form", placeholder: false });
    expect(domainFromApplication(app("no site here", "See www.pumpwise.com."))).toMatchObject({ domain: "pumpwise.com", from: "deck" });
  });
  it("skips social and sharing links", () => {
    expect(domainFromApplication(app("https://linkedin.com/company/x www.real.co.in"))?.domain).toBe("real.co.in");
    expect(domainFromApplication(app("https://docs.google.com/d/1 and https://calendly.com/x"))).toBeNull();
  });
  it("flags placeholder websites, which can never have real mail", () => {
    expect(domainFromApplication(app("www.grainkind.example"))).toMatchObject({ domain: "grainkind.example", placeholder: true });
  });
  it("finds nothing when there is no website", () => {
    expect(domainFromApplication(app("Revenue grew 3.5x in Q2, margin 48%"))).toBeNull();
  });
});

describe("ranking what Hunter returns", () => {
  const founders = [{ name: "Ritu Hegde" }];
  it("puts a founder named in the application first, then seniority, then confidence", () => {
    const ritu = cand({ email: "ritu@g.in", name: "Ritu Hegde", confidence: 60 });
    const ceo = cand({ email: "ceo@g.in", name: "Someone Else", position: "Chief Executive Officer", confidence: 95 });
    const eng = cand({ email: "eng@g.in", name: "An Engineer", position: "Engineer", confidence: 99 });
    expect([eng, ceo, ritu].sort((a, b) => rank(b, founders) - rank(a, founders)).map((c) => c.email)).toEqual(["ritu@g.in", "ceo@g.in", "eng@g.in"]);
  });
  it("matches a founder by all name parts, ignoring case and punctuation", () => {
    expect(founderMatch(cand({ name: "ritu HEGDE" }), founders)).toBe(true);
    expect(founderMatch(cand({ name: "Ritu Sharma" }), founders)).toBe(false);
  });
});

describe("looking the contact up", () => {
  it("makes no Hunter call for a placeholder website or a missing one", async () => {
    const h = fakeHunter({});
    expect(await findContact(app("www.grainkind.example"), "k", h.f)).toMatchObject({ status: "no_domain", domain: "grainkind.example" });
    expect(await findContact(app("nothing"), "k", h.f)).toMatchObject({ status: "no_domain" });
    expect(h.calls).toHaveLength(0);
  });
  it("uses one search when the domain search already names a founder, and pre-selects that founder", async () => {
    const h = fakeHunter({
      "domain-search": { body: { data: { emails: [
        { value: "info@grainkind.in", confidence: 90, position: null, verification: { status: "valid" } },
        { value: "ritu@grainkind.in", first_name: "Ritu", last_name: "Hegde", position: "CEO", confidence: 80, verification: { status: "valid" } },
      ] } } },
    });
    const r = await findContact(app("www.grainkind.in"), "k", h.f);
    expect(h.calls).toHaveLength(1);
    expect(r.status).toBe("found");
    expect(r.chosenEmail).toBe("ritu@grainkind.in");
    expect(r.candidates[0]).toMatchObject({ email: "ritu@grainkind.in", name: "Ritu Hegde", verification: "valid", via: "domain-search" });
  });
  it("asks for the first founder specifically when the domain search does not name one", async () => {
    const h = fakeHunter({
      "domain-search": { body: { data: { emails: [{ value: "info@grainkind.in", confidence: 40 }] } } },
      "email-finder": { body: { data: { email: "ritu@grainkind.in", score: 88, position: "CEO", verification: { status: "valid" } } } },
    });
    const r = await findContact(app("www.grainkind.in"), "k", h.f);
    expect(h.calls.map((u) => new URL(u).pathname.split("/").pop())).toEqual(["domain-search", "email-finder"]);
    expect(new URL(h.calls[1]).searchParams.get("first_name")).toBe("Ritu");
    expect(new URL(h.calls[1]).searchParams.get("last_name")).toBe("Hegde");
    expect(r.chosenEmail).toBe("ritu@grainkind.in");
  });
  it("selects nothing automatically for a low-confidence stranger", async () => {
    const h = fakeHunter({
      "domain-search": { body: { data: { emails: [{ value: "sales@grainkind.in", first_name: "Sam", last_name: "Sales", confidence: 40 }] } } },
      "email-finder": { status: 404, body: { errors: [{ details: "not found" }] } },
    });
    // the founder lookup finds nothing (Hunter 404): the domain search results must still be shown
    const r = await findContact(app("www.grainkind.in"), "k", h.f);
    expect(r.status).toBe("found");
    expect(r.candidates.map((c) => c.email)).toEqual(["sales@grainkind.in"]);
    expect(r.chosenEmail).toBeUndefined();
  });
  it("reports not found, not an error, when Hunter has no addresses", async () => {
    const h = fakeHunter({
      "domain-search": { body: { data: { emails: [] } } },
      "email-finder": { body: { data: { email: null } } },
    });
    const r = await findContact(app("www.grainkind.in"), "k", h.f);
    expect(r).toMatchObject({ status: "not_found", candidates: [] });
    expect(r.chosenEmail).toBeUndefined();
  });
  it("says plainly when the Hunter allowance is used up, and when the key is wrong", async () => {
    const used = fakeHunter({ "domain-search": { status: 429, body: { errors: [{ id: "usage_limit_reached", details: "x" }] } } });
    await expect(findContact(app("www.grainkind.in"), "k", used.f)).rejects.toThrow(/allowance is used up/);
    const bad = fakeHunter({ "domain-search": { status: 401, body: { errors: [{ details: "bad" }] } } });
    await expect(findContact(app("www.grainkind.in"), "k", bad.f)).rejects.toThrow(/rejected the key/);
  });
  it("needs a key", () => {
    expect(() => hunterKey({})).toThrow(MissingConfigError);
    expect(hunterKey({ HUNTER_API_KEY: " abc " })).toBe("abc");
  });
});
