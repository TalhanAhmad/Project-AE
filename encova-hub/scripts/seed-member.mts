import "dotenv/config";
import { getDatabase } from "../server/database.ts";
import { hashPassword } from "../modules/auth/password.ts";
import { bootstrapOwnerSchema, credentialsSubject } from "../modules/auth/schemas.ts";

const administrationUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!administrationUrl) throw new Error("Configure a migration or direct database URL before seeding a member.");
process.env.DATABASE_URL = administrationUrl;

const parsed = bootstrapOwnerSchema.safeParse({
  email: process.env.AUTH_BOOTSTRAP_MEMBER_EMAIL,
  name: process.env.AUTH_BOOTSTRAP_MEMBER_NAME,
  password: process.env.AUTH_BOOTSTRAP_MEMBER_PASSWORD,
});
if (!parsed.success) throw new Error("Set valid AUTH_BOOTSTRAP_MEMBER_EMAIL, AUTH_BOOTSTRAP_MEMBER_NAME, and a 12+ character AUTH_BOOTSTRAP_MEMBER_PASSWORD.");

const input = parsed.data;
const database = getDatabase();
try {
  const existing = await database.user.findUnique({ where: { email: input.email }, select: { role: true } });
  if (existing) {
    if (existing.role !== "MEMBER") throw new Error("The configured email already belongs to an owner; no changes were made.");
    console.log("Member already exists; password and role were not changed.");
  } else {
    const passwordHash = await hashPassword(input.password);
    await database.user.create({
      data: {
        authSubject: credentialsSubject(input.email),
        email: input.email,
        name: input.name,
        role: "MEMBER",
        isActive: true,
        credential: { create: { subject: credentialsSubject(input.email), passwordHash } },
      },
    });
    console.log("Member created without printing credentials.");
  }
} finally {
  await database.$disconnect();
}
