import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CONFIG } from "../src/domain/estimation/defaultConfig";
import { seedDemoRegister } from "./seedDemo";
import { seedOrgHierarchy } from "./seedOrg";
import { seedMultiOrg } from "./seedMultiOrg";
import { seedCrs } from "./seedCrs";
import { DEFAULT_RBAC } from "../src/lib/rbac";

const prisma = new PrismaClient();

const TEAM_MEMBERS: Record<
  string,
  { name: string; roleStream: string; resourceLevel: string; location: string }[]
> = {
  Vikings: [
    { name: "Aarav Patel", roleStream: "DEV", resourceLevel: "senior", location: "India" },
    { name: "Diya Shah", roleStream: "DEV", resourceLevel: "intermediate", location: "India" },
    { name: "Kabir Rao", roleStream: "DEV", resourceLevel: "experienced", location: "India" },
    { name: "Meera Iyer", roleStream: "QA", resourceLevel: "experienced", location: "India" },
    { name: "Rohan Gupta", roleStream: "QA", resourceLevel: "intermediate", location: "India" },
  ],
  Spartans: [
    { name: "Neha Verma", roleStream: "DEV", resourceLevel: "experienced", location: "India" },
    { name: "Arjun Nair", roleStream: "DEV", resourceLevel: "beginner", location: "India" },
    { name: "Ishita Bose", roleStream: "QA", resourceLevel: "intermediate", location: "India" },
  ],
  Centurions: [
    { name: "Luca Meier", roleStream: "DEV", resourceLevel: "senior", location: "Switzerland" },
    { name: "Priya Kulkarni", roleStream: "DEV", resourceLevel: "experienced", location: "India" },
    { name: "Elena Rossi", roleStream: "QA", resourceLevel: "experienced", location: "Switzerland" },
    { name: "Anika Das", roleStream: "QA", resourceLevel: "intermediate", location: "India" },
  ],
  Praetorians: [
    { name: "Jonas Keller", roleStream: "DEV", resourceLevel: "senior", location: "Switzerland" },
    { name: "Sophie Brunner", roleStream: "DEV", resourceLevel: "experienced", location: "Switzerland" },
    { name: "Nina Graf", roleStream: "QA", resourceLevel: "senior", location: "Switzerland" },
  ],
};

const MIX: Record<string, { location: string; allocationPct: number }[]> = {
  Vikings: [{ location: "India", allocationPct: 100 }],
  Spartans: [{ location: "India", allocationPct: 100 }],
  Centurions: [
    { location: "India", allocationPct: 50 },
    { location: "Switzerland", allocationPct: 50 },
  ],
  Praetorians: [{ location: "Switzerland", allocationPct: 100 }],
};

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const users = [
    ["admin@estimaite.local", "Ashish Joshi", "ADMINISTRATOR"],
    ["ba@estimaite.local", "Alex Requester", "REQUESTER"],
    ["eng@estimaite.local", "Jordan Tech Lead", "ESTIMATOR"],
    ["qa@estimaite.local", "Sam QA Lead", "ESTIMATOR"],
    ["reviewer@estimaite.local", "Riley Reviewer", "REVIEWER"],
    ["approver@estimaite.local", "Morgan Approver", "APPROVER"],
    ["delivery@estimaite.local", "Casey Delivery Lead", "DELIVERY_LEAD"],
    ["finance@estimaite.local", "Taylor Finance", "FINANCE"],
    ["viewer@estimaite.local", "Pat Viewer", "VIEWER"],
  ] as const;

  for (const [email, name, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, role, passwordHash, active: true },
      create: { email, name, role, passwordHash, active: true },
    });
  }

  for (const row of DEFAULT_CONFIG.costMappings) {
    const daily = DEFAULT_CONFIG.locationDailyRates.find((r) => r.location === row.location);
    await prisma.location.upsert({
      where: { name: row.location },
      update: {
        dailyRate: daily?.dailyRate ?? row.resourceSprintCost,
        currency: row.currency,
        costMethod: "Resource Cost per Sprint",
        standardTeamSize: row.standardTeamSize || 10,
        active: true,
      },
      create: {
        name: row.location,
        dailyRate: daily?.dailyRate ?? row.resourceSprintCost,
        currency: row.currency,
        costMethod: "Resource Cost per Sprint",
        standardTeamSize: row.standardTeamSize || 10,
        active: true,
      },
    });
  }

  for (const row of DEFAULT_CONFIG.teamCostMappings) {
    const resourceSprintRate = row.resourceSprintCost;
    const members = TEAM_MEMBERS[row.teamName] ?? [];
    const mix = MIX[row.teamName] ?? [];
    const existing = await prisma.team.findUnique({ where: { name: row.teamName } });
    if (existing) {
      await prisma.teamMember.deleteMany({ where: { teamId: existing.id } });
      await prisma.team.update({
        where: { id: existing.id },
        data: {
          mappedLocation: row.teamLocation,
          standardTeamSize: row.standardTeamSize || 10,
          currency: row.currency,
          teamSprintRate: row.teamSprintCost,
          resourceSprintRate,
          costMethod: "Resource Cost per Sprint",
          locationMixJson: JSON.stringify(mix),
          active: true,
          members: { create: members },
        },
      });
    } else {
      await prisma.team.create({
        data: {
          name: row.teamName,
          mappedLocation: row.teamLocation,
          standardTeamSize: row.standardTeamSize || 10,
          currency: row.currency,
          teamSprintRate: row.teamSprintCost,
          resourceSprintRate,
          costMethod: "Resource Cost per Sprint",
          locationMixJson: JSON.stringify(mix),
          effectiveFrom: new Date("2026-01-01"),
          active: true,
          members: { create: members },
        },
      });
    }
  }

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

  const teamByName = Object.fromEntries(
    (await prisma.team.findMany({ select: { id: true, name: true } })).map((t) => [t.name, t.id]),
  );
  const userTeams: Record<string, string | null> = {
    "admin@estimaite.local": null,
    "ba@estimaite.local": teamByName.Vikings ?? null,
    "eng@estimaite.local": null, // Crew-level (Crew seat) — no pod
    "qa@estimaite.local": teamByName.Spartans ?? null,
    "reviewer@estimaite.local": teamByName.Vikings ?? null,
    "approver@estimaite.local": teamByName.Vikings ?? null,
    "delivery@estimaite.local": teamByName.Centurions ?? null,
    "finance@estimaite.local": null, // Division-level (Division seat) — no pod
    "viewer@estimaite.local": teamByName.Praetorians ?? null,
  };
  for (const [email, teamId] of Object.entries(userTeams)) {
    await prisma.user.update({ where: { email }, data: { teamId } });
  }

  await prisma.rbacSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", matrixJson: JSON.stringify(DEFAULT_RBAC) },
  });

  await seedDemoRegister(prisma);
  await seedOrgHierarchy(prisma);
  await seedMultiOrg(prisma, passwordHash);
  await seedCrs(prisma);
  console.log("Seeded PRD mappings, teams, UBS org tree, Crew budgets, and demo users.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
