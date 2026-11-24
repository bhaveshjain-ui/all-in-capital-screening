# Backtest report – framework vs. the fund's 12 past decisions

2026-11-24. Protocol: `backtest_protocol.md` (fixed before any scoring). Framework: `scoring_framework.md`. Inputs and per-criterion results: `data/backtest/` (fact sheets, rubric, compact results). The scores were produced by four fresh agents that saw only the rubric and neutral fact sheets, three cases each, with no knowledge of any decision. Weighted scores, coverage and recommendations were then computed mechanically from the framework's weights and thresholds.

**Read the limits in section 6 before using any number here.** Twelve cases is far too few to estimate an accuracy rate, and the fact sheets carry content written after the outcomes were known.

## 1. Headline

| | Count |
|---|---|
| Agree | 5 (all five are passes the system also recommended Pass on) |
| Soft disagreement (system said Further research required where the fund had decided) | 6 (five investments, one pass) |
| Hard disagreement | 1 (ePlane, invested, system said Pass) |
| Cases the system recommended **Take a call** | **0** of 12 |

On the same evidence, every invested company scored higher than every passed company (36 of 36 pairs): invested 3.81–5.73 (mean 4.94), passed 1.70–3.18 (mean 2.69). That ordering is a notable result, but see the confounds in section 6 before reading it as skill.

## 2. Variant A: strict intake (only the memo's "What it does")
I assessed this variant directly rather than with agents, because it is nearly empty.
- The line gives no evidence on almost every criterion. At most one criterion (customer traction, B1) can be scored for Petalry (orders, no repeat data), Coinlane (users only) and Prepnest (downloads only). Coverage is 0–18% for all 12.
- Under the framework a file with coverage below 75% cannot be a Pass or a Take a call, so **all 12 are Further research required**, which is a soft disagreement with each of the fund's 12 decisions.
- This says something about the data, not the framework: a one-line company description is not an application. The deck-and-form test (the 10 live applications) is the real intake test and this backtest cannot stand in for it.

## 3. Variant B: screening-call facts (blind scoring)

| Case | Fund | Type | Score | Coverage | A2 | D2 | Recommendation | Result |
|---|---|---|---|---|---|---|---|---|
| ePlane | Invested | deeptech | 3.81 | 84% | 4 | possible | Pass | **Hard** |
| Petalry | Passed | consumer brand | 3.17 | 83% | 2 | no | Pass | Agree |
| Unbox Robotics | Invested | deeptech | 5.73 | 78% | 5 | no | Further research (B3 unscored) | Soft |
| HopBox | Passed | field operations | 3.18 | 87% | 1 | no | Pass | Agree |
| Wint Wealth | Invested | other | 5.05 | 57% | – | possible | Further research (A2, B2 unscored) | Soft |
| CampusCredit | Passed | lending | 1.70 | 61% | 0 | possible | Further research (coverage) | Soft |
| Giva | Invested | consumer brand | 5.23 | 87% | 6 | no | Further research (score below 7) | Soft |
| AeroDrop | Passed | deeptech | 2.48 | 88% | 1 | possible | Pass | Agree |
| SuperK | Invested | field operations | 4.31 | 91% | 5 | no | Further research | Soft |
| Coinlane | Passed | regulation-dependent | 2.97 | 74% | 1 | **triggered** | Pass | Agree |
| Jai Kisan | Invested | lending | 5.53 | 66% | 5 | possible | Further research (A3 unscored) | Soft |
| Prepnest | Passed | other | 2.62 | 81% | 2 | no | Pass | Agree |

Coverage is the weight of scored criteria over the weight of applicable criteria (N/A removed). Per-criterion scores, statuses and evidence classes are in `data/backtest/results_*.json`.

## 4. The disagreements, one by one

Class key: system likely wrong · framework design issue · information not available at intake · rule working as designed.

**ePlane (invested → system Pass). Hard.** Class: system likely wrong on this evidence, and a framework design issue.
- The Pass rests on B1 (customer traction) = 1. The agent inferred it from the risk line "first revenue is far away" and itself noted the sheet does not say there were no customers. That is an inference, tagged as a proxy. With B1 left unknown, the score is 4.58 and the recommendation becomes Further research required (a soft disagreement). One inferred score therefore decides the only hard disagreement.
- Separately, the framework treats every business type alike. The fund's stated reason for ePlane (deeptech at the earliest stage, where the founder is most of the investment) is documented in the thesis but is not reflected in how B1 and B4 are weighted for pre-revenue deeptech. The founder criteria did score well (A1 = 7), but the traction and capital criteria pulled the total down. Whether pre-revenue deeptech needs different treatment is a partner decision.

**CampusCredit (passed → system Further research). Soft.** Class: rule working as designed; information not available.
- The score is 1.70, the lowest of the 12, and A2 = 0 (an explicit refusal to own credit risk). Coverage is 61% because customer traction, unit economics and capital need are unknown, so the rule that a thin file cannot be a Pass applies.
- Question for the partners: should an explicit zero on the owns-the-central-risk criterion be able to support a Pass at lower coverage? That would change the Pass rule.

**Five investments → Further research required** (Unbox, Wint Wealth, Giva, SuperK, Jai Kisan). Class: information not available at intake; the 7.0 threshold was not reachable on this evidence.
- Unbox: key criterion B3 unscored. Wint Wealth: coverage 57%, A2 and B2 unscored. Giva: complete enough (87%) but 5.23, with no figures behind the founder's fluency. SuperK: 4.31, thin margins and limited same-store data. Jai Kisan: coverage 66%, A3 unscored.
- Under the agreement definition these are soft: a partner would still see each one, with its named gaps. They also show that with this kind of evidence the system would never advance anything on its own.

**Coinlane (passed → Pass, counted as agree).** Its Pass depends on two things: one agent's judgement that D2 was "triggered" (the other agents marked similar regulatory cases "possible"), and coverage of 74%, one point under the 75% gate. With D2 at "possible", Coinlane would be Further research required. Treat this agreement as fragile.

## 5. Sensitivity (these checks are descriptive; none changes the framework)

- **Weights ±1 point on any criterion, renormalised:** no recommendation changes (0 flips across 22 perturbations).
- **Take-a-call threshold from 6.0 to 8.0:** no effect, because no case scores above 5.73.
- **Pass threshold:**

| Pass at or below | Agree | Soft | Hard |
|---|---|---|---|
| 3.0 | 3 | 9 | 0 |
| 3.5 | 5 | 7 | 0 |
| 4.0 (framework) | 5 | 6 | 1 |
| 4.5 | 5 | 5 | 2 |
| 5.0 | 5 | 5 | 2 |

  A threshold near 3.5 removes the hard disagreement. I do **not** recommend adopting it: it would be tuned on the same 12 cases, which is overfitting. It is reported only to show how close the framework's 4.0 sits to the gap between the highest passed case (3.18) and the lowest invested case (3.81).

## 6. Limits and confounds

1. **The fact sheets are not clean.** The partners wrote the founder impressions and risk lists knowing the outcome. Pass memos contain more negative material by their nature (they explain why the fund declined), so the 36-of-36 ordering may partly reflect how the memos were written, not whether the framework can tell good from bad.
2. **The fact sheets were extracted by me after reading the whole memos.** I removed decisions, stage labels, sources, the "why" sections and conclusion sentences, but what I kept was a judgement. Scoring was blind; extraction was not.
3. **One agent scored each case.** No inter-rater check was run, so I cannot say how much the scores depend on the scorer. D2 shows it: similar regulatory cases received "triggered" in one set and "possible" in others.
4. **The evidence is richer than intake would give** (it includes call observations and partner risk lists) **and also poorer** (no figures; the memos rarely give numbers). That is why no case reached the High anchor on stated evidence.
5. **Some scores are inferences.** Twelve scored criteria are tagged as proxies across the 12 cases, including ePlane's B1. The rubric says missing information is never negative, and inferring a score from a partner's risk note comes close to breaking that rule.
6. **n = 12.** One case is 8 percentage points of any rate. With six invested and six passed, a single reclassification moves a half of the agree count.
7. **What this backtest cannot test:** deck-and-form reading, contradiction detection, external research, the portfolio conflict check, calibration of confidence labels, and real outcomes (none of the companies' later results are given).

## 7. What the partners should decide (none applied)
1. **Is no "Take a call" on this evidence acceptable?** If the 7.0 threshold needs a High anchor met on stated evidence and memos rarely contain figures, the live applications (which do contain figures) are the real test. Do the partners want to keep 7.0 until the 10 applications have been scored?
2. **Pre-revenue deeptech:** should traction (B1) and capital (B4) be treated differently when the stage is pre-revenue, given the documented reason for ePlane?
3. **Should an explicit zero on A2 allow a Pass below 75% coverage** (the CampusCredit case)?
4. **A rule against inferring scores from partner risk notes:** apply "missing is not negative" strictly to risk statements. For the live applications there are no partner notes, so this mainly protects replays of the memos.
5. **How much disagreement with the fund's past decisions is acceptable?** On these 12: 5 agree, 6 soft, 1 hard, and 0 Take-a-call. The brief wants this agreed in numbers before real use; the partners have not set it.
6. **A second blind scoring of the same fact sheets** would show how stable the scores are. I did not run one.

## 8. Next
The 10 live applications are the proper test of the framework as designed. The framework and its thresholds are provisional and have not been reviewed by the partners; scoring the live applications now would be a trial run, to be labelled as such.
