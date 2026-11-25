import { z } from "zod";
import type { BusinessType, CriterionId, FrameworkParams } from "./framework/config";
import type { Evaluation } from "./framework/score";

export const SourceKind = z.enum(["deck", "form"]);
export type SourceKind = z.infer<typeof SourceKind>;

const num = z.number().finite();

export const FounderSchema = z.object({
  name: z.string(),
  role: z.string().nullish(),
  background: z.string().nullish(),
  full_time_since: z.string().nullish(),
});

export const CompanySchema = z.object({
  name: z.string(),
  one_liner: z.string().nullish(),
  sector_selected: z.string().nullish(),
  stage_selected: z.string().nullish(),
  location: z.string().nullish(),
  incorporated: z.string().nullish(),
  team_size: z.string().nullish(),
  founders: z.array(FounderSchema).default([]),
  ask_inr: num.nullish(),
  post_money_inr: num.nullish(),
  how_heard: z.string().nullish(),
});

/** One checkable statement taken from the text, with where it came from. */
export const ClaimSchema = z.object({
  /** snake_case field name; the same name must be used in the deck and the form. */
  field: z.string(),
  label: z.string(),
  value: z.union([z.string(), num, z.boolean()]),
  unit: z.string().nullish(),
  source: SourceKind,
  location: z.string(),
  quote: z.string(),
});
export type Claim = z.infer<typeof ClaimSchema>;

const where = { source: SourceKind, location: z.string() };

/** claimed = product of factors (market sizes, ARR from MRR, revenue from volume x fee ...). */
export const ProductSchema = z.object({ label: z.string(), claimed: num, factors: z.array(num).min(1), ...where });
/** claimed = sum of parts (channel shares, use of funds, chart totals ...). */
export const SumSchema = z.object({ label: z.string(), claimed: num, parts: z.array(num).min(1), ...where });
/** claimed = numerator / denominator (CAC from cost and customers, shares ...). */
export const QuotientSchema = z.object({
  label: z.string(), claimed: num, numerator: num, denominator: num, ...where,
});
/** claimed payback months = CAC / (monthly revenue per customer x gross margin). */
export const PaybackSchema = z.object({
  label: z.string(),
  claimed_months: num,
  cac_inr: num,
  monthly_revenue_per_customer_inr: num,
  gross_margin_pct: num,
  ...where,
});

export const FiguresSchema = z.object({
  products: z.array(ProductSchema).default([]),
  sums: z.array(SumSchema).default([]),
  quotients: z.array(QuotientSchema).default([]),
  paybacks: z.array(PaybackSchema).default([]),
});
export type Figures = z.infer<typeof FiguresSchema>;

export const ExtractionSchema = z.object({
  company: CompanySchema,
  claims: z.array(ClaimSchema).default([]),
  figures: FiguresSchema.default({ products: [], sums: [], quotients: [], paybacks: [] }),
  notes: z.string().nullish(),
});
export type ExtractionResult = z.infer<typeof ExtractionSchema>;

export interface RecomputeItem {
  kind: "product" | "sum" | "quotient" | "payback";
  label: string;
  claimed: number;
  computed: number;
  match: boolean;
  relDiff: number;
  source: SourceKind;
  location: string;
  note?: string;
}

export interface Conflict {
  field: string;
  label: string;
  kind: "numeric" | "text";
  deck: { value: string | number | boolean; location: string; quote: string };
  form: { value: string | number | boolean; location: string; quote: string };
  relDiff?: number;
}

// ---- External research -------------------------------------------------------------------

export const QuestionType = z.enum(["competition", "claim_check", "regulation", "market", "identity"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const PlanSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    type: QuestionType,
    question: z.string(),
    why: z.string(),
    claim_field: z.string().nullish(),
  })).min(1).max(8),
});
export type ResearchQuestion = z.infer<typeof PlanSchema>["questions"][number];

export type SourceQuality = "official" | "regulator" | "press" | "aggregator" | "blog" | "vendor" | "unknown";

export interface SourceRef {
  id: number;
  url: string;
  title: string;
  quality: SourceQuality;
}

/** The structuring step may only cite sources by the numeric ids that the search actually returned. */
export const StructuredFindingsSchema = z.object({
  findings: z.array(z.object({
    statement: z.string(),
    status: z.enum(["found", "not_found"]),
    source_ids: z.array(z.number().int()).default([]),
    contradicts_claim: z.string().nullish(),
    cost_of_absence: z.string().nullish(),
  })),
});

export interface Finding {
  questionId: string;
  statement: string;
  status: "found" | "not_found";
  sources: SourceRef[];
  contradictsClaim?: string;
  costOfAbsence?: string;
}

export const PortfolioCheckSchema = z.object({
  checks: z.array(z.object({
    company: z.string(),
    overlap: z.enum(["possible", "likely"]),
    reason: z.string(),
  })),
});

export interface PortfolioResult {
  checkedAt: string;
  checks: { company: string; overlap: "possible" | "likely"; reason: string }[];
  /** Portfolio names or aliases that appear in the application text itself. */
  mentions: string[];
  note: string;
}

export interface Research {
  status: "planned" | "running" | "done" | "error";
  model?: string;
  plannedAt?: string;
  questions: ResearchQuestion[];
  completed: string[];
  findings: Finding[];
  portfolio?: PortfolioResult;
  errors: { questionId: string; message: string }[];
}

// ---- Scoring ------------------------------------------------------------------------------

export const EvidenceSource = z.enum(["deck", "form", "research", "recompute", "conflict"]);
export const EvidenceSchema = z.object({ source: EvidenceSource, quote: z.string() });
export type Evidence = z.infer<typeof EvidenceSchema>;

export const CriterionOutputSchema = z.object({
  status: z.enum(["scored", "unknown", "stated_absence", "na"]),
  score: num.nullable(),
  class: z.enum(["S-c", "S-u", "P", "X"]).nullish(),
  evidence: z.array(EvidenceSchema).default([]),
  reasoning: z.string(),
  missing: z.string().nullish(),
  cost: z.string().nullish(),
});
export type CriterionOutput = z.infer<typeof CriterionOutputSchema>;

export const BUSINESS_TYPES = ["consumer", "lending", "deeptech", "network", "regdep", "other"] as const;

export const ScoreOutputSchema = z.object({
  business_types: z.object({
    types: z.array(z.enum(BUSINESS_TYPES)).min(1).max(2),
    reason: z.string(),
  }),
  criteria: z.object({
    A1: CriterionOutputSchema, A2: CriterionOutputSchema, A3: CriterionOutputSchema,
    A4: CriterionOutputSchema, A5: CriterionOutputSchema, B1: CriterionOutputSchema,
    B2: CriterionOutputSchema, B3: CriterionOutputSchema, B4: CriterionOutputSchema,
    B5: CriterionOutputSchema, B6: CriterionOutputSchema,
  }),
  d2: z.object({
    value: z.enum(["triggered", "possible", "not_triggered", "unknown"]),
    reason: z.string(),
    evidence: z.array(EvidenceSchema).default([]),
  }),
});
export type ScoreOutput = z.infer<typeof ScoreOutputSchema>;

export interface CriterionScoreRecord {
  status: CriterionOutput["status"];
  score: number | null;
  class: "S-c" | "S-u" | "P" | "X" | null;
  evidence: Evidence[];
  reasoning: string;
  missing?: string;
  cost?: string;
}

export interface Scoring {
  model: string;
  scoredAt: string;
  attempts: number;
  businessTypes: { types: BusinessType[]; reason: string; overriddenAt?: string };
  criteria: Record<CriterionId, CriterionScoreRecord>;
  /** Derived from the portfolio check in the research step, never from the model's own opinion. */
  d1: { flag: "none" | "possible" | "likely"; checks: PortfolioResult["checks"] };
  d2: { value: "triggered" | "possible" | "not_triggered" | "unknown"; reason: string; evidence: Evidence[] };
  evaluation: Evaluation;
  paramsUsed: FrameworkParams;
  /** Weights in force when this was scored or last recomputed. Older records fall back to the framework weights. */
  weightsUsed?: Record<CriterionId, number>;
  /** Past reviewer corrections shown to the model as precedent in this run (empty if none). */
  memoryUsed?: { correctionId: string; company: string; criterion: CriterionId }[];
}

// ---- Review, corrections and audit ---------------------------------------------------------

const CRITERION_IDS = ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6"] as const;
const oneLine = (s: string) => s.split(String.fromCharCode(10)).length === 1 && s.split(String.fromCharCode(13)).length === 1;

export const CorrectionInputSchema = z.object({
  criterion: z.enum(CRITERION_IDS),
  status: z.enum(["scored", "stated_absence", "unknown", "na"]),
  score: num.min(0).max(10).nullable(),
  /** One line saying why, so the correction can be shown on similar companies later. */
  reason: z.string().trim().min(10, "Say why in at least a short sentence.").max(240).refine(oneLine, "Keep the reason to one line."),
  by: z.string().trim().max(60).optional(),
  /** Required for a score above 8: how it was independently verified. */
  verification: z.string().trim().max(240).optional(),
});
export type CorrectionInput = z.infer<typeof CorrectionInputSchema>;

export const AcceptInputSchema = z.object({
  criteria: z.array(z.enum(CRITERION_IDS)).min(1),
  by: z.string().trim().max(60).optional(),
});

export const DECISION_VALUES = ["Take a call", "Further research required", "Pass"] as const;
export const DecisionInputSchema = z.object({
  value: z.enum(DECISION_VALUES),
  reason: z.string().trim().min(10, "Say why in at least a short sentence.").max(400),
  by: z.string().trim().max(60).optional(),
});

export interface Correction {
  id: string;
  criterion: CriterionId;
  at: string;
  by: string;
  reason: string;
  verification?: string;
  original: { status: CorrectionInput["status"]; score: number | null };
  corrected: { status: CorrectionInput["status"]; score: number | null };
  /** Used later to show similar past corrections on similar applications. */
  tags: { businessTypes: BusinessType[]; sector?: string };
}

export interface Decision {
  value: (typeof DECISION_VALUES)[number];
  reason: string;
  by: string;
  at: string;
  /** What the system suggested when the decision was recorded (after any corrections). */
  systemLean: string;
  agreedWithSystem: boolean;
}

export interface Review {
  corrections: Correction[];
  accepted: CriterionId[];
  decision?: Decision;
}

export interface AuditEntry {
  at: string;
  type:
    | "extraction_run" | "research_planned" | "scoring_run" | "business_types_changed"
    | "criterion_accepted" | "criterion_corrected" | "decision_recorded" | "review_archived"
    | "email_drafted" | "email_edited" | "email_approved" | "email_sent" | "email_failed" | "booking_created" | "booking_failed" | "contact_searched" | "contact_chosen" | "memory_marked" | "settings_applied";
  /** "system" or the name the reviewer typed (there is no login, so this is self-declared). */
  by: string;
  detail: string;
}

// ---- Email -------------------------------------------------------------------------------

export const EmailDraftOutputSchema = z.object({
  subject: z.string().min(3).max(150),
  body: z.string().min(40).max(2500),
  /** The one company-specific sentence in the body, and the exact words from the application it rests on. */
  personal_detail: z.object({
    sentence: z.string().min(15).max(300),
    quote: z.string().min(12).max(300),
    source: z.enum(["deck", "form"]),
  }),
});
export type EmailPersonalDetail = z.infer<typeof EmailDraftOutputSchema>["personal_detail"];

const noBreak = (s: string) => !s.includes(String.fromCharCode(10)) && !s.includes(String.fromCharCode(13));

export const EmailEditSchema = z.object({
  to: z.string().trim().max(254),
  subject: z.string().trim().min(3).max(150).refine(noBreak, "The subject must be one line."),
  body: z.string().trim().min(20, "The message is too short.").max(4000),
  by: z.string().trim().max(60).optional(),
});

export interface MemoryMark {
  correctionId: string;
  criterion: CriterionId;
  useful: boolean;
  by: string;
  at: string;
}

export interface ContactCandidate {
  email: string;
  name: string;
  position?: string;
  /** Hunter's confidence, 0 to 100. */
  confidence: number;
  verification: "valid" | "accept_all" | "webmail" | "invalid" | "unknown";
  via: "domain-search" | "email-finder";
}

export interface ContactResult {
  checkedAt: string;
  status: "found" | "not_found" | "no_domain";
  domain?: string;
  candidates: ContactCandidate[];
  /** The address selected for the invitation. Only pre-selected when a named founder was found or Hunter is very confident. */
  chosenEmail?: string;
  note?: string;
}

export interface EmailDraft {
  id: string;
  status: "draft" | "approved" | "sent" | "test_logged" | "failed";
  to: string;
  subject: string;
  body: string;
  slots: { startIso: string; label: string }[];
  attendees: string[];
  model: string;
  createdAt: string;
  createdBy: string;
  editedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  /** Fingerprint of the recipient, subject and body at approval; a change after approval cancels the approval. */
  approvedHash?: string;
  sentAt?: string;
  /** "test" means nothing left the system; "live" means Resend accepted it. */
  mode?: "test" | "live";
  resendId?: string | null;
  error?: string;
  /** The model's draft as first written, kept so a reviewer's edits can be learned from later. */
  original?: { subject: string; body: string };
  /** Earlier reviewer edits the model was shown as wording preferences when writing this draft. */
  precedentUsed?: { company: string; draftId: string }[];
  /** What makes the draft specific to this company, with the application text it was based on. Older drafts have none. */
  personalisation?: { sentence: string; quote: string; source: "deck" | "form" };
  /** How many model attempts passed the code checks (1 = first try). Older drafts have none. */
  attempts?: number;
  /** Where the offered slots came from. */
  slotSource?: "cal.com" | "fixed rule";
  /** Set once a reviewer books the time the applicant chose. "test" means no calendar entry was made. */
  booking?: { startIso: string; label: string; mode: "test" | "live"; uid: string | null; by: string; at: string; eventTypeId?: number };
}

export interface StoredFile {
  kind: SourceKind;
  filename: string;
  pages: number;
  text: string;
}

export interface Application {
  id: string;
  name: string;
  createdAt: string;
  files: StoredFile[];
  extraction: {
    status: "not_run" | "done" | "error";
    model?: string;
    extractedAt?: string;
    error?: string;
    result?: ExtractionResult;
  };
  recompute: RecomputeItem[];
  conflicts: Conflict[];
  research?: Research;
  scoring?: Scoring;
  review?: Review;
  /** Reviews from earlier scoring runs, kept when the application is scored again. */
  archivedReviews?: Review[];
  audit?: AuditEntry[];
  emails?: EmailDraft[];
  /** The point of contact found on Hunter.io, if a reviewer searched. */
  contact?: ContactResult;
  /** Reviewers' marks on whether each retrieved past correction was useful here. */
  memoryMarks?: MemoryMark[];
}

export interface ApplicationSummary {
  id: string;
  name: string;
  createdAt: string;
  files: number;
  extractionStatus: Application["extraction"]["status"];
  conflicts: number;
  mismatches: number;
}
