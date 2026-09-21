import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    env: {
      JWT_SECRET: "test-secret",
      DEMO_MODE: "true",
      VITEST: "true",
    },
  },
});
