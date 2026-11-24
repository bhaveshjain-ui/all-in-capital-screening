# All In Capital – Scorecard Specification (v0, for partner review)

2026-11-24. A design document, not code. It turns `investment_thesis.md` into something an application can be read against. Nothing here is scored yet, and no application has been run through it.

## 0. Decisions already made (yours, this session)
| Decision | Choice |
|---|---|
| Thesis lens | **Both, side by side**: one evidence-based read per criterion; a separate fit block shows where the written thesis and observed practice would differ |
| Scale | **Four bands per criterion, no total** (Strong / Adequate / Weak / Missing). No single number |
| Weights | **Left blank as partner-set parameters.** Nothing invented |
| Output | **Read + named gaps + a "take the call?" lean**, always for Kushal to decide. No auto-reject or auto-advance [N5] |

## 1. Principles (each traced to a source)
1. Every band cites at least one piece of evidence; no evidence means **Missing** [B: "the source behind every claim"].
2. **A missing number drags the score; it is never skipped** [N1]. Missing is shown separately from Weak (not-known vs known-bad) but both count against the application.
3. **Founder quality and path to market are scored in separate blocks** [N3].
4. **Score the evidence, not the pedigree** [N3].
5. State plainly what could not be found and what the absence costs [B].
6. State which lens was used and where lenses differ [N5].
7. No written pass/fail checklist: criteria are weighed with evidence; only the flags in section 6 act as gates, and only conflicts hold an application automatically [N2, N4].
8. A correction carries a one-line reason so it can be reused [N5] (section 9).

## 2. The evidence record (the unit everything is built from)
Each claim extracted from an application is stored as:

| Field | Values |
|---|---|
| Claim | Text and the number if any |
| Location | Deck page or form field, or the URL for external evidence |
| Status | **Stated** (applicant says so), **Verified** (confirmed by an independent source), **Contradicted** (another source or the applicant's other document disagrees), **Unverifiable** (no way to check from open sources) |
| Recomputed? | If it is arithmetic, the recomputed value and whether it matches |

Rules:
- Deck and form are both read. A disagreement creates a **Contradicted** record on both and the band uses the **more conservative** value, with the conflict shown.
- Every figure that can be recomputed is recomputed (market sizes, ARR from MRR, payback from CAC and margin). Mismatches are recorded, not silently corrected.
- External research that finds nothing is recorded as "not found" with the cost of that absence. Applicant websites and LinkedIn URLs in this batch are placeholders, so founder checks will mostly be **Unverifiable**.

## 3. Criteria

Confidence is from `investment_thesis.md`. "Observable at intake" says whether a deck and form can show it.

### Block A – Founder (scored separately from Block B)

| # | Criterion | Strong | Adequate | Weak | Missing | Thesis confidence | Observable at intake |
|---|---|---|---|---|---|---|---|
| A1 | **Founder-market fit** (earned insight) | Direct prior experience in the problem plus stated evidence of close customer or field contact (visits, interviews, pilots, manual first operations) | Relevant background; customer contact thin or unstated | Background unrelated, or the case rests on passion or credentials | No background given | High | Partly. Stated only; cannot verify placeholders |
| A2 | **Owns the central risk** (see 4 for what the risk is per business type) | Names the risk and says how they bear or mitigate it (own numbers, plan, hire) | Names it with partial mitigation | Delegates it (to a partner, a regulator, "later") or contradicts themselves on it | Not addressed | High | Partly (form wording) |
| A3 | **Commercial fluency** (numbers they own) | Gives the sector's key metrics and they reconcile | Some metrics; honest about what is unmeasured | Only top-line figures or averages; metrics that do not reconcile | None given | High for consumer; Low elsewhere | Yes |
| A4 | **Team and commitment** | Technical plus commercial/ops cover for the hard parts; founders full-time | One named gap | A critical gap unaddressed (solo, no ops, core work outsourced) or a founder part-time | Team not described | High (cover); Medium (commitment) | Yes |
| A5 | **Candour and consistency** (intake proxy only) | Specific risks named; deck and form agree; unmeasured items disclosed as such | Minor framing gaps (for example gross vs net) | Material deck/form conflicts or overstated claims | — (cannot be missing) | Low as a proxy | Yes |

A5 is **not** a measure of "defensive when pushed" [N1]. That signal only appears in a call. A5 records what the paperwork shows and must be labelled as a proxy.

### Block B – Path to market

| # | Criterion | Strong | Adequate | Weak | Missing | Thesis confidence | Observable at intake |
|---|---|---|---|---|---|---|---|
| B1 | **Customer evidence and traction quality** | Paying customers with metrics that reconcile and trend; evidence beyond the founder's say | Some paying customers; thin or short history | No paying customers, or vanity metrics only (downloads, "thousands") | No traction information | Medium | Yes |
| B2 | **Unit economics and margin path** | Contribution/margin figures that reconcile, with a path to positive | Partly measured | Negative or unmeasured with no path | None given | Medium | Yes |
| B3 | **Regulatory and dependency path** | Names the regulation or partner dependency and a plan or milestone sequence | Names it; no plan | Depends on a favourable change, or ignores a material exposure | Not addressed | High | Partly; needs external research |
| B4 | **Capital need against the ask** | Plan reaches the next milestone inside the ask | Plausible but tight | Needs far more capital or density than the ask | Ask or use of funds absent | Medium | Yes (cheque comparison blocked, see section 8) |
| B5 | **Why now** | A specific change in technology, behaviour or rules tied to timing | Generic | None | Not addressed | Medium (public wording only; absent from the 12 memos) | Yes |
| B6 | **Competition and defensibility honesty** | Names real alternatives and a specific reason for advantage | Names alternatives; advantage vague | "No competitors", or the advantage is one person | Not addressed | Low | Yes, with external research |

When a criterion genuinely does not apply (for example B3 for a company with no material regulatory exposure), the band is **N/A with a one-line reason**. N/A is never used to avoid a Missing.

## 4. What the "central risk" and "key metrics" are, by business type
This table drives A2, A3, B1 and B2. It is built only from what the memos show; rows with no precedent are marked.

| Business type | Central risk (A2) | Key metrics (A3, B1, B2) | Precedent |
|---|---|---|---|
| Consumer brand | Growth bought rather than earned; repeat | Cohort repeat, CAC by channel, gross margin | M2, M7, N1 |
| Lending / credit | Who bears credit loss; licence and funding | Loss and delinquency data, funding source, credit-risk hire | M6, M11, N2 |
| Deeptech | Customer, regulator, liability | Named pilot or customer, regulatory milestone sequence | M1, M3, M8 |
| Dense-network or field operations | Capital to reach density; field execution | Contribution margin, same-store growth, field evidence | M4, M9 |
| Regulation-dependent (crypto etc.) | Rule change | Plan if rules do not change | M10 |
| B2B SaaS, marketplaces, health, other | **No memo precedent** | Generic: paying customers, retention, CAC payback | UNKNOWN |

For the last row the scorecard uses the generic metrics and says "no memo precedent". Whether partners want sector-specific anchors there is an open question (section 8).

## 5. Missing data: how it counts
- Missing and Weak are separate bands but both reduce the lean.
- Every read has a **"what we could not find, and what that costs"** section, listing each Missing band with its consequence (for example "no repeat rate: cannot assess whether CAC is survivable [N1]").
- Proposed rule (partner to confirm, section 8): a Missing on a criterion that is a key metric for the business type (section 4) prevents a lean of **Take the call** unless a partner overrides.

## 6. Fit flags and gates (reported, not banded)

| Flag | Trigger | Effect | Source |
|---|---|---|---|
| **Portfolio conflict** | Any overlap with a portfolio company, including possible overlap | **Hold**: Kushal speaks to the portfolio founder first. Prefer a false alarm over a miss | N4 |
| Stage | Round stage outside pre-seed/seed | Flag for partner ruling | P-Inc42-23, P-site |
| Sector | Sector outside the four named, or label differs from what the business does | Flag; lens table shows written vs observed | B, N2 |
| Regulation-dependent existence | Business exists only if rules change favourably | Strong flag (not an automatic exclusion) | M10 |
| Capital intensity | Needs far more capital than the cheque | Flag, also reflected in B4 | M4 |
| Warm route | Intro from a portfolio founder or co-investor | Recorded; relationship to be noted for conflicts and routing | N4, N5 |

**Prerequisite:** the conflict check needs the **full portfolio list**. The public list is incomplete (section 7 of `fund_public_research.md`). Until partners supply it, every conflict result is "checked against the public list only".

## 7. Thesis lens block (reported once per application)

| Item | Written lens | Observed-practice lens | Differs? |
|---|---|---|---|
| Sector | In one of fintech, deeptech, consumer tech, consumer brands? | Consistent with the portfolio tilt (B2B software, commerce infrastructure)? | Yes / No, with a one-line reason |
| Stage | Pre-seed? | Pre-seed or seed? | Yes / No |
| Founder behaviour criteria | Not in written wording | Documented in memos and interviews | Shown |

Bands in section 3 are the same under both lenses. Only this block and the final lean note differ. The system states which lens, if either, changes the lean.

## 8. Lean logic (all thresholds are parameters for the partners)
Lean values: **Take the call**, **Hold for review**, **Likely pass**. The lean is a suggestion for Kushal; a one-line reason is always attached.

Rules supported by the files:
- Portfolio conflict → **Hold** [N4].
- A2 (owns the central risk) Weak → cannot be **Take the call**. Supported by six pass memos and rated High confidence [M6, M8, M10, N2].
- Block A strong but Block B weak, or the reverse → show both; do not blend into one number [N3].

Rules I propose but the files do not state (needs partner confirmation):
- Missing key metric caps the lean at **Hold** (section 5).
- The number of Weak bands that moves **Hold** to **Likely pass**.
- Whether a Strong block compensates for a Weak block.

Parameters left blank:
| Parameter | Status |
|---|---|
| Criterion weights | Not given by the files; partners to set |
| Weak-count threshold for Likely pass | Partners to set |
| Cap rule for Missing key metrics | Proposed, to confirm |
| Healthcare and other sectors: in or out | Partners to rule |
| Series A and larger rounds | Partners to rule |
| Cheque size and ownership target | Public figures conflict; partners to state |
| Sector-specific anchors for SaaS, marketplaces, health | No memo precedent |
| Treatment of B5 (why now) | Public wording only; weight unknown |
| Backtest agreement threshold ("how often it may disagree") | Partners to set before use |

## 9. Output per application (template)
1. **Header:** company, sector (as selected and as assessed), stage, ask, source route, date read.
2. **Flags and fit block:** conflicts, stage, sector, lens table.
3. **Block A and Block B tables:** band, one-line reason, evidence references with status (Stated / Verified / Contradicted / Unverifiable).
4. **Contradictions and recomputed figures.**
5. **What we could not find, and what it costs.**
6. **External research summary,** each claim sourced; "not found" stated.
7. **Lean + reason line, and confidence of the read** (for example "X of 11 criteria rest on Stated, unverified evidence").
8. **Reviewer field:** accepted / corrected, and a one-line reason.

**Correction memory (design only).** A correction record holds: application, criterion, original band, corrected band, the one-line reason, and tags (business type, central risk, sector). On a later application with matching tags, the system shows similar past corrections to the reviewer. It never changes a band by itself. This is the design; nothing is built.

## 10. Backtest design (summary)
- Score each of the 12 memo companies using only what would have been known at application time. Strip the "why we decided" text, the decision label and the partners' call-derived founder assessment (it comes from meetings, not intake). What remains is thin: the "what it does" line, source and sector.
- Compare the lean with the fund's actual decision. With 12 cases, report **counts**, not percentages, and name each disagreement.
- Classify each disagreement: fund likely wrong, system likely wrong, information not available at intake, or unresolved. Kushal's own doubts (Prepnest, Ledgerly) are noted [N5]; Ledgerly is not in the pack.
- State the leakage guard and the thin-input limit in the report, because the memos' strongest signals (founder behaviour in the call) are not available to the system.

## 11. Illustrative check against the memos
A sanity test of whether the criteria separate the cases the way the fund did. It **uses call-derived information from the memos that would not exist at intake**, so it shows the design is coherent, not that the system would reproduce the decisions.

| Case | Block A | Block B | Result under the rules |
|---|---|---|---|
| Petalry (passed) | A3 Weak (no cohort data), A4 Weak (solo, no ops), A2 Weak (unaware of the gap) | B1 Adequate, B2 Missing (repeat not tracked) | Cannot be Take the call; matches |
| CampusCredit (passed) | A2 Weak (default risk "the NBFC's problem"), A1 Weak (no credit experience) | B3 Adequate | Cannot be Take the call; matches |
| Jai Kisan (invested) | A1 Strong (field first), A2 Strong/Adequate (credit-hire plan) | B3 Adequate | Eligible for Take the call; sector flag raised and resolved by A2; matches |
| AeroDrop (passed) | A1 Strong on credentials only; A2 Weak ("solved once the tech works") | B1 Missing (no customer), B3 Weak | Cannot be Take the call; Riya's 7.5 mixed pedigree into the score, and separate blocks show it |
| HopBox (passed) | A1 Strong, A3 Strong | B4 Weak (needs far more capital), B2 Weak | Strong Block A, Weak Block B: shown separately, lean Hold or Likely pass per partner threshold; matches only if that threshold is set |
| Coinlane (passed) | A1 Adequate | B3 Weak and regulation-dependence flag | Strong flag; lean depends on how partners treat the flag |
| Prepnest (passed) | A3 Weak (no retention numbers) | B1 Missing (retention not shown) | Cannot be Take the call; the "defensive" signal is not capturable at intake |

Findings from the check:
- A2 and the two-block structure do the work in most cases.
- HopBox and Coinlane only come out right if partners set thresholds for how a Weak B-block or a regulation flag counts; the files do not set them.
- Prepnest's decisive signal (defensiveness) cannot be measured from paperwork.

## 12. Questions for the partners (blocking or shaping)
1. Weights, or a rule for how Strong/Weak combine, if any.
2. Missing key metric: cap at Hold?
3. How many Weak bands, if any, make **Likely pass**?
4. Healthcare, other sectors, and Series A: in or out?
5. Cheque size and ownership target.
6. Full portfolio list (needed before any conflict result can be trusted).
7. Sector-specific anchors for B2B SaaS and marketplaces, or keep the generic ones?
8. Is "why now" a scored criterion or context only?
9. How much disagreement with the fund's past decisions is acceptable before the system is trusted? (The brief asks for this agreed in advance, in numbers.)
