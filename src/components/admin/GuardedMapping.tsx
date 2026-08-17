import { auth } from "@/auth";
import { MappingEditor, type Column } from "@/components/admin/MappingEditor";
import { can, type FeatureId } from "@/lib/rbac";

export async function GuardedMapping(props: {
  title: string;
  description: string;
  section: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  allowAdd?: boolean;
  feature?: FeatureId;
}) {
  const session = await auth();
  const feature = props.feature ?? "config.mappings";
  return (
    <MappingEditor
      {...props}
      readOnly={!can(session?.user.role, feature, "RW")}
    />
  );
}
