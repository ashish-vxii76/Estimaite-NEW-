/**
 * Org LEVEL ranking — distinct from the RBAC role. Capabilities like Roll-up, Calibration and Crew
 * budgets are gated by the level of the viewer's ACTIVE seat/grant, not by their role: a Delivery
 * Lead at a Pod is not the same as a Delivery Lead at a Crew or Stream. Higher rank = wider scope.
 */
export const LEVEL_ORDER = ["POD", "CREW", "STREAM", "SUB_DIVISION", "DIVISION", "COMPANY", "APP"] as const;

export type OrgLevel = (typeof LEVEL_ORDER)[number];

export function levelRank(level: string | null | undefined): number {
  const i = LEVEL_ORDER.indexOf(level as OrgLevel);
  return i < 0 ? 0 : i; // unknown / pod-only → lowest
}

/** Minimum level for the crew-leadership surfaces (Roll-up, Calibration, Crew budgets). */
export const CREW_LEVEL = levelRank("CREW");
/** Default when a level isn't supplied — treat as apex so pure role/nav checks aren't gated. */
export const APP_LEVEL = levelRank("APP");
