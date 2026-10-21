import "dotenv/config";
import { getDatabase } from "../server/database.ts";
import { hashPassword } from "../modules/auth/password.ts";
import { bootstrapOwnerSchema, credentialsSubject } from "../modules/auth/schemas.ts";

const administrationUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!administrationUrl) throw new Error("Configure a migration or direct database URL before seeding the initial owner.");
// This is an administrative setup action. The runtime account deliberately
// cannot create users or password identities.
process.env.DATABASE_URL = administrationUrl;

const parsed = bootstrapOwnerSchema.safeParse({
  email: process.env.AUTH_BOOTSTRAP_OWNER_EMAIL,
  name: process.env.AUTH_BOOTSTRAP_OWNER_NAME,
  password: process.env.AUTH_BOOTSTRAP_OWNER_PASSWORD,
});
if (!parsed.success) throw new Error("Set valid AUTH_BOOTSTRAP_OWNER_EMAIL, AUTH_BOOTSTRAP_OWNER_NAME, and a 12+ character AUTH_BOOTSTRAP_OWNER_PASSWORD.");

const input = parsed.data;
const database = getDatabase();
try {
  const existing = await database.user.findUnique({ where: { email: input.email }, select: { id: true, role: true } });
  if (existing) {
    if (existing.role !== "OWNER") throw new Error("The configured email already belongs to a non-owner user; no changes were made.");
    console.log("Initial owner already exists; password and role were not changed.");
  } else {
    const passwordHash = await hashPassword(input.password);
    await database.user.create({
      data: {
        authSubject: credentialsSubject(input.email),
        email: input.email,
        name: input.name,
        role: "OWNER",
        isActive: true,
        credential: { create: { subject: credentialsSubject(input.email), passwordHash } },
      },
    });
    console.log("Initial owner created without printing credentials.");
  }
} finally {
  await database.$disconnect();
}
