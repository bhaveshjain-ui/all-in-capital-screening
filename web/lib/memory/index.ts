// Correction memory: when a reviewer corrected a score on one company, show that correction when a similar
// company reaches the same criterion. It is precedent, not a rule: it never changes a score by itself, and
// partners said written rules turn into checklists, so nothing here is applied automatically.

import type { BusinessType, CriterionId } from "../framework/config";
import type { Application, Correction } from "../schemas";

export interface MemoryMatch {
  applicationId: string;
  company: string;
  correction: Correction;
  /** Higher is more similar. */
  score: number;
  /** Plain-language reasons it matched, shown to the reviewer. */
  reasons: string[];
  /** True if the correction came from an earlier scoring of that company. */
  archived: boolean;
}

/** Plain data for the page (no functions, safe to pass to client components). */
export interface MemoryView {
  correctionId: string;
  company: string;
  by: string;
  at: string;
  original: string;
  corrected: string;
  reason: string;
  reasons: string[];
}

export const MIN_SIMILARITY = 3;
export const DEFAULT_LIMIT = 3;

const fmt = (e: { status: string; score: number | null }) => (e.score === null ? e.status.replace("_", " ") : `${e.score} (${e.status.replace("_", " ")})`);

/** The reviewer's latest correction for each criterion within one review (earlier ones were superseded). */
function latestPerCriterion(corrections: Correction[]): Correction[] {
  const byCriterion = new Map<CriterionId, Correction>();
  for (const c of corrections) byCriterion.set(c.criterion, c);
  return [...byCriterion.values()];
}

export function similarCorrections(
  target: Application,
  others: Application[],
  criterion: CriterionId,
  limit = DEFAULT_LIMIT,
): MemoryMatch[] {
  const sc = target.scoring;
  if (!sc) return [];
  const targetTypes = sc.businessTypes.types;
  const targetSector = target.extraction.result?.company.sector_selected?.trim().toLowerCase() ?? "";
  const modelNow = sc.criteria[criterion];

  const out: MemoryMatch[] = [];
  for (const other of others) {
    if (other.id === target.id) continue;
    const reviews = [
      ...(other.review ? [{ r: other.review, archived: false }] : []),
      ...(other.archivedReviews ?? []).map((r) => ({ r, archived: true })),
    ];
    for (const { r, archived } of reviews) {
      for (const c of latestPerCriterion(r.corrections)) {
        if (c.criterion !== criterion) continue;
        let score = 0;
        const reasons: string[] = [];

        const shared = c.tags.businessTypes.filter((t: BusinessType) => targetTypes.includes(t));
        if (shared.length) {
          score += Math.min(shared.length, 2) * 3;
          reasons.push(`same business type (${shared.join(", ")})`);
        }
        const sector = c.tags.sector?.trim().toLowerCase() ?? "";
        if (sector && sector === targetSector) {
          score += 1;
          reasons.push(`same sector (${c.tags.sector})`);
        }
        if (c.original.status === modelNow.status) {
          score += 1;
          if (c.original.score !== null && modelNow.score !== null && Math.abs(c.original.score - modelNow.score) <= 1) {
            score += 2;
            reasons.push(`the model also gave ${modelNow.score} here`);
          } else if (c.original.score === null && modelNow.score === null) {
            reasons.push(`the model also left this ${modelNow.status.replace("_", " ")}`);
          }
        }
        if (score >= MIN_SIMILARITY) out.push({ applicationId: other.id, company: other.name, correction: c, score, reasons, archived });
      }
    }
  }
  return out
    .sort((a, b) => b.score - a.score || b.correction.at.localeCompare(a.correction.at))
    .slice(0, limit);
}

export function toView(m: MemoryMatch): MemoryView {
  return {
    correctionId: m.correction.id,
    company: m.archived ? `${m.company} (earlier scoring)` : m.company,
    by: m.correction.by,
    at: m.correction.at,
    original: fmt(m.correction.original),
    corrected: fmt(m.correction.corrected),
    reason: m.correction.reason,
    reasons: m.reasons,
  };
}

export const CRITERION_IDS: CriterionId[] = ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6"];

/** Matches for every criterion at once. */
export function memoryFor(target: Application, others: Application[], limit = DEFAULT_LIMIT): Record<CriterionId, MemoryMatch[]> {
  return Object.fromEntries(CRITERION_IDS.map((id) => [id, similarCorrections(target, others, id, limit)])) as Record<CriterionId, MemoryMatch[]>;
}
