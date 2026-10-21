-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_subject" VARCHAR(191) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_identities" (
    "subject" VARCHAR(191) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_identities_pkey" PRIMARY KEY ("subject")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id", "user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "credential_identities_user_id_key" ON "credential_identities"("user_id");
CREATE INDEX "project_members_user_id_project_id_idx" ON "project_members"("user_id", "project_id");

-- AddForeignKey
ALTER TABLE "credential_identities" ADD CONSTRAINT "credential_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Keep identity values in their canonical form even when application code is bypassed.
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized" CHECK (email = lower(btrim(email)) AND email ~ '[^[:space:]]');
ALTER TABLE "users" ADD CONSTRAINT "users_name_nonblank" CHECK (name ~ '[^[:space:]]');
ALTER TABLE "users" ADD CONSTRAINT "users_auth_subject_nonblank" CHECK (auth_subject ~ '[^[:space:]]');
ALTER TABLE "credential_identities" ADD CONSTRAINT "credential_identities_password_hash_nonblank" CHECK (password_hash ~ '[^[:space:]]');
