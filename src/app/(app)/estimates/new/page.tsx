import { prisma } from "@/lib/prisma";
import { EstimateWizard } from "@/components/EstimateWizard";

export default async function NewEstimatePage() {
  const [teams, locations] = await Promise.all([
    prisma.team.findMany({ where: { active: true } }),
    prisma.location.findMany({ where: { active: true } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New estimate</h1>
      <EstimateWizard teams={teams} locations={locations} />
    </div>
  );
}
