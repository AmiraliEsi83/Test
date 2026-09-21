import { execSync } from "child_process";
import { randomBytes } from "crypto";
import fs from "fs";

if (!fs.existsSync(".env")) {
  const env = `DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="${randomBytes(32).toString("hex")}"
ENCRYPTION_KEY="${randomBytes(24).toString("hex")}"
DEMO_MODE="true"
SEED_DEMO_PASSWORD="harsi-demo-only"
NEXT_PUBLIC_APP_NAME="HARSI"
`;
  fs.writeFileSync(".env", env);
  console.log("Wrote .env with local secrets.");
}
fs.mkdirSync("apps/web", { recursive: true });
if (!fs.existsSync("apps/web/.env")) fs.symlinkSync("../../.env", "apps/web/.env");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
