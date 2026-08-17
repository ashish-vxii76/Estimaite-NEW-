"use server";

import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function switchProfile(email: string) {
  const session = await auth();
  if (session?.user.role !== "ADMINISTRATOR") {
    throw new Error("Only an Admin can switch profile without signing out");
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) throw new Error("Profile is not available");
  await signIn("credentials", {
    email: user.email,
    switchKey: process.env.AUTH_SECRET,
    redirectTo: "/",
  });
}
