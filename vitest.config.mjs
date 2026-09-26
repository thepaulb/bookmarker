import { defineConfig } from "vitest/config";

// Server-side test suite. Runs the Express app in-process against a
// throwaway in-memory SQLite database (DB_PATH=:memory:), so the real
// bookmarks.db is never touched.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.js"],
    setupFiles: ["server/test/setup.js"],
    env: {
      DB_PATH: ":memory:",
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "1h",
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/server",
      include: ["server/**/*.js"],
      exclude: [
        "server/test/**",
        "server/index.js",
        "server/import-bookmarks.js",
        "server/clean-urls.js",
        "server/**/*.test.js",
      ],
      reporter: ["text", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
