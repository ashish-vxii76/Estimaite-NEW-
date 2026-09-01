// DEC-011: metadata for the three per-crew mapping tables. Columns drive both the read-only view
// (M1) and the editor (M2–M4). `key` maps to a field on the row object; `num` marks numeric inputs.

export type MappingColumn = { key: string; label: string; num?: boolean; wide?: boolean };

export type OverrideDomain =
  | "ISSUE"
  | "EPIC"
  | "COMPLEXITY"
  | "LOCATION_SPRINT_RATES"
  | "LOCATION_DAILY_RATES"
  | "TEAM_SPRINT_RATES"
  | "ESTIMATION_CONFIG";

export type MappingTableMeta = {
  table: OverrideDomain;
  label: string;
  /** EstimationConfig fields this table owns (the coherent set copied/overridden together). */
  fields: string[];
  /** The primary editable array field rendered as rows. */
  rowsField: string;
  columns: MappingColumn[];
};

export const MAPPING_TABLE_META: Record<OverrideDomain, MappingTableMeta> = {
  ISSUE: {
    table: "ISSUE",
    label: "Issue mapping",
    fields: ["issueMappings", "issueStoryPointMappings", "allowedIssueStoryPoints"],
    rowsField: "issueMappings",
    columns: [
      { key: "tshirt", label: "T-shirt" },
      { key: "totalSp", label: "SP", num: true },
      { key: "devSp", label: "Dev SP", num: true },
      { key: "qaSp", label: "QA SP", num: true },
      { key: "devPd", label: "Dev PD", num: true },
      { key: "qaPd", label: "QA PD", num: true },
      { key: "totalPd", label: "Total PD", num: true },
      { key: "governance", label: "Governance" },
      { key: "notes", label: "Notes", wide: true },
    ],
  },
  EPIC: {
    table: "EPIC",
    label: "Epic mapping",
    fields: ["epicMappings", "epicRomMappings"],
    rowsField: "epicMappings",
    columns: [
      { key: "tshirt", label: "T-shirt" },
      { key: "romSp", label: "ROM SP", num: true },
      { key: "expectedStories", label: "Stories", num: true },
      { key: "devSp", label: "Dev SP", num: true },
      { key: "qaSp", label: "QA SP", num: true },
      { key: "devPd", label: "Dev PD", num: true },
      { key: "qaPd", label: "QA PD", num: true },
      { key: "totalPd", label: "Total PD", num: true },
      { key: "governance", label: "Governance" },
      { key: "notes", label: "Notes", wide: true },
    ],
  },
  COMPLEXITY: {
    table: "COMPLEXITY",
    label: "Complexity mapping",
    fields: ["complexityMappings", "complexityBands"],
    rowsField: "complexityMappings",
    columns: [
      { key: "lower", label: "Lower", num: true },
      { key: "upper", label: "Upper", num: true },
      { key: "tshirt", label: "T-shirt" },
      { key: "complexity", label: "Complexity" },
      { key: "governance", label: "Governance" },
      { key: "interpretation", label: "Interpretation", wide: true },
    ],
  },
  // DEC-013 crew-scoped rate domains (row-based, same editor as mappings).
  LOCATION_SPRINT_RATES: {
    table: "LOCATION_SPRINT_RATES",
    label: "Location sprint rates",
    fields: ["costMappings"],
    rowsField: "costMappings",
    columns: [
      { key: "location", label: "Location" },
      { key: "teamSprintCost", label: "Team sprint cost", num: true },
      { key: "resourceSprintCost", label: "Resource sprint cost", num: true },
      { key: "standardTeamSize", label: "Std team size", num: true },
      { key: "currency", label: "Currency" },
    ],
  },
  LOCATION_DAILY_RATES: {
    table: "LOCATION_DAILY_RATES",
    label: "Location daily rates",
    fields: ["locationDailyRates"],
    rowsField: "locationDailyRates",
    columns: [
      { key: "location", label: "Location" },
      { key: "dailyRate", label: "Daily rate", num: true },
      { key: "currency", label: "Currency" },
    ],
  },
  // DEC-013: team rates are per-pod (rows keyed by team/pod name); a crew override tunes its pods'
  // rate rows, resolved via config.teamCostMappings in the estimate.
  TEAM_SPRINT_RATES: {
    table: "TEAM_SPRINT_RATES",
    label: "Team sprint rates",
    fields: ["teamCostMappings"],
    rowsField: "teamCostMappings",
    columns: [
      { key: "teamLocation", label: "Team location" },
      { key: "teamName", label: "Team / Pod" },
      { key: "teamSprintCost", label: "Team sprint cost", num: true },
      { key: "resourceSprintCost", label: "Resource sprint cost", num: true },
      { key: "standardTeamSize", label: "Std team size", num: true },
      { key: "currency", label: "Currency" },
    ],
  },
  // DEC-013 estimation config is SCALAR (Class-A fields), not a row table — its page uses a
  // dedicated scalar editor (R5), so rowsField/columns are unused here.
  ESTIMATION_CONFIG: {
    table: "ESTIMATION_CONFIG",
    label: "Estimation config",
    fields: ["aiMinPct", "aiMaxPct", "standardTeamSize", "fullTeamRateUtilisationWarning"],
    rowsField: "",
    columns: [],
  },
};

export const MAPPING_TABLE_ORDER: ("ISSUE" | "EPIC" | "COMPLEXITY")[] = ["ISSUE", "EPIC", "COMPLEXITY"];
