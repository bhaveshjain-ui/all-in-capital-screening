# Backtest protocol (written before any scoring)

2026-11-24. Fixed in advance so the results cannot shape the rules. Applies `scoring_framework.md` to the 12 deal-memo companies.

## 1. What is tested
Whether the framework's recommendation (Take a call / Further research required / Pass) lines up with what the fund actually did on the 12 memo companies (6 invested, 6 passed).

## 2. Inputs, and the leakage limits
- **Strict intake (variant A):** only the memo's "What it does" line. This is all that is available if intake means a short company description.
- **Screening-call facts (variant B):** a neutral fact sheet drawn from the memo's "What it does", "Founder assessment" and "Risks and open questions". Removed: the decision, the stage label and the source (they would give away the outcome), the whole "Why we invested / Why we passed" section, and any sentence that states a conclusion (for example "that answer decided it", "unaware of the gap", "strongest part of the file", "right instinct").
- **Limits that remain (FACT):**
  - The partners' founder impressions and risk lists were written knowing the outcome. Some residual bias in them cannot be removed.
  - Variant B uses call-derived information that would not exist at application intake. It tests whether the framework is coherent on rich evidence, not whether it works on a deck and form.
  - I (the author of the fact sheets) had read the full memos before extracting facts, so the extraction is not blind. The scoring is blind (below).
  - The partner notes were not used.

## 3. Blind scoring
Variant B is scored by fresh agents that see only the rubric and the fact sheets, in sets of three cases, with no knowledge of any decision. They return per-criterion status, score, evidence quote and evidence class as JSON. Weighted scores, coverage and recommendations are then computed mechanically by a script from the framework's own weights and thresholds. Variant A is assessed directly from the "What it does" text.

## 4. Fixed computation rules (from `scoring_framework.md`)
- Weights: A1 22, B1 18, A2 13, A3 9, B3 9, B4 9, A4 4, A5 4, B2 4, B5 4, B6 4.
- Weighted score = sum(weight × score) / sum(weights of scored criteria). Statuses "scored" and "stated_absence" count as scored; "unknown" and "na" do not.
- Coverage = sum of weights of scored criteria / (100 − weights of "na" criteria). The framework text says "% of 100"; excluding N/A weights from the denominator is my reading, and the raw percentage of 100 is reported too.
- Key criteria (my assumption, because the framework refers to a table without listing it): A1 and A2, plus by business type: consumer brand → A3, B1; lending → A3, B3; deeptech → B1, B3; dense-network or field operations → B2, B4; regulation-dependent → B3; other → B1, B2.
- **Take a call:** score ≥ 7.0, coverage ≥ 75%, all key criteria scored, A2 ≥ 5, D2 not "triggered" or "possible".
- **Pass:** coverage ≥ 75% and score ≤ 4.0, or D2 "triggered".
- **Further research required:** everything else.
- D1 (portfolio conflict) is not testable here (no portfolio list; none of the memos describes a conflict).

## 5. Agreement definition (fixed before results)
| Fund decision | System says | Counted as |
|---|---|---|
| Invested | Take a call | Agree |
| Invested | Further research required | Soft disagreement (the human review would still proceed) |
| Invested | Pass | Hard disagreement |
| Passed | Pass | Agree |
| Passed | Further research required | Soft disagreement (not advanced; a partner still sees it) |
| Passed | Take a call | Hard disagreement |

With 12 cases, results are reported as counts. Every disagreement is named and classed as: fund likely wrong, system likely wrong, information not available at intake, or unresolved.

## 6. What this backtest cannot show
- It does not measure real-world outcomes of the invested or passed companies (none are given).
- It does not test deck-and-form reading, contradiction detection, external research or the conflict check.
- Thresholds tuned on these 12 cases would overfit; any tuning is reported as such and not used to claim accuracy.
