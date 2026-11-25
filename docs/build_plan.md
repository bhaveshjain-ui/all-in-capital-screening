# Build plan – All In Capital screening web app

2026-11-24. Decisions from you: a web app with no login, hosted on Vercel; Gemini for scoring, extraction, research reading and email drafting; Resend to send email; Neon Postgres for storage; keys supplied by you as environment variables (I never read them); a Vercel Deployment Protection password in front of the site.

The framework (`scoring_framework.md`) is still provisional until the partners decide. All weights, thresholds and rules live in one configuration file so changing them never means rewriting code.

## 1. Architecture
- **Frontend and API:** Next.js (App Router, TypeScript) in `web/`, deployed on Vercel with `web` as the root directory.
- **Storage:** Neon Postgres through `@neondatabase/serverless`. A file-based store with the same interface is used for local development and tests, selected by an environment variable, so nothing needs credentials to run the tests.
- **Model calls:** Gemini through `@google/genai`, behind one interface (`lib/llm`), with structured JSON output validated by `zod`. Research uses Gemini with Google Search grounding so every finding carries its source URLs.
- **Email:** Gemini drafts, a reviewer approves, Resend sends. See section 4.
- **No login.** Access is controlled by Vercel Deployment Protection (one shared password for the whole site), not by the app.

## 2. Modules and build order
| # | Slice | What it does | Needs keys? |
|---|---|---|---|
| 1 | Framework config and scoring engine | Weights, criteria, thresholds, key criteria by business type; weighted score, coverage, conflict and rule-dependence gates, lean. Tested against the 12 backtest results and the 20 trial results (both passes) so the TypeScript reproduces the numbers already reported. **Built 2026-11-24** | No |
| 2 | Intake | Upload a deck and form (PDF); extract text; store. **Built 2026-11-24** (file store tested; Neon store written, untested live) | No |
| 3 | Claim extraction and recomputation | Gemini extracts claims and figures into a schema; deterministic code recomputes market sizes, ARR, payback, per-unit figures; flags deck-versus-form conflicts. **Built 2026-11-24**: recomputation and comparison tested; the Gemini call is written but not yet run against the live API | Gemini |
| 4 | External research | Competitors, rules, portfolio overlaps; every source logged; "not found" recorded with its cost. **Built 2026-11-24**: planning, grounded search, citation checks, source labels and portfolio check are tested with a fake model; the live Gemini search call is untested. Research runs one question per request so each stays inside a function time limit | Gemini |
| 5 | Scoring run | Rubric prompt returns per-criterion status, score, evidence quote and class; the engine computes the result; all stored. **Built 2026-11-24**: rule and quote checks, one retry, evaluation and business-type override are tested with a fake model; the live Gemini call is untested. Audit trail so far: model, time, attempts and thresholds used; per-change logging comes with the review slice | Gemini |
| 6 | Review screens | Application list; one-page read (criteria, sources, gaps, flags, lean); reviewer accepts or corrects with a one-line reason. **Built 2026-11-24**: accept, correct (reason required, tags stored), final decision with agreement tracking, record of changes, archive on re-score; logic tested, and the flow was driven end to end in the browser. The reviewer's name is self-declared because there is no login | No |
| 7 | Correction memory | Corrections tagged by business type, central risk and sector; shown to the reviewer on similar applications, never applied automatically. **Built 2026-11-24**: matching and display tested and viewed in the browser; optional precedent in a re-score is tested with a fake model. Similarity is a simple rule-based score (shared business type, sector, similar model score); "central risk" is not yet a separate tag | No |
| 8 | Email and scheduling | See section 4. **Built 2026-11-24** (email only): drafting with checks, approval, guarded sending, test mode by default, audit entries; logic and guards tested with a fake sender and the flow driven in the browser in test mode. The Resend call and live mode have never been run. Slot times (2:00 and 3:30 pm IST) and the 2-day lead are assumptions the partners should confirm. Calendar integration is not built | Gemini, Resend |
| 9 | Evaluation page | Applies the current weights and thresholds to the stored backtest and trial scores: agreement counts, stability between the two passes, threshold grid, one-point weight sensitivity, what-if values, and real reviewer decisions recorded in the app. **Built 2026-11-24.** It does not call the model, so it shows the effect of the settings, not model quality; reproducing the reported numbers is tested | No |
| 10 | Settings page | The partner-set parameters (weights, thresholds, cap rules), with change history. **Built 2026-11-24**: weights must be whole numbers adding to 100, take above pass, reason required, history kept; new scoring uses saved values, and an existing result keeps its own until someone presses Recompute (no model call). Key criteria by business type are not editable yet | No |

## 3. Guardrails that are part of the design
- The system proposes; Kushal decides every outcome. No application is rejected or advanced automatically.
- Missing information is never scored as negative; unknowns are listed with what they cost (confirmed rule).
- Every claim carries its source and status (Stated, Verified, Contradicted, Unverifiable).
- Every model output is validated against a schema; invalid output is rejected and shown as an error, never silently repaired.
- Every score, correction, email draft and send is logged with who and when.

## 4. Email and scheduling, and why it is built this way
- **Gemini drafts** an invitation to a first call for an application the reviewer has marked promising. It never sends.
- **A reviewer approves each email** on screen, edits if needed, and clicks send. The server sends through Resend only for an approved draft, to one recipient, and refuses repeated or bulk sends.
- **Recipient:** the applications contain no email addresses (only placeholder websites and one placeholder address), so the reviewer types the address. There is no sending to addresses the app invents.
- **Test mode first:** `SEND_MODE=test` writes the email to the log and sends nothing. Live sending needs `SEND_MODE=live`, a verified Resend domain and a from-address that you set.
- **Slots:** the rule from the notes (Tuesday or Thursday afternoons, 30 minutes, Aditya joins only deeptech) proposes the next slots. v1 does not read anyone's calendar, because a hosted app needs a Google OAuth setup first; the reviewer confirms availability. Calendar integration is a later step.

## 5. Environment variables (names only; you supply the values)
`GEMINI_API_KEY` · `RESEND_API_KEY` · `RESEND_FROM_EMAIL` · `DATABASE_URL` (Neon) · `STORE=file|neon` · `SEND_MODE=test|live` · `GEMINI_MODEL`
These go in `web/.env.local` for local use and in Vercel's environment settings for the deployment. `.env*` files are git-ignored.

## 6. What stays open
- The partners' nine decisions (`partner_pack.md`) change configuration values, not code.
- The full portfolio list with aliases is needed before the conflict check can be trusted; until then it is "checked against the public list only".
- Vercel and Neon need your accounts: creating the Vercel project, connecting Neon, setting the environment variables and turning on Deployment Protection are steps you do or approve; I will not deploy or send anything without your explicit go-ahead.
- Gemini's exact model name and grounding behaviour will be confirmed when the first key is available; the model call is isolated so this is a one-file change.

## 5. Calendar: Cal.com (built 2026-11-24)
- **Slots:** when `CAL_API_KEY` and `CAL_EVENT_TYPE_ID` are set, the invitation offers only times Cal.com shows as free, restricted to the partners' rule (Tuesday or Thursday afternoons, at least two days ahead, at most two per day, four in total). Without them it falls back to the fixed rule and the screen says so. If Cal.com is set up but errors or shows nothing free, drafting stops with a plain message; it never offers unchecked times.
- **Booking:** once an invitation has gone out and the applicant replies with one of the offered times, a reviewer clicks that time. In live mode this creates the Cal.com booking (Cal.com then emails the applicant its own invite) after a confirm prompt; in test mode (default) it only records the choice. One booking per invitation.
- **Assumptions to confirm with the partners:** "afternoon" is taken as 12:00 to 18:00 IST; Cal.com's own availability sets the real hours. The account's only 30-minute event type (`30min`, id 7442184) is used for every call. Aditya for deeptech needs a separate event type with him as a host: set `CAL_EVENT_TYPE_ID_DEEPTECH`; until then deeptech uses the same event type and the email says Aditya joins, so he must be added by hand.
- **Not covered:** Google Calendar (replaced by Cal.com on your instruction), reading the partners' own calendars directly (Cal.com does that through its connected calendars), rescheduling and cancelling.

## 6. Tailored invitations and model retries (built 2026-11-24)
- **Tailored email:** the model reads the company's own extracted facts and the opening of its deck, and writes exactly one neutral sentence about what the company builds, with the exact words from the deck or form that the sentence rests on. Code then checks that the sentence is in the body, has no numbers, and that the quote really appears in the applicant's document (retry once, then fail loudly). The email also fails the checks if it praises or judges the company, or quotes any figure. The screen shows the reviewer the sentence and its source quote so it can be verified and edited. Run on the real model for three different companies (food, industrial IoT, travel): each draft passed on the first attempt, and Aditya was added for the deeptech one.
- **Retries:** Gemini sometimes answers 503 "high demand" or 429 for a few seconds. Calls now wait 3, 8 and 20 seconds and try again on those temporary errors only; a bad key or a retired model is still reported at once. This was found when two of three parallel runs failed at extraction on a 503.

## 7. Point of contact from Hunter.io (built 2026-11-24)
- **What it does:** on the Summary tab (right below the company details) and on the Email tab, a "Point of contact" card. "Find the contact" takes the company's website from the application (form first, then deck), asks Hunter for the addresses on that domain, and ranks them: a founder named in the application first, then senior titles, then Hunter's confidence. It shows each address with Hunter's verification status and confidence, and "Use this" picks one. A new invitation draft is addressed to the selected one; the reviewer still approves every send.
- **Credit protection:** Hunter's free plan is 50 credits a month (about 5 searches were left on 24 Nov, resetting 12 Dec). The lookup runs only when a reviewer clicks, uses at most two searches (one domain search, plus one founder-specific search only if the founder is not already named), and makes no call for a placeholder website such as `.example`. The key travels in a header, never in a URL.
- **Nothing is guessed:** with no website, a placeholder website, or no result, the card says so and the reviewer types the address. An address is pre-selected only when it is a named founder, or Hunter's confidence is 70 or more.
- **Limit worth knowing:** the 20 sample applications use placeholder websites, so the lookup cannot return anything for them. It will work for real applicants who give a real website.

## 8. Learning loop additions (built 2026-11-25)
- **Retrieval marks:** next to each criterion, every retrieved past correction now has "Useful" and "Not useful" buttons. A mark is accepted only for a correction that was really shown for that criterion on that application, and a later mark replaces an earlier one. Step 4 on the Evaluation page is now the share of marks that are useful, with its sample size (about ten marks are needed before it means anything).
- **Email edits as precedent:** each draft keeps the model's first version. When a reviewer rewrites a draft and approves it, the before-and-after becomes an example; the next drafts (for other applications) are shown the latest two as wording preferences, with an instruction to take style only and never names or facts. Every code check on the draft still applies. The draft's "Why this wording" fold-out lists which earlier edits shaped it, and the record of changes says so.
- **Still not captured:** corrections to extraction output; recall of facts the extraction missed (needs a checked list of the right facts per application).

## 9. All ten sample applications through the real pipeline (run 2026-11-25)
Each went through extraction, four grounded research questions and scoring with `gemini-3.8-flash` (about 3 to 7 minutes each, three at a time). They are in the live database as "CAPilot", "CareCorner" and so on, undecided.

- **Completed:** 10 of 10 scored; no research question failed; 2 scorings needed a second attempt after a code check (EarnWise, StockSathi).
- **Against the earlier two trial passes** (the same sample applications, scored by agents in this project): the mean absolute difference in the weighted score is 0.25 (0.00 to 0.62; trial passes differed from each other by 0.27). Every live suggestion equals at least one trial pass. Two are "Pass" (EarnWise, as in both trial passes; RentRoute, as in trial pass 2) and eight are "Further research required". None is "Take a call", as before.
- **Biggest score moves:** Pumpwise +0.62 above the trial average, EarnWise -0.53, RentRoute -0.49.
- **Criteria that move most between the live run and the trials** (mean absolute difference, scored in both): B5 why now 1.50 (only 5 cases), A3 commercial fluency 1.00, A4 team 0.85, A5 candour 0.85, B4 capital need 0.83. The most stable: A1 founder-market fit 0.20 and B1 customer evidence 0.30, the two heaviest weights.
- **What this does and does not show:** the live model behaves like the trial scorers on these ten, and agrees most on the criteria that carry the most weight. It does not show that the scores are right: no partner has scored these applications, and there is no outcome data.

## 10. Sending from a mailbox (built 2026-11-25)
- Resend can only send from a domain the sender owns and has verified, so it cannot send as the user's school address. Sending now also works through a real mailbox over SMTP (Gmail): when `SMTP_USER` and `SMTP_PASSWORD` (a Google App Password) are set, live sends go out from that address, appear in its Sent folder, and replies land there. Without them the app falls back to Resend.
- The From address is always the signed-in account (Gmail ignores any other). The founder's address still comes from Hunter, and every guard is unchanged: a "Take a call" decision, an approved draft, one validated recipient, 3 live emails per application, 10 a day, and no repeat to the same address within 24 hours.
- A refused sign-in is reported as "use a 16-character App Password", and an unreachable server as "nothing was sent".
- **Current way of sending (chosen by the user, 2026-11-25): Gmail by hand.** The user does not want to use an App Password, so the app cannot sign in to the mailbox itself. After a draft is approved, its button becomes "Open in Gmail": it opens a Gmail compose window for `bhaveshjain.work.10@gmail.com` with the founder's address (from Hunter, if selected), the subject and the approved message filled in. The reviewer presses Send in Gmail, then "I sent it" in the app, which records it as sent and unlocks booking a time. The text must be the approved text, to a valid address, behind a "Take a call" decision, or "I sent it" is refused. The app cannot see whether Gmail really sent it, so "I sent it" is the reviewer's word.
- The mailbox-over-SMTP code stays in the app, switched off: it activates by itself if `SMTP_USER` and `SMTP_PASSWORD` are ever set. So does a verified Resend domain (`RESEND_FROM_EMAIL` on it). Either turns the button back into an automatic "Send".
