/**
 * Canonical public base URL for every CLIENT-facing link (share links, recap
 * links, report links). Never derive these from req.nextUrl.origin: on
 * *.vercel.app hosts that bakes an SSO-walled URL into an email the client
 * can't open.
 */
export function publicBaseUrl(): string {
  return (process.env.STRATEGY_PUBLIC_URL || "https://strategy.syntellic.ai").replace(/\/$/, "");
}
