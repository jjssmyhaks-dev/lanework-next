import { defineConfig } from "vitest/config";
import path from "path";

process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";

// Provide required env vars for tests
if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests-only";
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-for-unit-tests-only";
// Skip integration tests (require running dev server) unless explicitly enabled
if (!process.env.TEST_BASE_URL) process.env.SKIP_INTEGRATION = "1";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts", "mcp-servers/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/rate-limit.ts",
        "src/lib/auth.ts",
        "src/app/api/**/route.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
