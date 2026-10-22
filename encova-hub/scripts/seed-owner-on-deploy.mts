// This guarded one-time hook lets Vercel create the initial owner without
// exposing the password to a local machine or repository. The flag is removed
// immediately after the successful deployment.
if (process.env.AUTH_BOOTSTRAP_OWNER_ON_DEPLOY === "true") {
  await import("./seed-owner.mts");
} else {
  console.log("Production owner bootstrap is not enabled for this build.");
}
