import { defineConfig } from "vitest/config";
import path from "path";

// Integration tests: run against a throwaway SQLite DB (never dev.db).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.int.test.ts"],
    env: { DATABASE_URL: "file:./test-int.db" },
    globalSetup: ["tests/integration/globalSetup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
