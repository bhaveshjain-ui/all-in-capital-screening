// Every time shown in the app is India time. The server runs in UTC (Vercel), so without an explicit time
// zone a time recorded at 8:16 pm in Mumbai would be shown as 2:46 pm. Stored values stay UTC ISO strings.

const TZ = "Asia/Kolkata";

/** "24/11/2026, 8:16:23 pm" */
export function fmtDateTime(iso: string | number | Date): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: TZ });
}

/** "24/11/2026" */
export function fmtDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: TZ });
}
