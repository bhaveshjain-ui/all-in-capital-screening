// Booking the time an applicant chose. This creates a calendar entry and Cal.com emails the applicant, so it
// only works for an invitation that has gone out, for one of the slots that was offered, once, by a named
// reviewer clicking. In test mode (the default) nothing is booked: it only records what would have happened.

import { calConfig, createCalBooking, eventTypeFor, CalError, type BookingRequest } from "../calendar/cal";
import { addAudit } from "../review";
import type { Application } from "../schemas";
import { EmailStateError, requireTakeACall } from "./draft";
import { checkRecipient } from "./slots";
import type { SendMode } from "./send";

export interface BookDeps {
  mode: SendMode;
  create?: (req: BookingRequest) => Promise<{ uid: string | null }>;
  now?: Date;
}

export async function bookSlot(app: Application, draftId: string, slotIso: string, by: string | undefined, deps: BookDeps): Promise<Application> {
  requireTakeACall(app);
  const d = app.emails?.find((x) => x.id === draftId);
  if (!d) throw new EmailStateError("That draft does not exist.");
  if (d.status !== "sent" && d.status !== "test_logged") throw new EmailStateError("Send the invitation before booking a time.");
  if (d.booking) throw new EmailStateError(`A time is already booked: ${d.booking.label}.`);
  const slot = d.slots.find((s) => s.startIso === slotIso);
  if (!slot) throw new EmailStateError("That time was not one of the slots offered in the invitation.");
  const live = deps.mode === "live";
  const r = checkRecipient(d.to, live);
  if (!r.ok) throw new EmailStateError(r.error);
  const who = by?.trim() || "unnamed reviewer";
  const at = (deps.now ?? new Date()).toISOString();
  const founders = app.extraction.result?.company.founders ?? [];
  const name = founders[0]?.name || app.name;

  let uid: string | null = null;
  let eventTypeId: number | undefined;
  if (live) {
    const cfg = calConfig();
    if (!cfg) throw new EmailStateError("Cal.com is not set up (CAL_API_KEY), so the booking cannot be created.");
    eventTypeId = eventTypeFor(cfg, d.attendees.includes("Aditya"));
    try {
      const res = await (deps.create ?? ((req: BookingRequest) => createCalBooking(cfg, req)))({ eventTypeId, startIso: slot.startIso, name, email: r.address });
      uid = res.uid;
    } catch (e) {
      const message = e instanceof CalError ? e.message : (e as Error).message;
      throw new EmailStateError(message);
    }
  }
  const next = { ...d, booking: { startIso: slot.startIso, label: slot.label, mode: deps.mode, uid, by: who, at, eventTypeId } };
  const updated = { ...app, emails: (app.emails ?? []).map((x) => (x.id === d.id ? next : x)) };
  return addAudit(
    updated, "booking_created", who,
    live ? `Booked ${slot.label} for ${r.address} on Cal.com (booking ${uid ?? "no id"}).` : `Test mode: would have booked ${slot.label} for ${r.address}. No calendar entry was made.`,
  );
}
