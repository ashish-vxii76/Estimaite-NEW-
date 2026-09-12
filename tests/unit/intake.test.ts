import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  // Deterministic key for the crypto round-trip (any string → SHA-256 → 32 bytes).
  process.env.INTAKE_ENCRYPTION_KEY = "test-intake-key-do-not-use-in-prod";
});

describe("intake · crypto (PAT at rest)", () => {
  it("round-trips a secret and produces versioned ciphertext", async () => {
    const { encryptSecret, decryptSecret, isEncrypted } = await import("@/lib/crypto");
    const secret = "glpat-EXAMPLE-token-1234567890";
    const enc = encryptSecret(secret);
    expect(isEncrypted(enc)).toBe(true);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(enc).not.toContain(secret); // plaintext never present
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("uses a fresh IV each time (ciphertext differs, plaintext same)", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/crypto");
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });

  it("rejects tampered ciphertext (GCM auth)", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/crypto");
    const enc = encryptSecret("secret");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("intake · gitlab refs & host allow-list", () => {
  it("only allows gitlab.com", async () => {
    const { isAllowedHost, assertAllowedHost } = await import("@/services/gitlab/refs");
    expect(isAllowedHost("gitlab.com")).toBe(true);
    expect(isAllowedHost("GitLab.com")).toBe(true);
    expect(isAllowedHost("evil.example.com")).toBe(false);
    expect(() => assertAllowedHost("gitlab.internal.corp")).toThrow();
  });

  it("externalRef is stable and round-trips (idempotency key)", async () => {
    const { externalRef, parseExternalRef } = await import("@/services/gitlab/refs");
    const ref = externalRef("gitlab.com", 42, "EPIC", 7);
    expect(ref).toBe("gitlab:gitlab.com:42:EPIC:7");
    // Same inputs → same ref (re-pull links, never duplicates).
    expect(externalRef("gitlab.com", 42, "EPIC", 7)).toBe(ref);
    expect(parseExternalRef(ref)).toEqual({ host: "gitlab.com", projectId: "42", type: "EPIC", iid: "7" });
    expect(parseExternalRef("nope")).toBeNull();
  });

  it("detects write scopes so read-only is enforced", async () => {
    const { hasWriteScope } = await import("@/services/gitlab/refs");
    expect(hasWriteScope(["read_api"])).toBe(false);
    expect(hasWriteScope(["read_api", "read_repository"])).toBe(false);
    expect(hasWriteScope(["api"])).toBe(true);
    expect(hasWriteScope(["write_repository"])).toBe(true);
    expect(hasWriteScope(["sudo"])).toBe(true);
  });
});

describe("intake · GitLabClient (injected fetch)", () => {
  it("testConnection passes for a read-only token", async () => {
    const { GitLabClient } = await import("@/services/gitlab/client");
    const fakeFetch = (async (url: string) => {
      const path = String(url);
      const body = path.endsWith("/user")
        ? { id: 1, username: "eng" }
        : { scopes: ["read_api"] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new GitLabClient("gitlab.com", "glpat-x", fakeFetch);
    const r = await client.testConnection();
    expect(r.ok).toBe(true);
    expect(r.username).toBe("eng");
    expect(r.readOnly).toBe(true);
  });

  it("testConnection rejects a token with write scopes", async () => {
    const { GitLabClient } = await import("@/services/gitlab/client");
    const fakeFetch = (async (url: string) => {
      const path = String(url);
      const body = path.endsWith("/user") ? { id: 1, username: "eng" } : { scopes: ["api"] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new GitLabClient("gitlab.com", "glpat-x", fakeFetch);
    const r = await client.testConnection();
    expect(r.ok).toBe(false);
    expect(r.readOnly).toBe(false);
  });

  it("refuses to construct against a disallowed host", async () => {
    const { GitLabClient } = await import("@/services/gitlab/client");
    expect(() => new GitLabClient("evil.example.com", "t")).toThrow();
  });
});

describe("intake · candidate parsing & selection", () => {
  it("toCandidate maps issue (project_id) and epic (group_id)", async () => {
    const { toCandidate } = await import("@/services/gitlab/client");
    const issue = toCandidate("ISSUE", { iid: 5, project_id: 42, title: "X", state: "opened", labels: ["a", "b"], web_url: "u", updated_at: "t", description: "d" });
    expect(issue).toMatchObject({ type: "ISSUE", iid: 5, projectId: 42, title: "X", labels: ["a", "b"] });
    const epic = toCandidate("EPIC", { iid: 2, group_id: 9, title: "E" });
    expect(epic.projectId).toBe(9);
    expect(epic.type).toBe("EPIC");
  });

  it("partitionCandidates hides already-imported by default, reveals with the toggle", async () => {
    const { partitionCandidates } = await import("@/services/gitlab/intake");
    const { toCandidate } = await import("@/services/gitlab/client");
    const { externalRef } = await import("@/services/gitlab/refs");
    const raw = [
      toCandidate("ISSUE", { iid: 1, project_id: 42, title: "one" }),
      toCandidate("ISSUE", { iid: 2, project_id: 42, title: "two" }),
    ];
    const imported = new Set([externalRef("gitlab.com", 42, "ISSUE", 1)]);

    const hiddenDefault = partitionCandidates(raw, "gitlab.com", imported, false);
    expect(hiddenDefault.visible.map((c) => c.iid)).toEqual([2]);
    expect(hiddenDefault.hidden).toBe(1);

    const revealed = partitionCandidates(raw, "gitlab.com", imported, true);
    expect(revealed.visible.length).toBe(2);
    expect(revealed.hidden).toBe(0);
    expect(revealed.visible.find((c) => c.iid === 1)?.alreadyImported).toBe(true);
    expect(revealed.visible.find((c) => c.iid === 2)?.alreadyImported).toBe(false);
  });
});
