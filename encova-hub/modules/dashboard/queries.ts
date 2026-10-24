import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import type { AppUser } from "../auth/types.ts";
import type { AssignedDashboardTask, DashboardSummary } from "./types.ts";

const assignedTaskSelect = {
  id: true,
  projectId: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  project: { select: { name: true } },
} as const;

function startOfAgencyDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00.000Z`);
}

function visibleProjectWhere(actor: AppUser): Prisma.ProjectWhereInput {
  return actor.role === "OWNER" ? {} : { members: { some: { userId: actor.id } } };
}

function serializeAssignedTask(task: Prisma.TaskGetPayload<{ select: typeof assignedTaskSelect }>): AssignedDashboardTask {
  return {
    id: task.id,
    projectId: task.projectId,
    projectName: task.project.name,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
  };
}

export async function getDashboardSummary(actor: AppUser, now = new Date()): Promise<DashboardSummary> {
  const db = getDatabase();
  const projects = visibleProjectWhere(actor);
  const activeProjects = { ...projects, archivedAt: null, status: "ACTIVE" as const };
  const visibleTasks = {
    deletedAt: null,
    project: { is: { ...projects, archivedAt: null } },
  } satisfies Prisma.TaskWhereInput;

  const [activeProjectCount, overdueTasks, completedTasks, assignedWork] = await Promise.all([
    db.project.count({ where: activeProjects }),
    db.task.count({ where: { ...visibleTasks, dueDate: { lt: startOfAgencyDay(now) }, status: { not: "DONE" } } }),
    db.task.count({ where: { ...visibleTasks, status: "DONE" } }),
    db.task.findMany({
      where: { ...visibleTasks, assigneeId: actor.id },
      select: assignedTaskSelect,
      // This explicit order stays deterministic until Week 6 pagination is added.
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
      take: 12,
    }),
  ]);

  return {
    activeProjects: activeProjectCount,
    overdueTasks,
    completedTasks,
    assignedWork: assignedWork.map(serializeAssignedTask),
  };
}
