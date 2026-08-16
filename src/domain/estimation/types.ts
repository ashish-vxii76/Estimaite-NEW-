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

export const READINESS_ANSWERS = ["YES", "PARTIAL", "NO"] as const;
export type ReadinessAnswer = (typeof READINESS_ANSWERS)[number];

export const GOVERNANCE_DECISIONS = [
  "READY",
  "REVIEW",
  "SPLIT",
  "SPIKE REQUIRED",
  "DISCOVERY REQUIRED",
  "PLAN",
  "DECOMPOSE",
  "SPLIT EPIC",
] as const;
export type GovernanceDecision = (typeof GOVERNANCE_DECISIONS)[number];

export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

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
  costMethod: string;
  cost: number;
  standardTeamSize: number;
  currency: string;
};

export type TeamCostMappingConfig = {
  teamLocation: string;
  teamName: string;
  costMethod: string;
  cost: number;
  standardTeamSize: number;
  currency: string;
};

export type LocationAllocation = {
  locationId: string;
  locationName: string;
  allocationPct: number;
  dailyRate: number;
  currency: string;
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
  sprintWorkingDays: number;
  aiMinPct: number;
  aiMaxPct: number;
  issueMaxRecommendedSprints: number;
  issueReviewSp: number;
  issueSplitSp: number;
  epicDecomposeSp: number;
  epicSplitSp: number;
  fullTeamRateUtilisationWarning: number;
  readinessDiscoveryMax: number;
  readinessSpikeMax: number;
  confidenceHighReadinessMin: number;
  confidenceHighUncertaintyMax: number;
  confidenceLowReadinessMax: number;
  confidenceLowUncertaintyMin: number;
  qaSplitBase: number;
  qaSplitFromQaScore: number;
  qaSplitFromNfrScore: number;
  qaSplitMin: number;
  qaSplitMax: number;
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
  currency: string;
};

export type EstimateCalculationResult = {
  complexityIndex: number;
  complexityIndexPct: number;
  assessedTshirt: TShirt;
  effectiveTshirt: TShirt;
  baselineSp: number;
  selectedSp: number;
  qaShare: number;
  devSp: number;
  qaSp: number;
  devCapacity: number;
  qaCapacity: number;
  aiAdjustedDevCapacity: number;
  aiAdjustedQaCapacity: number;
  requiredDev: number;
  requiredQa: number;
  plannedDev: number;
  plannedQa: number;
  devSprints: number;
  qaSprints: number;
  calculatedSprints: number;
  finalSprints: number;
  referenceEffortPd: number;
  adjustedDevEffortPd: number;
  adjustedQaEffortPd: number;
  adjustedTotalEffortPd: number;
  blendedDailyRate: number;
  effortBasedCost: number;
  baselineResourceSprints: number;
  aiAdjustedResourceSprints: number;
  baselineDeliveryCost: number;
  aiAdjustedDeliveryCost: number;
  estimatedAiCostAvoidance: number;
  aiCostSavingPct: number;
  confidence: ConfidenceLevel;
  readinessScore: number;
  governanceDecision: GovernanceDecision;
  currency: string;
  explanations: Record<string, Explanation>;
};
