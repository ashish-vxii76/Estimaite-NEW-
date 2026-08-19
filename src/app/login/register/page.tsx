import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthCard } from "@/components/auth/AuthCard";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  async function requestAccount(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (!name || !email || password.length < 8 || password !== confirm) {
      redirect("/login/register?error=invalid");
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (!exists) {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: "VIEWER",
          active: false,
          pendingApproval: true,
        },
      });
    }
    redirect("/login?notice=requested");
  }

  return (
    <AuthCard title="Create user">
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        Request an account. An administrator must approve it and assign your role and team before
        you can sign in. Self-service access is not granted automatically.
      </p>
      {error === "invalid" ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Enter your name, a valid email, and matching passwords of at least 8 characters.
        </p>
      ) : null}
      <form className="mt-6 space-y-4" action={requestAccount}>
        <label className="block text-sm">
          Full name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Confirm password
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
        <button type="submit" className="btn-primary w-full">
          Submit request
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-[var(--navy)] underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
