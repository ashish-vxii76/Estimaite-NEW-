import { copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}

execSync("npx prisma generate", { stdio: "inherit" });
execSync("npx prisma db push", { stdio: "inherit" });

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const users = await prisma.user.count();
await prisma.$disconnect();
if (users === 0) {
  execSync("npm run db:seed", { stdio: "inherit" });
}
