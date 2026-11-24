# Evals and the feedback loop

2026-11-24. Source: two course slides ("Recap: Feedback Loop" and "The Score Says Something Is Wrong. Evals Say Where."), read from photographs. Where a word in the photographs was hard to read it is marked.

## What the slides say

**Slide 1: the feedback loop.** Six stages in a circle:
1. **Signal**: observes outcomes and receives feedback from the environment.
2. **Capture**: relevant data and observations are collected.
3. **Store**: collected data is indexed, organised and committed to memory.
4. **Retrieve**: relevant past learnings are accessed from memory.
5. **Apply**: learnings are integrated to refine subsequent actions.
6. **Act**: the system performs an action or produces an output.

**Slide 2: per-step evals.** One overall score can only say something is wrong; a per-step eval says where.

| Pipeline step | The eval asks | Score vs target (slide's example) | Diagnosis (slide's example) |
|---|---|---|---|
| 1. Extract background | Did it find the right facts? | 95% (target 90%) | Passing. Not the problem. |
| 2. Portfolio conflicts | Did it flag overlaps (past investment)? | 60% (target 90%) | Missing context. Needs full portfolio list. |
| 3. Score application | Does the call match fund rubrics? | 80% (target 83%) | Borderline. Inspect specific misses. |
| 4. Pick corrections | Did it retrieve relevant past notes? | 92% (target 90%) | Passing. Retrieval functions properly. |
| 5. Draft email | Does it clear all voice checks and email drafting rubrics? | 85% (target 90%) | Failing despite notes. Prime fine-tuning candidate. |

**Diagnostic ladder:** overall score = the alarm; Riya's notes = the suspect; per-step eval = the exact location.

The percentages in the "Score vs target" column are the slide's worked example, not results from this project. Only the targets (90, 90, 83, 90, 90) are taken over, as provisional values for the partners to confirm.

## How this maps onto the project

| Slide idea | In this project | Status |
|---|---|---|
| Signal | Reviewer corrections, accepts, decisions, email edits | Built |
| Capture | Corrections keep criterion, original and corrected score, one-line reason, who, when, tags | Built for scores. Email edits are logged as a fact only; the changed text is not kept as a lesson (gap) |
| Store | Neon database, audit log | Built |
| Retrieve | Rule-based similar-correction lookup (business type, sector, model score) | Built; accuracy not measured |
| Apply | Optional re-score with precedent | Built for scoring only. Not yet applied to email drafting or extraction (gap). Deliberately not automatic: the partners said written rules become checklists |
| Act | Scoring, extraction, drafting | Built |
| Per-step evals | The Evaluation page, section "The score says something is wrong. Where?" | Built for what can be measured; see below |
| Riya's notes | Reviewer corrections and reasons | Built |

## Per-step evals: what is measured today

| Step | Measured how | Status |
|---|---|---|
| 1. Extraction | Share of extracted claims whose quote really appears in the document (catches invented facts, not missed ones) | Measured live (small sample so far) |
| 2. Portfolio | Needs the fund's full portfolio list and applications with known overlaps | Not measured; the known gap is the missing list |
| 3. Scoring | Backtest on 12 past memos, strict match with the fund's decision: 5 of 12 = 41.7%, against a target of 83% | Measured. Soft disagreements (research where the fund decided) would give 91.7%; the partners have not said which definition applies |
| 4. Corrections retrieval | Needs a "useful / not useful" mark from reviewers on retrieved notes | Not measured |
| 5. Email | Share of drafts passing every code check on the first attempt; also how many drafts reviewers edited | Measured live (small sample so far) |

Every measured number shows its sample size and says "too few to judge" under 10. A step with no real measurement shows "Not measured" and what it needs, never a number.

## What to build next, from the slides

1. A "useful / not useful" mark on each retrieved past correction, to measure step 4.
2. A checked list of the right facts for a few applications, to measure what extraction misses (step 1).
3. Keep the text a reviewer changed in an email draft and feed such edits back as precedent for later drafts (the loop's Capture and Apply stages for step 5). The slide calls the email step a fine-tuning candidate; with this few examples, prompt precedent comes first.
4. The fund's full portfolio list with aliases, to make step 2 measurable.
5. Partners to confirm the targets and which definition of "match" applies to scoring.
