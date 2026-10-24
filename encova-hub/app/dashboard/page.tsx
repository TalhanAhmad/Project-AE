import { redirect } from "next/navigation";
import DashboardWorkspace from "../../components/dashboard/dashboard-workspace";
import { getCurrentUser } from "../../server/current-user.ts";
import { DomainError } from "../../server/errors.ts";

export const metadata = { title: "Dashboard | Encova Hub" };
async function loadUser() {
  try { return await getCurrentUser(); }
  catch (error) { if (error instanceof DomainError) redirect("/login"); throw error; }
}
export default async function DashboardPage() { return <DashboardWorkspace user={await loadUser()} />; }
