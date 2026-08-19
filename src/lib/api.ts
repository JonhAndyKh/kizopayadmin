/**
 * Configurable API origin for the standalone admin app.
 *
 * - Development on Replit: leave VITE_API_ORIGIN unset — relative "/api/..."
 *   requests are routed to the shared API server by the workspace proxy.
 * - Production (separately deployed admin site): set VITE_API_ORIGIN to the
 *   API server origin, e.g. "https://api.example.com". No trailing slash needed.
 */
const configuredOrigin = (import.meta.env.VITE_API_ORIGIN ?? "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${configuredOrigin}${path}`;
}
