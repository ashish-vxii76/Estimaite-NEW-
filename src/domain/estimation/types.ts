export const T_SHIRTS = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type TShirt = (typeof T_SHIRTS)[number];

export const WORK_ITEM_TYPES = ["ISSUE", "EPIC"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const PLANNING_MODES = ["RESOURCE_CONSTRAINED", "SPRINT_CONSTRAINED"] as const;
export type PlanningMode = (typeof PLANNING_MODES)[number];

export const COSTING_MODELS = ["RESOURCE_SPRINT", "TEAM_SPRINT"] as const;
export type CostingModel = (typeof COSTING_MODELS)[number];

export const ESTIMATE_STANCES = ["OPTIMISTIC", "NEUTRAL", "PESSIMISTIC"] as const;
export type EstimateStance = (typeof ESTIMATE_STANCES)[number];

export const COSTING_BASES = ["TEAM", "LOCATION"] as const;
export type CostingBasis = (typeof COSTING_BASES)[number];

export const READINESS_ANSWERS = ["YES", "NO"] as const;
export type ReadinessAnswer = (typeof READINESS_ANSWERS)[number];

export const CONFIDENCE_LEVELS = ["Very Low", "Low", "Medium", "High"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const DOR_STATUSES = [
  "Ready for Estimation",
  "Estimate with Assumptions",
  "Discovery Required",
] as const;
export type DorStatus = (typeof DOR_STATUSES)[number];

export const GOVERNANCE_DECISIONS = [
  "READY",
  "REVIEW",
  "SPLIT",
  "SPIKE REQUIRED",
  "DISCOVERY REQUIRED",
  "PLAN",
  "DECOMPOSE",
  "SPLIT EPIC",
  "OVERRIDE INCOMPLETE",
  "RATE OVERRIDE APPROVAL REQ.",
  "COSTING BASIS REQUIRED",
  "TEAM REQUIRED",
  "LOCATION REQUIRED",
  "COST METHOD REQUIRED",
] as const;
export type GovernanceDecision = (typeof GOVERNANCE_DECISIONS)[number];

export const ISSUE_FIBONACCI = [1, 2, 3, 5, 8, 13, 21] as const;

export type Explanation = {
  title: string;
  summary: string;
  steps: string[];
};

export type ComplexityDimensionConfig = {
  id: string;
  name: string;
  description: string;
  weight: number;
  minScore: number;
  maxScore: number;
  guidance: string;
  active: boolean;
  options: string[];
};

export type ComplexityBandConfig = {
  tshirt: TShirt;
  minInclusive: number;
  maxExclusive: number;
};

export type ComplexityMappingConfig = {
  lower: number;
  upper: number;
  tshirt: TShirt;
  complexity: string;
  governance: GovernanceDecision;
  interpretation: string;
};

export type ResourceLevelConfig = {
  id: string;
  name: string;
  capacitySpPerSprint: number;
  daysPerPoint: number;
  definition?: string;
  rule?: string;
};

export type StoryPointMappingConfig = {
  tshirt: TShirt;
  canonicalSp: number;
  governance: GovernanceDecision;
};

export type IssueMappingConfig = {
  tshirt: TShirt;
  totalSp: number;
  devSp: number;
  qaSp: number;
  devPd: number;
  qaPd: number;
  totalPd: number;
  sprintRule: string;
  governance: GovernanceDecision;
  notes: string;
};

export type EpicRomMappingConfig = {
  tshirt: TShirt;
  romSp: number;
};

export type EpicMappingConfig = {
  tshirt: TShirt;
  romSp: number;
  expectedStories: number;
  devSp: number;
  qaSp: number;
  devPd: number;
  qaPd: number;
  totalPd: number;
  governance: GovernanceDecision;
  notes: string;
};

export type AllowedIssueSpConfig = {
  sp: number;
  tshirt: TShirt;
  autoOutput: boolean;
  notes: string;
};

export type CostMappingConfig = {
  location: string;
  teamSprintCost: number;
  resourceSprintCost: number;
  standardTeamSize: number;
  currency: string;
  cost?: number;
  costMethod?: string;
};

export type TeamCostMappingConfig = {
  teamLocation: string;
  teamName: string;
  teamSprintCost: number;
  resourceSprintCost: number;
  standardTeamSize: number;
  currency: string;
  cost?: number;
  costMethod?: string;
};

export type LocationDailyRateConfig = {
  location: string;
  dailyRate: number;
  currency: string;
};

export type RosterMember = {
  name?: string;
  roleStream: string;
  location: string;
  seniority?: string;
  headcount?: number;
};

export type LocationAllocation = {
  locationId: string;
  locationName: string;
  allocationPct: number;
  dailyRate: number;
  currency: string;
};

export type ReadinessCriterionConfig = {
  id: string;
  label: string;
};

export type EstimationConfig = {
  versionId: string;
  rateVersionId: string;
  complexityDimensions: ComplexityDimensionConfig[];
  complexityBands: ComplexityBandConfig[];
  complexityMappings: ComplexityMappingConfig[];
  issueStoryPointMappings: StoryPointMappingConfig[];
  issueMappings: IssueMappingConfig[];
  epicRomMappings: EpicRomMappingConfig[];
  epicMappings: EpicMappingConfig[];
  allowedIssueStoryPoints: AllowedIssueSpConfig[];
  resourceLevels: ResourceLevelConfig[];
  complexityMultipliers: Record<TShirt, number>;
  costMappings: CostMappingConfig[];
  teamCostMappings: TeamCostMappingConfig[];
  locationDailyRates: LocationDailyRateConfig[];
  sprintWorkingDays: number;
  aiMinPct: number;
  aiMaxPct: number;
  issueMaxRecommendedSprints: number;
  issueReviewSp: number;
  issueSplitSp: number;
  epicDecomposeSp: number;
  epicSplitSp: number;
  fullTeamRateUtilisationWarning: number;
  standardTeamSize: number;
  dashboardMinEstimates: number;
  calibrationMinSamples: number;
  indexReviewMin: number;
  indexSplitMin: number;
  /** Configurable release quarters for Ready + Overview filters. */
  releaseQuarters: string[];
  /** Definition of Ready questions shown on Ready step. */
  readinessCriteria: ReadinessCriterionConfig[];
  /** DoR score at/above this (and below full Yes) → Estimate with Assumptions. */
  readinessAssumptionsMin: number;
  /**
   * DEC-007 A5: per-crew calibrated Days/Point overrides — { crewId: { resourceLevelId: dpp } }.
   * A crew's estimate uses its override for a level if present, else the global resourceLevels
   * default. Empty by default → every crew behaves exactly as today (golden-safe).
   */
  crewDaysPerPoint: Record<string, Record<string, number>>;
  /**
   * DEC-009 Class-A: per-crew SP-capacity/sprint overrides — { crewId: { resourceLevelId: cap } }.
   * A crew's estimate uses its override for a level if present, else the global resourceLevels
   * capacity. Empty by default → every crew behaves exactly as today (golden-safe).
   */
  crewCapacitySpPerSprint: Record<string, Record<string, number>>;
};

export type ComplexityScoreInput = {
  dimensionId: string;
  score: number;
};

export type ReadinessInput = {
  criterionId: string;
  answer: ReadinessAnswer;
};

export type EstimateCalculationInput = {
  workItemType: WorkItemType;
  complexityScores: ComplexityScoreInput[];
  readiness: ReadinessInput[];
  stance: EstimateStance;
  overrideSp?: number | null;
  overrideEnabled?: boolean;
  overrideReason?: string | null;
  overrideApprovedBy?: string | null;
  projectOverrideRate?: number | null;
  costingBasis?: CostingBasis | "";
  teamId?: string;
  teamName?: string;
  locationId?: string;
  locationName?: string;
  costMethod?: string;
  devResourceLevelId: string;
  qaResourceLevelId: string;
  devAiProductivityPct: number;
  qaAiProductivityPct: number;
  planningMode: PlanningMode;
  availableDev: number;
  availableQa: number;
  targetSprints: number;
  costingModel: CostingModel;
  resourceSprintRate: number;
  teamSprintRate: number;
  otherFixedCost: number;
  locationAllocations: LocationAllocation[];
  roster?: RosterMember[];
  currency: string;
  standardTeamSize?: number;
};

export type EstimateCalculationResult = {
  complexityIndex: number;
  complexityIndexPct: number;
  assessedTshirt: TShirt;
  effectiveTshirt: TShirt;
  baselineSp: number;
  selectedSp: number;
  optimisticSp: number;
  pessimisticSp: number;
  governedTotalSp: number;
  qaShare: number;
  devSp: number;
  qaSp: number;
  refDevPd: number;
  refQaPd: number;
  refTotalPd: number;
  complexityMultiplier: number;
  devCapacity: number;
  qaCapacity: number;
  aiAdjustedDevCapacity: number;
  aiAdjustedQaCapacity: number;
  requiredDev: number;
  requiredQa: number;
  plannedDev: number;
  plannedQa: number;
  plannedResources: number;
  utilisation: number;
  applicability: string;
  selectedRate: number;
  devSprints: number;
  qaSprints: number;
  calculatedSprints: number;
  finalSprints: number;
  referenceEffortPd: number;
  adjustedDevEffortPd: number;
  adjustedQaEffortPd: number;
  adjustedTotalEffortPd: number;
  blendedDailyRate: number;
  effortBasedCost: number | null;
  baselineResourceSprints: number | null;
  aiAdjustedResourceSprints: number | null;
  baselineDeliveryCost: number | null;
  aiAdjustedDeliveryCost: number | null;
  estimatedAiCostAvoidance: number | null;
  aiAdjustedTotalCost: number | null;
  aiCostSavingPct: number | null;
  costApplicability: string;
  /** Optional Monte-Carlo confidence range on the AI-adjusted total cost (attached by the service). */
  costP50?: number | null;
  costP80?: number | null;
  confidence: ConfidenceLevel;
  readinessScore: number;
  dorStatus: DorStatus;
  deliveryFlag: GovernanceDecision;
  governanceDecision: GovernanceDecision;
  epicStories: number | null;
  epicSpPerStory: number | null;
  epicSummary: string | null;
  currency: string;
  explanations: Record<string, Explanation>;
};
