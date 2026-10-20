/**
 * Strip secrets from account documents before they leave the server.
 *
 * Account docs in Mongo hold Instagram/Facebook access tokens and the review
 * portal token. API routes that return account data must pass it through
 * toPublicAccount() so none of that reaches the browser (or anyone calling
 * the API directly).
 *
 * Rule: any key whose name looks like a credential is removed at any depth.
 */

const SECRET_KEY = /(token|secret|password|apikey|api_key|credential)/i;

// Keys that match the pattern but are safe metadata to keep.
const ALLOWED = new Set(["tokenCreatedAt", "tokenExpiresAt", "hasToken"]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  // Mongo ObjectId and similar: keep their string form
  if (typeof (value as { toHexString?: unknown }).toHexString === "function") {
    return (value as { toHexString: () => string }).toHexString();
  }

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key) && !ALLOWED.has(key)) continue;
    out[key] = strip(v);
  }
  return out;
}

export function toPublicAccount<T>(account: T): T {
  if (!account) return account;
  const clean = strip(account) as Record<string, unknown>;

  // Let the UI know a review link exists without exposing it.
  const original = account as unknown as { reviewPortal?: { token?: string } };
  if (original.reviewPortal && clean.reviewPortal && typeof clean.reviewPortal === "object") {
    (clean.reviewPortal as Record<string, unknown>).hasToken = Boolean(original.reviewPortal.token);
  }
  return clean as T;
}

export function toPublicAccounts<T>(accounts: T[]): T[] {
  return accounts.map(toPublicAccount);
}
