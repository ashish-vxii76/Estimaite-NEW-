import { assertAllowedHost, hasWriteScope, type GitlabItemType } from "./refs";

/**
 * Minimal read-only GitLab REST client (PRD §8: read_api only, host-allowlisted, untrusted content).
 * `fetchImpl` is injectable for testing. All content returned here is treated as UNTRUSTED data by
 * downstream consumers (the agent), never as instructions.
 */

export type GitlabUser = { id: number; username: string };

export type GitlabCandidate = {
  type: GitlabItemType;
  iid: number;
  projectId: number | string;
  title: string;
  state: string;
  labels: string[];
  webUrl: string;
  updatedAt: string;
  description: string;
};

export type ConnectionResult = {
  ok: boolean;
  username?: string;
  scopes: string[];
  readOnly: boolean;
  error?: string;
};

export class GitLabClient {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly host: string,
    private readonly token: string,
    fetchImpl?: typeof fetch,
  ) {
    assertAllowedHost(host);
    this.fetchImpl = fetchImpl ?? fetch;
  }

  private base(): string {
    return `https://${this.host}/api/v4`;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.base()}${path}`, {
      headers: { "PRIVATE-TOKEN": this.token, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`GitLab ${res.status} for ${path}`);
    return (await res.json()) as T;
  }

  async currentUser(): Promise<GitlabUser> {
    return this.get<GitlabUser>("/user");
  }

  /** Best-effort token scope read; empty on older instances that don't expose the endpoint. */
  async tokenScopes(): Promise<string[]> {
    try {
      const t = await this.get<{ scopes?: string[] }>("/personal_access_tokens/self");
      return t.scopes ?? [];
    } catch {
      return [];
    }
  }

  private encodeRef(ref: string): string {
    return encodeURIComponent(ref.trim());
  }

  private async getPaged<T>(path: string, maxPages = 5, perPage = 100): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const batch = await this.get<T[]>(`${path}${sep}per_page=${perPage}&page=${page}`);
      if (!Array.isArray(batch) || batch.length === 0) break;
      out.push(...batch);
      if (batch.length < perPage) break;
    }
    return out;
  }

  /** Read issues for a project (path or numeric id), optionally filtered by state/labels. */
  async listIssues(projectRef: string, opts: { state?: string; labels?: string } = {}): Promise<GitlabCandidate[]> {
    const q: string[] = [];
    if (opts.state && opts.state !== "all") q.push(`state=${encodeURIComponent(opts.state)}`);
    if (opts.labels) q.push(`labels=${encodeURIComponent(opts.labels)}`);
    const path = `/projects/${this.encodeRef(projectRef)}/issues${q.length ? `?${q.join("&")}` : ""}`;
    const raw = await this.getPaged<Record<string, unknown>>(path);
    return raw.map((r) => toCandidate("ISSUE", r));
  }

  /** Read epics for a group (path or numeric id). Best-effort (premium/tier dependent). */
  async listEpics(groupRef: string, opts: { state?: string; labels?: string } = {}): Promise<GitlabCandidate[]> {
    const q: string[] = [];
    if (opts.state && opts.state !== "all") q.push(`state=${encodeURIComponent(opts.state)}`);
    if (opts.labels) q.push(`labels=${encodeURIComponent(opts.labels)}`);
    const path = `/groups/${this.encodeRef(groupRef)}/epics${q.length ? `?${q.join("&")}` : ""}`;
    const raw = await this.getPaged<Record<string, unknown>>(path);
    return raw.map((r) => toCandidate("EPIC", r));
  }

  /** Validate the PAT: reachable, and read-only. Never returns or logs the token. */
  async testConnection(): Promise<ConnectionResult> {
    try {
      const user = await this.currentUser();
      const scopes = await this.tokenScopes();
      const readOnly = !hasWriteScope(scopes);
      if (!readOnly) {
        return { ok: false, username: user.username, scopes, readOnly, error: "Token has write scopes — use a read_api (read-only) token." };
      }
      return { ok: true, username: user.username, scopes, readOnly };
    } catch (e) {
      return { ok: false, scopes: [], readOnly: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  }
}

/** Map a raw GitLab issue/epic object to a candidate. Pure — unit-tested. Content is UNTRUSTED. */
export function toCandidate(type: GitlabItemType, r: Record<string, unknown>): GitlabCandidate {
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const labels = Array.isArray(r.labels) ? (r.labels as unknown[]).map(String) : [];
  return {
    type,
    iid: num(r.iid),
    projectId: type === "ISSUE" ? num(r.project_id) : num(r.group_id),
    title: str(r.title),
    state: str(r.state),
    labels,
    webUrl: str(r.web_url),
    updatedAt: str(r.updated_at),
    description: str(r.description),
  };
}
