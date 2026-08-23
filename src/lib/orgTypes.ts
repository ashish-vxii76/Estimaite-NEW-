export const ORG_TYPES = [
  "COMPANY",
  "DIVISION",
  "SUB_DIVISION",
  "STREAM",
  "CREW",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  COMPANY: "Company",
  DIVISION: "Division",
  SUB_DIVISION: "Sub-Division",
  STREAM: "Stream",
  CREW: "Crew",
};

export const ORG_CHILD_TYPE: Partial<Record<OrgType, OrgType>> = {
  COMPANY: "DIVISION",
  DIVISION: "SUB_DIVISION",
  SUB_DIVISION: "STREAM",
  STREAM: "CREW",
};

export const ORG_SEAT_TYPES = [
  "CEO",
  "CIO",
  "CTO",
  "CXO",
  "DIVISION_TECH_LEAD",
  "DIVISION_PRODUCT_LEAD",
  "SUB_DIVISION_TECH_LEAD",
  "SUB_DIVISION_PRODUCT_LEAD",
  "STREAM_TECH_LEAD",
  "STREAM_PRODUCT_LEAD",
  "CREW_TECH_LEAD",
  "CREW_PRODUCT_LEAD",
  "ORG_ADMIN",
] as const;

export type OrgSeatType = (typeof ORG_SEAT_TYPES)[number];

export const ORG_SEAT_LABEL: Record<OrgSeatType, string> = {
  CEO: "CEO",
  CIO: "CIO",
  CTO: "CTO",
  CXO: "CXO",
  DIVISION_TECH_LEAD: "Division Tech Lead",
  DIVISION_PRODUCT_LEAD: "Division Product Lead",
  SUB_DIVISION_TECH_LEAD: "Sub-Division Tech Lead",
  SUB_DIVISION_PRODUCT_LEAD: "Sub-Division Product Lead",
  STREAM_TECH_LEAD: "Stream Tech Lead",
  STREAM_PRODUCT_LEAD: "Stream Product Lead",
  CREW_TECH_LEAD: "Crew Tech Lead",
  CREW_PRODUCT_LEAD: "Crew Product Lead",
  ORG_ADMIN: "Org admin (subtree)",
};

export type OrgPath = {
  companyId: string;
  companyName: string;
  divisionId: string;
  divisionName: string;
  subDivisionId: string;
  subDivisionName: string;
  streamId: string;
  streamName: string;
  crewId: string;
  crewName: string;
  teamId?: string;
  teamName?: string;
};
