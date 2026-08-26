import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/api-auth";
import { verifyAuditChain } from "@/services/auditService";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Export the hash-chained audit trail as CSV (governance item A companion).
 * Admin only. Optional ?estimateId=… to scope to one estimate. The first line reports
 * the chain-integrity verdict so a reviewer can see at a glance whether it's untampered.
 */
export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["ADMINISTRATOR"]);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const estimateId = url.searchParams.get("estimateId") || undefined;

  const events = await prisma.auditEvent.findMany({
    where: estimateId ? { estimateId } : undefined,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const integrity = await verifyAuditChain();

  const header = [
    "createdAt", "action", "userId", "estimateId", "previousValue", "newValue", "prevHash", "hash",
  ];
  const rows = events.map((e) =>
    [
      e.createdAt.toISOString(),
      e.action,
      e.userId ?? "",
      e.estimateId ?? "",
      e.previousValue,
      e.newValue,
      e.prevHash,
      e.hash,
    ]
      .map(csvCell)
      .join(","),
  );
  const integrityLine = `# integrity: ${
    integrity.ok ? "VERIFIED" : `TAMPERED at ${integrity.brokenAtId}`
  }; events: ${integrity.count}`;
  const csv = [integrityLine, header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-trail${estimateId ? `-${estimateId}` : ""}.csv"`,
    },
  });
}
