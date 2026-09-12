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
