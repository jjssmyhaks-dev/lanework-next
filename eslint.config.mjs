import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The codebase deliberately types DB rows / JSON payloads as `any`.
      // Keep it a warning so it doesn't block the lint gate, but it's visible.
      "@typescript-eslint/no-explicit-any": "warn",
      // Only forbid characters that actually break JSX rendering.
      // Apostrophes and quotes in JSX text are safe.
      "react/no-unescaped-entities": ["error", { "forbid": [">", "}"] }],
      // React Compiler heuristic rules are noisy on fetch-in-effect patterns
      // used across this codebase; they don't indicate real bugs here.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy standalone dashboard app — separate build, not part of this app.
    "backend/**",
    "mcp-servers/**",
    "scripts/**",
    "test/**",
  ]),
]);

export default eslintConfig;
