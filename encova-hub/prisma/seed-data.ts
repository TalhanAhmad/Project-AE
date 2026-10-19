export const seedClients = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Example Studio", email: "studio@example.test", company: "Example Agency", notes: "Synthetic demo client." },
  { id: "10000000-0000-4000-8000-000000000002", name: "Sample Workshop", email: "workshop@example.test", company: "Sample Company", notes: "Synthetic demo client." },
] as const;

export const seedProjects = [
  { id: "20000000-0000-4000-8000-000000000001", clientId: seedClients[0].id, name: "Demo website", status: "ACTIVE", dueDate: new Date("2026-12-15T00:00:00.000Z"), description: "Synthetic website project." },
  { id: "20000000-0000-4000-8000-000000000002", clientId: seedClients[0].id, name: "Demo brand refresh", status: "PLANNED", dueDate: null, description: "Synthetic brand project." },
  { id: "20000000-0000-4000-8000-000000000003", clientId: seedClients[1].id, name: "Demo catalogue", status: "ON_HOLD", dueDate: null, description: "Synthetic catalogue project." },
] as const;
