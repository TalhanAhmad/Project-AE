import ProjectWorkspace from "../../components/projects/project-workspace";
import { getCurrentUser } from "../../server/current-user.ts";
import { DomainError } from "../../server/errors.ts";
import { redirect } from "next/navigation";

export const metadata = { title: "Projects | Encova Hub" };

async function requirePageUser() {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof DomainError) redirect("/login");
    throw error;
  }
}

export default async function ProjectsPage() {
  return <ProjectWorkspace user={await requirePageUser()} />;
}
