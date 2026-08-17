import { getActiveConfig } from "@/services/configService";
import { GuardedMapping } from "@/components/admin/GuardedMapping";

export default async function DailyRatesPage() {
  const config = await getActiveConfig();
  return (
    <GuardedMapping
      feature="config.rates"
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
