import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  teamId: true,
  createdAt: true,
} as const;

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users");
  if (forbidden) return forbidden;
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: userSelect,
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "VIEWER");
  const teamId = body.teamId ? String(body.teamId) : null;
  if (!email || !name || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email and a password of at least 8 characters are required" },
      { status: 400 },
    );
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email already has a login" }, { status: 400 });
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      teamId: role === "ADMINISTRATOR" ? null : teamId,
      active: true,
      passwordHash: await bcrypt.hash(password, 10),
    },
    select: userSelect,
  });
  return NextResponse.json({ user }, { status: 201 });
}

export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.users", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const id = String(body.id ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const role = body.role ? String(body.role) : user.role;
  if (body.role && !ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  }
  if (user.role === "ADMINISTRATOR" && (role !== "ADMINISTRATOR" || body.active === false)) {
    const admins = await prisma.user.count({ where: { role: "ADMINISTRATOR", active: true } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Keep at least one active Admin login" }, { status: 400 });
    }
  }
  const data: {
    name?: string;
    role?: string;
    active?: boolean;
    passwordHash?: string;
    teamId?: string | null;
  } = {};
  if (body.name) data.name = String(body.name).trim();
  if (body.role) data.role = role;
  if (typeof body.active === "boolean") data.active = body.active;
  if ("teamId" in body) {
    data.teamId = role === "ADMINISTRATOR" ? null : body.teamId ? String(body.teamId) : null;
  }
  if (body.password) {
    if (String(body.password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(String(body.password), 10);
  }
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
  return NextResponse.json({ user: updated });
}
