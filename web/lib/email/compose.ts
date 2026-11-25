// Sending by hand from Gmail: the app opens a Gmail compose window with the founder's address, the subject and
// the message filled in, signed in as the chosen account, and a person presses Send there. No password and no
// key are involved; the email leaves from that person's own mailbox.

/** A Gmail "compose" link. With an account given, Gmail opens that signed-in account. */
export function gmailComposeUrl(account: string | undefined, d: { to: string; subject: string; body: string }): string {
  const base = account ? `https://mail.google.com/mail/u/${encodeURIComponent(account)}/` : "https://mail.google.com/mail/";
  const q = [["view", "cm"], ["fs", "1"], ["to", d.to], ["su", d.subject], ["body", d.body]]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}?${q}`;
}
