import { FileStore } from "./file";
import { NeonStore } from "./neon";
import type { Store } from "./types";

export type { Store } from "./types";
export { summarize } from "./summary";

let cached: Store | null = null;

/** On Vercel the file system is read-only, so without a database the app cannot save anything. */
export function storeProblem(): string | null {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    return "The database is not connected. Set DATABASE_URL (the Neon connection string) and STORE=neon in this project's environment variables, then redeploy.";
  }
  return null;
}

/** STORE=neon uses Postgres (needs DATABASE_URL); anything else uses local files in web/.data. */
export function getStore(): Store {
  if (cached) return cached;
  const problem = storeProblem();
  if (problem) throw new Error(problem);
  const kind = (process.env.STORE ?? (process.env.DATABASE_URL ? "neon" : "file")).toLowerCase();
  if (kind === "neon") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("STORE=neon but DATABASE_URL is not set.");
    cached = new NeonStore(url);
  } else {
    cached = new FileStore(process.env.DATA_DIR ?? ".data");
  }
  return cached;
}

/** Saved settings, or null (the framework's starting values) when there is no database yet. */
export async function savedSettings() {
  return storeProblem() ? null : getStore().getSettings();
}

/** Every application, or none when there is no database yet. */
export async function allApplications() {
  return storeProblem() ? [] : getStore().all();
}
