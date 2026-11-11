import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same "@/..." imports as the app (tsconfig paths), so tests can load route handlers.
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") } },
  test: {
    // Makes TEST_DATABASE_URL from .env available to the database tests.
    env: loadEnv("test", process.cwd(), ""),
    // The database tests reset the test branch, so they must not run in parallel with each other.
    fileParallelism: false,
    // Database tests talk to Neon over the internet, so allow for network round trips.
    testTimeout: 30_000,
  },
});
