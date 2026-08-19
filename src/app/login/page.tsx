import { signIn } from "@/auth";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

const LOGIN_ERRORS: Record<string, string> = {
  CredentialsSignin: "Email or password is incorrect, or this account is not active yet.",
  Configuration: "Sign-in is misconfigured. Remove AUTH_URL from .env and restart the app.",
  AccessDenied: "Access denied.",
  Default: "Sign-in failed. Try again.",
};

const NOTICES: Record<string, string> = {
  requested: "Your account request was received. An administrator must approve it before you can sign in.",
  reset: "If that email is registered, an administrator can complete the password reset.",
  created: "Account created. Sign in with your email and password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/home",
    });
  }

  return (
    <AuthCard title="Sign in">
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        Use your work email and password. Accounts are approved by an administrator.
      </p>
      {notice && NOTICES[notice] ? (
        <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {NOTICES[notice]}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {LOGIN_ERRORS[error] ?? LOGIN_ERRORS.Default}
        </p>
      ) : null}
      <form className="mt-6 space-y-4" action={authenticate}>
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
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        <Link href="/login/forgot" className="text-[var(--navy)] underline">
          Forgot password
        </Link>
        <Link href="/login/register" className="text-[var(--navy)] underline">
          Create user
        </Link>
      </div>
    </AuthCard>
  );
}
