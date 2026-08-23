import { describe, expect, it } from "vitest";
import {
  formatRelease,
  formatReleaseYearOnly,
  isCompleteRelease,
  parseRelease,
  quartersForYear,
  releaseWhere,
  yearsFromCatalogue,
} from "@/lib/releasePeriod";

describe("releasePeriod", () => {
  const catalogue = ["2026-Q1", "2026-Q2", "2026-Q3", "2027-Q1"];

  it("parses full and year-only values", () => {
    expect(parseRelease("2026-Q2")).toEqual({ year: "2026", quarter: "Q2" });
    expect(parseRelease("2026-")).toEqual({ year: "2026", quarter: "" });
    expect(parseRelease("2026")).toEqual({ year: "2026", quarter: "" });
    expect(parseRelease("")).toEqual({ year: "", quarter: "" });
  });

  it("formats and validates complete releases", () => {
    expect(formatRelease("2026", "Q3")).toBe("2026-Q3");
    expect(formatReleaseYearOnly("2026")).toBe("2026-");
    expect(isCompleteRelease("2026-Q1")).toBe(true);
    expect(isCompleteRelease("2026-")).toBe(false);
  });

  it("lists years and quarters from the catalogue", () => {
    expect(yearsFromCatalogue(catalogue)).toEqual(["2027", "2026"]);
    expect(quartersForYear(catalogue, "2026")).toEqual(["Q1", "Q2", "Q3"]);
    expect(quartersForYear(catalogue, "2027")).toEqual(["Q1"]);
    expect(quartersForYear(catalogue, "")).toEqual([]);
  });

  it("builds prisma release filters", () => {
    expect(releaseWhere("2026-Q2")).toEqual({ release: "2026-Q2" });
    expect(releaseWhere("2026-")).toEqual({ release: { startsWith: "2026-" } });
    expect(releaseWhere("")).toEqual({});
  });
});
