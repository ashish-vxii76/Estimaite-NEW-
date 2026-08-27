import { redirect } from "next/navigation";

// Pods/Teams are now managed as the Pod level of Organisation setup.
export default function TeamsRedirect() {
  redirect("/admin/organisation");
}
