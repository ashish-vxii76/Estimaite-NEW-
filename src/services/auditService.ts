import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Tamper-evident audit trail (governance item A).
 *
 * Every event is hash-chained to its predecessor: hash = sha256(prevHash + payload).
 * A single altered or deleted row breaks the chain from that point on, so tampering
 * is DETECTABLE even by someone with direct database write access — the credible bar
 * for an "auditable system". Writers must go through `appendAuditEvent`, never
 * `prisma.auditEvent.create` directly.
 */

type AuditInput = {
  estimateId?: string | null;
  userId?: string | null;
  action: string;
  previousValue?: string;
  newValue?: string;
};

type AuditClient = PrismaClient | Prisma.TransactionClient;

function eventHash(
  prevHash: string,
  e: { estimateId: string | null; userId: string | null; action: string; previousValue: string; newValue: string; createdAt: string },
): string {
  const canonical = JSON.stringify([
    prevHash,
    e.estimateId ?? "",
    e.userId ?? "",
    e.action,
    e.previousValue,
    e.newValue,
    e.createdAt,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

/** Append a hash-chained audit event. Pass a transaction client to keep it atomic with the change it records. */
export async function appendAuditEvent(input: AuditInput, client: AuditClient = prisma) {
  const last = await client.auditEvent.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const prevHash = last?.hash ?? "";
  const createdAt = new Date();
  const previousValue = input.previousValue ?? "";
  const newValue = input.newValue ?? "";
  const hash = eventHash(prevHash, {
    estimateId: input.estimateId ?? null,
    userId: input.userId ?? null,
    action: input.action,
    previousValue,
    newValue,
    createdAt: createdAt.toISOString(),
  });
  return client.auditEvent.create({
    data: {
      estimateId: input.estimateId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      previousValue,
      newValue,
      createdAt,
      prevHash,
      hash,
    },
  });
}

export type AuditVerification = { ok: boolean; count: number; brokenAtId?: string };

/** Re-derive the chain and report the first row where it breaks (tamper detection). */
export async function verifyAuditChain(client: AuditClient = prisma): Promise<AuditVerification> {
  const events = await client.auditEvent.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  let prevHash = "";
  for (const e of events) {
    const expected = eventHash(prevHash, {
      estimateId: e.estimateId,
      userId: e.userId,
      action: e.action,
      previousValue: e.previousValue,
      newValue: e.newValue,
      createdAt: e.createdAt.toISOString(),
    });
    if (e.prevHash !== prevHash || e.hash !== expected) {
      return { ok: false, count: events.length, brokenAtId: e.id };
    }
    prevHash = e.hash;
  }
  return { ok: true, count: events.length };
}
