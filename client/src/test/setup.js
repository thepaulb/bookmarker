// Client test setup: jest-dom matchers and per-test cleanup of rendered
// trees, spies and stubbed globals (fetch, confirm).
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
