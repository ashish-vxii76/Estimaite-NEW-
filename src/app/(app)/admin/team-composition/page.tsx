import { redirect } from "next/navigation";

// Team composition is now managed inline on each Pod in Organisation setup.
export default function TeamCompositionRedirect() {
  redirect("/admin/organisation");
}
