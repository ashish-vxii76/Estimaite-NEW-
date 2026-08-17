import { describe, expect, it } from "vitest";
import { canAccessPath, welcomeLine } from "@/lib/roles";

describe("role access", () => {
  it("builds a welcome line from the signed-in name and role", () => {
    expect(welcomeLine("Ashish Joshi", "ADMINISTRATOR")).toBe("Welcome Ashish Joshi (Admin)");
  });

  it("restricts admin and create routes by role", () => {
    expect(canAccessPath("REQUESTER", "/admin")).toBe(false);
    expect(canAccessPath("FINANCE", "/admin")).toBe(true);
    expect(canAccessPath("FINANCE", "/admin/users")).toBe(false);
    expect(canAccessPath("VIEWER", "/estimates/new")).toBe(false);
    expect(canAccessPath("REQUESTER", "/estimates/new")).toBe(true);
    expect(canAccessPath("VIEWER", "/what-if")).toBe(false);
    expect(canAccessPath("REQUESTER", "/")).toBe(true);
  });
});
