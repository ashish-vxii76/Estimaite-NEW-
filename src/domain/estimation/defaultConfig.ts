import type {
  ComplexityDimensionConfig,
  EstimationConfig,
  IssueMappingConfig,
  EpicMappingConfig,
} from "./types";

const CRITERION_OPTIONS = [
  "Minimal / well understood",
  "Limited additional complexity",
  "Moderate complexity",
  "Significant complexity",
  "Extreme / poorly understood",
];

const UNCERTAINTY_OPTIONS = [
  "Requirements / solution clear",
  "Minor assumptions remain",
  "Material unknowns remain",
  "Significant investigation required",
  "Discovery / spike required",
];

function dim(
  id: string,
  name: string,
  weight: number,
  options = CRITERION_OPTIONS,
): ComplexityDimensionConfig {
  return {
    id,
    name,
    description: name,
    weight,
    minScore: 1,
    maxScore: 5,
    guidance: options.join(" → "),
    active: true,
    options,
  };
}

function issue(
  tshirt: IssueMappingConfig["tshirt"],
  totalSp: number,
  devSp: number,
  qaSp: number,
  governance: IssueMappingConfig["governance"],
  sprintRule: string,
  notes: string,
): IssueMappingConfig {
  return {
    tshirt,
    totalSp,
    devSp,
    qaSp,
    devPd: devSp,
    qaPd: qaSp,
    totalPd: totalSp,
    sprintRule,
    governance,
    notes,
  };
}

function epic(
  tshirt: EpicMappingConfig["tshirt"],
  romSp: number,
  expectedStories: number,
  devSp: number,
  qaSp: number,
  governance: EpicMappingConfig["governance"],
): EpicMappingConfig {
  return {
    tshirt,
    romSp,
    expectedStories,
    devSp,
    qaSp,
    devPd: devSp,
    qaPd: qaSp,
    totalPd: romSp,
    governance,
    notes: `${tshirt} epic ROM`,
  };
}

export const DEFAULT_CONFIG: EstimationConfig = {
  versionId: "cfg-v3-prd-2026-08",
  rateVersionId: "rate-v3-prd-chf",
  complexityDimensions: [
    dim("functional", "Functional / Business", 0.15),
    dim("technical", "Technical", 0.15),
    dim("applications", "Applications Impacted", 0.1),
    dim("integration", "Integration", 0.15),
    dim("data", "Data", 0.1),
    dim("qa", "QA / Regression", 0.1),
    dim("nfr", "NFR / Security", 0.05),
    dim("dependencies", "Dependencies", 0.05),
    dim("environment", "Environment / Release", 0.05),
    dim("uncertainty", "Uncertainty / Clarity", 0.1, UNCERTAINTY_OPTIONS),
  ],
  complexityMappings: [
    { lower: 0, upper: 20, tshirt: "XS", complexity: "Very Low", governance: "READY", interpretation: "Highly understood" },
    { lower: 21, upper: 35, tshirt: "S", complexity: "Low", governance: "READY", interpretation: "Straightforward" },
    { lower: 36, upper: 50, tshirt: "M", complexity: "Moderate", governance: "READY", interpretation: "Normal complexity" },
    { lower: 51, upper: 65, tshirt: "L", complexity: "High", governance: "READY", interpretation: "Complex delivery" },
    { lower: 66, upper: 80, tshirt: "XL", complexity: "Very High", governance: "REVIEW", interpretation: "High complexity" },
    { lower: 81, upper: 100, tshirt: "XXL", complexity: "Extreme", governance: "SPLIT", interpretation: "Not routine single unit" },
  ],
  complexityBands: [
    { tshirt: "XS", minInclusive: 0, maxExclusive: 21 },
    { tshirt: "S", minInclusive: 21, maxExclusive: 36 },
    { tshirt: "M", minInclusive: 36, maxExclusive: 51 },
    { tshirt: "L", minInclusive: 51, maxExclusive: 66 },
    { tshirt: "XL", minInclusive: 66, maxExclusive: 81 },
    { tshirt: "XXL", minInclusive: 81, maxExclusive: 101 },
  ],
  issueMappings: [
    issue("XS", 1, 0.5, 0.5, "READY", "Complete within 1 sprint", "Canonical XS"),
    issue("S", 3, 2, 1, "READY", "Complete within 1 sprint", "Canonical S"),
    issue("M", 5, 3, 2, "READY", "Complete within 1 sprint", "Canonical M"),
    issue("L", 8, 5, 3, "READY", "Complete within 1 sprint", "Canonical L"),
    issue("XL", 13, 8, 5, "REVIEW", "Review — may exceed 1 sprint", "Large Issue; review threshold"),
    issue("XXL", 21, 13, 8, "SPLIT", "Split — not a single-sprint item", "Split trigger"),
  ],
  issueStoryPointMappings: [
    { tshirt: "XS", canonicalSp: 1, governance: "READY" },
    { tshirt: "S", canonicalSp: 3, governance: "READY" },
    { tshirt: "M", canonicalSp: 5, governance: "READY" },
    { tshirt: "L", canonicalSp: 8, governance: "READY" },
    { tshirt: "XL", canonicalSp: 13, governance: "REVIEW" },
    { tshirt: "XXL", canonicalSp: 21, governance: "SPLIT" },
  ],
  epicMappings: [
    epic("XS", 13, 2, 8, 5, "PLAN"),
    epic("S", 21, 4, 13, 8, "PLAN"),
    epic("M", 40, 7, 24, 16, "PLAN"),
    epic("L", 70, 12, 42, 28, "PLAN"),
    epic("XL", 120, 20, 72, 48, "DECOMPOSE"),
    epic("XXL", 200, 32, 120, 80, "SPLIT EPIC"),
  ],
  epicRomMappings: [
    { tshirt: "XS", romSp: 13 },
    { tshirt: "S", romSp: 21 },
    { tshirt: "M", romSp: 40 },
    { tshirt: "L", romSp: 70 },
    { tshirt: "XL", romSp: 120 },
    { tshirt: "XXL", romSp: 200 },
  ],
  allowedIssueStoryPoints: [
    { sp: 1, tshirt: "XS", autoOutput: true, notes: "Valid Fibonacci Issue SP." },
    { sp: 2, tshirt: "S", autoOutput: false, notes: "Manual calibration only." },
    { sp: 3, tshirt: "S", autoOutput: true, notes: "Canonical S." },
    { sp: 5, tshirt: "M", autoOutput: true, notes: "Canonical M." },
    { sp: 8, tshirt: "L", autoOutput: true, notes: "Canonical L." },
    { sp: 13, tshirt: "XL", autoOutput: true, notes: "Review threshold." },
    { sp: 21, tshirt: "XXL", autoOutput: true, notes: "Split trigger." },
  ],
  resourceLevels: [
    { id: "beginner", name: "Beginner", capacitySpPerSprint: 3, daysPerPoint: 3.33, definition: "Average throughput per resource in one 2-week sprint.", rule: "Applies to Dev & QA" },
    { id: "intermediate", name: "Intermediate", capacitySpPerSprint: 5, daysPerPoint: 2.0, definition: "Average throughput per resource in one 2-week sprint.", rule: "Applies to Dev & QA" },
    { id: "experienced", name: "Experienced", capacitySpPerSprint: 7, daysPerPoint: 1.43, definition: "Average throughput per resource in one 2-week sprint.", rule: "Applies to Dev & QA" },
    { id: "senior", name: "Senior", capacitySpPerSprint: 10, daysPerPoint: 1.0, definition: "Average throughput per resource in one 2-week sprint.", rule: "Applies to Dev & QA" },
  ],
  complexityMultipliers: { XS: 1.0, S: 1.05, M: 1.15, L: 1.3, XL: 1.5, XXL: 1.75 },
  costMappings: [
    { location: "India", teamSprintCost: 25000, resourceSprintCost: 2500, standardTeamSize: 10, currency: "CHF" },
    { location: "United Kingdom", teamSprintCost: 50000, resourceSprintCost: 5000, standardTeamSize: 10, currency: "CHF" },
    { location: "United States", teamSprintCost: 70000, resourceSprintCost: 7000, standardTeamSize: 10, currency: "CHF" },
    { location: "Switzerland", teamSprintCost: 90000, resourceSprintCost: 9000, standardTeamSize: 10, currency: "CHF" },
    { location: "Poland", teamSprintCost: 35000, resourceSprintCost: 3500, standardTeamSize: 10, currency: "CHF" },
    { location: "Singapore", teamSprintCost: 120000, resourceSprintCost: 12000, standardTeamSize: 10, currency: "CHF" },
    { location: "Blended", teamSprintCost: 75000, resourceSprintCost: 7500, standardTeamSize: 10, currency: "CHF" },
    { location: "Other / Project Specific", teamSprintCost: 75000, resourceSprintCost: 7500, standardTeamSize: 10, currency: "CHF" },
  ],
  teamCostMappings: [
    { teamLocation: "India", teamName: "Vikings", teamSprintCost: 25000, resourceSprintCost: 2500, standardTeamSize: 10, currency: "CHF" },
    { teamLocation: "India", teamName: "Spartans", teamSprintCost: 25000, resourceSprintCost: 2500, standardTeamSize: 10, currency: "CHF" },
    { teamLocation: "Blended", teamName: "Centurions", teamSprintCost: 50000, resourceSprintCost: 5000, standardTeamSize: 10, currency: "CHF" },
    { teamLocation: "United States", teamName: "Praetorians", teamSprintCost: 70000, resourceSprintCost: 7000, standardTeamSize: 10, currency: "CHF" },
  ],
  locationDailyRates: [
    { location: "India", dailyRate: 250, currency: "CHF" },
    { location: "United Kingdom", dailyRate: 600, currency: "CHF" },
    { location: "United States", dailyRate: 700, currency: "CHF" },
    { location: "Switzerland", dailyRate: 900, currency: "CHF" },
    { location: "Poland", dailyRate: 350, currency: "CHF" },
    { location: "Singapore", dailyRate: 500, currency: "CHF" },
  ],
  sprintWorkingDays: 10,
  aiMinPct: 0,
  aiMaxPct: 1,
  issueMaxRecommendedSprints: 1,
  issueReviewSp: 13,
  issueSplitSp: 21,
  epicDecomposeSp: 120,
  epicSplitSp: 200,
  fullTeamRateUtilisationWarning: 0.75,
  standardTeamSize: 10,
  dashboardMinEstimates: 5,
  calibrationMinSamples: 3,
  indexReviewMin: 66,
  indexSplitMin: 81,
};

export function hydrateConfig(raw: Partial<EstimationConfig> | null | undefined): EstimationConfig {
  const merged: EstimationConfig = { ...DEFAULT_CONFIG, ...(raw ?? {}) };
  if (!merged.complexityDimensions?.[0]?.options) {
    merged.complexityDimensions = DEFAULT_CONFIG.complexityDimensions;
  }
  if (merged.complexityMappings?.length) {
    merged.complexityBands = merged.complexityMappings.map((m) => ({
      tshirt: m.tshirt,
      minInclusive: m.lower,
      maxExclusive: m.upper + 0.0001,
    }));
  }
  if (merged.issueMappings?.length) {
    merged.issueStoryPointMappings = merged.issueMappings.map((m) => ({
      tshirt: m.tshirt,
      canonicalSp: m.totalSp,
      governance: m.governance,
    }));
  }
  if (merged.epicMappings?.length) {
    merged.epicRomMappings = merged.epicMappings.map((m) => ({ tshirt: m.tshirt, romSp: m.romSp }));
  }
  merged.costMappings = (merged.costMappings ?? []).map((row) => ({
    ...row,
    teamSprintCost: row.teamSprintCost ?? (row.costMethod?.toLowerCase().includes("team") ? row.cost ?? 0 : row.teamSprintCost ?? 0),
    resourceSprintCost: row.resourceSprintCost ?? row.cost ?? 0,
    standardTeamSize: row.standardTeamSize || 10,
    currency: row.currency || "CHF",
  }));
  merged.teamCostMappings = (merged.teamCostMappings ?? []).map((row) => ({
    ...row,
    teamSprintCost: row.teamSprintCost ?? (row.costMethod?.toLowerCase().includes("team") ? row.cost ?? 0 : 0),
    resourceSprintCost: row.resourceSprintCost ?? row.cost ?? 0,
    standardTeamSize: row.standardTeamSize || 10,
    currency: row.currency || "CHF",
  }));
  if (!merged.locationDailyRates?.length) {
    merged.locationDailyRates = DEFAULT_CONFIG.locationDailyRates;
  }
  if (merged.aiMaxPct < 1 && merged.aiMaxPct === 0.5) merged.aiMaxPct = 1;
  return merged;
}
