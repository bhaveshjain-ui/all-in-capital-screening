# All In Capital – Investment Evaluation and Scoring Framework (v1, for partner review)

2026-11-24. Built on `investment_thesis.md` (the approved thesis). A design for review. No application is scored, no code is written, and no decision is made by the system.

## 0. Read this first: what this changes and what is unresolved

This framework follows your latest brief. It differs from decisions you made earlier in this session, so I list the differences instead of absorbing them silently.

| Item | Earlier approved (`scorecard_spec.md`) | This brief (applied here) |
|---|---|---|
| Scale | Four bands, no total | 0–10 per criterion, weighted total. The old bands survive as labels mapped to score ranges (section 3) |
| Weights | Left blank | Derived from the memos, with the method and its assumptions shown (section 4) |
| Missing information | A missing number drags the score (from Meeting 1) | **Never an automatic negative.** Reconciled in section 5 |
| Recommendation labels | Take the call / Hold for review / Likely pass | **Take a call / Further research required / Pass** |

**One conflict, now decided (confirmed by you, 2026-11-24).** Kushal said in Meeting 1 that "a missing number should drag the score, not be skipped" [N1]. The brief says missing information must never be treated as negative evidence automatically. Section 5 reconciles them as follows. Note that this is the user's decision in this session; the partners themselves have not yet seen or agreed it (see section 13):
- A metric that is simply **unknown** is not scored. It does not lower the score; it lowers *confidence and coverage* and blocks a "Take a call" until it is resolved.
- A metric the applicant **states they do not have** ("not measured yet") is real evidence and is scored.
- Skipping a gap silently is not allowed: every unknown is listed, with what it costs.

Labels used throughout: **FACT** (documented in the thesis or sources), **ASSUMPTION** (my design choice, changeable), **UNKNOWN** (not in any file or source).

## 1. How every criterion connects to the thesis

Each criterion cites its row in `investment_thesis.md` (section number and the row's own label and confidence). Criteria not in the thesis were not added. Sector and stage are **not** weighted criteria: the thesis says the sector label matters less than founder behaviour [N2, M11], and stage rules are unknown. They are reported as fit flags (section 8).

## 2. The criteria (11), with measurable parameters, anchors and evidence

Weight rationale is in section 4. Thesis confidence is the thesis document's rating of the criterion, not the evidence quality of a given application.

Scale labels used below: **Low (1–2)**, **Mid (5)**, **High (8)**. Intermediate scores interpolate between anchors (section 3). **0 is reserved for affirmative evidence of the opposite** (for example an explicit refusal to own a risk), never for missing information.

### A1. Founder–market fit (weight 22)
- **Thesis link:** 2.2 "Founder-market fit" (DOCUMENTED, High) and "Close-to-customer behaviour" (High). Memos M1, M3, M5, M9, M11; Inc42 interview.
- **Measurable parameters:**
  - (a) Years or role directly in the problem area, as stated.
  - (b) Customer or field contact with numbers (interviews, store or site visits, pilots, manual first operations).
  - (c) Lessons from failures or pilots described specifically.
- **Anchors:**
  - Low: background unrelated, or the case rests on credentials or passion only [M8, N3].
  - Mid: relevant background without customer-contact evidence, or contact evidence without relevant background.
  - High: relevant background plus specific, quantified customer contact.
- **Evidence required:** form founder fields; deck team and problem slides (for example "60 owner interviews"); external confirmation for 9–10.
- **Intake note:** all founder profiles in this batch are placeholders, so (a) is stated-only.

### A2. Founder owns the central risk (weight 13)
- **Thesis link:** 2.2 "Founder owns the central risk" (DOCUMENTED, High); 2.6 "Founder treats the central risk as someone else's problem" (High). M6, M8, M11, N2.
- **Central risk by business type** (from the memos; no precedent for other types): consumer brand → growth bought vs earned and repeat; lending → who bears credit loss; deeptech → customer, regulator, liability; dense-network or field operations → capital to reach density; regulation-dependent → rule change.
- **Measurable parameters:** (a) central risk named; (b) specific own mitigation (plan, hire, capital at stake, numbers); (c) delegation language ("the partner handles it", "solved later").
- **Anchors:**
  - Low: delegates or dismisses the risk [M6, M8].
  - Mid: names it with generic mitigation.
  - High: names it with specific own mitigation (credit-hire plan [M11], milestone sequence [M1]).
- **Evidence required:** form risk, funding and regulatory fields; funding of credit or advances; agreements; licence status.

### A3. Commercial fluency (weight 9)
- **Thesis link:** 2.2 "Operator fluency" (DOCUMENTED; High for consumer, Low elsewhere); 2.5 "Cohort data for consumer brands" (High). M2, M7, M12, N1.
- **Measurable parameters:** (a) key metrics for the business type provided (count against the list in the approved scorecard spec, section 4); (b) metrics reconcile when recomputed; (c) unmeasured items disclosed as such.
- **Anchors:**
  - Low: only top-line figures or averages; metrics that do not reconcile.
  - Mid: some key metrics, partly measured.
  - High: all key metrics given and reconciling.
- **Stated absence:** if the applicant says a key metric is not measured, score A3 on that statement; a stated absence of a key metric limits A3 to **4**. This reflects Petalry and Prepnest, where the observed absence was the evidence [M2, M12].
- **Evidence required:** form and deck figures, recomputed; cohort sheet if offered.

### A4. Team and commitment (weight 4)
- **Thesis link:** 2.2 "Complementary cofounders" (High) and "Commitment" (Medium). M1, M2, M3, M8, M9.
- **Parameters:** (a) coverage of technical and commercial/operational needs; (b) full-time status of founders; (c) core work outsourced or advisory-only.
- **Anchors:** Low: critical gap unaddressed (solo with no ops, core work outsourced); Mid: one named gap; High: complementary cover, founders full-time.
- **Evidence required:** team and form fields.

### A5. Candour and consistency (weight 4)
- **Thesis link:** 2.2 "Defensiveness is a signal" (DOCUMENTED, Medium) and "Candour" (INFERRED, Low). N1, M12. **An intake proxy only**: it records what paperwork shows and is not a measure of defensiveness under questioning.
- **Parameters:** (a) number of material deck-versus-form conflicts; (b) recomputation mismatches; (c) specificity of stated risks; (d) disclosure of unmeasured items.
- **Anchors:** Low: several material conflicts or overstated claims; Mid: minor framing gaps (gross vs net); High: documents agree and risks are specific.
- **Evidence required:** both documents read side by side; recomputed figures.

### B1. Customer evidence and traction quality (weight 18)
- **Thesis link:** 2.5 "Quality of evidence outweighs quantity" (INFERRED, Low) and "Signed pilot reopens a pass" (DOCUMENTED, Medium); 2.6 "Growth appears bought" (Medium). M2, M3, M8, M12.
- **Parameters:** (a) paying customers (count and trend); (b) repeat or retention evidence; (c) share of growth from paid channels; (d) whether traction metrics reconcile.
- **Anchors:** Low: no paying customer or vanity metrics only; Mid: some paying customers, short history; High: paying customers with repeat evidence, trend and reconciling figures.
- **Evidence required:** traction slide, form customer and revenue fields, recomputation.

### B2. Unit economics and margin path (weight 4)
- **Thesis link:** 2.4 "Positive or reachable contribution margin" (INFERRED, Low). M4 (and M2 secondary).
- **Parameters:** (a) gross margin or contribution stated; (b) CAC and payback recomputed; (c) path to positive stated.
- **Anchors:** Low: negative with no path; Mid: partly measured; High: figures reconcile with a path to positive.
- **Evidence required:** form and deck unit-economics figures, recomputed.

### B3. Regulatory and dependency path (weight 9)
- **Thesis link:** 2.3 "Regulation acceptable only with a founder plan" (DOCUMENTED, High). M1, M5, M8, M10, M11.
- **Parameters:** (a) material regulatory or partner dependency identified; (b) stated plan or milestone sequence; (c) whether existence depends on a favourable change (see disqualifier D2).
- **Anchors:** Low: depends on a favourable change, or ignores a material exposure; Mid: names it without a plan; High: names it with a plan or milestones.
- **Not applicable:** when no material exposure exists the criterion is N/A with a reason; N/A is excluded from the weighted average and recorded; it is not an unknown.
- **Evidence required:** form dependencies and risks; external research on the current rules.

### B4. Capital need against the ask (weight 9)
- **Thesis link:** 2.4 "Capital need must fit what the fund deploys" (DOCUMENTED, Medium). M1, M4, N1.
- **Parameters:** (a) ask against the cost of the stated next milestone; (b) capital needed to reach density or scale on the applicant's own numbers; (c) reliance on debt.
- **Anchors:** Low: needs far more capital than the ask to reach its milestone [M4]; Mid: tight; High: plan reaches the milestone within the ask.
- **Limit:** the fund's cheque size is UNKNOWN (public figures conflict), so this criterion uses the ask relative to the milestone only.

### B5. Why now (weight 4)
- **Thesis link:** 2.3 "Why now" (DOCUMENTED public, Medium; absent from all 12 memos). Inc42 interview.
- **Parameters:** a specific change in technology, behaviour or rules, with timing.
- **Anchors:** Low: none or "the market is growing"; Mid: generic trend; High: a specific named change tied to timing.

### B6. Competition and defensibility honesty (weight 4)
- **Thesis link:** 2.3 "Crowded markets are a risk, not a veto" (INFERRED, Low) and 2.4 "Product must not depend on one individual" (INFERRED, Low). M12.
- **Parameters:** (a) real alternatives named; (b) specificity of the stated advantage; (c) whether the product is the person; (d) external check of "no competitors" claims.
- **Anchors:** Low: "no competitors", or the advantage is one person; Mid: alternatives named, advantage vague; High: real alternatives named with a specific, checkable advantage.

## 3. The 0–10 scale (applies to every criterion)

| Score | Meaning | Labels used earlier |
|---|---|---|
| 9–10 | Meets the High anchor **and** is independently verified | Strong |
| 7–8 | Meets the High anchor on stated evidence that is internally consistent and recomputed | Strong |
| 5–6 | Mid anchor: partial evidence or mixed signals | Adequate |
| 3–4 | Between Low and Mid: weak, with some mitigating evidence (stated absence of a key metric lands here for A3) | Weak |
| 1–2 | Low anchor: clear evidence matching the memo-supported weak pattern | Weak |
| 0 | Affirmative evidence of the opposite (for example an explicit refusal to own the risk). **Never used for missing information** | Weak |
| Not scored | No evidence (Unknown or Not found) | Missing |

ASSUMPTION: without independent verification a score cannot exceed 8. The reason is that every founder profile and website in this batch is a placeholder, so nothing about the applicants can be verified from open sources; a ceiling avoids implying certainty the evidence cannot support.

## 4. Weights: method, numbers and rationale

**Method (FACT about the method; the inputs are my coding of the memos, which is INFERRED).** For each criterion I counted how many of the 12 memos name it in their own "Why we invested / Why we passed" text. A memo can name more than one criterion. Weight points equal that count. Four criteria have no primary mention, so each gets a **floor of 1 point (ASSUMPTION)**, so that criteria the thesis documents are not given zero weight. Weights are points divided by total points, rounded to sum to 100.

| Criterion | Memos naming it as a reason | Points | Weight |
|---|---|---|---|
| A1 Founder–market fit | M1, M3, M5, M9, M11 | 5 | **22** |
| B1 Customer evidence and traction | M2, M3, M8, M12 | 4 | **18** |
| A2 Owns the central risk | M6, M8, M11 | 3 | **13** |
| A3 Commercial fluency | M2, M7 | 2 | **9** |
| B3 Regulatory and dependency path | M8, M10 | 2 | **9** |
| B4 Capital need against the ask | M1, M4 | 2 | **9** |
| B6 Competition and defensibility | M12 | 1 | **4** |
| A4 Team and commitment | none (secondary in M2, M8) | 1 (floor) | **4** |
| A5 Candour and consistency | none (proxy) | 1 (floor) | **4** |
| B2 Unit economics | none (secondary in M2, M4) | 1 (floor) | **4** |
| B5 Why now | none (public wording only) | 1 (floor) | **4** |
| **Total** | | 23 | **100** |

Rationale in plain terms:
- **A1 is heaviest** because the memos name it most often and the public interview calls founder-market fit the core test.
- **B1** carries the next weight because three of the six passes (Petalry, AeroDrop, Prepnest) and one investment (Unbox) turned partly on the quality of traction evidence.
- **A2 is weighted below what the thesis's confidence might suggest.** The count gives it 13, though the thesis rates it High and Kushal stated it as a rule [N2]. If the partners think it deserves more, that is a parameter to change, and I flag it as the most likely adjustment.
- **Floor criteria** (A4, A5, B2, B5) have thesis support but no memo shows them deciding a case. Their weight is deliberately small and should be reviewed.
- **Not weighted:** sector and stage fit (section 8), and the portfolio conflict check (a disqualifier).

Limits (FACT): twelve memos is a small sample; the memos mix investments and passes; each "why" text was written after the decision. A one-point change in the count moves a weight by about 4 points. These weights should be treated as a starting position to be tested in the backtest, not as the fund's own priorities.

**Score calculation (in words).** The weighted score is the sum of each scored criterion's weight times its score, divided by the sum of the weights of the scored criteria only. Criteria that are N/A or not scored are left out of both sums and are reported. **Coverage** is the sum of the weights of the scored criteria, as a percentage of 100.

## 5. Missing information: how it is treated

Four different situations are kept apart:

| Situation | Example | Treatment |
|---|---|---|
| **Unknown** | EarnWise gives no revenue figure | Not scored. No penalty to the score. Lowers coverage and confidence. Listed with what it costs. Blocks "Take a call" if it concerns a key criterion (below). |
| **Stated absence** | "We have not measured acquisition cost yet" (CAPilot) | This is evidence. Scored on the statement; for A3 the cap is 4. |
| **Not found** | External research finds nothing | Recorded as not found with the cost of that absence; not scored, not negative. |
| **Not applicable** | No material regulatory exposure | N/A with a reason; excluded from both sums. |

Safeguards so that skipping a gap cannot flatter a thin file:
1. The weighted score is always shown with coverage and confidence beside it.
2. **Key criteria** must be scored before "Take a call" is possible: A1, A2, and the criteria that carry the business type's central risk and key metrics (approved scorecard spec, section 4). If a key criterion is Unknown, the recommendation is **Further research required**, and the output names the exact question or source that would resolve it. This keeps the intent of Kushal's N1 rule (do not be seduced by an incomplete file) without treating a gap as bad evidence.
3. Every Unknown generates a named follow-up: ask the applicant, run a specific search, or request a document the applicant offered (for example GrainKind's cohort sheet).

## 6. Confidence levels

**Per criterion (evidence quality):**

| Level | Rule |
|---|---|
| High | Independently verified (external source, or a document seen) |
| Medium | Stated, internally consistent, and recomputed where arithmetic exists |
| Low | Stated but unreconciled or contradicted between deck and form; or a proxy (A5); or a Low-confidence thesis criterion |
| Not scored | No evidence |

A contradicted claim uses the more conservative value and is rated Low.

**Per read (overall)**, reported as three numbers: coverage, share of scored weight at High/Medium/Low evidence confidence, and the number of contradictions. The overall label is **High** if coverage ≥ 85% and at least half the scored weight is Medium or better; **Medium** if coverage is 70–85%; **Low** otherwise. ASSUMPTION: these cut-offs are provisional and to be set from the backtest.

The thesis confidence (section 2) is kept as a separate attribute so a reviewer can see when a high score rests on a criterion the thesis itself rates Low.

## 7. Disqualifying factors (kept apart from the score)

They are reported before the score and never subtracted from it. None triggers an automatic rejection: Kushal sees every outcome [N5].

| # | Factor | Status in the thesis | Effect on the recommendation |
|---|---|---|---|
| D1 | Overlap with a portfolio company (including possible overlap) | FACT [N4]: default no unless the founder knows and the portfolio founder is told | **Further research required**: Kushal speaks to the portfolio founder first. Needs the full portfolio list, which is UNKNOWN (the public list is incomplete) |
| D2 | The business exists only if rules change favourably | FACT [M10]: "outside the areas we back" | Recommends **Pass**, for partner confirmation. Narrowly worded: the memos support this for a retail crypto exchange, not for any regulated business |
| D3 | Capital need far beyond what the fund deploys | FACT [M4] as a reason; no threshold given | Flag only; B4 carries it. Partners to rule on whether it is ever a stand-alone disqualifier |
| D4 | Later-stage, already-safe company | FACT (public interview), no rule on round size | Flag for partner ruling. UNKNOWN whether Series A is excluded |
| D5 | Sector outside the four named | UNKNOWN: the label matters less than founder behaviour [N2, M11] | Flag for partner ruling |

D3–D5 are shown because the thesis mentions them, but the files do not support treating them as disqualifiers. That is for the partners to decide.

## 8. Fit block (reported, not weighted)

For each application, once: sector as selected and as assessed, stage, source route, warm-intro relationship, and a **written-thesis vs observed-practice** comparison with a one-line reason where the two differ (you chose both lenses earlier). The weighted score is the same under both lenses.

## 9. From score to recommendation

Recommendations are suggestions for a human reviewer. Each comes with a one-line reason.

| Recommendation | Rule (provisional) |
|---|---|
| **Take a call** | Weighted score ≥ 7.0, **and** coverage ≥ 75%, **and** all key criteria scored, **and** A2 ≥ 5, **and** no unresolved D1 or D2 |
| **Pass** | (Coverage ≥ 75% **and** weighted score ≤ 4.0) **or** a confirmed D2 |
| **Further research required** | Everything else: score between 4.0 and 7.0, coverage below 75%, any key criterion unscored, or any D1 |

Rationale for each threshold:
- **7.0** is the lower edge of "High anchor met on stated, consistent evidence" in the scale (7–8). A score below 7 means the main evidence is at best partial.
- **4.0** is the top of "weak, with some mitigation" (3–4). A weighted average at or below it means most of the weight sits on weak evidence.
- **75% coverage** requires nearly all the weight to be evidenced, while allowing the four 4-point criteria and one more to be missing.
- **A2 ≥ 5** follows the documented rule that a founder who does not own the central risk should not reach a call (M6, M8, M10, N2).
- A **Pass** needs affirmative evidence: a thin file alone cannot be a Pass, because missing information is not negative evidence. It becomes Further research required.

Calibration points from the notes (FACT): Riya's earlier scores of 6.5 (Petalry) and 7.5 (AeroDrop) were both judged too high [N1, N3] because they skipped a missing number and counted pedigree. Both would fall under this framework: Petalry's key metric (repeat) is stated-absent (A3 ≤ 4), and AeroDrop's A1 is credentials-only. The 7.0 cut-off sits below Riya's 7.5, so whether it is high enough is **UNKNOWN until the backtest**.

**These thresholds are ASSUMPTIONS, not fund policy.** The backtest should adjust them, and the partners must agree the final values in advance, in writing and in numbers, before the system touches a real decision [B].

## 10. Human review

- The system proposes; Kushal decides every outcome [N5]. Nothing is auto-rejected or auto-advanced.
- Each output ends with a reviewer field: accepted or corrected, and a one-line reason for any change [N5].
- A correction records the application, the criterion, the old and new score, the reason, and tags (business type, central risk, sector). On later similar applications the reviewer is shown the past correction; it never changes a score by itself.
- The output always states: weighted score, coverage, confidence mix, disqualifier results, each unknown with its cost, and which lens changes the answer.

## 11. Backtest and calibration (summary)

- Score the 12 memo companies using only intake-time information; remove the "why we decided" text and the call-derived founder assessments.
- Compare each recommendation with the fund's decision. With 12 cases, report counts, name every disagreement, and classify it: fund likely wrong, system likely wrong, information not available at intake, or unresolved.
- Use the backtest to test the weights (for example, sensitivity to ±1 point per criterion) and the 7.0, 4.0 and 75% thresholds.
- Limit (FACT): the memos' strongest evidence, founder behaviour in the call, is not available at intake, so the backtest tests the paperwork-based criteria only.

## 12. Facts, assumptions and unknowns

**FACT (from the thesis and sources):** the criteria and their thesis links; the memo evidence cited; the notes' rules (separate founder quality from path to market, score evidence not pedigree, Kushal sees every outcome, one-line correction reasons); the portfolio conflict rule.

**ASSUMPTION (my design, open to change):** the memo-count method and the floor of 1 for four criteria; the cap of 8 without verification; the cap of 4 for A3 when a key metric is stated absent; the confidence cut-offs; the three recommendation thresholds; the reconciliation of N1 with your "never negative" rule; D2's narrow wording.

**UNKNOWN:** the fund's real weights; cheque size and ownership target; numeric traction thresholds; whether stage, healthcare, Series A or later rounds are excluded; the full portfolio list; sector-specific anchors for B2B SaaS, marketplaces and health; how much disagreement with past decisions is acceptable.

## 13. Questions for the partners
1. The missing-information rule (section 5) is confirmed for this project, but it departs from Kushal's Meeting 1 statement. Do the partners accept that, or do they want a missing key number to lower the score?
2. Is A2 (owning the central risk) heavier than 13?
3. Are the floor criteria (A4, A5, B2, B5) too small or too large?
4. Are 7.0, 4.0 and 75% acceptable starting thresholds?
5. Are D3, D4 and D5 disqualifiers, flags, or neither?
6. Full portfolio list, to make D1 reliable.
7. How much disagreement with the fund's past decisions is acceptable, in numbers?
