import { getActiveConfig } from "@/services/configService";
import { MappingEditor } from "@/components/admin/MappingEditor";

export default async function DailyRatesPage() {
  const config = await getActiveConfig();
  return (
    <MappingEditor
      title="Location Daily Rates"
      description="Blended daily rate uses Dev/QA roster headcount × these CHF daily rates. SM, PO and IT Lead are not costed."
      section="locationDailyRates"
      rows={config.locationDailyRates as unknown as Record<string, unknown>[]}
      columns={[
        { key: "location", label: "Location" },
        { key: "dailyRate", label: "Daily Rate", type: "number" },
        { key: "currency", label: "Currency" },
      ]}
    />
  );
}
