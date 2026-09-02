import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { visibleCrewIds, visibleOrgUnitIds } from "@/services/orgService";
import { getActiveConfig } from "@/services/configService";
import { appendAuditEvent } from "@/services/auditService";
import { prisma } from "@/lib/prisma";
import { MAPPING_TABLE_META } from "@/components/admin/crewMappingTables";

// DEC-011: per-crew mapping override lifecycle.
//   request  → seed a REQUESTED override from global (crew lead, in scope)
//   approve  → admin promotes REQUESTED → APPROVED (admin: config.mappings RW)
//   save     → edit rows of an APPROVED override (crew lead)
//   revert   → drop the override, back to global (crew lead)
// Global is the default: no APPROVED row → estimates resolve global (golden-safe, see M0).

type Table = keyof typeof MAPPING_TABLE_META;
const TABLES = new Set<Table>(Object.keys(MAPPING_TABLE_META) as Table[]);

async function inScope(user: ReturnType<typeof fromSession>, unitId: string, unitType: string) {
  if (unitType === "COMPANY") {
    // DEC-015: company-scoped config — the actor must be able to see that company (admins: all).
    const visible = await visibleOrgUnitIds(user);
    return visible == null || visible.includes(unitId);
  }
  const visible = await visibleCrewIds(user);
  return visible == null || visible.includes(unitId);
}

function seedPayload(table: Table, config: Awaited<ReturnType<typeof getActiveConfig>>) {
  const meta = MAPPING_TABLE_META[table];
  const payload: Record<string, unknown> = {};
  for (const f of meta.fields) payload[f] = (config as unknown as Record<string, unknown>)[f];
  return payload;
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await request.json();
  const action = String(body.action ?? "");
  const table = String(body.table ?? "") as Table;
  const crewId = String(body.crewId ?? "");
  if (!TABLES.has(table)) return NextResponse.json({ error: "Unknown table" }, { status: 400 });

  const scope = fromSession(session!.user);
  // DEC-015: the override "scope unit" may be a CREW or a COMPANY (an OrgUnit either way).
  const crew = await prisma.orgUnit.findUnique({ where: { id: crewId }, select: { type: true, name: true } });
  if (!crew || (crew.type !== "CREW" && crew.type !== "COMPANY")) {
    return NextResponse.json({ error: "Config scope must be a Crew or a Company" }, { status: 400 });
  }

  const existing = await prisma.crewMappingOverride.findUnique({
    where: { crewId_table: { crewId, table } },
  });

  if (action === "approve") {
    // Admin-only gate (DEC-011 D2).
    const forbidden = requireFeature(session!.user.role, "config.mappings", "RW");
    if (forbidden) return forbidden;
    if (!existing || existing.status !== "REQUESTED") {
      return NextResponse.json({ error: "No pending request to approve" }, { status: 400 });
    }
    const row = await prisma.crewMappingOverride.update({
      where: { id: existing.id },
      data: { status: "APPROVED", approvedBy: session!.user.id, approvedAt: new Date() },
    });
    await appendAuditEvent({
      userId: session!.user.id,
      action: "CREW_MAPPING_APPROVED",
      previousValue: `${crew.name}/${table} REQUESTED`,
      newValue: `${crew.name}/${table} APPROVED`,
    });
    return NextResponse.json({ ok: true, status: row.status });
  }

  // All remaining actions require crew-mappings RW + the crew in the actor's scope.
  const forbidden = requireFeature(session!.user.role, "config.crewMappings", "RW");
  if (forbidden) return forbidden;
  if (!(await inScope(scope, crewId, crew.type))) {
    return NextResponse.json({ error: "Crew outside your org scope" }, { status: 403 });
  }
  const meta = MAPPING_TABLE_META[table];

  if (action === "request") {
    if (existing && existing.status === "APPROVED") {
      return NextResponse.json({ error: "Crew already uses crew-specific mappings" }, { status: 400 });
    }
    const config = await getActiveConfig();
    const payload = JSON.stringify(seedPayload(table, config));
    // An actor who can approve (config.mappings RW — i.e. an administrator) self-approves in one
    // step: there is no one above them to gate it. Others go to REQUESTED for admin approval.
    const selfApprove = can(session!.user.role, "config.mappings", "RW");
    const now = new Date();
    const base = selfApprove
      ? { status: "APPROVED", approvedBy: session!.user.id, approvedAt: now }
      : { status: "REQUESTED", approvedBy: null, approvedAt: null };
    const row = await prisma.crewMappingOverride.upsert({
      where: { crewId_table: { crewId, table } },
      update: { ...base, payload, requestedBy: session!.user.id, requestedAt: now },
      create: { crewId, table, payload, requestedBy: session!.user.id, ...base },
    });
    await appendAuditEvent({
      userId: session!.user.id,
      action: selfApprove ? "CREW_MAPPING_APPROVED" : "CREW_MAPPING_REQUESTED",
      previousValue: "global",
      newValue: `${crew.name}/${table} ${row.status}`,
    });
    return NextResponse.json({ ok: true, status: row.status });
  }

  if (action === "save") {
    if (!existing || existing.status !== "APPROVED") {
      return NextResponse.json({ error: "Approve crew-specific mappings before editing" }, { status: 400 });
    }
    const payload = JSON.parse(existing.payload) as Record<string, unknown>;
    if (meta.rowsField === "") {
      // Scalar domain (ESTIMATION_CONFIG): merge only the whitelisted fields. Scalars → finite
      // number; complexityMultipliers → object of finite per-t-shirt numbers (DEC-014). Rounding is
      // never a field here (stays global).
      const fields = (body.fields ?? {}) as Record<string, unknown>;
      for (const key of meta.fields) {
        if (!(key in fields)) continue;
        if (key === "complexityMultipliers") {
          const obj = fields[key] as Record<string, unknown>;
          if (!obj || typeof obj !== "object") {
            return NextResponse.json({ error: "complexityMultipliers must be an object" }, { status: 400 });
          }
          const clean: Record<string, number> = {};
          for (const [k, v] of Object.entries(obj)) {
            const n = Number(v);
            if (!Number.isFinite(n)) {
              return NextResponse.json({ error: `complexityMultipliers.${k} must be a number` }, { status: 400 });
            }
            clean[k] = n;
          }
          payload[key] = clean;
          continue;
        }
        const val = Number(fields[key]);
        if (!Number.isFinite(val)) {
          return NextResponse.json({ error: `${key} must be a number` }, { status: 400 });
        }
        payload[key] = val;
      }
    } else {
      const rows = body.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: "Rows must be a non-empty array" }, { status: 400 });
      }
      payload[meta.rowsField] = rows;
    }
    const row = await prisma.crewMappingOverride.update({
      where: { id: existing.id },
      data: { payload: JSON.stringify(payload), version: existing.version + 1 },
    });
    await appendAuditEvent({
      userId: session!.user.id,
      action: "CREW_MAPPING_SAVED",
      previousValue: `${crew.name}/${table} v${existing.version}`,
      newValue: `${crew.name}/${table} v${row.version}`,
    });
    return NextResponse.json({ ok: true, version: row.version });
  }

  if (action === "revert") {
    if (!existing) return NextResponse.json({ ok: true });
    await prisma.crewMappingOverride.delete({ where: { id: existing.id } });
    await appendAuditEvent({
      userId: session!.user.id,
      action: "CREW_MAPPING_REVERTED",
      previousValue: `${crew.name}/${table} ${existing.status}`,
      newValue: "global",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
