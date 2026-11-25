// How an approved invitation leaves. "auto": the app sends it itself (through a mailbox over SMTP, or through
// Resend with a verified domain). "compose": the app cannot send to outside people on its own, so it hands
// the message to Gmail, a person presses Send, and then records it as sent.

import { smtpConfigured } from "./send";

export type SendChannel = "auto" | "compose";

export function sendChannel(env: Record<string, string | undefined> = process.env): SendChannel {
  if (smtpConfigured(env)) return "auto";
  const from = env.RESEND_FROM_EMAIL ?? "";
  // Resend's shared test sender only delivers to the Resend account's own address, so it is not a real channel.
  if (env.RESEND_API_KEY && from && !/@resend\.dev\b/i.test(from)) return "auto";
  return "compose";
}

/** The Gmail account the compose window should open, if one is configured. */
export function composeAccount(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.SMTP_USER?.trim() || undefined;
}
