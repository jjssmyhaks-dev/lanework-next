/**
 * Environment variable validation.
 * Import this at the top of critical entry points to fail fast on misconfiguration.
 *
 * Usage: import "@/lib/env"; // validates on import
 */

const REQUIRED_VARS = {
  DATABASE_URL: {
    description: "Neon PostgreSQL connection string",
    example: "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname",
  },
  JWT_SECRET: {
    description: "Secret key for JWT signing (generate: openssl rand -hex 32)",
    example: "a1b2c3d4e5f6...",
    minLength: 32,
  },
} as const;

const OPTIONAL_VARS = {
  NEXTAUTH_SECRET: "Alias for JWT_SECRET (used by next-auth)",
  CLOUDFLARE_AI_ACCOUNT_ID: "Cloudflare Workers AI account ID",
  CLOUDFLARE_AI_API_TOKEN: "Cloudflare Workers AI API token",
  OPENWEATHER_API_KEY: "OpenWeatherMap API key (free tier works)",
  CORS_ORIGINS: "Comma-separated allowed origins for CORS",
  LOG_LEVEL: "debug | info | warn | error (default: info in production)",
  SENTRY_ORG: "Sentry organization slug",
  SENTRY_PROJECT: "Sentry project slug",
  SENTRY_AUTH_TOKEN: "Sentry auth token for source maps",
} as const;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validate(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];
    if (!value) {
      errors.push(
        `Missing required env var: ${key}\n  → ${config.description}\n  → Example: ${config.example}`
      );
    } else if ("minLength" in config && value.length < config.minLength) {
      errors.push(
        `${key} is too short (minimum ${config.minLength} chars, got ${value.length})`
      );
    }
  }

  // JWT_SECRET must be set (either directly or via NEXTAUTH_SECRET)
  if (!process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
    errors.push(
      "Either JWT_SECRET or NEXTAUTH_SECRET must be set\n  → Generate: openssl rand -hex 32"
    );
  }

  // Warn about optional but important vars
  const importantOptional = [
    "OPENWEATHER_API_KEY",
    "CLOUDFLARE_AI_ACCOUNT_ID",
    "CLOUDFLARE_AI_API_TOKEN",
    "CORS_ORIGINS",
    "SENTRY_AUTH_TOKEN",
  ];

  for (const key of importantOptional) {
    if (!process.env[key]) {
      warnings.push(`Optional env var not set: ${key} — some features may use simulated data`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Run validation on module load
const result = validate();

if (!result.valid) {
  console.error("\n╔══════════════════════════════════════════════════╗");
  console.error("║        ⚠️  ENVIRONMENT VALIDATION FAILED  ⚠️     ║");
  console.error("╠══════════════════════════════════════════════════╣");
  for (const error of result.errors) {
    console.error("║  " + error.split("\n").join("\n║  "));
  }
  console.error("╚══════════════════════════════════════════════════╝\n");
  // In production, fail hard. In development, warn and continue.
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

if (result.warnings.length > 0 && process.env.NODE_ENV !== "test") {
  console.warn("\n⚡ Environment warnings:");
  for (const warning of result.warnings) {
    console.warn(`  → ${warning}`);
  }
  console.warn("");
}

export { result as envValidation };
