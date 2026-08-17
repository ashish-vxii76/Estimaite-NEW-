import { getActiveConfig } from "@/services/configService";
import { GuardedMapping } from "@/components/admin/GuardedMapping";

export default async function ComplexityMappingPage() {
  const config = await getActiveConfig();
  return (
    <GuardedMapping
      title="Complexity Mapping"
      description="Lower and Upper are complexity-index percentages. The engine maps the scored index into a T-Shirt, complexity label and governance outcome."
      section="complexityMappings"
      rows={config.complexityMappings as unknown as Record<string, unknown>[]}
      columns={[
        { key: "lower", label: "Lower", type: "number" },
        { key: "upper", label: "Upper", type: "number" },
        { key: "tshirt", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
        { key: "complexity", label: "Complexity" },
        {
          key: "governance",
          label: "Governance",
          type: "select",
          options: ["READY", "REVIEW", "SPLIT", "PLAN", "DECOMPOSE", "SPLIT EPIC"],
        },
        { key: "interpretation", label: "Interpretation" },
      ]}
    />
  );
}
