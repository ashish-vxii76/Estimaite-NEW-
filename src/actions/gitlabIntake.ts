"use server";

import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { isGitlabIntakeEnabled } from "@/lib/features";
import {
  previewCandidates,
  createImportRun,
  type PullFilters,
  type PreviewCandidate,
} from "@/services/gitlab/intake";

/** Trigger actions: feature on AND caller holds estimates.import (crew-leadership OR pod-level). */
async function requireImporter() {
  if (!isGitlabIntakeEnabled()) throw new Error("GitLab intake is disabled");
  const session = await auth();
  if (!session?.user) throw new Error("Sign in first");
  if (!can(session.user.role, "estimates.import", "RW")) throw new Error("Not permitted");
  return session;
}

export async function previewAction(
  mappingId: string,
  filters: PullFilters,
): Promise<{ candidates: PreviewCandidate[]; hiddenImported: number; error?: string }> {
  const session = await requireImporter();
  return previewCandidates(fromSession(session.user), mappingId, filters);
}

export async function createRunAction(input: {
  mappingId: string;
  filters: PullFilters;
  selectedRefs: string[];
  defaultReleaseQuarter?: string | null;
}): Promise<{ ok: boolean; runId?: string; message: string }> {
  const session = await requireImporter();
  return createImportRun(fromSession(session.user), input);
}
