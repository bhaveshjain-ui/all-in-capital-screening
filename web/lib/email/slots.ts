// Call slots from the partners' own rule (Meeting 5): Tuesday or Thursday afternoons, 30 minutes, Aditya joins
// only for deeptech. The rule gives no clock times, so the afternoon times below are an ASSUMPTION for the
// partners to change. This does not read anyone's calendar: the reviewer confirms availability.

import type { BusinessType } from "../framework/config";

export const IST_OFFSET_MINUTES = 330;
/** Tuesday = 2, Thursday = 4 (0 = Sunday). */
export const SLOT_WEEKDAYS = [2, 4];
/** Afternoon start times in India Standard Time (assumption). */
export const SLOT_TIMES = [{ h: 14, m: 0 }, { h: 15, m: 30 }];
export const SLOT_MINUTES = 30;
/** Earliest slot is at least this many days after the request (assumption). */
export const LEAD_DAYS = 2;

export interface Slot {
  startIso: string;
  label: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function clock(h: number, m: number) {
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "Thursday 26 November, 2:00 pm IST" for a UTC instant. */
export function formatSlotLabel(startIso: string): string {
  const d = new Date(Date.parse(startIso) + IST_OFFSET_MINUTES * 60_000);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${clock(d.getUTCHours(), d.getUTCMinutes())} IST`;
}

/** The next slots on Tuesdays and Thursdays, in IST, starting LEAD_DAYS after `from`. */
export function proposeSlots(from: Date, count = 4): Slot[] {
  const slots: Slot[] = [];
  const istNow = new Date(from.getTime() + IST_OFFSET_MINUTES * 60_000);
  // Start counting from midnight IST of the day LEAD_DAYS ahead.
  let dayStart = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + LEAD_DAYS);
  for (let guard = 0; slots.length < count && guard < 60; guard++, dayStart += 86_400_000) {
    const d = new Date(dayStart);
    if (!SLOT_WEEKDAYS.includes(d.getUTCDay())) continue;
    for (const t of SLOT_TIMES) {
      if (slots.length >= count) break;
      const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), t.h, t.m) - IST_OFFSET_MINUTES * 60_000;
      slots.push({
        startIso: new Date(utc).toISOString(),
        label: `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${clock(t.h, t.m)} IST`,
      });
    }
  }
  return slots;
}

/** Kushal takes every call; Aditya joins only for deeptech (Meeting 3 and Meeting 5). */
export function attendeesFor(types: BusinessType[]): string[] {
  return types.includes("deeptech") ? ["Kushal", "Aditya"] : ["Kushal"];
}

// ---- recipient checks -------------------------------------------------------------------

const ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const RESERVED_TLDS = ["example", "test", "invalid", "localhost"];

export function checkRecipient(raw: string, live: boolean): { ok: true; address: string } | { ok: false; error: string } {
  const address = raw.trim();
  if (!address) return { ok: false, error: "Enter the applicant's email address." };
  if (address.length > 254) return { ok: false, error: "That address is too long." };
  // One address only, and nothing that could add headers or more recipients.
  if (/[\s,;<>()"'\\]/.test(address)) return { ok: false, error: "Enter exactly one plain email address." };
  if (!ADDRESS.test(address)) return { ok: false, error: "That does not look like an email address." };
  const tld = address.split(".").pop()!.toLowerCase();
  if (live && RESERVED_TLDS.includes(tld)) {
    return { ok: false, error: `Addresses ending in .${tld} cannot receive mail. Use a real address, or test mode.` };
  }
  return { ok: true, address };
}
