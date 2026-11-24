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
