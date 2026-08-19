import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ForgotPage() {
  async function requestReset(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetRequestedAt: new Date() },
        });
      }
    }
    redirect("/login?notice=reset");
  }

  return (
    <AuthCard title="Reset password">
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        Enter your email. An administrator completes the reset. Email links and authenticator-based
        recovery can be added when mail and MFA are connected.
      </p>
      <form className="mt-6 space-y-4" action={requestReset}>
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
        <button type="submit" className="btn-primary w-full">
          Request reset
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
