"use server";

import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Switch the signed-in user's ACTIVE role to one of their own granted roles.
 * This never changes identity — the grant must belong to the current user — so a
 * user can only move between roles they have been granted, not into anyone else's.
 */
export async function switchRole(grantId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Sign in before switching role");
  }
  const grant = await prisma.roleGrant.findUnique({ where: { id: grantId } });
  if (!grant || grant.userId !== session.user.id) {
    throw new Error("That role isn't available to you");
  }
  await signIn("credentials", {
    email: session.user.email,
    switchKey: process.env.AUTH_SECRET,
    activeGrantId: grantId,
    redirectTo: "/home",
  });
}
