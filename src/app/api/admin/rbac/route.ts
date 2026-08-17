import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getRbacMatrix, resetRbacMatrix, saveRbacMatrix } from "@/services/rbacService";
import { DEFAULT_RBAC } from "@/lib/rbac";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.rbac");
  if (forbidden) return forbidden;
  const matrix = await getRbacMatrix();
  return NextResponse.json({ matrix, defaults: DEFAULT_RBAC });
}

export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.rbac", "RW");
  if (forbidden) return forbidden;
  const body = await request.json().catch(() => ({}));
  try {
    const matrix = await saveRbacMatrix(body.matrix, session!.user.id);
    return NextResponse.json({ matrix });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.rbac", "RW");
  if (forbidden) return forbidden;
  const body = await request.json().catch(() => ({}));
  try {
    const matrix = body.reset
      ? await resetRbacMatrix(session!.user.id)
      : await saveRbacMatrix(body.matrix, session!.user.id);
    return NextResponse.json({ matrix });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
