# All In Capital – application screening: partner review pack

For Kushal, Aditya and Riya. Prepared 2026-11-24. This is a **design and trial for your review**, not a system in use. Nothing here decides anything; every outcome stays with Kushal.

## 1. What we are asking you for
We reconstructed the fund's thesis from your memos and meeting notes, public sources and the 10 inbound applications, and designed a scoring framework that reads each application criterion by criterion, shows the source behind every claim, names what it could not find, and suggests one of three leans: **Take a call**, **Further research required** or **Pass**. We tested it on your 12 past memos and trial-scored the 10 live applications twice. The numbers and thresholds are provisional. **We need your decisions on the nine questions in section 7** before anything is used on a real application.

## 2. How it works, in one screen
1. Read the deck and form together. Recompute every figure that can be recomputed. List every place the deck and form disagree.
2. Look up public information on competitors, rules and portfolio overlaps, and record what was not found.
3. Score 11 criteria from 0 to 10, each tied to a line in the thesis and to a quoted source. Missing information is left unscored and listed, never silently filled in.
4. Check two things separately from the score: a possible portfolio conflict, and whether the business exists only if rules change.
5. Show the score, how much of it rests on evidence (coverage), how reliable the evidence is, and a lean with a one-line reason. You review it; a correction carries a one-line reason so a similar company can be shown the same note later.

## 3. The thesis as we reconstructed it
Confidence: **High** = stated by the fund and supported by several decisions; **Medium** = stated once or consistent with a few decisions; **Low** = one decision, or conflicting sources. Full table with sources: `investment_thesis.md`.

| What we found | Where it comes from | Confidence |
|---|---|---|
| India, pre-seed **and seed** (the case brief says pre-seed only) | Fund website | High |
| Founder-market fit: what founders know and can do | Public interview, memos | High |
| The founder owns the central risk (credit, regulation, liability, repeat) | Meeting 2, memos CampusCredit, Jai Kisan, AeroDrop | High |
| Consumer brands: founders must know cohort repeat, CAC, margins | Memos Giva, Petalry, Prepnest | High |
| Evidence over pedigree; defensiveness is a signal | Meetings 1 and 3 | High / Medium |
| Portfolio conflict: default no unless the portfolio founder is told | Meeting 4 | High |
| Regulation is fine with a founder plan; not if the business needs the rules to change | Memos ePlane, AeroDrop, Coinlane | High |
| "Why now" matters | Public interview only, absent from all 12 memos | Medium |
| Portfolio tilts to B2B software and commerce infrastructure, more than the four named sectors | Official portfolio list; Riya's observation | Medium (inferred) |
| Cheque size, ownership target, exclusions, weights | Not published; public cheque figures conflict | Unknown |

## 4. The scoring framework in brief
| Criterion | Weight | Why this weight |
|---|---|---|
| Founder-market fit | 22 | Named as a reason in 5 of 12 memos |
| Customer evidence and traction | 18 | Named in 4 of 12 |
| Founder owns the central risk | 13 | Named in 3 of 12 (the thesis rates it High, so this may be too low) |
| Commercial fluency | 9 | Named in 2 |
| Regulatory and dependency path | 9 | Named in 2 |
| Capital need against the ask | 9 | Named in 2 |
| Team and commitment; candour and consistency; unit economics; why now | 4 each | Documented in the thesis, but no memo cites them as a deciding reason; this floor is our assumption |
| Competition and defensibility | 4 | Named in 1 |

- **Scale:** nothing scores above 8 without independent verification. All applicant profiles and websites are placeholders, so nothing could be verified.
- **Missing information is not a negative.** Unknown items are not scored; they lower coverage and block "Take a call" if they concern a key criterion. An applicant stating "we have not measured CAC" is evidence and is scored. This departs from Kushal's Meeting 1 remark that a missing number should drag the score (question 1).
- **Leans (provisional):** Take a call = score at least 7.0, coverage at least 75%, key criteria scored, owns-the-risk at least 5, no open conflict or rule-dependence. Pass = score at most 4.0 with coverage at least 75%, or a confirmed rule-dependence. Everything else = Further research required, with the exact gaps named.

## 5. How it behaved when tested
**On your 12 memos** (scored blind from neutral fact sheets; the memos' own "why we decided" text was removed). Counts, not rates, because 12 is too few:
- Agree 5 (all five were passes the system also called a Pass), soft disagreement 6 ("research required" where you had decided), hard disagreement 1 (ePlane, called a Pass on one inferred traction score).
- No memo reached "Take a call". Every invested company scored above every passed one, but your pass memos naturally carry more negative detail, so we do not treat this as skill.
- Detail: `backtest_report.md`.

**On the 10 live applications** (two independent scoring passes). Scores are the two passes; coverage was 87–100%.

| Application | Score | Lean | Flags |
|---|---|---|---|
| GrainKind | 6.2–6.3 | Further research | Clean file; no material conflicts |
| Pumpwise | 5.6–5.8 | Further research | Deeptech: Aditya's second call |
| CareCorner | 5.5–5.6 | Further research | Healthcare: outside the four sectors |
| Settlr | 4.5–5.3 | Further research | Series A (INR 30 Cr): stage ruling |
| Talkbook | 5.0–5.2 | Further research | **Likely overlap with MeetRecord** |
| Yatrika | 4.9–5.1 | Further research | Deck overstates versus form |
| StockSathi | 4.8–5.2 | Further research | **Possible overlap with SuperK**; conflicts on CAC and on how credit is funded |
| CAPilot | 4.7–4.8 | Further research | Deck counts trial firms as paying |
| RentRoute | 4.0–4.3 | Further research / Pass (flips) | Possible rule-dependence (RBI rent-by-card rule, press-reported) |
| EarnWise | 3.1–3.3 | **Pass** (both passes) | Four material deck-versus-form conflicts |

- **Stability:** nine of ten leans were the same in both passes; scores moved by 0.27 points on average. Leans close to a threshold are not stable (RentRoute). Both scorers were the same kind of model, so human reviewers may differ more.
- **What it caught reliably:** deck-versus-form conflicts, arithmetic slips (market sizes 10× off in three decks), omitted competitors, and portfolio overlaps.
- Detail: `trial_scoring_report.md`.

## 6. Questions to resolve for each application
| Application | Resolve before a call |
|---|---|
| GrainKind | Cohort sheet and co-packer agreement (both offered); why-now; the 90-day window for the August cohort |
| Pumpwise | Accuracy and false-alarm data; churn; certification path; the sizing assumes 60 sensors per customer, the real average is 23 |
| CareCorner | Clinic-level P&Ls (offered); registration status in Telangana; ramp of clinics two and three; whether healthcare is in scope |
| Settlr | Stage; who funds and bears loss on the financing book; loss data; market sizing |
| Talkbook | **Kushal's conversation with the MeetRecord founder first** [Meeting 4]; reconcile MRR (2.1, 1.9 or 1.7 L); call-recording rules |
| Yatrika | 12-month milestones and use of funds; gross margin; share of bookings from the founder's agency base |
| StockSathi | Who funds the credit; the CAC basis; lending while unregistered as an NBFC; the SuperK overlap; the Fund I introducer |
| CAPilot | CAC (not measured); gross margin including AI compute; when the churns happened |
| RentRoute | How the model fits the September 2025 RBI rule; the aggregator agreement; revenue shown gross versus net |
| EarnWise | The founder-background discrepancy; team and client counts; revenue; the NBFC agreement |

## 7. Decisions we need from you
1. **Missing numbers:** accept "unknown is not scored, but blocks Take a call", or restore Kushal's rule that a missing key number lowers the score?
2. **Weights:** is "owns the central risk" worth more than 13 of 100? Are four criteria at 4 each too small or too large?
3. **Thresholds:** keep 7.0 / 4.0 / 75%? No application reaches 7.0 on stated evidence (the best is 6.3). Should a band of about 0.5 around each threshold always mean "research required"?
4. **Scope rulings:** is Series A out? Is healthcare out or judged on founder behaviour, as Jai Kisan was? How should B2B software that selected "consumer tech" be treated?
5. **Portfolio list:** please provide the full list with former names (MeetRecord appears to have been renamed). Without it every conflict check is partial.
6. **Pre-revenue deeptech:** should traction and capital need count differently when there is no revenue, as with ePlane?
7. **Explicit zero on "owns the risk":** may it support a Pass below 75% coverage (the CampusCredit case)?
8. **Acceptable disagreement:** how often may the system differ from you, and how should we count a "research required" where you decided? Your brief asks for this agreed in numbers before any use.
9. **Written or observed thesis:** should scoring follow the public wording, your observed practice, or show both (we show both)? And please name the three passes you feel uneasy about (Prepnest? the missing Ledgerly notes).

## 8. Limits to keep in mind
- Founder behaviour in a call, your main variable, cannot be seen from paperwork. The system records proxies only.
- All applicant websites and LinkedIn profiles are placeholders; founder claims are unverified.
- External findings are from search summaries (press and vendor pages), not primary documents; several pages were blocked.
- Weights come from 12 memos written after the decisions; thresholds are our proposal.
- Not built or tested: calendar booking (Tuesday/Thursday, 30 minutes, Aditya for deeptech), the correction memory, any live system. These are designs only.

## 9. Files (`docs/` and `data/`)
`investment_thesis.md` (thesis with sources and confidence) · `scoring_framework.md` (criteria, weights, thresholds) · `backtest_report.md` · `trial_scoring_report.md` · `application_analysis.md` (deck-versus-form findings) · `external_research.md` · `fund_public_research.md` · `data/` (case files, applications, backtest and trial results).
