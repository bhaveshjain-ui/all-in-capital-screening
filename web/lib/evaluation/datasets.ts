// Stored per-criterion results from the 2026-11-24 backtest (12 memo companies) and the two trial scoring
// passes (10 applications). They are imported statically so they ship with the deployed app. The evaluation page
// re-applies the CURRENT rules to these stored scores; it does not call the model again.

import type { BusinessType } from "../framework/config";
import b1 from "../../data/eval/backtest/results_1.json";
import b2 from "../../data/eval/backtest/results_2.json";
import b3 from "../../data/eval/backtest/results_3.json";
import b4 from "../../data/eval/backtest/results_4.json";
import t1 from "../../data/eval/trial/apps_1.json";
import t2 from "../../data/eval/trial/apps_2.json";
import t3 from "../../data/eval/trial/apps_3.json";
import t4 from "../../data/eval/trial/apps_4.json";
import t5 from "../../data/eval/trial/apps_5.json";
import u1 from "../../data/eval/trial2/apps2_1.json";
import u2 from "../../data/eval/trial2/apps2_2.json";
import u3 from "../../data/eval/trial2/apps2_3.json";
import u4 from "../../data/eval/trial2/apps2_4.json";
import u5 from "../../data/eval/trial2/apps2_5.json";

export interface RawCase {
  case?: string;
  app?: string;
  criteria: Record<string, { status: string; score: number | null }>;
  D1?: { flag: string };
  D2?: { value: string };
}

const all = (...xs: unknown[]) => xs.flat() as RawCase[];

export const BACKTEST_RAW = all(b1, b2, b3, b4);
export const TRIAL_PASS1_RAW = all(t1, t2, t3, t4, t5);
export const TRIAL_PASS2_RAW = all(u1, u2, u3, u4, u5);

// Business types are my assignments (assumptions); the fund's decisions are from the deal memos.
export const BACKTEST_TYPES: Record<string, BusinessType[]> = {
  "ePlane": ["deeptech"], "Petalry": ["consumer"], "Unbox Robotics": ["deeptech"], "HopBox": ["network"],
  "Wint Wealth": ["other"], "CampusCredit": ["lending"], "Giva": ["consumer"], "AeroDrop": ["deeptech"],
  "SuperK": ["network"], "Coinlane": ["regdep"], "Jai Kisan": ["lending"], "Prepnest": ["other"],
};
export const BACKTEST_DECISIONS: Record<string, "Invested" | "Passed"> = {
  "ePlane": "Invested", "Petalry": "Passed", "Unbox Robotics": "Invested", "HopBox": "Passed",
  "Wint Wealth": "Invested", "CampusCredit": "Passed", "Giva": "Invested", "AeroDrop": "Passed",
  "SuperK": "Invested", "Coinlane": "Passed", "Jai Kisan": "Invested", "Prepnest": "Passed",
};
export const APP_TYPES: Record<string, BusinessType[]> = {
  CAPilot: ["other"], CareCorner: ["network"], EarnWise: ["lending"], GrainKind: ["consumer"],
  Pumpwise: ["deeptech"], RentRoute: ["regdep"], Settlr: ["lending"], StockSathi: ["network", "lending"],
  Talkbook: ["other"], Yatrika: ["other"],
};
