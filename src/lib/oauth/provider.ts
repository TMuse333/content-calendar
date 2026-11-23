/**
 * Minimal OAuth 2.1 authorization-server core for the MCP connector.
 *
 * Implements exactly what claude.ai's custom-connector client needs:
 *   - Dynamic Client Registration (RFC 7591): public clients, PKCE only
 *   - Authorization-code grant with PKCE S256 (no implicit, no secrets)
 *   - JWT access tokens (HS256, 1h) carrying scopes: "read" | "publish"
 *   - Rotating opaque refresh tokens (90d) in Mongo
 *
 * The human side is a single consent page guarded by MCP_LOGIN_PASSWORD —
 * this is a one-admin system; "login" = Thomas typing the passphrase once
 * per connector authorization. Secrets never appear in URLs.
 *
 * Env: OAUTH_SIGNING_SECRET (JWT HMAC key), MCP_LOGIN_PASSWORD.
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import clientPromise from "@/lib/mongodb/clientPromise";

const DB = "strategy";
export const ISSUER = "https://strategy.syntellic.ai";
export const SCOPES = ["read", "publish"] as const;
export type Scope = (typeof SCOPES)[number];

const ACCESS_TTL_S = 60 * 60; // 1h
const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90d
const CODE_TTL_MS = 10 * 60 * 1000; // 10min

async function col(name: string) {
  return (await clientPromise).db(DB).collection(name);
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function signingSecret(): string {
  const s = process.env.OAUTH_SIGNING_SECRET;
  if (!s || s.length < 32) throw new Error("OAUTH_SIGNING_SECRET missing/weak");
  return s;
}

export function checkLoginPassword(given: string): boolean {
  const expected = process.env.MCP_LOGIN_PASSWORD ?? "";
  if (expected.length < 8) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// ---- clients (DCR) ----

export interface OAuthClient {
  clientId: string;
  redirectUris: string[];
  name?: string;
  createdAt: Date;
}

export async function registerClient(input: { redirect_uris: string[]; client_name?: string }): Promise<OAuthClient> {
  const uris = (input.redirect_uris ?? []).filter((u) => /^https:\/\//.test(u));
  if (!uris.length) throw new Error("redirect_uris must contain at least one https URL");
  const client: OAuthClient = {
    clientId: `mcp_${b64u(randomBytes(18))}`,
    redirectUris: uris,
    name: input.client_name?.slice(0, 100),
    createdAt: new Date(),
  };
  await (await col("oauth_clients")).insertOne({ ...client });
  return client;
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  return (await col("oauth_clients")).findOne<OAuthClient>({ clientId });
}

// ---- authorization codes (PKCE) ----

export async function issueCode(data: {
  clientId: string;
  redirectUri: string;
  scope: Scope;
  codeChallenge: string;
}): Promise<string> {
  const code = b64u(randomBytes(32));
  await (await col("oauth_codes")).insertOne({ code, ...data, expiresAt: new Date(Date.now() + CODE_TTL_MS) });
  return code;
}

export async function redeemCode(code: string, clientId: string, redirectUri: string, codeVerifier: string) {
  const codes = await col("oauth_codes");
  const doc = await codes.findOneAndDelete({ code }); // single-use
  if (!doc) throw new Error("invalid_grant: unknown or reused code");
  if (doc.clientId !== clientId || doc.redirectUri !== redirectUri) throw new Error("invalid_grant: mismatch");
  if (doc.expiresAt < new Date()) throw new Error("invalid_grant: expired");
  const challenge = b64u(createHash("sha256").update(codeVerifier).digest());
  if (challenge !== doc.codeChallenge) throw new Error("invalid_grant: PKCE verification failed");
  return { scope: doc.scope as Scope };
}

// ---- tokens ----

export function signAccessToken(clientId: string, scope: Scope): { token: string; expiresIn: number } {
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(
    JSON.stringify({ iss: ISSUER, aud: `${ISSUER}/api/mcp`, sub: "thomas", client_id: clientId, scope, iat: now, exp: now + ACCESS_TTL_S })
  );
  const sig = createHmac("sha256", signingSecret()).update(`${header}.${payload}`).digest("base64url");
  return { token: `${header}.${payload}.${sig}`, expiresIn: ACCESS_TTL_S };
}

export function verifyAccessToken(token: string): { scope: Scope; clientId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = createHmac("sha256", signingSecret()).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (p.iss !== ISSUER || typeof p.exp !== "number" || p.exp * 1000 < Date.now()) return null;
    if (!SCOPES.includes(p.scope)) return null;
    return { scope: p.scope, clientId: p.client_id };
  } catch {
    return null;
  }
}

export async function issueRefreshToken(clientId: string, scope: Scope): Promise<string> {
  const token = `rt_${b64u(randomBytes(32))}`;
  await (await col("oauth_refresh")).insertOne({ token, clientId, scope, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) });
  return token;
}

/** Rotating: the presented refresh token is consumed and a new one issued. */
export async function redeemRefreshToken(token: string, clientId: string) {
  const doc = await (await col("oauth_refresh")).findOneAndDelete({ token, clientId });
  if (!doc || doc.expiresAt < new Date()) throw new Error("invalid_grant: refresh token invalid/expired");
  return { scope: doc.scope as Scope };
}
