import { neon } from "@neondatabase/serverless";
import type { Application, ApplicationSummary } from "../schemas";
import type { Store } from "./types";
import type { SettingsDoc } from "../settings";
import { summarize } from "./summary";

/**
 * Neon Postgres store: one JSONB document per application.
 * NOT yet tested against a live database (no DATABASE_URL was available when this was written).
 */
export class NeonStore implements Store {
  private sql: ReturnType<typeof neon>;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = neon(url);
  }

  private ensure(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.sql`create table if not exists applications (
          id text primary key,
          data jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )`;
        await this.sql`create table if not exists settings (
          id text primary key,
          data jsonb not null,
          updated_at timestamptz not null default now()
        )`;
      })();
    }
    return this.ready;
  }

  async getSettings(): Promise<SettingsDoc | null> {
    await this.ensure();
    const rows = (await this.sql`select data from settings where id = 'current'`) as { data: SettingsDoc }[];
    return rows[0]?.data ?? null;
  }

  async saveSettings(doc: SettingsDoc): Promise<void> {
    await this.ensure();
    await this.sql`insert into settings (id, data) values ('current', ${JSON.stringify(doc)}::jsonb)
      on conflict (id) do update set data = excluded.data, updated_at = now()`;
  }

  async list(): Promise<ApplicationSummary[]> {
    await this.ensure();
    const rows = (await this.sql`select data from applications order by created_at desc`) as { data: Application }[];
    return rows.map((r) => summarize(r.data));
  }

  async all(): Promise<Application[]> {
    await this.ensure();
    const rows = (await this.sql`select data from applications order by created_at desc`) as { data: Application }[];
    return rows.map((r) => r.data);
  }

  async get(id: string): Promise<Application | null> {
    await this.ensure();
    const rows = (await this.sql`select data from applications where id = ${id}`) as { data: Application }[];
    return rows[0]?.data ?? null;
  }

  async save(app: Application): Promise<void> {
    await this.ensure();
    await this.sql`insert into applications (id, data) values (${app.id}, ${JSON.stringify(app)}::jsonb)
      on conflict (id) do update set data = excluded.data, updated_at = now()`;
  }
}
