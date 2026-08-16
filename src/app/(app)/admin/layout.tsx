import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Administration</p>
        <p className="text-sm text-[var(--muted)]">
          Excel v7.1 mapping tables. Edits publish a new configuration version used by the
          calculation engine.
        </p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
