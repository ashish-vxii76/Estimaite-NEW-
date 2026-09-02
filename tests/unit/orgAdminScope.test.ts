import { describe, expect, it } from "vitest";
import {
  canArchiveUnit,
  canCreateUnderParent,
  canWriteUnit,
  type OrgAdminScope,
} from "@/services/orgService";

// DEC-016: administration authority is anchored to a seat/grant subtree. These pure helpers encode
// the create/edit/archive policy that the organisation API enforces server-side.

const appAdmin: OrgAdminScope = { appLevel: true, anchorId: null, anchorType: null, visibleIds: new Set() };

// Crew-anchored admin (e.g. "IBRL Admin"): visible = the crew only (no org children below a crew).
const crewAdmin: OrgAdminScope = {
  appLevel: false,
  anchorId: "crew",
  anchorType: "CREW",
  visibleIds: new Set(["crew"]),
};

// Stream-anchored admin: visible = stream + its crews.
const streamAdmin: OrgAdminScope = {
  appLevel: false,
  anchorId: "stream",
  anchorType: "STREAM",
  visibleIds: new Set(["stream", "crew", "crew2"]),
};

describe("org admin scope gating (DEC-016)", () => {
  it("App admin is unrestricted", () => {
    expect(canCreateUnderParent(appAdmin, null)).toBe(true); // create a Company
    expect(canCreateUnderParent(appAdmin, "anything")).toBe(true);
    expect(canArchiveUnit(appAdmin, "anything")).toBe(true);
    expect(canWriteUnit(appAdmin, "anything")).toBe(true);
  });

  it("a Crew admin cannot create Companies/Divisions/Crews", () => {
    expect(canCreateUnderParent(crewAdmin, null)).toBe(false); // no top-level Company
    expect(canCreateUnderParent(crewAdmin, "company")).toBe(false); // parent out of scope
    expect(canCreateUnderParent(crewAdmin, "stream")).toBe(false); // can't create a crew under a stream
  });

  it("a Crew admin may edit their crew but never archive it or anything above", () => {
    expect(canWriteUnit(crewAdmin, "crew")).toBe(true); // edit crew details
    expect(canArchiveUnit(crewAdmin, "crew")).toBe(false); // cannot delete own anchor
    expect(canArchiveUnit(crewAdmin, "stream")).toBe(false); // cannot touch ancestor
    expect(canWriteUnit(crewAdmin, "otherCrew")).toBe(false); // no sibling crews
  });

  it("delete-crew belongs to the Stream admin one rung up", () => {
    expect(canArchiveUnit(streamAdmin, "crew")).toBe(true); // strict descendant → archivable
    expect(canArchiveUnit(streamAdmin, "crew2")).toBe(true);
    expect(canArchiveUnit(streamAdmin, "stream")).toBe(false); // not their own anchor
    expect(canCreateUnderParent(streamAdmin, "stream")).toBe(true); // create a new crew under the stream
  });
});
