import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-md p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Estimaite</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Governed Agile estimation and delivery economics. Demo password for all seeded users:
          <span className="text-teal-200"> demo1234</span>
        </p>
        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/",
            });
          }}
        >
          <label className="block text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              defaultValue="admin@estimaite.local"
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            />
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
          Try admin@, eng@, approver@, delivery@, or finance@estimaite.local
        </p>
      </div>
    </main>
  );
}
