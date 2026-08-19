import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="mt-3 text-[var(--navy)] underline">Sign out</button>
    </form>
  );
}
