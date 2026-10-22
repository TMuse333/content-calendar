/**
 * Business Login for Instagram (Instagram API with Instagram Login).
 * Docs: developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
 */
export const IG_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_content_publish",
];

export function igLoginRedirectUri(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/api/auth/instagram-login/callback`;
}

export function buildIgAuthorizeUrl(opts: { appId: string; redirectUri: string; state: string }) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", opts.appId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_LOGIN_SCOPES.join(","));
  u.searchParams.set("state", opts.state);
  return u.toString();
}

type FetchLike = (url: string, init?: RequestInit) => Promise<{ json: () => Promise<unknown> }>;

export interface IgLoginResult {
  accessToken: string; // long-lived (~60 days)
  expiresIn: number; // seconds
  userId: string; // Instagram professional account id (use for Graph calls)
  username: string;
  accountType?: string;
}

/** code → short-lived → long-lived token → profile. Throws with a readable message. */
export async function exchangeIgLoginCode(
  opts: { appId: string; appSecret: string; redirectUri: string; code: string },
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<IgLoginResult> {
  // Instagram appends "#_" to the code in some redirects.
  const code = opts.code.replace(/#_$/, "");

  const form = new URLSearchParams({
    client_id: opts.appId,
    client_secret: opts.appSecret,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    code,
  });
  const short = (await (
    await fetchImpl("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
  ).json()) as { access_token?: string; error_message?: string; error?: { message?: string } };
  if (!short.access_token) {
    throw new Error(`Instagram token exchange failed: ${short.error_message || short.error?.message || "no token"}`);
  }

  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", opts.appSecret);
  longUrl.searchParams.set("access_token", short.access_token);
  const long = (await (await fetchImpl(longUrl.toString())).json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!long.access_token) {
    throw new Error(`Instagram long-lived token failed: ${long.error?.message || "no token"}`);
  }

  const meUrl = new URL("https://graph.instagram.com/v21.0/me");
  meUrl.searchParams.set("fields", "user_id,username,account_type");
  meUrl.searchParams.set("access_token", long.access_token);
  const me = (await (await fetchImpl(meUrl.toString())).json()) as {
    user_id?: string | number;
    id?: string;
    username?: string;
    account_type?: string;
    error?: { message?: string };
  };
  if (me.error || !(me.user_id || me.id)) {
    throw new Error(`Instagram profile failed: ${me.error?.message || "no user id"}`);
  }

  return {
    accessToken: long.access_token,
    expiresIn: long.expires_in || 5184000,
    userId: String(me.user_id ?? me.id),
    username: me.username || "",
    accountType: me.account_type,
  };
}

/** Refresh a long-lived Instagram Login token (must be ≥24h old and unexpired). */
export async function refreshIgLoginToken(
  accessToken: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<{ accessToken: string; expiresIn: number }> {
  const u = new URL("https://graph.instagram.com/refresh_access_token");
  u.searchParams.set("grant_type", "ig_refresh_token");
  u.searchParams.set("access_token", accessToken);
  const r = (await (await fetchImpl(u.toString())).json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!r.access_token) throw new Error(`Instagram refresh failed: ${r.error?.message || "no token"}`);
  return { accessToken: r.access_token, expiresIn: r.expires_in || 5184000 };
}
