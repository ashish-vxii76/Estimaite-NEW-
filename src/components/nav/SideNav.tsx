"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  Cog,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Menu,
  Plus,
  Ruler,
  Settings,
  Wallet,
  X,
} from "lucide-react";
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
  "crew-budgets": Wallet,
  analytics: BarChart3,
  administration: Settings,
};

// Sub-section (nested group) icons — parallel to the top-level icons, for scannability.
const SUB_ICONS: Record<string, typeof Home> = {
  "admin-overview": LayoutDashboard,
  "admin-access": KeyRound,
  "admin-org": Building2,
  "admin-lists": ClipboardList,
  "admin-size": Ruler,
  "admin-commercial": Banknote,
  "admin-engine": Cog,
};

/** Icon for a node: top-level sections and nested sub-sections carry one; leaves don't. */
function iconFor(node: NavNode, depth: number) {
  return depth === 0 ? TOP_ICONS[node.id] : SUB_ICONS[node.id];
}

export function SideNav({
  role,
  matrix,
  seatLevel,
  userName,
  userRole,
  signOut,
  profileSwitcher,
}: {
  role: string;
  matrix?: RbacMatrix;
  seatLevel?: number;
  userName?: string | null;
  userRole?: string | null;
  // Elements (not functions): AppShell is a Server Component, so only serializable React elements
  // may cross the boundary. SideNav renders them in one mount point at a time (mobile drawer XOR
  // desktop aside), so a single instance is safe.
  signOut: React.ReactNode;
  profileSwitcher?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [hash, setHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  // Accordion: at most ONE branch open per level → `open` only ever holds a single ancestor path.
  // Starts empty so a fresh login / Home lands fully collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const apply = () => setHash(window.location.hash);
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, search, hash]);

  const tree = useMemo(() => filterTree(NAV_TREE, role, matrix, seatLevel), [role, matrix, seatLevel]);

  // Parent lookup for the accordion: opening/closing a node is expressed as its ancestor path.
  const parentOf = useMemo(() => {
    const map: Record<string, string | null> = {};
    const walk = (nodes: NavNode[], parent: string | null) => {
      for (const n of nodes) {
        map[n.id] = parent;
        if (n.children) walk(n.children, n.id);
      }
    };
    walk(tree, null);
    return map;
  }, [tree]);

  function ancestorsOf(id: string): string[] {
    const chain: string[] = [];
    let p = parentOf[id] ?? null;
    while (p) {
      chain.push(p);
      p = parentOf[p] ?? null;
    }
    return chain;
  }

  // On navigation, expand exactly the active branch path (and nothing else). On Home — which has no
  // expandable active branch — this resolves to fully collapsed. Replaces (not merges) prior state,
  // so the tree never accumulates open siblings across routes.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    const visit = (nodes: NavNode[]) => {
      for (const node of nodes) {
        if (node.children?.length && containsActive(node, pathname, search, hash)) {
          next[node.id] = true;
          visit(node.children);
        }
      }
    };
    visit(tree);
    setOpen(next);
  }, [pathname, search, hash, tree]);

  // Accordion toggle: only one branch stays open per level. Opening a node keeps its ancestor path
  // open and closes every sibling/unrelated branch; closing it drops back to the parent path.
  function toggle(id: string) {
    setOpen((current) => {
      const next: Record<string, boolean> = {};
      for (const a of ancestorsOf(id)) next[a] = true;
      if (!current[id]) next[id] = true;
      return next;
    });
  }

  function collapseAll() {
    setOpen({});
  }

  // Factory (not a shared element): rendered in both the mobile drawer and desktop aside.
  const renderNav = () => (
    <nav className="mt-4 space-y-0.5 text-sm">
      <div className="mb-1 flex items-center justify-end gap-2 px-2 text-[0.68rem] font-medium text-[var(--muted)]">
        <button type="button" onClick={collapseAll} className="hover:text-[var(--navy)]">
          Collapse all
        </button>
      </div>
      {tree.map((node) => (
        <NavBranch
          key={node.id}
          node={node}
          depth={0}
          basePad={8}
          reserveIcon={tree.some((n) => Boolean(iconFor(n, 0)))}
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
            <div className="min-h-0 flex-1 overflow-y-auto">{renderNav()}</div>
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
        <div className="min-h-0 flex-1 overflow-y-auto">{renderNav()}</div>
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
        src="/brand/estimaite-logo-dark-cut.png"
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
  basePad,
  reserveIcon,
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
  /** Left padding (px) for this row, derived from the parent's label position (hanging indent). */
  basePad: number;
  /** Reserve the icon column even without an icon, so leaves align with icon-bearing siblings. */
  reserveIcon: boolean;
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
  const Icon = iconFor(node, depth);
  const showIconSlot = Boolean(Icon) || reserveIcon;
  const padding = { paddingLeft: `${basePad}px` };
  // Children hang under THIS row's label: chevron (14) + gap (4) = 18, plus the icon column (20) when
  // shown. So a child's label lands under this label; icon-less groups keep the "start from E" look,
  // while icon-bearing sub-sections nest one icon-width further in.
  const childBasePad = basePad + (showIconSlot ? 20 : 0);
  const childReserveIcon = children.some((child) => Boolean(iconFor(child, depth + 1)));
  // Fixed-width placeholders that hold the chevron / icon columns on rows that lack them.
  const chevronSpacer = <span className="w-3.5 shrink-0" aria-hidden="true" />;
  const iconSlot = showIconSlot
    ? Icon
      ? <Icon size={16} className="shrink-0 text-[var(--muted)]" />
      : <span className="w-4 shrink-0" aria-hidden="true" />
    : null;

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
            {iconSlot}
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
          <Link href={node.href} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-1 truncate py-1.5 pr-1">
            {chevronSpacer}
            {iconSlot}
            {node.label}
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1 truncate py-1.5">
            {chevronSpacer}
            {iconSlot}
            {node.label}
          </span>
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
              basePad={childBasePad}
              reserveIcon={childReserveIcon}
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

function filterTree(nodes: NavNode[], role: string, matrix?: RbacMatrix, level?: number): NavNode[] {
  return nodes
    .filter((node) => canSeeNav(node, role, matrix, level))
    .map((node) => ({
      ...node,
      children: node.children ? filterTree(node.children, role, matrix, level) : undefined,
    }))
    .filter((node) => node.href || (node.children && node.children.length > 0));
}
