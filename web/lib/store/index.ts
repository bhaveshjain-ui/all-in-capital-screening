import { FileStore } from "./file";
import { NeonStore } from "./neon";
import type { Store } from "./types";

export type { Store } from "./types";
export { summarize } from "./summary";

let cached: Store | null = null;

/** STORE=neon uses Postgres (needs DATABASE_URL); anything else uses local files in web/.data. */
export function getStore(): Store {
  if (cached) return cached;
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
