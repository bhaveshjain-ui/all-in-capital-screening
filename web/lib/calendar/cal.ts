// Cal.com: real availability for the invitation, and booking once an applicant picks a time.
// Rule from the partners (Meeting 5): Tuesday or Thursday afternoons, 30 minutes, Aditya joins only deeptech.
// Slots are only ever offered when Cal.com says they are free. If Cal.com is not configured the app falls
// back to the fixed rule in slots.ts, and says so.

import { MissingConfigError } from "../llm";
import { IST_OFFSET_MINUTES, LEAD_DAYS, SLOT_WEEKDAYS, formatSlotLabel, type Slot } from "../email/slots";

export class CalError extends Error {}

export interface CalConfig {
  apiKey: string;
  eventTypeId: number;
  /** Optional separate event type (with Aditya as a host) for deeptech. */
  eventTypeIdDeeptech?: number;
}

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

/** Null means Cal.com is not set up: the app then uses the fixed rule. */
export function calConfig(env: Env = process.env): CalConfig | null {
  const apiKey = env.CAL_API_KEY?.trim();
  if (!apiKey) return null;
  const id = Number(env.CAL_EVENT_TYPE_ID);
  if (!Number.isInteger(id) || id <= 0) throw new MissingConfigError("CAL_EVENT_TYPE_ID");
  const d = Number(env.CAL_EVENT_TYPE_ID_DEEPTECH);
  return { apiKey, eventTypeId: id, eventTypeIdDeeptech: Number.isInteger(d) && d > 0 ? d : undefined };
}

export function eventTypeFor(cfg: CalConfig, deeptech: boolean): number {
  return deeptech && cfg.eventTypeIdDeeptech ? cfg.eventTypeIdDeeptech : cfg.eventTypeId;
}

const BASE = "https://api.cal.com/v2";
const istDate = (ms: number) => new Date(ms + IST_OFFSET_MINUTES * 60_000);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Afternoon window in IST: from 12:00 up to (not including) 18:00. */
const AFTERNOON_FROM = 12;
const AFTERNOON_TO = 18;

/** Free Tuesday/Thursday afternoon slots, at least LEAD_DAYS ahead, at most two per day, earliest first. */
export async function fetchCalSlots(cfg: CalConfig, eventTypeId: number, from: Date, count = 4, f: Fetch = fetch): Promise<Slot[]> {
  const startMs = from.getTime() + LEAD_DAYS * 86_400_000;
  const url = `${BASE}/slots?eventTypeId=${eventTypeId}&start=${ymd(istDate(startMs))}&end=${ymd(istDate(startMs + 21 * 86_400_000))}&timeZone=Asia/Kolkata`;
  let res: Response;
  try {
    res = await f(url, { headers: { Authorization: `Bearer ${cfg.apiKey}`, "cal-api-version": "2024-09-04" } });
  } catch (e) {
    throw new CalError(`Cal.com could not be reached: ${(e as Error).message}`);
  }
  if (!res.ok) throw new CalError(`Cal.com returned ${res.status} when asked for free slots.`);
  const json = (await res.json()) as { data?: Record<string, { start: string }[]> };
  if (!json.data || typeof json.data !== "object") throw new CalError("Cal.com's answer did not contain any slots.");

  const out: Slot[] = [];
  for (const day of Object.keys(json.data).sort()) {
    let perDay = 0;
    for (const s of json.data[day]) {
      const ms = Date.parse(s.start);
      if (!Number.isFinite(ms) || ms < startMs) continue;
      const ist = istDate(ms);
      if (!SLOT_WEEKDAYS.includes(ist.getUTCDay())) continue;
      if (ist.getUTCHours() < AFTERNOON_FROM || ist.getUTCHours() >= AFTERNOON_TO) continue;
      if (perDay >= 2) break;
      const startIso = new Date(ms).toISOString();
      out.push({ startIso, label: formatSlotLabel(startIso) });
      perDay++;
      if (out.length >= count) return out;
    }
  }
  return out;
}

export interface BookingRequest { eventTypeId: number; startIso: string; name: string; email: string }

/** Creates the booking; Cal.com then emails the applicant its own confirmation and calendar invite. */
export async function createCalBooking(cfg: CalConfig, req: BookingRequest, f: Fetch = fetch): Promise<{ uid: string | null }> {
  let res: Response;
  try {
    res = await f(`${BASE}/bookings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "cal-api-version": "2024-08-13", "Content-Type": "application/json" },
      body: JSON.stringify({
        start: req.startIso, eventTypeId: req.eventTypeId,
        attendee: { name: req.name, email: req.email, timeZone: "Asia/Kolkata", language: "en" },
      }),
    });
  } catch (e) {
    throw new CalError(`Cal.com could not be reached: ${(e as Error).message}`);
  }
  const json = (await res.json().catch(() => ({}))) as { status?: string; data?: { uid?: string }; error?: { message?: string }; message?: string };
  if (!res.ok || json.status === "error") {
    throw new CalError(`Cal.com refused the booking: ${json.error?.message ?? json.message ?? res.status}`);
  }
  return { uid: json.data?.uid ?? null };
}
