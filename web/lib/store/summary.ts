import type { Application, ApplicationSummary } from "../schemas";

export function summarize(a: Application): ApplicationSummary {
  return {
    id: a.id,
    name: a.name,
    createdAt: a.createdAt,
    files: a.files.length,
    extractionStatus: a.extraction.status,
    conflicts: a.conflicts.length,
    mismatches: a.recompute.filter((r) => !r.match).length,
  };
}
