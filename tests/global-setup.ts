import { execSync } from "child_process";
import fs from "fs";

export default function setup() {
  fs.rmSync("prisma/test.db", { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
