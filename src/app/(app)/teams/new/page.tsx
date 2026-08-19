import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewTeamForm } from "@/components/NewTeamForm";

export default async function NewTeamPage() {
  const session = await auth();
  if (session?.user.role !== "ADMINISTRATOR") redirect("/home");
  return <NewTeamForm />;
}
