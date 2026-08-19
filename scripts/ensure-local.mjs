import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function ensureEnv() {
  if (!existsSync(".env")) {
    copyFileSync(".env.example", ".env");
    console.log("Created .env from .env.example");
  }

  let text = readFileSync(".env", "utf8");
  const original = text;

  // A hardcoded AUTH_URL sends the browser to that host after login.
  // That breaks 127.0.0.1, Cursor previews, and leftover :3000 values.
  // Auth.js trustHost follows the URL you actually opened.
  text = text.replace(/^[ \t]*AUTH_URL=.*\r?\n?/gm, "");

  if (!/^AUTH_SECRET=/m.test(text)) {
    text += `${text.endsWith("\n") ? "" : "\n"}AUTH_SECRET="demo-estimaite-secret-change-me"\n`;
  }
  if (!/^DATABASE_URL=/m.test(text)) {
    text += `${text.endsWith("\n") ? "" : "\n"}DATABASE_URL="file:./dev.db"\n`;
  }

  if (text !== original) {
    writeFileSync(".env", text);
    console.log("Updated .env for local Auth.js (AUTH_URL removed)");
  }
}

ensureEnv();

execSync("npx prisma generate", { stdio: "inherit" });
execSync("npx prisma db push", { stdio: "inherit" });

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const users = await prisma.user.count();
await prisma.$disconnect();
if (users === 0) {
  execSync("npm run db:seed", { stdio: "inherit" });
}

console.log("Estimaite is ready on http://localhost:3456 (this computer only)");
