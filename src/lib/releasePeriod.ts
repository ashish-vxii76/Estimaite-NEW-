/** Release period helpers. Stored value remains `YYYY-QN` (e.g. 2026-Q2). */

const FULL_RE = /^(\d{4})-Q([1-4])$/i;
const YEAR_ONLY_RE = /^(\d{4})-?$/;

export function parseRelease(release: string | null | undefined): {
  year: string;
  quarter: string;
} {
  const raw = String(release ?? "").trim();
  const full = FULL_RE.exec(raw);
  if (full) return { year: full[1]!, quarter: `Q${full[2]}` };
  const yearOnly = YEAR_ONLY_RE.exec(raw);
  if (yearOnly) return { year: yearOnly[1]!, quarter: "" };
  return { year: "", quarter: "" };
}

export function formatRelease(year: string, quarter: string): string {
  const y = year.trim();
  const q = quarter.trim().toUpperCase().replace(/^Q/i, "");
  if (!/^\d{4}$/.test(y) || !/^[1-4]$/.test(q)) return "";
  return `${y}-Q${q}`;
}

/** Persist year selection before a quarter is chosen (`2026-`). */
export function formatReleaseYearOnly(year: string): string {
  const y = year.trim();
  return /^\d{4}$/.test(y) ? `${y}-` : "";
}

/** True when release is a complete catalogue value `YYYY-QN`. */
export function isCompleteRelease(release: string | null | undefined): boolean {
  return FULL_RE.test(String(release ?? "").trim());
}

/** Unique years from config catalogue, descending. */
export function yearsFromCatalogue(catalogue: string[]): string[] {
  const years = new Set<string>();
  for (const entry of catalogue) {
    const { year } = parseRelease(entry);
    if (year) years.add(year);
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

/** Quarter tokens (Q1…Q4) available for a year in the catalogue. */
export function quartersForYear(catalogue: string[], year: string): string[] {
  if (!year) return [];
  const found = new Set<string>();
  for (const entry of catalogue) {
    const parsed = parseRelease(entry);
    if (parsed.year === year && parsed.quarter) found.add(parsed.quarter);
  }
  return ["Q1", "Q2", "Q3", "Q4"].filter((q) => found.has(q));
}

/** Display label: year-only "2026-" shows as "2026"; complete "2026-Q3" is unchanged. */
export function displayRelease(release: string | null | undefined): string {
  const raw = String(release ?? "").trim();
  if (!raw) return "";
  return raw.endsWith("-") ? raw.slice(0, -1) : raw;
}

/**
 * Prisma `release` filter: exact `YYYY-QN`, or all quarters in a year when value is `YYYY` / `YYYY-`.
 */
export function releaseWhere(
  release: string | null | undefined,
): { release: string } | { release: { startsWith: string } } | Record<string, never> {
  const raw = String(release ?? "").trim();
  if (!raw) return {};
  if (FULL_RE.test(raw)) return { release: raw };
  const { year, quarter } = parseRelease(raw);
  if (year && !quarter) return { release: { startsWith: `${year}-` } };
  return { release: raw };
}
