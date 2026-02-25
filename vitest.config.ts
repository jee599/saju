import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const DB_PATH = resolve(__dirname, "packages/api/prisma/fortune.db");

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "apps/**/lib/**/*.test.ts"],
    environment: "node",
    env: {
      DATABASE_URL: `file:${DB_PATH}`,
    },
  },
});
