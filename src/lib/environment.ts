/**
 * Detect the current runtime environment based on hostname.
 * Used by maintenance & audit panels so the owner can avoid wrong-publish.
 */
export type AppEnvironment = "production" | "staging" | "development";

export function detectEnvironment(): AppEnvironment {
  if (typeof window === "undefined") return "production";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return "development";
  }
  if (
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--")
  ) {
    return "staging";
  }
  return "production";
}

export function environmentLabel(env: AppEnvironment): string {
  if (env === "production") return "Production";
  if (env === "staging") return "Staging";
  return "Development";
}

export function environmentBadgeClass(env: AppEnvironment): string {
  if (env === "production") return "bg-green-500/15 text-green-600 border-green-500/30";
  if (env === "staging") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  return "bg-blue-500/15 text-blue-600 border-blue-500/30";
}