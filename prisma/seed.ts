import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CONFIG } from "../src/domain/estimation/defaultConfig";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const users = [
    ["admin@estimaite.local", "Platform Admin", "ADMINISTRATOR"],
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
      update: { name, role, passwordHash },
      create: { email, name, role, passwordHash },
    });
  }

  const platforms = await prisma.team.upsert({
    where: { name: "Platform Engineering" },
    update: {},
    create: {
      name: "Platform Engineering",
      mappedLocation: "United Kingdom",
      standardTeamSize: 6,
      currency: "GBP",
      teamSprintRate: 18000,
      resourceSprintRate: 4000,
      effectiveFrom: new Date("2026-01-01"),
      active: true,
      members: {
        create: [
          { name: "Dev A", roleStream: "DEV", resourceLevel: "senior" },
          { name: "Dev B", roleStream: "DEV", resourceLevel: "intermediate" },
          { name: "QA A", roleStream: "QA", resourceLevel: "experienced" },
        ],
      },
    },
  });

  await prisma.team.upsert({
    where: { name: "Payments" },
    update: {},
    create: {
      name: "Payments",
      mappedLocation: "India",
      standardTeamSize: 8,
      currency: "USD",
      teamSprintRate: 9000,
      resourceSprintRate: 1800,
      effectiveFrom: new Date("2026-01-01"),
      active: true,
      members: {
        create: [
          { name: "Dev C", roleStream: "DEV", resourceLevel: "experienced" },
          { name: "Dev D", roleStream: "DEV", resourceLevel: "beginner" },
          { name: "QA B", roleStream: "QA", resourceLevel: "intermediate" },
        ],
      },
    },
  });

  const locations = [
    ["India", 220, "USD"],
    ["United Kingdom", 650, "GBP"],
    ["United States", 780, "USD"],
    ["Switzerland", 900, "CHF"],
    ["Poland", 320, "EUR"],
    ["Singapore", 540, "SGD"],
  ] as const;
  for (const [name, dailyRate, currency] of locations) {
    await prisma.location.upsert({
      where: { name },
      update: { dailyRate, currency, active: true },
      create: { name, dailyRate, currency, active: true },
    });
  }

  await prisma.configurationVersion.upsert({
    where: { id: DEFAULT_CONFIG.versionId },
    update: { payload: JSON.stringify(DEFAULT_CONFIG), active: true },
    create: {
      id: DEFAULT_CONFIG.versionId,
      payload: JSON.stringify(DEFAULT_CONFIG),
      active: true,
    },
  });

  console.log("Seeded demo users (password: demo1234), teams, locations, config.");
  console.log("Primary team:", platforms.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
