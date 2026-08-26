import { describe, expect, it } from "vitest";
import { appendAuditEvent, verifyAuditChain } from "@/services/auditService";

/**
 * In-memory stand-in for the Prisma client's auditEvent model, so we can prove the
 * hash-chain tamper-evidence (governance item A) without a database.
 */
type Row = {
  id: string;
  estimateId: string | null;
  userId: string | null;
  action: string;
  previousValue: string;
  newValue: string;
  createdAt: Date;
  prevHash: string;
  hash: string;
};

function fakeClient() {
  const rows: Row[] = [];
  let n = 0;
  const client = {
    rows,
    auditEvent: {
      async findFirst() {
        return rows.length ? rows[rows.length - 1] : null;
      },
      async findMany() {
        return [...rows];
      },
      async create({ data }: { data: Omit<Row, "id"> }) {
        const row: Row = { id: `e${n++}`, ...data };
        rows.push(row);
        return row;
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

describe("audit hash chain (governance item A — tamper evidence)", () => {
  it("produces a valid, linked chain and verifies clean", async () => {
    const c = fakeClient();
    await appendAuditEvent({ estimateId: "est1", userId: "u1", action: "ESTIMATE_CREATED", newValue: "REF-1" }, c);
    await appendAuditEvent({ estimateId: "est1", userId: "u2", action: "ESTIMATE_REVIEW", previousValue: "READY_FOR_REVIEW", newValue: "REVIEWED" }, c);
    await appendAuditEvent({ estimateId: "est1", userId: "u3", action: "ESTIMATE_APPROVE", previousValue: "REVIEWED", newValue: "APPROVED" }, c);

    // each event links to the previous one
    expect(c.rows[0].prevHash).toBe("");
    expect(c.rows[1].prevHash).toBe(c.rows[0].hash);
    expect(c.rows[2].prevHash).toBe(c.rows[1].hash);

    const v = await verifyAuditChain(c);
    expect(v).toEqual({ ok: true, count: 3 });
  });

  it("detects a tampered value", async () => {
    const c = fakeClient();
    await appendAuditEvent({ estimateId: "est1", action: "A", newValue: "x" }, c);
    await appendAuditEvent({ estimateId: "est1", action: "B", newValue: "y" }, c);
    await appendAuditEvent({ estimateId: "est1", action: "C", newValue: "z" }, c);

    // an insider edits a historical approval in the DB
    c.rows[1].newValue = "TAMPERED";

    const v = await verifyAuditChain(c);
    expect(v.ok).toBe(false);
    expect(v.brokenAtId).toBe(c.rows[1].id);
  });

  it("detects a deleted event", async () => {
    const c = fakeClient();
    await appendAuditEvent({ action: "A", newValue: "1" }, c);
    await appendAuditEvent({ action: "B", newValue: "2" }, c);
    await appendAuditEvent({ action: "C", newValue: "3" }, c);

    c.rows.splice(1, 1); // delete the middle event

    const v = await verifyAuditChain(c);
    expect(v.ok).toBe(false);
  });
});
