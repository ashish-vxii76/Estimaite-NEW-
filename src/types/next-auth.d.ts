import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    teamId?: string | null;
    /** Org-unit scope of the active role grant (leadership roles); null for pod/none. */
    seatOrgUnitId?: string | null;
    /** The active RoleGrant id when the user holds switchable roles; null otherwise. */
    activeGrantId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      teamId?: string | null;
      seatOrgUnitId?: string | null;
      activeGrantId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    teamId?: string | null;
    seatOrgUnitId?: string | null;
    activeGrantId?: string | null;
  }
}
