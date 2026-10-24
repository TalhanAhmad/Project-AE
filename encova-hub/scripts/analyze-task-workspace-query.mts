import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required.");
const url = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Use only the separate local test database.");

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
const clientId = randomUUID(); const projectId = randomUUID(); const userId = randomUUID();
try {
  await client.connect();
  await client.query("INSERT INTO clients(id,name,updated_at) VALUES($1,$2,now())", [clientId, "Query analysis fixture"]);
  await client.query("INSERT INTO users(id,auth_subject,email,name,role,updated_at) VALUES($1,$2,$3,$4,'MEMBER',now())", [userId, `profile:${userId}`, `profile-${userId}@example.test`, "Query analyst"]);
  await client.query("INSERT INTO projects(id,client_id,name,status,updated_at) VALUES($1,$2,$3,'ACTIVE',now())", [projectId, clientId, "Query analysis project"]);
  await client.query("INSERT INTO project_members(project_id,user_id) VALUES($1,$2)", [projectId, userId]);
  await client.query(`INSERT INTO tasks(project_id,title,status,priority,due_date,created_by,updated_at)
    SELECT $1, 'Profile task ' || series, 'TODO', 'MEDIUM', DATE '2026-10-01' + (series % 30), $2, now()
    FROM generate_series(1, 2000) AS series`, [projectId, userId]);
  await client.query("ANALYZE tasks");
  const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS)
    SELECT task.id, task.title, task.due_date
    FROM tasks AS task
    JOIN projects AS project ON project.id = task.project_id
    JOIN project_members AS member ON member.project_id = project.id AND member.user_id = $1
    WHERE task.deleted_at IS NULL AND project.archived_at IS NULL
    ORDER BY task.due_date ASC NULLS LAST, task.created_at DESC, task.id DESC
    LIMIT 10 OFFSET 20`, [userId]);
  console.log(result.rows.map((row) => row["QUERY PLAN"] as string).join("\n"));
} finally {
  if (client) {
    await client.query("DELETE FROM tasks WHERE project_id=$1", [projectId]).catch(() => {});
    await client.query("DELETE FROM project_members WHERE project_id=$1", [projectId]).catch(() => {});
    await client.query("DELETE FROM projects WHERE id=$1", [projectId]).catch(() => {});
    await client.query("DELETE FROM users WHERE id=$1", [userId]).catch(() => {});
    await client.query("DELETE FROM clients WHERE id=$1", [clientId]).catch(() => {});
    await client.end().catch(() => {});
  }
}
