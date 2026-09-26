// Global test setup. Env vars (DB_PATH, JWT_SECRET, …) are provided by
// vitest.config.js before any module loads, so requiring ../db here yields
// a connection to the in-memory test database.
import { beforeEach } from "vitest";
import { resetDb } from "./helpers.js";

// Every test starts from a clean schema with no leftover rows.
beforeEach(() => {
  resetDb();
});
