# Inbound applications – evidence analysis (10 companies)

2026-11-24. Source: the 20 PDFs (deck + form per company), read via the Drive connector and matched to the Downloads copies. Arithmetic re-computed with a script (`scratchpad/checks.py`, not part of the project).

**This is an evidence base, not a scoring.** No scorecard exists yet, so nothing below is a score or a recommendation. Where a finding touches the thesis, it is stated as an observation for the partners.

Conventions: "deck" = pitch deck, "form" = form response. "Computed" = my arithmetic from the applicant's own inputs. "Not stated" = absent from both files. Every company's website and LinkedIn URLs are `.example` placeholders, so nothing about the applicants can be checked on the open web, and no contact emails are given (only Yatrika's deck has `hello@yatrika.example`).

## 1. Cross-application view

| Company | Sector selected | Stage | Ask (INR) | Post-money | Implied dilution | Source | Deck vs form conflicts | Revenue stated? |
|---|---|---|---|---|---|---|---|---|
| CAPilot | Fintech | Pre-seed | 1.5 Cr | 10 Cr | 15% | Public form | 1 | Yes (MRR 78k) |
| CareCorner | Other (Healthcare) | Pre-seed | 3 Cr | 18 Cr | 16.7% | Public form | 0 | Yes (9.8 L/month) |
| EarnWise | Fintech | Pre-seed | 2 Cr | 12 Cr | 16.7% | Public form | 4 | **No** |
| GrainKind | Consumer brands | Pre-seed | 2.5 Cr | 14 Cr | 17.9% | Public form | 0 | Yes (16.5 L/month) |
| Pumpwise | Deeptech | Pre-seed | 2.2 Cr | 11 Cr | 20% | Public form (+ incubator mentor) | 0 | Yes (14.2 L cumulative) |
| RentRoute | Fintech | Pre-seed | 1.8 Cr | 12 Cr | 15% | Public form | 0 (framing gap, see below) | Yes (11 L gross, 5.5 L net) |
| Settlr | Fintech | **Series A** | 30 Cr | 180 Cr | 16.7% | Public form | 0 | Yes (78 L net/month) |
| StockSathi | Consumer tech | Pre-seed | 2 Cr | 12 Cr | 16.7% | **Intro via a Fund I portfolio founder** | 4 | Not as revenue (GMV only) |
| Talkbook | Consumer tech | Pre-seed | 2 Cr | 12 Cr | 16.7% | Public form | 1 (plus internal) | Yes (1.9 or 2.1 L MRR) |
| Yatrika | Consumer tech | Pre-seed | 1.2 Cr (form only) | 8 Cr | 15% | Public form | 1 (language) | Yes (4.6 L total) |

Notes:
- All asks imply 15–20% dilution. That uniformity looks like how the case data was built; it says nothing about the companies.
- Only StockSathi came through a warm route. The other nine say "public application form". In the memos, public-form and warm-intro outcomes were mixed.
- Prior startup experience: none for any founder, except EarnWise (18 months as an employee at a payments startup) and Yatrika (family business).
- Implied earlier valuations from angel stakes (investment ÷ stake; dates not given): CAPilot 1.5 Cr, EarnWise 1.67 Cr, StockSathi 1.67 Cr, GrainKind 2.5 Cr, CareCorner 2.4 Cr. These are 4–8× below today's asks. Dates are unknown, so this is only a prompt for a question.

### Market-size arithmetic (applicants' own inputs, recomputed)

| Company | Deck says | Computed | Result |
|---|---|---|---|
| CareCorner TAM / SAM / SOM | 1.14 lakh Cr / 5,400 Cr / 35 Cr | same | Match |
| Pumpwise TAM / SAM / SOM | 16,200 / 4,536 / 21.6 Cr | same | Match |
| Talkbook TAM / SAM / SOM | 4,200 / 660 / 27 Cr | same | Match |
| StockSathi TAM / SAM / SOM | 17 lakh Cr / 64,800 / 518 Cr | 17.28 lakh Cr / 64,800 / 518.4 | Match |
| GrainKind TAM / SAM / SOM | 91,200 / 14,400 / 28.8 Cr | **9,120 / 1,440 / 28.8** | TAM and SAM are 10× above the stated inputs; SOM matches |
| EarnWise TAM | 14,400 Cr | **1,44,000 Cr (1.44 lakh Cr)** | Deck is 10× below the stated inputs |
| Settlr TAM / SAM / SOM | 9.4 lakh Cr / 1.8 lakh Cr / 6,750 Cr | **94.5 lakh Cr / 18 lakh Cr / 67,500 Cr** | Deck is 10× below the stated inputs |
| CAPilot, RentRoute, Yatrika | Top-down only ("1% of X") | — | No bottom-up SAM/SOM given |

I can't tell whether the 10× gaps are unit slips or deliberate. Either way, none changes a company's story on its own, but the system must recompute rather than trust deck figures.

## 2. Company sheets

### 2.1 CAPilot (AI for CA firms: GST reconciliation and notice replies)
**Snapshot.** Ahmedabad, incorporated Dec 2025, team 6, raising 1.5 Cr at 10 Cr post. Founders: Dhruv Shah (qualified CA, 4 years, about 60 GST clients), Isha Merchant (CTO, 3 years at a SaaS company, built the matching engine). Both full-time since Feb 2026. Equity: founders 90%, one angel 10% (INR 15 L).

**Supported / consistent.** MRR 78k (chart 18/41/78k, Aug–Oct); 78k × 12 = 9.36 L (deck rounds to 9.4 L). Per-firm MRR about 3,250 (24 firms), inside the stated INR 2,500–6,000 band.

**Conflicts / issues.**
- Deck: "31 paying CA firms". Form: 24 paying plus 7 on free trial (31 total). The deck counts trials as paying.
- Deck competition table shows ClearTax and Tally/Zoho as also "built for small CA firms" (Partial / Yes), which undercuts the differentiation claim.
- Valuation is about 107× ARR.

**Missing.** CAC (form: "not measured yet"), churn rate (2 firms of 31 or 26), notice-reply accuracy, trial conversion, data-access terms for GST portal data, customer concentration.

**Thesis observations.**
- Founder-market fit: a practising CA building for CAs is direct domain insight (documented criterion; observed, not verified).
- Risk ownership: form states responsibility "sits with the CA", so the liability for model errors is pushed to customers. The partners' pattern of testing whether founders own the key risk applies here.
- Why-now: not in deck.
- Sector label "Fintech" for a SaaS tool for accountants. A label question, not a conflict.

**External research needed.** GST reconciliation and notice-automation competitors; GST portal data access rules; any overlap with a portfolio company (full list needed).

### 2.2 CareCorner (neighbourhood clinics with diagnostics, Tier-2 India)
**Snapshot.** Hyderabad, incorporated Aug 2025, team 14 (3 doctors), raising 3 Cr at 18 Cr post. Dr. Lakshmi Reddy (MBBS, 8 years family medicine), Vikram Rao (6 years hospital operations); full-time since Aug 2025; founders 75%, angels 25% (INR 60 L), plus a 40 L bank loan. Two healthcare funds in conversation.

**Supported / consistent.** Revenue chart 3.9/5.2/7.0/8.6/9.8 L (Jun–Oct); 3 clinics; capex 3 × 28 L = 84 L against 100 L raised; 5 new clinics = 1.4 Cr = 47% of the ask (matches deck); TAM/SAM/SOM arithmetic matches.

**Issues.**
- Current revenue per clinic is 3.27 L/month (about 39 L/year) against the 1.4 Cr/year maturity assumption: a 3.6× ramp is assumed.
- Twelve-month plan (8 clinics, 45 L/month) implies about 5.6 L/month per clinic.
- Household spend (INR 6,000/year) rests on a 90-household survey.
- Only the first clinic has reached breakeven (month 8); clinics 2 and 3 are not stated.

**Missing.** Clinic-level P&Ls (offered, not provided), doctor retention, repeat visits, pharmacy margin, licensing, ramp data for the newer clinics.

**Thesis observations.**
- Sector is "Other (Healthcare)", outside the four named sectors. Whether healthcare is excluded or judged on founder behaviour (as Jai Kisan was) is **unknown** and needs a partner ruling.
- Capital intensity (28 L per clinic, bank-funded) relates to the capital-versus-cheque concern from the HopBox pass. The partners must judge how similar it is; the numbers alone don't settle it.
- Candid risks section (capital intensity, doctor retention, slower ramp).

**External research needed.** Clinic and diagnostics regulation; Tier-2 primary-care competitors; whether any portfolio company is in healthcare.

### 2.3 EarnWise (earned wage access for gig and shift workers)
**Snapshot.** Gurugram, incorporated Jan 2026, raising 2 Cr at 12 Cr post. Rohit Arora, solo founder now (a co-founder left in July 2026). Founder 85%, one angel 15% (INR 25 L).

**Deck vs form conflicts (the most of any application).**
1. Enterprise clients: deck "3 live"; form "1 live and 2 in pilot".
2. Team: deck "Team of 12"; form team 5 (founder, 2 outsourced developers, 1 operations, 1 sales).
3. Founder background: deck "Ex-Goldman Sachs. Ex-Google. MBA, IIM Ahmedabad"; form: a 10-week summer analyst internship at an investment bank, a 5-month vendor contract role at a large technology company, an MBA at "a tier-2 business school (2022 to 2024)", and 18 months at a payments startup.
4. Tech leadership: deck says tech is "led by an advisor"; form lists no technical team member (two outsourced developers).
5. The deck does not mention the departed co-founder.

**Other issues.**
- No revenue or fee figure in either file ("flat fee", amount not stated).
- Advances 38 L (chart 4+9+11+14 = 38 ✓) to 1,600 workers is about INR 2,375 per worker cumulatively, against the TAM assumption of INR 12,000 per month.
- TAM computed at 1.44 lakh Cr; the deck says 14,400 Cr. It also counts advance volume, not revenue.
- Advances are funded by a partner NBFC "under an agreement in principle" (not signed) and partly by the founder's own savings.

**Missing.** Revenue, repayment and loss rates, employer contract terms, signed NBFC agreement, CAC, how the founder-funded part is sized.

**Thesis observations.**
- The deck and form disagree on facts the partners would check first (background, team size, client count). The memos' pattern of valuing candour and "evidence over pedigree" is relevant; the form's version is the more conservative one.
- Lending depends on an NBFC partner: the memo pattern separating CampusCredit (pass) from Jai Kisan (invested) turned on whether founders own the credit risk. Here the form says part of the book is funded by the founder personally; whether that counts as owning the risk is a partner judgement.

**External research needed.** Regulation of earned wage access and digital lending in India; competitors; verification of the founder's claimed employers (not possible from the placeholder profile).

### 2.4 GrainKind (millet-based breakfast and snacks)
**Snapshot.** Bengaluru, incorporated Jul 2025, launch Nov 2025, team 9, raising 2.5 Cr at 14 Cr post. Ritu Hegde (6 years category/brand roles at a large packaged-food company, food-science degree), Sanjay Kulkarni (5 years supply chain at a quick-commerce company). First-time founders, full-time since Jul 2025. Founders 82%, three angels 18% (INR 45 L). One consumer fund in conversation.

**Supported / consistent (the most complete data of the ten).**
- 90-day repeat: 31% (June), 34% (July), 38% (August), over 3,100 customers; deck and form agree.
- Revenue chart 4.8/7.1/10.2/13.0/16.5 L (Jun–Oct), sum 51.6 L; "72 L since launch" implies 20.4 L in Nov–May.
- Blended CAC 340 ✓ (weighted channel CACs = 337); hero SKUs 42+28+17 = 87% ✓; AOV 540; gross margin 48%; contribution 11%; LTV:CAC 1.8× implies a 12-month LTV of about 612 (consistent).

**Issues.**
- Gross profit on a first order is about INR 259 against a CAC of 340; the business depends on repeat (2.4 orders per customer for the June cohort, 5 months).
- TAM and SAM are 10× above the stated inputs (91,200 vs 9,120; 14,400 vs 1,440 Cr); SOM is correct.
- Timing: an August cohort's 90-day window ends around November, but figures are labelled October 2026; confirm the data cut-off.
- Single co-packer in Hosur; paid social 45% of new customers at CAC 410 and rising.

**Offered but not provided.** Cohort sheet and co-packer agreement.

**Thesis observations.** Founders supply cohort repeat, channel CAC and margins unprompted. The memos state this as the test applied to every consumer brand (Giva: invested; Petalry: passed for lacking it). It is the one application where that test can be read from the file.

**External research needed.** Millet/better-for-you competitors and their repeat benchmarks; co-packer concentration; label-claim regulation; portfolio overlap in consumer food.

### 2.5 Pumpwise (predictive maintenance for small-factory motors and pumps)
**Snapshot.** Pune, incorporated Oct 2025, team 7, raising 2.2 Cr at 11 Cr post. Karthik Subramanian (IIT Madras mechanical, 5 years reliability engineer), Neeraj Pillai (4 years embedded systems; designed sensor and firmware). Full-time since Oct 2025. Founders 80%, angels 12%, ESOP 8%; existing 30 L (10 L incubator grant, 20 L angels). Two pre-seed funds in conversation; an incubator mentor suggested applying.

**Supported / consistent.** Hardware 140 × 9,500 = 13.3 L ✓; subscription 140 × 750 = 1.05 L/month ✓; CAC 4.4 L ÷ 6 = 73k ✓ (excludes founder time); average-customer first-year gross profit about 3.2 L (deck 3.1 L) ✓; 6 of 11 pilots converted (55%); market arithmetic matches.

**Issues.**
- Average customer has 23 sensors, but the TAM, SAM and SOM assume 60 sensors per customer (2.6× higher).
- Recurring revenue is small: 1.05 L/month, with about 94% of cumulative revenue (13.3 of 14.2 L) from hardware.
- Savings figures (9 stoppages at INR 1.8 L each) are customer-reported and unaudited (the form says so).
- Timeline differences: form says pilots started March 2026; deck chart starts June at 20 sensors.
- The 300K "20+ motor" MSME base comes from 12% of 2.5M, "based on our plant visits" (38 plants).

**Missing.** Sensor accuracy data, subscription churn, certification requirements, contract-manufacturer dependence, results by motor type.

**Thesis observations.** Deeptech with paying customers and live deployments is the closer parallel to the Unbox memo (nearer path to revenue) than to the AeroDrop pass. Regulatory risk appears limited to certification. Process: Aditya runs the second call for deeptech [N3, N5].

**External research needed.** Industrial condition-monitoring competitors; certification and calibration requirements; MSME counts.

### 2.6 RentRoute (pay rent by credit card)
**Snapshot.** Bengaluru, incorporated May 2026, team 4 (2 contract developers), raising 1.8 Cr at 12 Cr post. Sameer Qureshi (product manager at a fintech, 4 years), Divya Menon (5 years consumer marketing; full-time since Aug 2026; Sameer since Jun 2026). Founders 100% equity, 18 L own savings, no other investors.

**Supported / consistent.** Rent paid 0.4+1.0+1.9+2.8 = 6.1 Cr ✓ over 2,400 payments (average about INR 25.4k); 1.8% × 6.1 Cr = 10.98 L gross ✓; 1,900 registered users, 1,100 paid at least once.

**Issues.**
- Framing gap: the deck presents revenue as 11 L; the form discloses 0.9% goes to the payment partner, leaving 5.5 L net.
- The deck says "no direct competitors"; the form lists a single payment-aggregator dependency and says banks and card networks have changed rules on rent payments before.
- Target of 20 Cr monthly volume is 7.1× the current 2.8 Cr.
- Marketing is 55% of the raise; cost per paying user not measured (about INR 120 per registered user in small paid tests).

**Missing.** Mitigation if rules change, aggregator agreement terms, repeat rate per user, fraud and chargeback experience.

**Thesis observations.** The business depends on rules set by banks and card networks. The Coinlane memo passed because the company's existence depended on a favourable regulatory change; here the dependency is on existing rules not turning adverse. Related but not identical; a partner judgement. Founders disclose the dependency candidly in the form.

**External research needed.** Current rules on credit-card rent payments; payment-aggregator regulation; competitors (deck says none; verify).

### 2.7 Settlr (payments and invoice financing for SMEs)
**Snapshot.** Mumbai, incorporated Apr 2023, team 31, **Series A**, raising 30 Cr at 180 Cr post. Rahul Mehta (10 years transaction banking), Sonal Iyer (8 years payments engineering). Founders 58%, seed investors 30%, ESOP 12%; seed 9 Cr (2024). Four Series A funds in conversation; "looking for a lead investor".

**Supported / consistent.** Volume chart 52/61/70/79/86 Cr (Jun–Oct); net revenue 78 L = 0.91% of volume; ARPU about 6,783 ✓ (deck 6,800); 1,150 SMEs.

**Issues.**
- Stated payback is 7 months; computed from the deck's own CAC, ARPU and margin it is about 3.7 months (14,500 ÷ (6,800 × 58%)). The deck may be using a ramped payback; not explained.
- Volume per SME is about 0.9 Cr/year against the 4.5 Cr/year used for the market size.
- TAM, SAM and SOM are each 10× below the computed values.
- Credit losses on financed invoices are named as a risk but no loss data is given.

**Missing.** Financing book size, loss and delinquency rates, NBFC terms, the identity of the seed investors.

**Thesis observations.** Stage and ask size are outside the fund's published pre-seed/seed focus (cheque USD 250–600K publicly; this is INR 30 Cr). Whether larger rounds are excluded outright is **unknown**; the memos and notes do not say. The Inc42 interview says the fund avoids later-stage "safe" deals.

**External research needed.** SME payments and invoice-financing landscape; seed investors; regulation of NBFC-funded financing.

### 2.8 StockSathi (restocking and short-term credit for small-town kirana stores)
**Snapshot.** Hyderabad, incorporated Mar 2026, team 4 (2 founders, 2 field agents), raising 2 Cr at 12 Cr post. Aarav Deshmukh (8 years FMCG distribution and field operations), Pooja Nair (5 years software engineer at a payments company; built the app and credit rules). Full-time since Apr 2026. Founders 85%, angels 15% (INR 25 L). One pre-seed fund in conversation, no term sheet. **Introduced through a founder in the fund's Fund I portfolio** (unnamed).

**Deck vs form conflicts.**
1. Retailers: deck 38 onboarded; form 42.
2. CAC: deck INR 2,860 blended (40,000 ÷ 14 stores in October), with "CAC under INR 2,000" as a 12-month goal; form states "CAC is under INR 2,000 per store".
3. Credit funding: deck "funded from our own capital for now… NBFC partnership in discussion"; form "provided through our NBFC partner. We take the first-loss risk".
4. Footprint: form "Live in Karimnagar only"; deck cites interviews in Karimnagar and Warangal and a "small sample, one town" CAC.

**Other issues.**
- GMV: deck INR 3.8 L in October; form about INR 9 L over three months (not inconsistent, but no monthly series is shown).
- Credit book is about INR 85,000 across 12 retailers, roughly a third of October GMV; not registered as an NBFC (form), which makes the legal basis of lending from its own capital a question.
- Payback 5.5 months (2,860 ÷ 520 monthly margin) ✓; margin per store implies about INR 13,000 GMV per store per month at 4%, against the market-size assumption of INR 1.2 L total monthly purchases per store.
- Field agents onboarded 24 of 38 stores; neighbour referrals 9, distributor intros 5 (sums to 38 ✓).

**Missing.** Late-payment and default history ("none so far"), identity and status of the NBFC partner, the credit-scoring approach (offered on a call), repeat details beyond 22 of 38/42, distributor agreements.

**Thesis observations.**
- Founders show field and distribution experience, with 60 owner interviews; the memos' pattern (SuperK) values founders who work close to store owners. Observed, not verified.
- Adjacent to portfolio company SuperK (both serve kirana stores). Degree of overlap is unconfirmed.
- The warm intro from a Fund I founder is a relationship to note for the conflict and routing process.
- The contradictions on credit funding and CAC concern the central risk (credit), which the partners test closely.

**External research needed.** SuperK's actual model; kirana B2B competitors; regulation of trade credit by unregistered lenders; the NBFC partner.

### 2.9 Talkbook (AI call summaries and CRM updates for Indian sales teams)
**Snapshot.** Chennai, incorporated Feb 2026, team 8, raising 2 Cr at 12 Cr post. Arun Kumar (6 years product lead at a CRM software company), Meenakshi S (4 years speech ML). Full-time since Mar 2026. Founders 95%, ESOP 5%; no existing investors; one pre-seed fund in conversation.

**Issues.**
- MRR is stated three ways: deck 2.1 L (chart 40/85/140/210k), form 1.9 L, and seats × price = 340 × 500 = 1.7 L.
- Deck: average team pays INR 13,000/month (16 × 13,000 = 2.08 L ✓ deck), but 340 seats ÷ 16 = 21 seats × 500 = about INR 10,600 per team. The gap is unexplained.
- Payback "about 5 months" holds at 13,000/team (5.3) but is 6.5 months on the seat-based figure.
- Form: "We do not know of an India-first player"; deck compares only against global tools and meeting note-takers.
- Customer concentration in BFSI and call-recording rules are named as risks.

**Missing.** Churn, transcription accuracy, consent and recording legality, named customers, the basis of the 70% gross margin.

**Thesis observations.**
- **Likely conflict flag.** Meeting 4 describes a meeting-notes and call-summary startup overlapping with portfolio company MeetRecord, with a default of "no". Talkbook's product is call summaries plus CRM updates for sales teams. Nothing in the application mentions MeetRecord. The product-level comparison has not been done.
- Sector label "Consumer tech" for a B2B SaaS product.
- Why-now is argued (speech models, cheaper inference).

**External research needed.** MeetRecord's current product; Indian call-intelligence competitors; call-recording regulation.

### 2.10 Yatrika (AI-planned family trips with local guides)
**Snapshot.** Jaipur, incorporated Mar 2026, team 4, raising 1.2 Cr at 8 Cr post (form only; the deck gives no amount). Manish Joshi (10 years running a family travel agency, over 3,000 families), Kavya Nair (3 years web developer). Full-time since Mar 2026. Founders 100%; no investors.

**Deck vs form.**
- The deck has almost no numbers: "thousands of travellers", "3x growth", "many 5-star reviews", no amount, no sizing beyond a 3 lakh Cr tourism figure, a duplicated vision slide.
- The form gives 410 bookings, about 1,300 travellers (not thousands), booking value 38.6 L, 12% commission = 4.6 L ✓, 14% repeat, paid acquisition about INR 640 per booking.

**Computed.** Average booking value about INR 9,415; commission about INR 1,130 per booking, so paid acquisition at 640 per booking is about 57% of commission per booking (whether 640 is per paid booking or blended is not stated).

**Issues.** The product is a language model plus 40 hand-built route templates, with bookings confirmed manually on WhatsApp; the AI element is thin and the operations don't scale yet (the form says so). Referrals from the family agency's customers are the main channel.

**Missing.** Gross margin after refunds, supply-side quality data, seasonality, how much of the 410 bookings come from the founder's existing agency base, any cohort data beyond 14% repeat.

**Thesis observations.** Founder has deep domain history (10 years, 3,000 families), which the fund calls "earned secrets"; the deck, however, leans on passion language and gives the partners nothing to test. The memos treat missing numbers as a drag on the score; here the numbers exist only in the form.

**External research needed.** Family-trip and Tier-2 travel competitors; supply-side quality; any portfolio overlap in travel.

## 3. Findings that apply across the batch
1. **Deck and form disagree in four applications** (EarnWise, StockSathi, CAPilot, Talkbook). The form generally contains the more conservative or detailed version. The system must read both and report conflicts instead of picking one.
2. **Three companies have 10× market-size arithmetic gaps** (GrainKind up, EarnWise and Settlr down).
3. **Candour about gaps varies.** Several forms state "not measured yet" (CAPilot, RentRoute) or "excludes founder time" (Pumpwise); others omit the metric entirely (EarnWise revenue).
4. **Fit questions the partners must answer before scoring:** CareCorner (healthcare), Settlr (Series A), Talkbook (MeetRecord), StockSathi (SuperK adjacency, Fund I intro).
5. **Only two applications let the memos' "cohort and margin" test be applied from the file:** GrainKind fully, Yatrika partially (repeat only).
6. **Founder behaviour is invisible.** Nothing here shows how a founder answers a hard question live. Intake can only record what the form says and how it conflicts.

## 4. What I did not check
- Visual layout of the PDFs (rendering is unavailable here); numbers and chart labels came through as text.
- Any fact outside the files. External research on each company is still to do.
