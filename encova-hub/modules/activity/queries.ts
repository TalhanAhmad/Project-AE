import "server-only";
import type { Prisma } from "../../generated/prisma/client.ts";
import type { ActivityAction, ActivityDetails } from "./types.ts";

type ActivityInput = {
  projectId: string;
  taskId?: string;
  actorId: string;
  action: ActivityAction;
  details?: ActivityDetails;
};

// Call this only inside the mutation's existing transaction. If this insert
// fails, Prisma rejects the transaction and the related mutation rolls back.
export async function appendActivity(transaction: Prisma.TransactionClient, input: ActivityInput): Promise<void> {
  await transaction.activityLog.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId,
      actorId: input.actorId,
      action: input.action,
      details: input.details ?? {},
    },
  });
}
