# All In Capital – AI application screening

Separate project (not part of Sprinto). Screens inbound applications for All In Capital against a thesis reconstructed from past deal memos, partner notes and public sources. It suggests; Kushal decides every outcome.

## Where things are
- `docs/` – thesis, scoring framework, backtest and trial reports, research logs, the partner pack (`partner_pack.md` / `.docx`) and `build_plan.md`.
- `data/` – the case files, the 10 applications, and the backtest and trial-scoring results. Source: shared Drive folder "Startup Applications & Seed Data" (case brief from local Downloads).
- `web/` – the Next.js app (Vercel). **Built so far:**
  - the framework configuration and the deterministic scoring engine (`web/lib/framework/`), tested against the 12 backtest results and both trial passes;
  - intake: upload a deck and form (PDF), text read page by page (`lib/pdf.ts`), stored through a file store (local) or Neon (production, untested against a live database);
  - code-based recomputation of stated figures and deck-versus-form comparison (`lib/recompute.ts`, `lib/conflicts.ts`);
  - Gemini claim extraction behind an interface (`lib/llm`, `lib/extract.ts`), not yet run against the live API;
  - external research (`lib/research/`): the model plans 3 to 6 questions, each is answered with Google Search grounding, and a second call turns the answer into findings that may only cite pages the search returned (checked in code); every source is labelled press, regulator, aggregator, blog, vendor or unknown by domain; a portfolio-overlap check against the public list (incomplete, flagged as such); not-found results record what they prevent us judging. Written and tested with a fake model; not yet run against the live API;
  - scoring run (`lib/scoring/`): the model returns per-criterion status, score and quoted evidence; code checks every rule (no score on unknown, no score above 8, A3 stated-absence cap, evidence class, rule-dependence needs a quote) and every quote against the documents, retries once with the problems listed, then computes the score, coverage and lean with the tested engine. The portfolio flag comes from the research check, not the model. A reviewer can change the business types and the result is recomputed in code. Tested with a fake model; not yet run against the live API;
  - review (`lib/review/`): per criterion a reviewer accepts or corrects with a required one-line reason; corrections are layered over the model's scoring (both stay visible) and the result is recomputed in code; scores above 8 need a verification note; the reviewer records the final outcome, which may differ from the suggestion and is then kept as a disagreement; every step goes into a record of changes; scoring again archives the earlier review. There is no login, so the reviewer's name is self-declared and stored in the browser;
  - pages: `/` (the weights and thresholds in use), `/settings` (edit them, with reasons and history), `/evaluation` (backtest, stability and what-if on stored scores; no model call), `/applications` (upload and list), `/applications/[id]` (files, claims, conflicts, recomputed figures, research, scoring, review, decision, invitation email, record of changes).
  - correction memory (`lib/memory/`): next to each criterion the reviewer sees past corrections made on similar companies (same criterion; matched by business type, sector and how the model scored it), with the reason it matched. It is precedent, never a rule, and changes no score by itself. "Score again using past corrections" optionally shows the model the same precedent, labelled as not rules, and records which corrections it saw. First scoring has no precedent because the business types are not known until it has run. A company's own corrections are not shown back on itself;
  - email (`lib/email/`): after a reviewer records "Take a call", the model drafts a plain-text invitation offering Tuesday/Thursday afternoon 30-minute slots (Aditya joins only deeptech); code checks that it offers every slot exactly, says 30 minutes, has no links, no score or assessment and no promise of investment (one retry). The reviewer types the recipient, edits, approves and sends each email; any edit after approval cancels the approval. Test mode (the default) sends nothing and only records what would have been sent; live mode needs `SEND_MODE=live`, `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, allows 3 live emails per application and 10 a day, and blocks reserved addresses (.example and similar). No calendar is read. The Resend call is written but never run live;
  **Not built yet:** evaluation page, settings page (see `docs/build_plan.md`).

## Run locally
```
cd web
npm install
npm test            # scoring engine tests
npm run dev
```

## Configuration
Copy `web/.env.example` to `web/.env.local` and fill in the values yourself; `.env*` files are git-ignored. Names only: `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DATABASE_URL`, `STORE`, `SEND_MODE`. Email stays in test mode (`SEND_MODE=test`, nothing is sent) until you set it to `live`.

## Deployment (Vercel)
Set the project root directory to `web`, add the environment variables in Vercel's settings, connect a Neon database, and turn on Deployment Protection (a password for the whole site) because the app has no login. Nothing has been deployed.

## Status
Framework thresholds and weights are provisional until the partners decide (`docs/partner_pack.md`, section 7).


## Deployment and live checks (2026-11-24)
- Hosted on Vercel (project `all-in-capital-screening`, root `web`), storing data in Neon Postgres (`STORE=neon`, `DATABASE_URL`). Without a database the app shows a notice and falls back to the starting values.
- Model: `GEMINI_MODEL=gemini-3.8-flash` (Google retired `gemini-2.5-flash` for new keys). Long steps (extraction, research, scoring, email draft) have a 300-second function limit; scoring took about 2 minutes on a real application.
- Run live with the real model on one application (GrainKind): extraction, grounded research, scoring and email drafting all worked. The score (6.10, Further research required) is close to the two trial passes (6.32, 6.24). Resend and live sending have not been run; `SEND_MODE=test` is set.

- Calendar: Cal.com (`CAL_API_KEY`, `CAL_EVENT_TYPE_ID`, optional `CAL_EVENT_TYPE_ID_DEEPTECH`). Free slots come from Cal.com; booking a chosen time is a reviewer click and is recorded only, in test mode. See `docs/build_plan.md` section 5.
- Evals and the feedback loop: the Evaluation page has per-step evals against targets and a six-stage feedback-loop view with live counts; see `docs/evals_and_feedback_loop.md`.
- Emails page (`/emails`, in the sidebar with a badge for drafts awaiting review): every drafted invitation across applications, in tabs Awaiting review, Sent and Failed.
