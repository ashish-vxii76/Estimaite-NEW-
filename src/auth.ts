import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the identity (role + scope) a session should run as. A user with
 * RoleGrant rows runs as one active grant at a time — `activeGrantId` picks it,
 * else the primary grant. A user with no grants keeps their plain User.role/teamId.
 */
async function resolveIdentity(
  user: { id: string; role: string; teamId: string | null },
  activeGrantId?: string | null,
) {
  const grants = await prisma.roleGrant.findMany({ where: { userId: user.id } });
  if (grants.length === 0) {
    return { role: user.role, teamId: user.teamId, seatOrgUnitId: null, activeGrantId: null };
  }
  const grant =
    (activeGrantId && grants.find((g) => g.id === activeGrantId)) ||
    grants.find((g) => g.isPrimary) ||
    grants[0];
  return {
    role: grant.role,
    teamId: grant.teamId ?? null,
    seatOrgUnitId: grant.orgUnitId ?? null,
    activeGrantId: grant.id,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        switchKey: { label: "Switch key", type: "text" },
        activeGrantId: { label: "Active grant", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!email) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.active === false || user.pendingApproval) return null;

        const switchKey = String(credentials?.switchKey ?? "");
        const activeGrantId = credentials?.activeGrantId ? String(credentials.activeGrantId) : null;

        const authed =
          (switchKey && switchKey === process.env.AUTH_SECRET) ||
          (await (async () => {
            const password = String(credentials?.password ?? "");
            if (!password) return false;
            return bcrypt.compare(password, user.passwordHash);
          })());
        if (!authed) return null;

        const identity = await resolveIdentity(
          { id: user.id, role: user.role, teamId: user.teamId },
          activeGrantId,
        );
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: identity.role,
          teamId: identity.teamId,
          seatOrgUnitId: identity.seatOrgUnitId,
          activeGrantId: identity.activeGrantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: string;
          teamId?: string | null;
          seatOrgUnitId?: string | null;
          activeGrantId?: string | null;
        };
        token.role = u.role;
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.teamId = u.teamId ?? null;
        token.seatOrgUnitId = u.seatOrgUnitId ?? null;
        token.activeGrantId = u.activeGrantId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = String(token.role ?? "VIEWER");
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.teamId = (token.teamId as string | null) ?? null;
        session.user.seatOrgUnitId = (token.seatOrgUnitId as string | null) ?? null;
        session.user.activeGrantId = (token.activeGrantId as string | null) ?? null;
      }
      return session;
    },
  },
});
