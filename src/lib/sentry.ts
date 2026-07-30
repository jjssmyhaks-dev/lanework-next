import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      // Set tracesSampleRate to 1.0 to capture 100%
      // Reduce in production by sampling (0.1 = 10%)
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // Disable in development
      enabled: process.env.NODE_ENV === "production",
      // Capture unhandled promise rejections
      attachStacktrace: true,
      // Don't send PII by default
      sendDefaultPii: false,
      // Alert rules are configured in Sentry dashboard:
      // Project Settings → Alerts → Create Alert Rule
      // Recommended: # of errors > 5 per 5 minutes → notify
    });
  }
}

// Inline error boundary for client components
// Use: wrap with <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("[Sentry dev]", error, context);
  }
};
