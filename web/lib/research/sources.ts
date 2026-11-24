import type { SourceQuality, SourceRef } from "../schemas";

const OFFICIAL = ["allincapital.vc"];
const REGULATOR = ["rbi.org.in", "sebi.gov.in", "meity.gov.in", "mca.gov.in", "gst.gov.in", "npci.org.in", "trai.gov.in"];
const PRESS = [
  "inc42.com", "entrackr.com", "yourstory.com", "business-standard.com", "economictimes.indiatimes.com",
  "livemint.com", "techcrunch.com", "entrepreneur.com", "outlookbusiness.com", "thehindu.com",
  "moneycontrol.com", "financialexpress.com", "indianexpress.com", "hindustantimes.com", "reuters.com",
  "dealstreetasia.com", "freepressjournal.in", "businesstoday.in", "forbesindia.com", "theprint.in",
  "indianstartupnews.com", "medianama.com", "techinasia.com", "bloomberg.com",
];
const AGGREGATOR = [
  "crunchbase.com", "cbinsights.com", "tracxn.com", "f6s.com", "wellfound.com", "g2.com", "capterra.com",
  "capterra.in", "briter.co", "echai.ventures", "f4.fund", "producthunt.com", "sourceforge.net", "linkedin.com",
];
const BLOG = [
  "legal500.com", "chambers.com", "nishithdesai.com", "cyrilamarchandblogs.com", "conventuslaw.com",
  "medium.com", "substack.com", "prsindia.org",
];

const GROUNDING_REDIRECT = "vertexaisearch.cloud.google.com";

function hostOf(value: string): string | null {
  const t = value.trim().toLowerCase();
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(t)) return t.replace(/^www\./, "");
  try {
    return new URL(t).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const matches = (host: string, list: string[]) => list.some((d) => host === d || host.endsWith(`.${d}`));

/**
 * Classify by domain. Google's search grounding returns redirect links whose TITLE is the site's domain,
 * so the title is used when the link is a redirect. Anything not on a list is "vendor": unknown sites are
 * treated as the company's own marketing until shown otherwise, which is the cautious reading.
 */
export function classifySource(url: string, title = ""): SourceQuality {
  let host = hostOf(url);
  if (!host || host.includes(GROUNDING_REDIRECT)) host = hostOf(title);
  if (!host) return "unknown";
  if (matches(host, OFFICIAL)) return "official";
  if (matches(host, REGULATOR) || /\.gov\.in$/.test(host)) return "regulator";
  if (matches(host, PRESS)) return "press";
  if (matches(host, AGGREGATOR)) return "aggregator";
  if (matches(host, BLOG)) return "blog";
  return "vendor";
}

/** Best effort: follow Google's grounding redirect once to show the real address. Falls back to the original. */
export async function resolveRedirect(url: string, timeoutMs = 4000): Promise<string> {
  if (!url.includes(GROUNDING_REDIRECT)) return url;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: ctl.signal });
    const loc = res.headers.get("location");
    return loc && /^https?:\/\//i.test(loc) ? loc : url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

/** Number the sources the search returned (1..n), drop duplicates, and classify each. */
export function numberSources(raw: { url: string; title: string }[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const s of raw) {
    if (!s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push({ id: out.length + 1, url: s.url, title: s.title, quality: classifySource(s.url, s.title) });
  }
  return out;
}
