import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaTuned?: boolean };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite concurrency hardening: WAL lets readers not block the writer (persistent on the
// db file), and a busy timeout makes concurrent writers wait briefly instead of throwing
// SQLITE_BUSY. Best-effort, SQLite only; errors ignored.
if (!globalForPrisma.prismaTuned && (process.env.DATABASE_URL ?? "").startsWith("file:")) {
  globalForPrisma.prismaTuned = true;
  void prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  void prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000;").catch(() => {});
}
