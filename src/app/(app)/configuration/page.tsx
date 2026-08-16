import { prisma } from "@/lib/prisma";
import { getActiveConfig } from "@/services/configService";
import { ConfigEditor } from "@/components/ConfigEditor";

export default async function ConfigurationPage() {
  const [config, locations, versions] = await Promise.all([
    getActiveConfig(),
    prisma.location.findMany(),
    prisma.configurationVersion.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Configuration</h1>
        <p className="text-sm text-[var(--muted)]">
          Thresholds, mappings and rates are persisted configuration. Historical estimates keep the
          version they were calculated with.
        </p>
      </div>
      <ConfigEditor config={config} locations={locations} versions={versions} />
    </div>
  );
}
