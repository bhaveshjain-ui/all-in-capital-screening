import { promises as fs } from "node:fs";
import path from "node:path";
import type { Application, ApplicationSummary } from "../schemas";
import type { Store } from "./types";
import type { SettingsDoc } from "../settings";
import { summarize } from "./summary";

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Local development and tests only: one JSON file per application under <dir>/applications. */
export class FileStore implements Store {
  private dir: string;
  constructor(dir: string) {
    this.dir = path.resolve(dir, "applications");
  }

  private file(id: string) {
    if (!SAFE_ID.test(id)) throw new Error("Invalid application id.");
    return path.join(this.dir, `${id}.json`);
  }

  async list(): Promise<ApplicationSummary[]> {
    await fs.mkdir(this.dir, { recursive: true });
    const names = (await fs.readdir(this.dir)).filter((n) => n.endsWith(".json"));
    const apps: Application[] = [];
    for (const n of names) apps.push(JSON.parse(await fs.readFile(path.join(this.dir, n), "utf8")));
    return apps
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(summarize);
  }

  async all(): Promise<Application[]> {
    await fs.mkdir(this.dir, { recursive: true });
    const names = (await fs.readdir(this.dir)).filter((n) => n.endsWith(".json"));
    const apps: Application[] = [];
    for (const n of names) apps.push(JSON.parse(await fs.readFile(path.join(this.dir, n), "utf8")));
    return apps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Application | null> {
    try {
      return JSON.parse(await fs.readFile(this.file(id), "utf8")) as Application;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async getSettings(): Promise<SettingsDoc | null> {
    try {
      return JSON.parse(await fs.readFile(path.resolve(this.dir, "..", "settings.json"), "utf8")) as SettingsDoc;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async saveSettings(doc: SettingsDoc): Promise<void> {
    await fs.mkdir(path.resolve(this.dir, ".."), { recursive: true });
    await fs.writeFile(path.resolve(this.dir, "..", "settings.json"), JSON.stringify(doc, null, 2), "utf8");
  }

  async save(app: Application): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file(app.id), JSON.stringify(app, null, 2), "utf8");
  }
}
