// Deterministic recomputation of figures. The model extracts the inputs; this code does the arithmetic,
// so a wrong total in a deck is caught by code, not by a model's mental maths.

import type { Figures, RecomputeItem } from "./schemas";

/** Relative difference allowed before a claimed figure counts as not matching (rounding in decks). */
export const TOLERANCE = 0.03;

const rel = (claimed: number, computed: number): number => {
  if (computed === 0) return claimed === 0 ? 0 : Infinity;
  return Math.abs(claimed - computed) / Math.abs(computed);
};

/** If the claimed value is out by a clean power of ten, say so: it is usually a unit slip (lakh vs crore). */
export function unitSlipNote(claimed: number, computed: number): string | undefined {
  if (computed === 0 || claimed === 0) return undefined;
  const ratio = claimed / computed;
  for (const k of [1, 2, 3]) {
    const p = 10 ** k;
    if (Math.abs(ratio - p) / p < 0.05) return `claimed is about ${p}x the computed value (possible unit slip)`;
    if (Math.abs(ratio - 1 / p) * p < 0.05) return `claimed is about 1/${p} of the computed value (possible unit slip)`;
  }
  return undefined;
}

export function recomputeAll(figures: Figures, tolerance = TOLERANCE): RecomputeItem[] {
  const out: RecomputeItem[] = [];

  for (const f of figures.products) {
    const computed = f.factors.reduce((a, b) => a * b, 1);
    const r = rel(f.claimed, computed);
    out.push({
      kind: "product", label: f.label, claimed: f.claimed, computed,
      match: r <= tolerance, relDiff: r, source: f.source, location: f.location,
      note: r <= tolerance ? undefined : unitSlipNote(f.claimed, computed),
    });
  }

  for (const f of figures.sums) {
    const computed = f.parts.reduce((a, b) => a + b, 0);
    const r = rel(f.claimed, computed);
    out.push({
      kind: "sum", label: f.label, claimed: f.claimed, computed,
      match: r <= tolerance, relDiff: r, source: f.source, location: f.location,
    });
  }

  for (const f of figures.quotients) {
    if (f.denominator === 0) {
      out.push({
        kind: "quotient", label: f.label, claimed: f.claimed, computed: NaN, match: false,
        relDiff: Infinity, source: f.source, location: f.location, note: "denominator is zero",
      });
      continue;
    }
    const computed = f.numerator / f.denominator;
    const r = rel(f.claimed, computed);
    out.push({
      kind: "quotient", label: f.label, claimed: f.claimed, computed,
      match: r <= tolerance, relDiff: r, source: f.source, location: f.location,
    });
  }

  for (const f of figures.paybacks) {
    const monthlyProfit = f.monthly_revenue_per_customer_inr * (f.gross_margin_pct / 100);
    if (monthlyProfit <= 0) {
      out.push({
        kind: "payback", label: f.label, claimed: f.claimed_months, computed: NaN, match: false,
        relDiff: Infinity, source: f.source, location: f.location,
        note: "monthly gross profit per customer is zero or negative",
      });
      continue;
    }
    const computed = f.cac_inr / monthlyProfit;
    const r = rel(f.claimed_months, computed);
    out.push({
      kind: "payback", label: f.label, claimed: f.claimed_months, computed,
      match: r <= tolerance, relDiff: r, source: f.source, location: f.location,
      note: r <= tolerance ? undefined : "payback = CAC / (monthly revenue per customer x gross margin)",
    });
  }

  return out;
}
