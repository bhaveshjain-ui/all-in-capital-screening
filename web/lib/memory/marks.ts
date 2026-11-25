// Reviewers mark each retrieved past correction as useful or not. This is what lets the Evaluation page
// measure whether retrieval picks the right notes. A mark is only accepted for a correction that was really
// shown for that criterion on that application.

import { addAudit } from "../review";
import type { Application, MemoryMark } from "../schemas";
import { CRITERION_IDS, memoryFor } from "./index";
import type { CriterionId } from "../framework/config";

export class MarkError extends Error {}

export function setMemoryMark(app: Application, others: Application[], input: Record<string, unknown>): Application {
  if (!app.scoring) throw new MarkError("Score the application first.");
  const criterion = input.criterion as CriterionId;
  if (typeof input.correctionId !== "string" || !CRITERION_IDS.includes(criterion) || typeof input.useful !== "boolean") {
    throw new MarkError("Send the correction, the criterion and whether it was useful.");
  }
  const shown = memoryFor(app, others)[criterion];
  const match = shown.find((m) => m.correction.id === input.correctionId);
  if (!match) throw new MarkError("That correction was not shown for this criterion.");
  const by = typeof input.by === "string" && input.by.trim() ? input.by.trim().slice(0, 60) : "unnamed reviewer";
  const mark: MemoryMark = { correctionId: input.correctionId, criterion, useful: input.useful, by, at: new Date().toISOString() };
  const rest = (app.memoryMarks ?? []).filter((x) => !(x.correctionId === mark.correctionId && x.criterion === mark.criterion));
  return addAudit({ ...app, memoryMarks: [...rest, mark] }, "memory_marked", by,
    `Marked the correction from ${match.company} (${criterion}) as ${mark.useful ? "useful" : "not useful"} here.`);
}
