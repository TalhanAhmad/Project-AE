import { redirect } from "next/navigation";
import TaskListWorkspace from "../../components/tasks/task-list-workspace";
import { getCurrentUser } from "../../server/current-user.ts";
import { DomainError } from "../../server/errors.ts";

export const metadata = { title: "Tasks | Encova Hub" };
async function loadUser() {
  try { return await getCurrentUser(); }
  catch (error) { if (error instanceof DomainError) redirect("/login"); throw error; }
}
export default async function TasksPage() { return <TaskListWorkspace user={await loadUser()} />; }
