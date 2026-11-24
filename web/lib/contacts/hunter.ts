// Finding the point of contact for an application with Hunter.io.
// Hunter's free plan is small (50 credits a month), so a search is spent only when a reviewer clicks, only on
// a real company domain taken from the application itself, and never on a placeholder website. Nothing is
// guessed: if Hunter has no address, the result says so and the reviewer types one.

import { MissingConfigError } from "../llm";
import type { Application, ContactCandidate, ContactResult } from "../schemas";

export class HunterError extends Error {
  /** True for quota and key problems, which must stop the search; false for "nothing found" style answers. */
  constructor(message: string, public fatal = true) {
    super(message);
  }
}

type Fetch = typeof fetch;
type Env = Record<string, string | undefined>;

export function hunterKey(env: Env = process.env): string {
  const k = env.HUNTER_API_KEY?.trim();
  if (!k) throw new MissingConfigError("HUNTER_API_KEY");
  return k;
}

// ---- Domain from the application ----------------------------------------------------------------------

const RESERVED_TLDS = ["example", "test", "invalid", "localhost"];
const URL_RE = /(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+)(?:[/:?#][^\s]*)?/gi;
const SOCIAL = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|github|medium|notion|google|docs\.google|drive\.google|calendly|canva)\.[a-z.]+$/i;

export interface DomainFound {
  domain: string;
  from: "form" | "deck";
  /** True when the website is a reserved or placeholder name that cannot have real mail. */
  placeholder: boolean;
}

/** The company's own website, from the form first, then the deck. Social and file-sharing links are skipped. */
export function domainFromApplication(app: Application): DomainFound | null {
  const order: ("form" | "deck")[] = ["form", "deck"];
  for (const kind of order) {
    const text = app.files.find((f) => f.kind === kind)?.text ?? "";
    // Only things that look like a website: a www. prefix or an explicit scheme. Bare words with dots (e.g. "L1.5") are ignored.
    const candidates = [...text.matchAll(/(?:https?:\/\/|www\.)[^\s,;)"']+/gi)].map((m) => m[0]);
    for (const c of candidates) {
      URL_RE.lastIndex = 0;
      const m = URL_RE.exec(c);
      if (!m) continue;
      const domain = m[1].toLowerCase().replace(/^www\./, "").replace(/[.,;:]+$/, "");
      if (!domain.includes(".") || SOCIAL.test(domain)) continue;
      const tld = domain.split(".").pop()!;
      return { domain, from: kind, placeholder: RESERVED_TLDS.includes(tld) };
    }
  }
  return null;
}

// ---- Ranking ------------------------------------------------------------------------------------------

const SENIOR = /\b(founder|co-?founder|ceo|chief executive|managing director|owner|president|chairman|md)\b/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** How well a Hunter result fits: a founder named in the application counts most, then seniority, then confidence. */
export function rank(c: ContactCandidate, founders: { name: string; role?: string | null }[]): number {
  let s = c.confidence / 10; // 0 to 10
  const full = norm(c.name);
  const hit = founders.find((f) => {
    const parts = f.name.trim().split(/\s+/).map(norm).filter(Boolean);
    return parts.length > 0 && parts.every((p) => full.includes(p));
  });
  if (hit) s += 100;
  if (c.position && SENIOR.test(c.position)) s += 20;
  if (c.verification === "valid") s += 5;
  return s;
}

export function founderMatch(c: ContactCandidate, founders: { name: string }[]): boolean {
  const full = norm(c.name);
  return founders.some((f) => {
    const parts = f.name.trim().split(/\s+/).map(norm).filter(Boolean);
    return parts.length > 0 && parts.every((p) => full.includes(p));
  });
}

// ---- Hunter calls -------------------------------------------------------------------------------------

interface HunterEmail {
  value?: string; confidence?: number; first_name?: string | null; last_name?: string | null;
  position?: string | null; verification?: { status?: string | null } | null;
}

async function hunterGet(path: string, params: Record<string, string>, key: string, f: Fetch): Promise<unknown> {
  const url = `https://api.hunter.io/v2/${path}?${new URLSearchParams(params).toString()}`;
  let res: Response;
  try {
    // The key goes in a header, not in the URL, so it never lands in a log.
    res = await f(url, { headers: { "X-API-KEY": key } });
  } catch (e) {
    throw new HunterError(`Hunter could not be reached: ${(e as Error).message}`);
  }
  const json = (await res.json().catch(() => ({}))) as { data?: unknown; errors?: { id?: string; details?: string }[] };
  if (!res.ok) {
    const e = json.errors?.[0];
    if (res.status === 429 || e?.id === "usage_limit_reached" || e?.id === "rate_limit_reached") {
      throw new HunterError("Hunter's search allowance is used up for now (the free plan is small). Try again after it resets, or type the address yourself.");
    }
    if (res.status === 401) throw new HunterError("Hunter rejected the key. Check HUNTER_API_KEY.");
    // Anything else (for example 404, no address found) only means this one lookup had no result.
    throw new HunterError(`Hunter said: ${e?.details ?? res.status}`, res.status >= 500);
  }
  return json.data;
}

function toCandidate(e: HunterEmail, via: ContactCandidate["via"]): ContactCandidate | null {
  if (!e.value) return null;
  const name = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return {
    email: e.value, name: name || "Name not given", position: e.position ?? undefined,
    confidence: typeof e.confidence === "number" ? e.confidence : 0,
    verification: (e.verification?.status as ContactCandidate["verification"]) ?? "unknown", via,
  };
}

const AUTO_PICK_MIN_CONFIDENCE = 70;

/**
 * Looks up the contact. One Hunter search for the domain; if that does not name a founder, one email-finder
 * search for the first named founder. At most two credits.
 */
export async function findContact(app: Application, key: string, f: Fetch = fetch, now = new Date()): Promise<ContactResult> {
  const base = { checkedAt: now.toISOString() };
  const found = domainFromApplication(app);
  if (!found) {
    return { ...base, status: "no_domain", candidates: [], note: "The application gives no company website, so there is nothing to look up. Type the address yourself." };
  }
  if (found.placeholder) {
    return { ...base, status: "no_domain", domain: found.domain, candidates: [], note: `The website in the application (${found.domain}) is a placeholder that cannot receive mail, so Hunter was not asked. Type the address yourself.` };
  }
  const founders = (app.extraction.result?.company.founders ?? []).filter((x) => x.name?.trim());

  const candidates: ContactCandidate[] = [];
  const data = (await hunterGet("domain-search", { domain: found.domain, limit: "10" }, key, f)) as { emails?: HunterEmail[] } | undefined;
  for (const e of data?.emails ?? []) {
    const c = toCandidate(e, "domain-search");
    if (c) candidates.push(c);
  }

  // No founder named in the application showed up: ask Hunter for the first founder specifically.
  if (founders.length > 0 && !candidates.some((c) => founderMatch(c, founders))) {
    const [first, ...rest] = founders[0].name.trim().split(/\s+/);
    const last = rest.join(" ");
    if (first && last) {
      const one = (await hunterGet("email-finder", { domain: found.domain, first_name: first, last_name: last }, key, f).catch((e) => {
        // A quota or key problem stops the search; "no address for this person" does not.
        if (e instanceof HunterError && !e.fatal) return undefined;
        throw e;
      })) as
        | { email?: string; score?: number; position?: string | null; first_name?: string; last_name?: string; verification?: { status?: string | null } }
        | undefined;
      if (one?.email) {
        const c = toCandidate({ value: one.email, confidence: one.score, first_name: one.first_name ?? first, last_name: one.last_name ?? last, position: one.position ?? founders[0].role ?? null, verification: one.verification }, "email-finder");
        if (c && !candidates.some((x) => x.email === c.email)) candidates.push(c);
      }
    }
  }

  const ranked = [...candidates].sort((a, b) => rank(b, founders) - rank(a, founders)).slice(0, 5);
  if (ranked.length === 0) {
    return { ...base, status: "not_found", domain: found.domain, candidates: [], note: `Hunter has no address on file for ${found.domain}. Type the address yourself.` };
  }
  // Pre-select only when it is a founder named in the application, or Hunter is highly confident.
  const top = ranked[0];
  const auto = founderMatch(top, founders) || top.confidence >= AUTO_PICK_MIN_CONFIDENCE;
  return { ...base, status: "found", domain: found.domain, candidates: ranked, chosenEmail: auto ? top.email : undefined };
}
