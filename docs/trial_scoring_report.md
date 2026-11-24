# TRIAL scoring of the 10 inbound applications

2026-11-24. **This is a trial run for partner review, not a screening decision.** The framework (`scoring_framework.md`) and its thresholds are provisional and the partners have not seen them. Every lean below is a suggestion for Kushal, who decides every outcome.

Method: five fresh agents, two applications each, read only the deck text, the form text and the external research log (`external_research.md`), with the application rubric in `data/trial_scoring/rubric_apps.md`. They did not see my earlier analysis, so their contradiction and arithmetic checks are an independent check of it. Per-criterion results are in `data/trial_scoring/apps_*.json` (compact: statuses, scores, evidence classes, contradiction and recomputation counts). A script computed weighted scores, coverage and leans from the framework's weights and thresholds. One scorer read each application.

## 1. Results

| Application | Score | Coverage | Owns central risk (A2) | D1 conflict | D2 rule dependence | Lean |
|---|---|---|---|---|---|---|
| GrainKind | **6.32** | 96% | 6 | none | no | Further research required |
| CareCorner | 5.64 | 96% | 6 | none | no | Further research required |
| Pumpwise | 5.57 | 100% | 4 | none | no | Further research required |
| StockSathi | 5.19 | 100% | 4 | **possible** (SuperK) | **possible** | Further research required |
| Yatrika | 5.08 | 91% | 4 | none | no | Further research required |
| Talkbook | 5.00 | 91% | 4 | **likely** (MeetRecord) | no | Further research required |
| CAPilot | 4.83 | 96% | 4 | none | no | Further research required |
| Settlr | 4.51 | 96% | 3 | none | no | Further research required (stage ruling) |
| RentRoute | 4.30 | 96% | 3 | none | **possible** | Further research required |
| EarnWise | **3.15** | 92% | 3 | none | unknown | **Pass** (for partner confirmation) |

**Take a call: 0. Further research required: 9. Pass: 1.**

Why nothing reaches "Take a call": the bar is a weighted score of 7.0 on stated evidence. The highest score (GrainKind, 6.32) comes close but has partner-dependency (B3 = 4), competition (B6 = 4) and a missing why-now. Under a 6.0 threshold GrainKind alone would qualify; at 4.5 for Pass, RentRoute would join EarnWise. These sensitivity points are descriptive, not a proposal.

Stability checks: changing any weight by one point flips no lean. A second independent scoring was run afterwards and is reported in section 6: nine of ten leans were unchanged. The table above is the first pass.

## 2. Per application

Format: strongest criteria · weakest criteria · deck/form conflicts · arithmetic · flags · what to resolve.

**GrainKind (6.32).** Strongest: founder-market fit, commercial fluency, traction, unit economics and team (all 7). Cohort repeat 31/34/38%, channel CACs that recompute to the blended INR 337–340, margin and LTV/CAC all reconcile. Weakest: dependency path (4: one co-packer, platforms 45% of revenue, no second source) and competition (4: omits Tata Soulfull, Slurrp Farm, and PepsiCo's Kurkure Jowar Puffs, which overlaps a hero SKU). No why-now. Conflicts: none material (Jowar puffs repeat caveat appears only in the form). Arithmetic: TAM and SAM are 10× above the applicant's own inputs (9,120 and 1,440 Cr against 91,200 and 14,400). Flags: none; revenue run rate reads closer to late pre-seed or seed. Resolve: the cohort sheet and co-packer agreement it offered, a why-now, and the 90-day window for the late-August cohort (data runs to October).

**CareCorner (5.64).** Strongest: founders' clinical and operating backgrounds (7), team (7), commercial figures (6), capital plan (6: 47% of the ask equals five clinics at INR 28 L each). Weakest: regulatory path (3: no licensing item named; Telangana status unknown) and competition (3). Conflicts: the deck says Tier-2 India while evidence comes from three Hyderabad suburb clinics (material); the deck omits the INR 40 L bank loan. Arithmetic: market sizes reconcile; mature revenue per clinic is 3.6× today's average. Flags: healthcare is outside the four named sectors; stage reads late. Resolve: clinic-level P&Ls (offered), registration status, ramp of clinics two and three.

**Pumpwise (5.57).** Strongest: founder fit (7), commercial detail (6), traction (6), unit economics (6). Weakest: owns the central risk (4: no accuracy or false-alarm data, no liability stance), certification path (4: only a budget line), competition (4: omits Indian and academic alternatives). Conflicts: the market sizing assumes 60 sensors per customer while the real average is 23 (material). Arithmetic: cumulative subscription revenue (0.9 L implied) is below what the ramp suggests (up to 3.0 L); subscription-only payback is 5.0 months against "under 4"; the 12-month MRR target needs about 53 sensors per customer. Flags: deeptech, so Aditya runs the second call [N3, N5]. Resolve: accuracy data, churn, named certification, customer references.

**StockSathi (5.19).** Strongest: founder fit (7), commercial figures (6), capital plan (6). Weakest: candour and consistency (3), regulatory path (3: lends from its own capital while "not registered as an NBFC"), owns the central risk (4). Conflicts: retailers 38 vs 42; CAC INR 2,860 in the deck vs "under 2,000" in the form (material); credit "from our own capital, NBFC in discussion" vs "through our NBFC partner, we take first loss" (material); repeat 22 of 38 vs 22 of 42. Arithmetic: payback on trade margin alone computes to about 7.2 months (deck says 5.5, which needs credit fees); current GMV per store is about INR 10,000 against a sizing assumption of INR 1.2 L. Flags: D1 possible (SuperK serves the same owners and plans Telangana); D2 possible (trade-credit rules not researched); intro came through a Fund I portfolio founder. Resolve: who funds the credit, the CAC basis, the NBFC partner's identity, the SuperK overlap.

**Yatrika (5.08).** Strongest: founder background (7: ten years and 3,000 families in a family agency), revenue reconciles (6). Weakest: why-now (3), competition (3: GuavaTrips, 30 Sundays, Gumo and others omitted), owns the central risk (4: partner quality named without a plan). Conflicts, three material: "thousands of travellers" vs about 1,300; "strong brand… growing across India" vs two states and referral-led; "AI plans trips" vs 40 route templates and manual WhatsApp confirmation. Arithmetic: paid acquisition of about INR 640 per booking is about 57% of commission per booking (about INR 1,130) if all bookings were paid. Unknown: capital need (no milestones or split of funds). Resolve: milestones, gross margin after refunds, share of bookings from the founder's agency base.

**Talkbook (5.00).** Strongest: team (7), why-now (6). Weakest: competition (3: "no India-first player" is contradicted by several Indian vendors, vendor-reported), candour (4). Conflicts: MRR is 2.1 L (deck), 1.9 L (form) and 1.7 L from 340 seats × INR 500; the INR 13,000 per team does not follow from the seat count; payback is 5.3 to 6.5 months. Flags: **D1 likely**: MeetRecord (possibly renamed Outdoo AI) does AI call summaries and CRM-linked insights for sales teams; sector label "consumer tech" looks wrong (B2B SaaS). Resolve: the portfolio-conflict conversation per [N4] before anything else, an MRR reconciliation, call-recording rules (not researched).

**CAPilot (4.83).** Strongest: founder-market fit (6), team (6), capital plan (6). Weakest: acquisition cost "not measured yet", so commercial fluency and unit economics are scored as stated absences (3 each); competition (3). Conflicts: 31 paying firms in the deck vs 24 paying plus 7 on trial in the form (material). Competition: dedicated GST notice-reply tools exist outside the deck's table, and one lists INR 999/month unlimited against CAPilot's INR 2,500–6,000. Unknown: why-now. Resolve: CAC, gross margin including AI compute, when the two churns happened, GST data-access terms.

**Settlr (4.51).** Strongest: traction (6), team (6). Weakest: owns the central risk (3), commercial fluency (3), competition (2: no competition slide; TReDS operators and others omitted). Conflicts: who funds the INR 13.5 Cr financing book and who bears loss is ambiguous (material). Arithmetic: TAM, SAM and SOM are each 10× below the stated inputs; payback computes to 3.7 months against 7; volume per SME is about INR 0.9 Cr a year against 4.5 Cr in the sizing; fee income (about 34 L) leaves most of the INR 78 L net revenue unexplained. No loss data. Flags: Series A (INR 30 Cr, INR 180 Cr post), outside the fund's stated stage, a partner ruling. Resolve: loss and delinquency data, NBFC terms, the funding of the book.

**RentRoute (4.30).** Strongest: traction (6: 6.1 Cr over four months, 1,100 paying users). Weakest: owns the risk (3), team (3: contract developers only), candour (3), regulatory path (3), competition (2). Conflicts, three material: revenue INR 11 L (gross) vs net 5.5 L; 1,900 users vs 1,100 paying; the deck omits the single-aggregator dependency and says "no direct competitors" (contradicted by press history). Commercial fluency and unit economics are scored as stated absences (4) because cost per paying user is unmeasured. Flags: D2 possible: press reports an RBI rule (15 Sep 2025) that restricts card payments to merchants contracted with the aggregator; how RentRoute's route complies, having launched in July 2026, is unanswered. Resolve: the aggregator agreement, the applicant's explanation, the rule text.

**EarnWise (3.15), Pass for partner confirmation.** Weakest: candour (1), commercial fluency (2), owns the risk (3), team (3), founder fit (3). Four material conflicts: the founder's background (deck: Goldman, Google, IIM Ahmedabad; form: a 10-week internship, a 5-month vendor contract, a tier-2 MBA, 18 months at a payments startup); team size 12 vs 5; clients 3 live vs 1 live and 2 in pilot; the departed co-founder and advances funded by an NBFC agreement "in principle" plus the founder's savings. No revenue or fee figure in either file; TAM is 10× lower than its own inputs and counts advance volume. The Pass rests on conflicts and stated facts, not on missing information (the unknown fee, cost of funds and competitors were left unscored). D2 is unknown because how employer-deduction wage advances are treated under RBI rules was not found. This lean should be read by a partner before it is acted on.

## 3. Across the batch
- **Deck-and-form conflicts are the most useful output.** Material conflicts: EarnWise 4, Talkbook 3, Yatrika 3, RentRoute 3, StockSathi 2, CAPilot 1, CareCorner 1, Pumpwise 1, Settlr 1, GrainKind 0. The scorers found every conflict in my earlier analysis (written separately) and added others (StockSathi's trade-margin payback, Settlr's fee income, Pumpwise's subscription revenue, CareCorner's Tier-2 framing).
- **Recomputation flags** appear in all ten applications, but some flags are inferences or missing inputs rather than arithmetic errors (for example RentRoute's indicative CAC, Yatrika's top-down market, CareCorner's 3.6× clinic ramp). The clear arithmetic mismatches are: market size 10× off in GrainKind, EarnWise and Settlr; Settlr's payback and fee income; Talkbook's MRR and per-team revenue; Pumpwise's subscription revenue and 12-month target; StockSathi's trade-margin payback.
- **Competition claims** were contradicted or incomplete in nine applications (CAPilot, CareCorner, GrainKind, Pumpwise, RentRoute, Settlr, StockSathi, Talkbook, Yatrika), mostly because the decks omit named competitors; two claims were directly contradicted (RentRoute's "no direct competitors", Talkbook's "no India-first player"). EarnWise's competition was left unscored because neither file mentions any.
- **Why-now** was unknown for six, so it carried no weight for them.
- **Fit flags for partner rulings:** CareCorner (healthcare), Settlr (Series A), Talkbook (label and MeetRecord), StockSathi (SuperK adjacency), Pumpwise (deeptech routing).

## 4. Weak points in this trial
1. **Single scorer per application in the first pass** (a second pass followed; see section 6). The capital-need criterion (B4) shows the variation risk: seven applications received a proxy score (class P, inferred from the use-of-funds line), one (CareCorner) a score on stated evidence, and two (Talkbook, Yatrika) were left unknown for the same kind of gap (no burn or runway figure). That inconsistency moves scores by a few points on a 9%-weight criterion. A second independent pass would measure this.
2. **A5 (candour) is a proxy** and scored from conflicts; it carries only 4% weight but drives how a reviewer reads an application.
3. **External evidence is secondary.** Competitor and rule findings come from search summaries (press, vendor pages), not primary documents. They contradict claims; they do not prove them.
4. **Comparison with the backtest is loose.** Backtest scores ran 1.70–5.73 on thinner evidence (coverage 57–91%); these run 3.15–6.32 with 91–100% coverage. Rich evidence gives more positive and more negative scores, so the ranges are not directly comparable.
5. **Placeholders.** Founder claims and websites are unverifiable, so no score above 8 and no "verified" class was possible.
6. **Business types are my assignments** (for example StockSathi as network and lending, RentRoute as regulation-dependent), and they decide which criteria count as key. The partners may classify some differently.

## 5. Decisions for the partners
1. Is a 7.0 bar for "Take a call" right, given that the best application scores 6.32 on stated evidence and nothing can exceed 8 without verification?
2. Confirm the Pass for EarnWise, and decide how conflicts like its founder-background discrepancy should be treated going forward.
3. Rule on stage (Settlr), sector (CareCorner, Talkbook's label) and the portfolio conflicts (Talkbook with MeetRecord; StockSathi with SuperK).
4. Supply the full portfolio list with aliases (MeetRecord appears to have been renamed).
5. Decide whether a band around each threshold should always route to Further research (see section 6); the second pass shows the scores move by about 0.3 points between scorers.

## 6. Second independent pass (stability)
Five fresh agents re-scored all 10 applications with the same rubric and inputs, in different pairings, without seeing the first-pass results. Results are in `data/trial_scoring/pass2/`.

**Leans.** Nine of ten are unchanged. Only RentRoute differs: 4.30 in the first pass (Further research required) and 3.97 in the second (Pass), on either side of the 4.0 Pass line. EarnWise is Pass in both (3.15 and 3.29); GrainKind is highest in both (6.32 and 6.24); nothing comes near the 7.0 "Take a call" line in either pass.

**Scores.**
| Application | Pass 1 | Pass 2 | Difference |
|---|---|---|---|
| GrainKind | 6.32 | 6.24 | −0.08 |
| Pumpwise | 5.57 | 5.79 | +0.22 |
| CareCorner | 5.64 | 5.46 | −0.18 |
| Settlr | 4.51 | 5.29 | **+0.78** |
| Talkbook | 5.00 | 5.23 | +0.23 |
| Yatrika | 5.08 | 4.88 | −0.20 |
| StockSathi | 5.19 | 4.75 | −0.44 |
| CAPilot | 4.83 | 4.74 | −0.09 |
| RentRoute | 4.30 | 3.97 | −0.33 |
| EarnWise | 3.15 | 3.29 | +0.14 |

The mean absolute difference is 0.27 points; rank correlation 0.82. The top (GrainKind) and bottom (EarnWise, RentRoute) hold; the middle moves (Settlr rises from eighth to fourth, because the second scorer gave it a point more on five criteria).

**Criteria.** Of 100 criteria scored in both passes, 60 are identical and 98 are within one point. Two differ by two points: StockSathi's commercial fluency (6 → 4) and RentRoute's candour (3 → 5). Three criteria were scored in one pass and left unknown in the other (CareCorner regulatory path, Talkbook capital need, EarnWise competition). The most variable criteria are commercial fluency and candour (mean difference 0.7), capital need (0.62) and owns-the-central-risk (0.5); the most stable are traction, unit economics, why-now and competition (about 0.2).

**Flags.** The portfolio-conflict and rule-dependence flags are identical for all ten applications in both passes (Talkbook likely, StockSathi possible for D1; EarnWise unknown, RentRoute and StockSathi possible for D2).

**Contradictions.** Both passes found the same underlying conflicts. The materiality labels differ: Yatrika 3 material conflicts in the first pass and 0 in the second, Settlr 1 and 3, EarnWise 4 and 5, StockSathi 2 and 3, Talkbook 3 and 2, Pumpwise 1 and 2. Whether a conflict counts as material is a judgement, and it moves A5 (candour) by a point or two.

**Averaging the two passes** gives scores of 3.23 to 6.28 and the same leans except that RentRoute (4.14) stays at Further research required; only EarnWise would be a Pass.

**What this does and does not show.**
- Scores are stable to about 0.3 points between scorers, and conflicts, arithmetic problems and flags are found reliably. Leans near a threshold are not stable: RentRoute sits within noise of the 4.0 line.
- Both scorers are the same kind of model, using the same rubric, texts, research log and my assignment of business types. Their agreement may overstate stability compared with two human reviewers, and errors they share (for example how B4 is read) would not show up.
- A possible design response, not applied: treat any score within about 0.5 of a threshold as Further research required, which would keep RentRoute out of Pass and stop a borderline case flipping with the scorer. That is the partners' call.
