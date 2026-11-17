import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // NOTE: the default process pools ("forks"/"threads") fail in this project with "Cannot read properties of
    // undefined (reading 'config')" as soon as a test file awaits something before its first describe();
    // the cause was not tracked down. "vmThreads" works, so it is pinned here. For the same reason there is
    // no `setupFiles`: the environment is prepared by importing ./src/test/test-db.ts instead.
    pool: "vmThreads",
  },
});
