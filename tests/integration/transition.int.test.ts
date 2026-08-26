import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { transitionStatus } from "@/services/estimateService";

/**
 * #11: exercise the real transitionStatus service path against a DB — the state machine,
 * both segregation-of-duties rules, and the concurrent double-approve race that #3's
 * transaction is supposed to close.
 */

let teamId: string;
let creatorId: string;
let reviewerId: string;
let approverId: string;
let approver2Id: string;

const EMAIL = {
  creator: "creator@int.test",
  reviewer: "reviewer@int.test",
  approver: "approver@int.test",
  approver2: "approver2@int.test",
};

async function makeUser(email: string, role: string) {
  return prisma.user.create({ data: { email, name: email, passwordHash: "x", role } });
}

async function newEstimate() {
  return prisma.estimate.create({
    data: {
      workItemType: "ISSUE",
      reference: "R-" + Math.random().toString(36).slice(2, 8),
      title: "Integration estimate",
      teamId,
      requester: "tester",
      status: "DRAFT",
      configurationVersionId: "cfg-test",
      rateVersionId: "rate-test",
      createdById: creatorId,
    },
  });
}

async function statusOf(id: string) {
  return (await prisma.estimate.findUnique({ where: { id } }))!.status;
}

beforeAll(async () => {
  const team = await prisma.team.create({
    data: {
      name: "Team-" + Math.random().toString(36).slice(2, 6),
      mappedLocation: "India",
      standardTeamSize: 10,
      currency: "CHF",
      teamSprintRate: 0,
      resourceSprintRate: 0,
      effectiveFrom: new Date(),
    },
  });
  teamId = team.id;
  creatorId = (await makeUser(EMAIL.creator, "ESTIMATOR")).id;
  reviewerId = (await makeUser(EMAIL.reviewer, "REVIEWER")).id;
  approverId = (await makeUser(EMAIL.approver, "APPROVER")).id;
  approver2Id = (await makeUser(EMAIL.approver2, "APPROVER")).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("estimate transition state machine (#11)", () => {
  it("runs the happy path DRAFT → READY_FOR_REVIEW → REVIEWED → APPROVED", async () => {
    const e = await newEstimate();
    await transitionStatus(e.id, "submit", creatorId, EMAIL.creator);
    expect(await statusOf(e.id)).toBe("READY_FOR_REVIEW");
    await transitionStatus(e.id, "review", reviewerId, EMAIL.reviewer);
    expect(await statusOf(e.id)).toBe("REVIEWED");
    const approved = await transitionStatus(e.id, "approve", approverId, EMAIL.approver);
    expect(approved!.status).toBe("APPROVED");
  });

  it("rejects an illegal transition (approve from DRAFT)", async () => {
    const e = await newEstimate();
    await expect(transitionStatus(e.id, "approve", approverId, EMAIL.approver)).rejects.toThrow(
      /Cannot approve from DRAFT/,
    );
  });

  it("blocks the creator from reviewing/approving their own record", async () => {
    const e = await newEstimate();
    await transitionStatus(e.id, "submit", creatorId, EMAIL.creator);
    await expect(transitionStatus(e.id, "review", creatorId, EMAIL.creator)).rejects.toThrow(
      /record you created/i,
    );
  });

  it("blocks the reviewer from also approving (two-person rule)", async () => {
    const e = await newEstimate();
    await transitionStatus(e.id, "submit", creatorId, EMAIL.creator);
    await transitionStatus(e.id, "review", reviewerId, EMAIL.reviewer);
    await expect(transitionStatus(e.id, "approve", reviewerId, EMAIL.reviewer)).rejects.toThrow(
      /reviewer cannot also approve/i,
    );
  });

  it("closes the concurrent double-approve race — exactly one wins (#3)", async () => {
    const e = await newEstimate();
    await transitionStatus(e.id, "submit", creatorId, EMAIL.creator);
    await transitionStatus(e.id, "review", reviewerId, EMAIL.reviewer);

    const results = await Promise.allSettled([
      transitionStatus(e.id, "approve", approverId, EMAIL.approver),
      transitionStatus(e.id, "approve", approver2Id, EMAIL.approver2),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled" && r.value);
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(await statusOf(e.id)).toBe("APPROVED");
    const approvals = await prisma.approval.count({ where: { estimateId: e.id, action: "approve" } });
    expect(approvals).toBe(1);
  });
});
