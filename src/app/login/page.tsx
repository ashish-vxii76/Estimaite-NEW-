import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import Link from "next/link";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";

const LOGIN_ERRORS: Record<string, string> = {
  CredentialsSignin: "That profile or password was not accepted.",
  Configuration: "Auth is misconfigured. Remove AUTH_URL from .env and restart npm run dev.",
  AccessDenied: "Access denied.",
  Default: "Sign-in failed. Confirm you opened http://localhost:3456 on the computer running the app.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; error?: string }>;
}) {
  const { profile, error } = await searchParams;
  let profiles: { email: string; name: string; role: string; team: { name: string } | null }[] = [];
  try {
    profiles = await prisma.user.findMany({
      where: { active: true },
      select: { email: true, name: true, role: true, team: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
  } catch {
    profiles = (await prisma.user.findMany({
      where: { active: true },
      select: { email: true, name: true, role: true },
      orderBy: { name: "asc" },
    })).map((row) => ({ ...row, team: null }));
  }
  const initialEmail =
    profiles.find((p) => p.email === profile)?.email ??
    profiles.find((p) => p.role === "ADMINISTRATOR")?.email ??
    profiles[0]?.email ??
    "";

  async function authenticate(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="inline-block">
          <EstimAIteLogo variant="lockup" />
        </Link>
        <h1 className="mt-5 font-display text-2xl font-semibold text-[var(--navy)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose a profile. The whole app follows that role and team — a Vikings Approver only sees
          Vikings, as Approver. Admin sees every team.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {LOGIN_ERRORS[error] ?? LOGIN_ERRORS.Default}
          </p>
        ) : null}
        <form className="mt-6 space-y-4" action={authenticate}>
          <label className="block text-sm">
            Profile
            <select
              name="email"
              defaultValue={initialEmail}
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            >
              {profiles.map((item) => (
                <option key={item.email} value={item.email}>
                  {item.name} — {roleLabel(item.role)}
                  {item.team?.name ? ` · ${item.team.name}` : item.role === "ADMINISTRATOR" ? " · All teams" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Password
            <input
              name="password"
              type="password"
              required
              defaultValue="demo1234"
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="btn-primary w-full"
          >
            Continue
          </button>
        </form>
        <p className="mt-6 text-xs text-[var(--muted)]">
          Seeded password is <span className="font-medium text-[var(--navy)]">demo1234</span>. Create more logins under
          Administration → Access → Login credentials.
        </p>
      </div>
    </main>
  );
}
