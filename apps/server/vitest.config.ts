import { defineConfig } from "vitest/config";
import { baseCoverageConfig } from "@sergeant/config/vitest.base";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    // Coverage instrumentation + dynamic `await import("./module.js")` inside
    // tests (e.g. push.test.ts re-imports push.ts per case to pick up env
    // changes) can blow past the 5s default under turbo concurrency. Lift to
    // 15s to absorb that without masking real hangs.
    testTimeout: 15_000,
    coverage: {
      ...baseCoverageConfig,
      include: ["src/**/*.ts"],
      thresholds: {
        // Baseline (2026-04-25, post barcode + weekly-digest tests):
        // lines 69.82 / branches 77.37 / fns 74.48. Floors set ~2pp below to
        // absorb flake; raise per sprint as more handler tests land.
        lines: 67,
        branches: 75,
        functions: 72,
        statements: 67,
      },
    },
  },
});
