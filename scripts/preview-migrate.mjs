// Runs Drizzle migrations only when a database URL is available.
// Without one (e.g. a preview with no managed Postgres) the app still boots; chat history is disabled.
import { spawnSync } from "node:child_process";
const url = (process.env.DATABASE_URL || "").trim();
if (!url) {
  console.log("DATABASE_URL not set; skipping migrations (chat history disabled).");
  process.exit(0);
}
const r = spawnSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
