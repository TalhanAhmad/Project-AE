import "dotenv/config";
import pg from "pg";
import { z } from "zod";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const clientId = process.argv[2] ? z.uuid().parse(process.argv[2]) : null;
const connection = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await connection.connect();
  const result = await connection.query(`
    SELECT p.id, p.name AS project_name, p.status::text,
           p.due_date::text, c.id AS client_id, c.name AS client_name
    FROM projects AS p
    JOIN clients AS c ON c.id = p.client_id
    WHERE ($1::uuid IS NULL OR p.client_id = $1::uuid)
    ORDER BY p.created_at DESC, p.id DESC
  `, [clientId]);
  console.table(result.rows);
} catch { throw new Error("Join failed; check the configured local database and migrations."); }
finally { await connection.end(); }
