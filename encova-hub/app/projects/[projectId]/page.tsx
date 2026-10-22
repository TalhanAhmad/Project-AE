import { notFound, redirect } from "next/navigation";
import TaskWorkspace from "../../../components/tasks/task-workspace";
import { getCurrentUser } from "../../../server/current-user.ts";
import { DomainError } from "../../../server/errors.ts";
import { listProjects } from "../../../modules/projects/service.ts";

export const metadata = { title: "Project tasks | Encova Hub" };
async function loadProject(params: Promise<{ projectId: string }>) {
  try { const user = await getCurrentUser(); const { projectId } = await params; const project = (await listProjects(user)).find((item) => item.id === projectId); if (!project) notFound(); return { user, project }; }
  catch (error) { if (error instanceof DomainError) redirect("/login"); throw error; }
}
export default async function ProjectTasksPage({ params }: { params: Promise<{ projectId: string }> }) { const { user, project } = await loadProject(params); return <TaskWorkspace user={user} project={project} />; }
