import { prisma } from "@/lib/prisma";
import {
  DEFAULT_RBAC,
  normalizeMatrix,
  type RbacMatrix,
} from "@/lib/rbac";
import { appendAuditEvent } from "@/services/auditService";

let cache: RbacMatrix | null = null;

export function getCachedRbacMatrix(): RbacMatrix {
  return cache ?? DEFAULT_RBAC;
}

export function setCachedRbacMatrix(matrix: RbacMatrix) {
  cache = matrix;
}

export async function getRbacMatrix(): Promise<RbacMatrix> {
  try {
    const row = await prisma.rbacSettings.findUnique({ where: { id: "default" } });
    if (!row) {
      const matrix = normalizeMatrix(DEFAULT_RBAC);
      await prisma.rbacSettings.create({
        data: { id: "default", matrixJson: JSON.stringify(matrix) },
      });
      cache = matrix;
      return matrix;
    }
    const matrix = normalizeMatrix(JSON.parse(row.matrixJson));
    cache = matrix;
    return matrix;
  } catch {
    return cache ?? DEFAULT_RBAC;
  }
}

export function assertAdminNotLockedOut(matrix: RbacMatrix) {
  if (matrix["config.rbac"].ADMINISTRATOR !== "RW") {
    throw new Error("Admin must keep RW on the RBAC matrix so access can still be configured");
  }
  if (matrix["config.users"].ADMINISTRATOR !== "RW") {
    throw new Error("Admin must keep RW on login credentials");
  }
  if (!matrix.home.ADMINISTRATOR) {
    throw new Error("Admin must keep at least read access to Home");
  }
  if (!matrix["home.notifications"].ADMINISTRATOR) {
    throw new Error("Admin must keep Home notifications so alerts remain reachable");
  }
  if (!matrix["home.actions"].ADMINISTRATOR) {
    throw new Error("Admin must keep Home actions so admin shortcuts remain reachable");
  }
  if (!matrix["scope.allTeams"].ADMINISTRATOR) {
    throw new Error("Admin must keep All teams scope so administration is not trapped on one team");
  }
}

export async function saveRbacMatrix(matrixInput: unknown, actorUserId?: string) {
  const matrix = normalizeMatrix(matrixInput);
  assertAdminNotLockedOut(matrix);
  const previous = await prisma.rbacSettings.findUnique({ where: { id: "default" } });
  await prisma.rbacSettings.upsert({
    where: { id: "default" },
    update: { matrixJson: JSON.stringify(matrix) },
    create: { id: "default", matrixJson: JSON.stringify(matrix) },
  });
  await appendAuditEvent({
    userId: actorUserId,
    action: "RBAC_MATRIX_UPDATED",
    previousValue: previous?.matrixJson ?? "",
    newValue: JSON.stringify(matrix),
  });
  cache = matrix;
  return matrix;
}

export async function resetRbacMatrix(actorUserId?: string) {
  return saveRbacMatrix(DEFAULT_RBAC, actorUserId);
}
