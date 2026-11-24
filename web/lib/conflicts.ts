// Deck-versus-form comparison. Claims share a snake_case field name across the two documents;
// numbers that differ by more than 5% are numeric conflicts, other differences are text conflicts
// for a reviewer to read. Nothing here decides which document is right.

import type { Claim, Conflict } from "./schemas";

export const NUMERIC_TOLERANCE = 0.05;

const norm = (v: string | number | boolean) =>
  String(v).toLowerCase().replace(/\s+/g, " ").trim();

export function findConflicts(claims: Claim[]): Conflict[] {
  const byField = new Map<string, { deck: Claim[]; form: Claim[] }>();
  for (const c of claims) {
    const g = byField.get(c.field) ?? { deck: [], form: [] };
    g[c.source].push(c);
    byField.set(c.field, g);
  }

  const out: Conflict[] = [];
  for (const [field, g] of byField) {
    let found: Conflict | null = null;
    for (const d of g.deck) {
      for (const f of g.form) {
        if (found) break;
        if (typeof d.value === "number" && typeof f.value === "number") {
          const base = Math.max(Math.abs(d.value), Math.abs(f.value));
          const diff = base === 0 ? 0 : Math.abs(d.value - f.value) / base;
          if (diff > NUMERIC_TOLERANCE) {
            found = {
              field, label: d.label, kind: "numeric", relDiff: diff,
              deck: { value: d.value, location: d.location, quote: d.quote },
              form: { value: f.value, location: f.location, quote: f.quote },
            };
          }
        } else if (norm(d.value) !== norm(f.value)) {
          found = {
            field, label: d.label, kind: "text",
            deck: { value: d.value, location: d.location, quote: d.quote },
            form: { value: f.value, location: f.location, quote: f.quote },
          };
        }
      }
    }
    if (found) out.push(found);
  }
  return out.sort((a, b) => (a.kind === b.kind ? a.field.localeCompare(b.field) : a.kind === "numeric" ? -1 : 1));
}
