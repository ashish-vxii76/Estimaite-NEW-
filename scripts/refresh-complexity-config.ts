import { PrismaClient } from "@prisma/client";
import { DEFAULT_CONFIG } from "../src/domain/estimation/defaultConfig";
import { getActiveConfig } from "../src/services/configService";

const prisma = new PrismaClient();

async function main() {
  await prisma.configurationVersion.updateMany({ data: { active: false } });
  await prisma.configurationVersion.upsert({
    where: { id: DEFAULT_CONFIG.versionId },
    update: { payload: JSON.stringify(DEFAULT_CONFIG), active: true },
    create: {
      id: DEFAULT_CONFIG.versionId,
      payload: JSON.stringify(DEFAULT_CONFIG),
      active: true,
    },
  });

  const cfg = await getActiveConfig();
  for (const d of cfg.complexityDimensions) {
    console.log(`${d.name} | ${d.options[0]} → ${d.options[4]} | w ${d.weight}`);
  }
  const bad = cfg.complexityDimensions.some(
    (d) => (d.options || [])[0] === "Minimal / well understood",
  );
  console.log(bad ? "FAIL still old labels" : "PASS All estimates Size labels correct");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
