import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";

const grantInclude = {
  team: { select: { name: true } },
  orgUnit: { select: { name: true } },
} as const;

function shape(g: {
  id: string;
  userId: string;
  role: string;
  label: string | null;
  teamId: string | null;
  orgUnitId: string | null;
  isPrimary: boolean;
  team: { name: string } | null;
  orgUnit: { name: string } | null;
}) {
  return {
    id: g.id,
    userId: g.userId,
    role: g.role,
    label: g.label,
    teamId: g.teamId,
    orgUnitId: g.orgUnitId,
    isPrimary: g.isPrimary,
    scopeName: g.team?.name ?? g.orgUnit?.name ?? null,
  };
}

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users");
  if (forbidden) return forbidden;
  const userId = new URL(request.url).searchParams.get("userId");
  const grants = await prisma.roleGrant.findMany({
    where: userId ? { userId } : {},
    include: grantInclude,
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ grants: grants.map(shape) });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();

  const userId = String(body.userId ?? "");
  const role = String(body.role ?? "");
  const label = body.label ? String(body.label).trim() : null;
  const teamId = body.teamId ? String(body.teamId) : null;
  const orgUnitId = body.orgUnitId ? String(body.orgUnitId) : null;
  const isPrimary = Boolean(body.isPrimary);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  }
  if (teamId && orgUnitId) {
    return NextResponse.json(
      { error: "A role is scoped to a pod OR an org unit, not both" },
      { status: 400 },
    );
  }

  const grant = await prisma.$transaction(async (tx) => {
    const existing = await tx.roleGrant.count({ where: { userId } });
    // First grant is automatically the primary; else honour the flag (demoting others).
    const makePrimary = isPrimary || existing === 0;
    if (makePrimary) {
      await tx.roleGrant.updateMany({ where: { userId }, data: { isPrimary: false } });
    }
    return tx.roleGrant.create({
      data: { userId, role, label, teamId, orgUnitId, isPrimary: makePrimary },
      include: grantInclude,
    });
  });
  return NextResponse.json({ grant: shape(grant) }, { status: 201 });
}

/** Set a grant as the user's primary (login) role. */
export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const id = String(body.id ?? "");
  const grant = await prisma.roleGrant.findUnique({ where: { id } });
  if (!grant) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  await prisma.$transaction([
    prisma.roleGrant.updateMany({ where: { userId: grant.userId }, data: { isPrimary: false } }),
    prisma.roleGrant.update({ where: { id }, data: { isPrimary: true } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users", "RW");
  if (forbidden) return forbidden;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const grant = await prisma.roleGrant.findUnique({ where: { id } });
  if (!grant) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  await prisma.roleGrant.delete({ where: { id } });
  // If we removed the primary but others remain, promote the oldest so a login role stays defined.
  if (grant.isPrimary) {
    const next = await prisma.roleGrant.findFirst({
      where: { userId: grant.userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) await prisma.roleGrant.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  return NextResponse.json({ ok: true });
}
