import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  const profiles = await prisma.user.findMany({
    where: { active: true },
    select: { email: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
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
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Estimaite</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose a profile. Menus and permissions follow the role on that login.
        </p>
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
            className="w-full rounded-lg bg-teal-400 px-4 py-2 font-medium text-slate-950"
          >
            Continue
          </button>
        </form>
        <p className="mt-6 text-xs text-[var(--muted)]">
          Seeded password is <span className="text-teal-200">demo1234</span>. Create more logins under
          Administration → Access → Login credentials.
        </p>
      </div>
    </main>
  );
}
