# Agile Dev / QA Delivery Estimation App — Product Requirements Document

Authoritative source: `Estimation_App_PRD_1_582b.pdf` (updated). This file is the in-repo executable summary of that spec.

- Currency of reference data: **CHF**
- Sprint length: **2 weeks (10 working days)**
- Engine: pure TypeScript `calculateEstimate(inputs, config)` — identical inputs + config ⇒ identical outputs
- Golden Case A/B in §14 must match **exactly** (costs to the cent, effort to 3 dp)

## Complexity index

`Index = round(20 × Σ(score_i × weight_i), 0)` with weights summing to 1.00. Range 20–100.

Criteria / weights: Functional 0.15, Technical 0.15, Applications Impacted 0.10, Integration 0.15, Data 0.10, QA 0.10, NFR 0.05, Dependencies 0.05, Environment/Release 0.05, Uncertainty 0.10.

Bands (inclusive): 0–20 XS, 21–35 S, 36–50 M, 51–65 L, 66–80 XL, 81–100 XXL.

## Issue / Epic mapping

Issue: XS 1/0.5/0.5, S 3/2/1, M 5/3/2, L 8/5/3, XL 13/8/5, XXL 21/13/8 (SP and reference PD).

Epic ROM: XS 13/2 stories/8+5, S 21/4/13+8, M 40/7/24+16, L 70/12/42+28, XL 120/20/72+48 DECOMPOSE, XXL 200/32/120+80 SPLIT EPIC.

Stance shifts **effective** T-shirt; SP is looked up from the effective T-shirt. The complexity multiplier uses the **assessed** T-shirt (intentional double-apply).

## DoR, confidence, governance

DoR: Yes/No only; score = count of Yes (0–5). 5 Ready; ≥3 Assumptions; else Discovery Required.

Confidence: `["Very Low","Low","Medium","High"][min(uncertainty_tier, dor_tier) − 1]`.

Issue delivery flag = max of size/sprint, index (≥66 review, ≥81 split), structural (any of Functional/Technical/Integration/Data = 5). Spike if uncertainty option is Discovery/spike. Wrapper: DISCOVERY REQUIRED from DoR first.

## Costing

Cost method: Resource Cost per Sprint. Selected rate = project override else approved resource-sprint rate (team or location). Standard team size 10. Utilisation = planned / standard; **never prorates cost**.

AI MIN rule:

`effort_ratio = (refDevPd/(1+devAI)+refQaPd/(1+qaAI))/(refDevPd+refQaPd)`  
`ai_rs = min(planned_resources × final_sprints, baseline_rs × effort_ratio)`  
`ai_cost = ai_rs × selected_rate`  
Other/fixed added after.

Epic: all commercial cost blank — `COST DEFERRED — ROM Epic; cost at Story level`.

Blended daily rate: Dev+QA roster × location daily-rate card (India 250, UK 600, US 700, CH 900, Poland 350, Singapore 500). SM/PO/IT Lead not costed.

Team rates: Vikings/Spartans India 25,000 / 2,500; Centurions Blended 50,000 / 5,000; Praetorians US 70,000 / 7,000.

AI% 0–100% in UI (engine 0–1). Sprint-constrained required resources use **AI-adjusted** capacity (PRD §6.5): `req = max(1, ROUNDUP(sp / (target_sprints × ai_capacity)))`. AI is "applied once, at capacity" and that AI-adjusted capacity drives both required-resources and sprint count. AI% stays active in both planning modes.

## Portfolio / What-If / Dashboard

Portfolio RAG: GREEN if total ≤ budget; AMBER if ≤ budget×1.1; else RED.

What-If objectives: Lowest Cost, Fewest Sprints, Least Effort, Best Value (fastest + 1 sprint slack, then cheapest), Cheapest within N.

Dashboard charts only at ≥5 estimates; calibration bars ≥3 actuals/level.

UX: greyed inputs must be **cleared**, not left with stale values.

## Golden Case A (must match)

Issue, index 75, Neutral, Dev Beginner, QA Experienced, Dev AI 5%, QA AI 10%, Vikings 2,500/resource-sprint, Resource-Constrained 1+1, DoR score 2.

Expected: Index 75; T-Shirt XL/XL; SP 13/8/5; Ref Dev PD 8; Cap 3 / AI 3.15; Final sprints 3; Planned resources 2; Utilisation 20%; Baseline 15,000; AI-adjusted 14,035.96; Avoidance 964.04; Adjusted effort 47.807; Blended 250; Effort-based 11,951.79; Multiplier 1.5; Opt/Pes SP 8/21; DoR 2 / Discovery Required; Confidence Low; Delivery Flag SPLIT; Final Planning Decision DISCOVERY REQUIRED.

Scores that yield index 75: Functional 3, Data 3, rest 4.

## Golden Case B

Epic, index 78 → XL; ROM 120; breakdown “Split into 20 stories of ~6 SP each”; costs blank; DECOMPOSE if DoR clear.
