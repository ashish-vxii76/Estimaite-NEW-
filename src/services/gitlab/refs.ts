/**
 * GitLab source helpers: host allow-list, item types, and the idempotency key (externalRef).
 * PRD §8.1 (host validation), §8.4 F11 (externalRef = {projectId, iid, type}, unique per estimate).
 */

export type GitlabItemType = "ISSUE" | "EPIC";

/** Config-allowed hosts (PRD assumption: gitlab.com SaaS in v1). */
export const ALLOWED_HOSTS = new Set(["gitlab.com"]);

export function isAllowedHost(host: string): boolean {
  return ALLOWED_HOSTS.has(host.trim().toLowerCase());
}

export function assertAllowedHost(host: string): void {
  if (!isAllowedHost(host)) {
    throw new Error(`GitLab host not allowed: "${host}" (allowed: ${[...ALLOWED_HOSTS].join(", ")})`);
  }
}

/** Stable idempotency key for an issue/epic. Re-pulls resolve to the same ref → link, never duplicate. */
export function externalRef(
  host: string,
  projectId: string | number,
  type: GitlabItemType,
  iid: string | number,
): string {
  return `gitlab:${host.trim().toLowerCase()}:${projectId}:${type}:${iid}`;
}

export function parseExternalRef(
  ref: string,
): { host: string; projectId: string; type: GitlabItemType; iid: string } | null {
  const parts = ref.split(":");
  if (parts.length !== 5 || parts[0] !== "gitlab") return null;
  const [, host, projectId, type, iid] = parts;
  if (type !== "ISSUE" && type !== "EPIC") return null;
  return { host, projectId, type, iid };
}

/**
 * Write-scope detection for a PAT. The connection must be read-only (`read_api`); any of these
 * scopes means the token can mutate GitLab and is rejected (PRD §8.1 F2, read-only guarantee).
 */
export function hasWriteScope(scopes: string[]): boolean {
  return scopes.some(
    (s) => s === "api" || s === "sudo" || s.startsWith("write") || s === "create_runner",
  );
}
