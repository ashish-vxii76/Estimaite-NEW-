// DEC-011: metadata for the three per-crew mapping tables. Columns drive both the read-only view
// (M1) and the editor (M2–M4). `key` maps to a field on the row object; `num` marks numeric inputs.

export type MappingColumn = { key: string; label: string; num?: boolean; wide?: boolean };

export type MappingTableMeta = {
  table: "ISSUE" | "EPIC" | "COMPLEXITY";
  label: string;
  /** EstimationConfig fields this table owns (the coherent set copied/overridden together). */
  fields: string[];
  /** The primary editable array field rendered as rows. */
  rowsField: string;
  columns: MappingColumn[];
};

export const MAPPING_TABLE_META: Record<"ISSUE" | "EPIC" | "COMPLEXITY", MappingTableMeta> = {
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
};

export const MAPPING_TABLE_ORDER: ("ISSUE" | "EPIC" | "COMPLEXITY")[] = ["ISSUE", "EPIC", "COMPLEXITY"];
