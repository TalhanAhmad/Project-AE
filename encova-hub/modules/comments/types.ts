export type Comment = {
  id: string;
  taskId: string;
  body: string | null;
  deletedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
};
