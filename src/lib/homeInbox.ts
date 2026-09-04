import { prisma } from "@/lib/prisma";
import { can } from "@/lib/access";
import { canUseWhatIf } from "@/lib/rbac";
import { getCachedRbacMatrix } from "@/services/rbacService";
import { fromSession, resolveEstimateScope, type ScopeUser } from "@/lib/scope";
import { CREW_LEVEL, APP_LEVEL } from "@/lib/orgLevel";

export type AppNotification = {
  id: string;
  severity: "info" | "warn" | "urgent";
  title: string;
  body: string;
  href: string;
};

export type HomeAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  feature?: string;
};

/** Build role-scoped inbox items for the top-right bell. */
export async function buildNotifications(
  user: ScopeUser | { id: string; role: string; teamId?: string | null },
): Promise<AppNotification[]> {
  const scoped = fromSession(user);
  const scope = await resolveEstimateScope(scoped);
  const [drafts, pendingReview, pendingApprove, resultRows] = await Promise.all([
    prisma.estimate.count({ where: { ...scope, status: { in: ["DRAFT", "RETURNED"] } } }),
    prisma.estimate.count({ where: { ...scope, status: "READY_FOR_REVIEW" } }),
    prisma.estimate.count({ where: { ...scope, status: "REVIEWED" } }),
    prisma.estimate.findMany({ where: scope, select: { resultJson: true } }),
  ]);

  const discovery = resultRows.filter((row) => {
    if (!row.resultJson) return false;
    try {
      const parsed = JSON.parse(row.resultJson) as {
        deliveryFlag?: string;
        governanceDecision?: string;
        dorStatus?: string;
      };
      return (
        parsed.deliveryFlag === "DISCOVERY REQUIRED" ||
        parsed.governanceDecision === "DISCOVERY REQUIRED" ||
        parsed.dorStatus === "Discovery Required"
      );
    } catch {
      return false;
    }
  }).length;

  const items: AppNotification[] = [];
  const role = scoped.role;

  if (discovery > 0 && can(role, "estimates.create", "RW")) {
    items.push({
      id: "discovery",
      severity: "urgent",
      title: "Discovery required",
      body: `${discovery} estimate${discovery === 1 ? " is" : "s are"} stamped DISCOVERY REQUIRED. Size ${discovery === 1 ? "it" : "them"} first.`,
      href: "/estimates?status=DRAFT",
    });
  }
  if (pendingApprove > 0 && can(role, "estimates.approve", "RW")) {
    items.push({
      id: "approve",
      severity: "warn",
      title: "Waiting for approval",
      body: `${pendingApprove} estimate${pendingApprove === 1 ? "" : "s"} ready to approve.`,
      href: "/estimates?status=REVIEWED",
    });
  }
  if (pendingReview > 0 && can(role, "estimates.review", "RW")) {
    items.push({
      id: "review",
      severity: "warn",
      title: "Waiting for review",
      body: `${pendingReview} estimate${pendingReview === 1 ? "" : "s"} ready for review.`,
      href: "/estimates?status=READY_FOR_REVIEW",
    });
  }
  if (drafts > 0 && can(role, "estimates.edit", "RW")) {
    items.push({
      id: "drafts",
      severity: "info",
      title: "Open drafts",
      body: `${drafts} draft or returned estimate${drafts === 1 ? "" : "s"} in your scope.`,
      href: "/estimates?status=DRAFT",
    });
  }
  if (items.length === 0) {
    items.push({
      id: "clear",
      severity: "info",
      title: "All clear",
      body: "Nothing is waiting on discovery, review or approval in your scope.",
      href: "/estimates",
    });
  }
  return items;
}

/** Role-aware shortcut panel under Home charts. */
export function buildHomeActions(role: string | undefined, seatLevel: number = APP_LEVEL): HomeAction[] {
  const actions: HomeAction[] = [];
  const crewLevelOrAbove = seatLevel >= CREW_LEVEL;
  if (can(role, "estimates.create", "RW")) {
    actions.push({
      id: "new-estimate",
      label: "New estimate",
      description: "Start Ready → Size → Plan & cost → Govern.",
      href: "/estimates/new",
      feature: "estimates.create",
    });
  }
  if (can(role, "estimates.list")) {
    actions.push({
      id: "register",
      label: "Open register",
      description: "Browse and filter all estimates in scope.",
      href: "/estimates",
      feature: "estimates.list",
    });
  }
  if (can(role, "estimates.review", "RW")) {
    actions.push({
      id: "review-queue",
      label: "Review queue",
      description: "Items waiting to be marked reviewed.",
      href: "/estimates?status=READY_FOR_REVIEW",
      feature: "estimates.review",
    });
  }
  if (can(role, "estimates.approve", "RW")) {
    actions.push({
      id: "approve-queue",
      label: "Approval queue",
      description: "Items awaiting approval.",
      href: "/estimates?status=REVIEWED",
      feature: "estimates.approve",
    });
  }
  if (crewLevelOrAbove && can(role, "portfolio.view")) {
    actions.push({
      id: "portfolio",
      label: "Roll-up & CR register",
      description: "Portfolio cost and delivery roll-up.",
      href: "/portfolio",
      feature: "portfolio.view",
    });
  }
  if (crewLevelOrAbove && can(role, "calibration.view")) {
    actions.push({
      id: "calibration",
      label: "Calibration",
      description: "Actuals vs estimate variance insights.",
      href: "/calibration",
      feature: "calibration.view",
    });
  }
  if (canUseWhatIf(role, seatLevel, getCachedRbacMatrix())) {
    actions.push({
      id: "what-if",
      label: "What-if scenarios",
      description: "Model team / seniority / SP scenarios.",
      href: "/what-if",
      feature: "whatIf",
    });
  }
  if (can(role, "config.mappings") || can(role, "config.users") || can(role, "config.rbac")) {
    actions.push({
      id: "admin",
      label: "Administration",
      description: "Lists, mappings, rates and access.",
      href: "/admin",
    });
  }
  if (can(role, "config.users", "RW")) {
    actions.push({
      id: "users",
      label: "Login credentials",
      description: "Create and manage user accounts.",
      href: "/admin/users",
      feature: "config.users",
    });
  }
  if (can(role, "config.rbac", "RW")) {
    actions.push({
      id: "rbac",
      label: "RBAC matrix",
      description: "Grant Home notifications, actions and all other features.",
      href: "/admin/rbac",
      feature: "config.rbac",
    });
  }
  return actions;
}
