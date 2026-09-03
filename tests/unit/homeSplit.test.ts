import { describe, it, expect } from "vitest";
import { computeHomeSplit } from "@/lib/homeSplit";
import type { OrgFilterUnit, OrgFilterTeam } from "@/lib/orgFilter";

// Company > Division > Crew tree helper.
function tree(): OrgFilterUnit[] {
  return [
    { id: "citi", type: "COMPANY", name: "Citi", parentId: null },
    { id: "hsbc", type: "COMPANY", name: "HSBC", parentId: null },
    { id: "citi-d1", type: "DIVISION", name: "Citi Markets", parentId: "citi" },
    { id: "citi-d2", type: "DIVISION", name: "Citi Wealth", parentId: "citi" },
    { id: "hsbc-d1", type: "DIVISION", name: "HSBC Retail", parentId: "hsbc" },
    { id: "citi-c1", type: "CREW", name: "Falcons", parentId: "citi-d1" },
    { id: "citi-c2", type: "CREW", name: "Eagles", parentId: "citi-d2" },
    { id: "hsbc-c1", type: "CREW", name: "Otters", parentId: "hsbc-d1" },
  ];
}
const teams = (): OrgFilterTeam[] => [
  { id: "t1", name: "Pod A", crewId: "citi-c1" },
  { id: "t2", name: "Pod B", crewId: "citi-c2" },
  { id: "t3", name: "Pod C", crewId: "hsbc-c1" },
];

describe("computeHomeSplit", () => {
  it("splits by Company when more than one company is visible (App admin)", () => {
    const s = computeHomeSplit(tree(), teams());
    expect(s.splitType).toBe("COMPANY");
    expect(s.splitLabel).toBe("Company");
    expect(s.units.map((u) => u.id).sort()).toEqual(["citi", "hsbc"]);
    // Pods roll up to their company.
    expect(s.teamToUnitId.t1).toBe("citi");
    expect(s.teamToUnitId.t2).toBe("citi");
    expect(s.teamToUnitId.t3).toBe("hsbc");
    expect(s.unitCrewIds.citi.sort()).toEqual(["citi-c1", "citi-c2"]);
    expect(s.unitCrewIds.hsbc).toEqual(["hsbc-c1"]);
  });

  it("splits by Division when only one company but many divisions are visible (Org admin)", () => {
    const units = tree().filter((u) => u.id !== "hsbc" && u.parentId !== "hsbc" && u.id !== "hsbc-c1" && u.parentId !== "hsbc-d1");
    const s = computeHomeSplit(units, teams().filter((t) => t.id !== "t3"));
    expect(s.splitType).toBe("DIVISION");
    expect(s.units.map((u) => u.id).sort()).toEqual(["citi-d1", "citi-d2"]);
    expect(s.teamToUnitId.t1).toBe("citi-d1");
    expect(s.teamToUnitId.t2).toBe("citi-d2");
  });

  it("returns no split when there is a single unit at every level (single-crew user)", () => {
    const units: OrgFilterUnit[] = [
      { id: "citi", type: "COMPANY", name: "Citi", parentId: null },
      { id: "citi-d1", type: "DIVISION", name: "Citi Markets", parentId: "citi" },
      { id: "citi-c1", type: "CREW", name: "Falcons", parentId: "citi-d1" },
    ];
    const s = computeHomeSplit(units, [{ id: "t1", name: "Pod A", crewId: "citi-c1" }]);
    expect(s.splitType).toBeNull();
    expect(s.units).toHaveLength(0);
  });

  it("maps unresolved pods (no crew) to null", () => {
    const s = computeHomeSplit(tree(), [{ id: "tx", name: "Floating", crewId: null }]);
    expect(s.teamToUnitId.tx).toBeNull();
  });
});
