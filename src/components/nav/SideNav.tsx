"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronRight, Home, ListChecks, Menu, Plus, Settings, X } from "lucide-react";
import {
  NAV_TREE,
  canCreate,
  canSeeNav,
  containsActive,
  isNodeActive,
  type NavNode,
} from "@/components/nav/navConfig";
import type { RbacMatrix } from "@/lib/rbac";

const TOP_ICONS: Record<string, typeof Home> = {
  home: Home,
  estimates: ListChecks,
  analytics: BarChart3,
  administration: Settings,
};

export function SideNav({
  role,
  matrix,
  userName,
  userRole,
  signOut,
  profileSwitcher,
}: {
  role: string;
  matrix?: RbacMatrix;
  userName?: string | null;
  userRole?: string | null;
  signOut: React.ReactNode;
  profileSwitcher?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [hash, setHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ estimates: true, analytics: true });

  useEffect(() => {
    const apply = () => setHash(window.location.hash);
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, search, hash]);

  const tree = useMemo(() => filterTree(NAV_TREE, role, matrix), [role, matrix]);

  useEffect(() => {
    setOpen((current) => {
      const next = { ...current };
      const visit = (nodes: NavNode[]) => {
        for (const node of nodes) {
          if (node.children?.length && containsActive(node, pathname, search, hash)) {
            next[node.id] = true;
          }
          if (node.children) visit(node.children);
        }
      };
      visit(tree);
      return next;
    });
  }, [pathname, search, hash, tree]);

  function toggle(id: string) {
    setOpen((current) => ({ ...current, [id]: !current[id] }));
  }

  const nav = (
    <nav className="mt-6 space-y-0.5 text-sm">
      {tree.map((node) => (
        <NavBranch
          key={node.id}
          node={node}
          depth={0}
          role={role}
          matrix={matrix}
          open={open}
          toggle={toggle}
          pathname={pathname}
          search={search}
          hash={hash}
        />
      ))}
    </nav>
  );

  return (
    <>
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 md:hidden">
        <p className="text-sm font-medium">Estimaite</p>
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-[var(--panel-2)]"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={18} />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-start justify-between gap-3">
              <Brand />
              <button
                type="button"
                className="rounded-lg p-1 hover:bg-[var(--panel-2)]"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
            <UserBlock
              name={userName}
              role={userRole}
              signOut={signOut}
              profileSwitcher={profileSwitcher}
            />
          </div>
        </div>
      ) : null}

      <aside className="hidden w-72 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)] p-4 md:flex">
        <Brand />
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
        <UserBlock
          name={userName}
          role={userRole}
          signOut={signOut}
          profileSwitcher={profileSwitcher}
        />
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/home" className="mx-auto flex w-full items-center justify-center px-1 py-1">
      {/* Per-theme lockup, matching the landing: light asset on cream, dark asset on navy. */}
      <img
        className="app-logo-light h-auto w-[5.28rem] max-w-[5.28rem] object-contain"
        src="/brand/EstimAIte%20-%20Transparent.PNG"
        alt="estimAIte"
      />
      <img
        className="app-logo-dark h-auto w-[5.28rem] max-w-[5.28rem] object-contain"
        src="/brand/estimaite-logo-dark.png"
        alt="estimAIte"
      />
    </Link>
  );
}

function UserBlock({
  name,
  role,
  signOut,
  profileSwitcher,
}: {
  name?: string | null;
  role?: string | null;
  signOut: React.ReactNode;
  profileSwitcher?: React.ReactNode;
}) {
  return (
    <div className="mt-6 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
      <p className="font-medium text-[var(--navy)]">{name}</p>
      <p>{role}</p>
      {profileSwitcher}
      {signOut}
    </div>
  );
}

function NavBranch({
  node,
  depth,
  role,
  matrix,
  open,
  toggle,
  pathname,
  search,
  hash,
}: {
  node: NavNode;
  depth: number;
  role: string;
  matrix?: RbacMatrix;
  open: Record<string, boolean>;
  toggle: (id: string) => void;
  pathname: string;
  search: string;
  hash: string;
}) {
  const children = node.children?.filter((child) => canSeeNav(child, role, matrix)) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = hasChildren && Boolean(open[node.id]);
  const active = isNodeActive(node, pathname, search, hash) && !hasChildren;
  const showCreate = canCreate(node, role, matrix);
  const Icon = depth === 0 ? TOP_ICONS[node.id] : undefined;
  const padding = { paddingLeft: `${8 + depth * 12}px` };

  return (
    <div>
      <div
        className={`group flex items-center gap-0.5 rounded-lg ring-1 ring-inset transition-colors ${
          active
            ? "bg-[var(--gold-soft)] font-semibold text-[var(--navy)] ring-[color-mix(in_srgb,var(--gold)_45%,transparent)]"
            : "text-[var(--text)] ring-transparent hover:bg-[var(--panel-2)]"
        }`}
        style={padding}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 py-1.5 pr-1 text-left"
            onClick={() => toggle(node.id)}
            aria-expanded={isOpen}
          >
            <ChevronRight
              size={14}
              className={`shrink-0 transition-transform ${
                active ? "text-[var(--gold-2)]" : "text-[var(--muted)]"
              } ${isOpen ? "rotate-90" : ""}`}
            />
            {Icon ? <Icon size={16} className="shrink-0 text-[var(--muted)]" /> : null}
            {node.href && depth > 0 ? (
              <Link
                href={node.href}
                className="min-w-0 flex-1 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {node.label}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate">{node.label}</span>
            )}
          </button>
        ) : node.href ? (
          <Link href={node.href} className="flex min-w-0 flex-1 items-center gap-2 truncate py-1.5 pr-1">
            {Icon ? <Icon size={16} className="shrink-0 text-[var(--muted)]" /> : null}
            {node.label}
          </Link>
        ) : (
          <span className="min-w-0 flex-1 truncate py-1.5">{node.label}</span>
        )}
        {showCreate ? (
          <Link
            href={node.createHref!}
            aria-label={node.createLabel ?? `Create ${node.label}`}
            title={node.createLabel ?? `Create ${node.label}`}
            className={`mr-1 rounded-md p-1 ${
              active ? "text-[var(--gold-2)] hover:bg-[var(--gold-soft)]" : "text-[var(--navy)] hover:bg-[var(--panel-2)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Plus size={14} />
          </Link>
        ) : null}
      </div>
      {hasChildren && isOpen ? (
        <div className="mb-1">
          {children.map((child) => (
            <NavBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              role={role}
              matrix={matrix}
              open={open}
              toggle={toggle}
              pathname={pathname}
              search={search}
              hash={hash}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function filterTree(nodes: NavNode[], role: string, matrix?: RbacMatrix): NavNode[] {
  return nodes
    .filter((node) => canSeeNav(node, role, matrix))
    .map((node) => ({
      ...node,
      children: node.children ? filterTree(node.children, role, matrix) : undefined,
    }))
    .filter((node) => node.href || (node.children && node.children.length > 0));
}
