CREATE TABLE "login_rate_limits" (
    "key" VARCHAR(64) NOT NULL,
    "failures" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "login_rate_limits_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "login_rate_limits_failures_positive" CHECK ("failures" > 0)
);

CREATE INDEX "login_rate_limits_reset_at_idx" ON "login_rate_limits"("reset_at");
