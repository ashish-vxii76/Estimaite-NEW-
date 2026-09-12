"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { encryptSecret } from "@/lib/crypto";
import { GitLabClient } from "@/services/gitlab/client";
import { isAllowedHost } from "@/services/gitlab/refs";
import { canConfigureCrew } from "@/services/gitlab/intake";

export type ActionResult = { ok: boolean; message: string };

/** Every configure action: feature must be on AND caller must hold integration.gitlab (RW). */
async function requireConfigurer() {
  if (!isGitlabIntakeEnabled()) throw new Error("GitLab intake is disabled");
  const session = await auth();
  if (!session?.user) throw new Error("Sign in first");
  if (!can(session.user.role, "integration.gitlab", "RW")) throw new Error("Not permitted");
  return session;
}

export async function testAndSaveConnection(host: string, token: string): Promise<ActionResult> {
  const session = await requireConfigurer();
  const h = (host || "gitlab.com").trim().toLowerCase();
  if (!isAllowedHost(h)) return { ok: false, message: `Host not allowed: ${h}` };
  if (!token || token.trim().length < 8) return { ok: false, message: "Enter a valid read_api token." };

  let client: GitLabClient;
  try {
    client = new GitLabClient(h, token.trim());
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bad host" };
  }
  const res = await client.testConnection();
  if (!res.ok) return { ok: false, message: res.error ?? "Connection failed" };

  await prisma.gitLabConnection.upsert({
    where: { userId_host: { userId: session.user.id, host: h } },
    create: { userId: session.user.id, host: h, encToken: encryptSecret(token.trim()), scopes: res.scopes.join(","), status: "ACTIVE", lastUsedAt: new Date() },
    update: { encToken: encryptSecret(token.trim()), scopes: res.scopes.join(","), status: "ACTIVE", lastUsedAt: new Date() },
  });
  revalidatePath("/admin/integrations/gitlab");
  return { ok: true, message: `Connected as @${res.username} (read-only).` };
}

export async function revokeConnection(): Promise<ActionResult> {
  const session = await requireConfigurer();
  await prisma.gitLabConnection.deleteMany({ where: { userId: session.user.id } });
  revalidatePath("/admin/integrations/gitlab");
  return { ok: true, message: "Connection revoked." };
}

export async function saveMapping(input: {
  projectOrGroupRef: string;
  crewId: string;
  defaultPodTeamId?: string | null;
}): Promise<ActionResult> {
  const session = await requireConfigurer();
  const scopeUser = fromSession(session.user);
  const ref = input.projectOrGroupRef.trim();
  if (!ref) return { ok: false, message: "Enter a GitLab project or group ref." };
  if (!input.crewId) return { ok: false, message: "Pick a crew." };
  if (!(await canConfigureCrew(scopeUser, input.crewId))) return { ok: false, message: "That crew is outside your scope." };

  await prisma.gitLabSourceMapping.upsert({
    where: { host_projectOrGroupRef: { host: "gitlab.com", projectOrGroupRef: ref } },
    create: { host: "gitlab.com", projectOrGroupRef: ref, crewId: input.crewId, defaultPodTeamId: input.defaultPodTeamId || null, configuredById: session.user.id, enabled: true },
    update: { crewId: input.crewId, defaultPodTeamId: input.defaultPodTeamId || null },
  });
  revalidatePath("/admin/integrations/gitlab/mapping");
  return { ok: true, message: `Mapped ${ref}.` };
}

async function ownedMapping(id: string) {
  const session = await requireConfigurer();
  const scopeUser = fromSession(session.user);
  const m = await prisma.gitLabSourceMapping.findUnique({ where: { id } });
  if (!m) return { m: null as null, ok: false as const };
  if (!(await canConfigureCrew(scopeUser, m.crewId))) return { m: null as null, ok: false as const };
  return { m, ok: true as const };
}

export async function toggleMapping(id: string, enabled: boolean): Promise<ActionResult> {
  const { m, ok } = await ownedMapping(id);
  if (!ok || !m) return { ok: false, message: "Not found or out of scope." };
  await prisma.gitLabSourceMapping.update({ where: { id }, data: { enabled } });
  revalidatePath("/admin/integrations/gitlab/mapping");
  return { ok: true, message: enabled ? "Enabled." : "Disabled." };
}

export async function deleteMapping(id: string): Promise<ActionResult> {
  const { m, ok } = await ownedMapping(id);
  if (!ok || !m) return { ok: false, message: "Not found or out of scope." };
  await prisma.gitLabSourceMapping.delete({ where: { id } });
  revalidatePath("/admin/integrations/gitlab/mapping");
  return { ok: true, message: "Mapping deleted." };
}
