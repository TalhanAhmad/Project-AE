import ClientWorkspace from "../../components/clients/client-workspace";
import { getCurrentUser } from "../../server/current-user.ts";
import { DomainError } from "../../server/errors.ts";
import { redirect } from "next/navigation";

async function requirePageUser() {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof DomainError) redirect("/login");
    throw error;
  }
}

export default async function ClientsPage() {
  const user = await requirePageUser();
  if (user.role !== "OWNER") redirect("/projects");
  return <ClientWorkspace user={user} />;
}
