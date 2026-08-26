import { execSync } from "child_process";
import { rmSync } from "fs";
import path from "path";

const DB_URL = "file:./test-int.db";
const DB_FILE = path.resolve(__dirname, "../../prisma/test-int.db");

// Provision a clean throwaway SQLite DB with the current schema before the integration
// tests run, and delete it afterwards. Never touches dev.db.
export default function setup() {
  execSync("npx prisma db push --skip-generate --force-reset", {
    env: { ...process.env, DATABASE_URL: DB_URL },
    stdio: "ignore",
  });
  return () => {
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      try {
        rmSync(DB_FILE + suffix, { force: true });
      } catch {
        /* ignore */
      }
    }
  };
}
