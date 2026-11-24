# Scoring rubric (read fully before scoring)

You are scoring past startup screening cases against a fixed rubric for an early-stage VC fund. You will be given neutral FACT SHEETS. You do NOT know what the fund decided and must not guess it. Score only from the fact sheet. Do not use outside knowledge about real companies. Do not infer facts that are not written.

## Scale (every criterion, 0-10)
- 9-10: meets the HIGH anchor AND is independently verified. (Nothing in these fact sheets is independently verified, so do not use 9-10.)
- 7-8: meets the HIGH anchor on stated, internally consistent evidence.
- 5-6: MID anchor: partial evidence or mixed signals.
- 3-4: between LOW and MID: weak, with some mitigating evidence.
- 1-2: LOW anchor: clear evidence matching the weak pattern.
- 0: affirmative evidence of the opposite (e.g. an explicit refusal to own a risk). NEVER use 0 for missing information.
- Maximum score without independent verification is 8.

## Statuses (use exactly one per criterion)
- "scored": the fact sheet gives evidence; give a score.
- "unknown": the fact sheet gives no evidence on this criterion. Do NOT score it, do NOT treat it as bad. Say what is missing.
- "stated_absence": the fact sheet says the founders did not have / did not track a key item (e.g. "did not have 30-day numbers"). This is evidence; give a score. For A3, a stated absence of a key metric limits the score to 4 or less.
- "na": the criterion genuinely does not apply (give a one-line reason). Never use "na" to avoid "unknown".

## Criteria, anchors and parameters (LOW ~1-2, MID ~5, HIGH ~8)
A1 Founder-market fit. Parameters: (a) relevant years/role in the problem area, (b) customer or field contact with specifics (interviews, visits, pilots, manual first operations), (c) lessons from failures described specifically. LOW: background unrelated, or case rests on credentials/passion only. MID: relevant background without customer-contact evidence, or contact evidence without relevant background. HIGH: relevant background plus specific customer/field contact.

A2 Founder owns the central risk. Central risk by business type: consumer brand = growth bought vs earned and repeat; lending = who bears credit loss; deeptech = customer, regulator, liability; dense-network/field operations = capital to reach density and field execution; regulation-dependent = rule change; other = the main risk named in the fact sheet. Parameters: (a) central risk named by the founders, (b) specific own mitigation (plan, hire, numbers, capital at stake), (c) delegation language ("the partner handles it", "solved later", "someone else's problem"). LOW: delegates or dismisses the risk. MID: names it with generic mitigation. HIGH: names it with specific own mitigation.

A3 Commercial fluency. Parameters: (a) key metrics for the business type provided or known to the founders, (b) they reconcile, (c) unmeasured items disclosed. Key metrics: consumer brand = cohort repeat, CAC by channel, gross margin; lending = loss/delinquency data, funding source; deeptech = named pilot/customer, regulatory milestones; field operations = contribution margin, field evidence; other = paying customers, retention, CAC payback. LOW: only top-line or averages; metrics that do not reconcile. MID: some key metrics, partly measured. HIGH: key metrics known/given and consistent. Stated absence of a key metric: max 4.

A4 Team and commitment. Parameters: (a) technical + commercial/operational coverage for the business's hard parts, (b) full-time status, (c) core work outsourced or advisory only. LOW: critical gap unaddressed. MID: one named gap. HIGH: complementary cover, founders committed.

A5 Candour and consistency (intake proxy only; judge from the fact sheet's internal consistency and how openly gaps/risks are stated). LOW: material conflicts or overstated claims. MID: minor gaps. HIGH: consistent, specific risks. If the sheet gives no basis, mark "unknown".

B1 Customer evidence and traction quality. Parameters: (a) paying customers (count/trend), (b) repeat or retention evidence, (c) share of growth from paid channels, (d) whether traction figures reconcile. LOW: no paying customer, or vanity metrics only (downloads, users). MID: some paying customers, short history. HIGH: paying customers with repeat evidence and trend.

B2 Unit economics and margin path. Parameters: (a) gross margin/contribution stated, (b) CAC and payback, (c) path to positive. LOW: negative with no path. MID: partly measured. HIGH: figures given with a path to positive.

B3 Regulatory and dependency path. Parameters: (a) material regulatory or partner dependency identified, (b) stated plan or milestones, (c) existence depends on a favourable change. LOW: depends on a favourable change, or ignores a material exposure. MID: names it without a plan. HIGH: names it with a plan/milestones. Use "na" with a reason if there is no material regulatory/partner exposure.

B4 Capital need against the ask. Parameters: (a) capital needed to reach the next milestone or density on the founders' own account vs the raise, (b) reliance on debt. LOW: needs far more capital than a small early cheque to reach its milestone. MID: tight. HIGH: plan reaches its milestone within a small cheque. Ask size is NOT given in these fact sheets; use "unknown" unless the sheet says something about capital need.

B5 Why now. LOW: none or "market is growing". MID: generic trend. HIGH: a specific named change tied to timing. Use "unknown" if not mentioned.

B6 Competition and defensibility honesty. Parameters: (a) real alternatives named, (b) specificity of advantage, (c) whether the product is the person. LOW: "no competitors", or advantage is one person. MID: alternatives named, advantage vague. HIGH: real alternatives with a specific advantage.

## Disqualifier D2 (separate from scores)
D2 = "the business exists only if rules change favourably". Output one of: "triggered" (fact sheet says so or clearly implies it), "possible" (fact sheet mentions regulatory uncertainty that might imply it), "not_triggered", "unknown". Give a one-line reason.

## Rules
1. Every scored criterion needs an evidence quote or close paraphrase from the fact sheet.
2. Evidence class for each scored criterion: "S-c" (stated, consistent), "S-u" (stated but thin, unreconciled, or based on a single remark), "P" (proxy).
3. Missing information is never negative evidence. Use "unknown".
4. Score the evidence, not the pedigree: prestigious credentials alone do not raise A1 above MID.
5. Do not produce a total score or a recommendation. Only the per-criterion output below.

## Output format (valid JSON only: a JSON array with one object per case, no commentary outside the JSON)
[
 {"case": "<name>",
  "criteria": {
    "A1": {"status": "scored|unknown|stated_absence|na", "score": null, "evidence": "...", "class": "S-c|S-u|P|null", "note": "..."},
    "A2": {}, "A3": {}, "A4": {}, "A5": {},
    "B1": {}, "B2": {}, "B3": {}, "B4": {}, "B5": {}, "B6": {}
  },
  "D2": {"value": "triggered|possible|not_triggered|unknown", "reason": "..."}
 }
]
(Every one of the 11 criteria must appear for every case, each with the same fields as A1.)
