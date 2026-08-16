import { getActiveConfig } from "@/services/configService";
import { EstimationConfigForm } from "@/components/admin/EstimationConfigForm";

export default async function EstimationConfigPage() {
  const config = await getActiveConfig();
  return <EstimationConfigForm config={config} />;
}
