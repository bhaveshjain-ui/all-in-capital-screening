import type { Application, ApplicationSummary } from "../schemas";
import type { SettingsDoc } from "../settings";

export interface Store {
  list(): Promise<ApplicationSummary[]>;
  /** Every application in full. Used for cross-application features such as correction memory. */
  all(): Promise<Application[]>;
  get(id: string): Promise<Application | null>;
  save(app: Application): Promise<void>;
  /** Partner-set parameters with their change history; null until the first change. */
  getSettings(): Promise<SettingsDoc | null>;
  saveSettings(doc: SettingsDoc): Promise<void>;
}
