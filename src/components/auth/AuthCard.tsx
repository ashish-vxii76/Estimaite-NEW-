import Link from "next/link";
import type { ReactNode } from "react";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="mx-auto flex w-full justify-center">
          <EstimAIteLogo tone="light" className="h-auto w-full max-w-[14rem] object-contain" />
        </Link>
        <h1 className="mt-5 text-center font-display text-2xl font-semibold text-[var(--navy)]">{title}</h1>
        {children}
      </div>
    </main>
  );
}
