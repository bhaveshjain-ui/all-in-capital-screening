import type { StoredFile } from "../schemas";

/** Field names the model should reuse so the deck and the form can be compared. */
export const CANONICAL_FIELDS = [
  "customers_paying", "customers_trial", "customers_total", "customers_churned",
  "enterprise_clients_live", "enterprise_clients_pilot", "retailers_onboarded", "retailers_repeat",
  "users_registered", "users_paying", "workers_enabled", "bookings_total", "travellers_total",
  "mrr_inr", "arr_inr", "revenue_monthly_inr", "revenue_total_inr", "revenue_net_inr", "gmv_inr",
  "volume_monthly_inr", "advances_total_inr", "gross_margin_pct", "contribution_margin_pct",
  "cac_inr", "payback_months", "repeat_rate_pct", "nrr_pct", "ltv_cac_ratio",
  "team_size", "founders_full_time", "founder_background", "funding_of_credit", "credit_book_inr",
  "regulatory_status", "competitors_claim", "existing_investors", "ask_inr", "post_money_inr",
  "sector_selected", "stage_selected",
];

export function buildExtractPrompt(files: StoredFile[]): string {
  const docs = files
    .map((f) => `##### ${f.kind.toUpperCase()} (${f.filename}, ${f.pages} pages)\n${f.text}`)
    .join("\n\n");

  return `You extract facts from a startup's pitch deck and application form so that a human reviewer can check them. You are not evaluating the company.

RULES
- Use ONLY what the text says. If the text does not say it, leave it out. Never estimate, infer or fill gaps.
- Every claim needs the exact supporting words in "quote" (at most 200 characters, copied from the text) and the page in "location" (for example "deck page 4" or "form page 1").
- "source" is "deck" or "form". The same fact stated in both documents must appear twice, once per source, using the same "field" name, so the two can be compared.
- Money is in raw rupees (INR) as a plain number: 1 lakh = 100000, 1 crore = 10000000, 1 lakh crore = 1000000000000. Percentages are plain numbers in fields ending _pct (38 means 38%). Counts are plain numbers.
- Prefer these field names when they fit, and reuse the same name across documents: ${CANONICAL_FIELDS.join(", ")}. If none fits, use a new snake_case name, and use it in both documents.
- "value" is a number for figures and counts, otherwise a short string.
- FIGURES for recomputation. Copy inputs exactly as stated; do not calculate anything yourself.
  - "products": claimed = product of factors. Examples: a market size stated with its inputs (households x spend per year); ARR from MRR (factors: MRR, 12); revenue from volume and fee rate (factors: volume, 0.018).
  - "sums": claimed total with its parts (channel shares, use of funds, chart values added up).
  - "quotients": claimed = numerator / denominator (for example CAC = stated cost / customers).
  - "paybacks": claimed payback in months with the stated CAC, monthly revenue per customer and gross margin percentage.
  Include a figure only when the text states BOTH the claimed result and every input needed.
- "company": the identity details as stated. For founders give name, role and background exactly as described; do not embellish.
- Return only JSON, no commentary.

JSON SHAPE
{
  "company": { "name": string, "one_liner": string, "sector_selected": string, "stage_selected": string, "location": string, "incorporated": string, "team_size": string, "founders": [ { "name": string, "role": string, "background": string, "full_time_since": string } ], "ask_inr": number|null, "post_money_inr": number|null, "how_heard": string },
  "claims": [ { "field": string, "label": string, "value": string|number|boolean, "unit": string, "source": "deck"|"form", "location": string, "quote": string } ],
  "figures": {
    "products": [ { "label": string, "claimed": number, "factors": number[], "source": "deck"|"form", "location": string } ],
    "sums": [ { "label": string, "claimed": number, "parts": number[], "source": "deck"|"form", "location": string } ],
    "quotients": [ { "label": string, "claimed": number, "numerator": number, "denominator": number, "source": "deck"|"form", "location": string } ],
    "paybacks": [ { "label": string, "claimed_months": number, "cac_inr": number, "monthly_revenue_per_customer_inr": number, "gross_margin_pct": number, "source": "deck"|"form", "location": string } ]
  },
  "notes": string
}

DOCUMENTS
${docs}`;
}
