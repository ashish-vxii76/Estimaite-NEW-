import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role) && role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
