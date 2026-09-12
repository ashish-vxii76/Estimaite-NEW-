import { PrismaClient } from "@prisma/client";

/**
 * Demo seed for GitLab Agentic Intake: maps the demo source RefineIQ → the IBRL crew.
 * Idempotent. Run after the org seed: `npm run db:seed:intake`.
 */
const prisma = new PrismaClient();

async function main() {
  const crew = await prisma.orgUnit.findFirst({ where: { type: "CREW", name: "IBRL" } });
  if (!crew) {
    console.log("IBRL crew not found — run `npm run db:seed` (and org seed) first. Skipping.");
    return;
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR" } });
  const ref = "aajoshi.vxii-group/RefineIQ";
  await prisma.gitLabSourceMapping.upsert({
    where: { host_projectOrGroupRef: { host: "gitlab.com", projectOrGroupRef: ref } },
    create: {
      host: "gitlab.com",
      projectOrGroupRef: ref,
      crewId: crew.id,
      configuredById: admin?.id ?? crew.id,
      enabled: true,
    },
    update: { crewId: crew.id, enabled: true },
  });
  console.log(`Seeded GitLab source mapping: ${ref} → IBRL (${crew.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
