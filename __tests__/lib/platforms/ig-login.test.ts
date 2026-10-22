import { describe, it, expect, vi } from "vitest";
import { buildIgAuthorizeUrl, exchangeIgLoginCode, refreshIgLoginToken, igLoginRedirectUri, IG_LOGIN_SCOPES } from "@/lib/platforms/ig-login";
import { graphHost } from "@/lib/platforms/ig-graph";
import { fetchInstagramBaseline } from "@/lib/baseline/capture";

const res = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) });

describe("graphHost", () => {
  it("defaults to Facebook Graph, uses graph.instagram.com for Instagram Login", () => {
    expect(graphHost()).toBe("https://graph.facebook.com");
    expect(graphHost("facebook")).toBe("https://graph.facebook.com");
    expect(graphHost("instagram")).toBe("https://graph.instagram.com");
  });
});

describe("Instagram Login", () => {
  it("builds the authorize URL with business scopes and exact redirect", () => {
    const url = new URL(buildIgAuthorizeUrl({ appId: "704", redirectUri: igLoginRedirectUri("https://strategy.syntellic.ai/"), state: "abc" }));
    expect(url.origin + url.pathname).toBe("https://www.instagram.com/oauth/authorize");
    expect(url.searchParams.get("redirect_uri")).toBe("https://strategy.syntellic.ai/api/auth/instagram-login/callback");
    expect(url.searchParams.get("scope")).toBe(IG_LOGIN_SCOPES.join(","));
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("exchanges code → long-lived token → profile (strips #_ from code)", async () => {
    const fetchImpl = vi.fn()
      .mockImplementationOnce((url: string, init?: RequestInit) => {
        expect(url).toBe("https://api.instagram.com/oauth/access_token");
        expect(String(init?.body).endsWith("code=CODE123")).toBe(true);
        expect(String(init?.body)).not.toContain("%23_");
        return res({ access_token: "short", user_id: 1 });
      })
      .mockImplementationOnce((url: string) => {
        expect(url).toContain("graph.instagram.com/access_token");
        expect(url).toContain("grant_type=ig_exchange_token");
        return res({ access_token: "long", expires_in: 5000 });
      })
      .mockImplementationOnce((url: string) => {
        expect(url).toContain("graph.instagram.com/v21.0/me");
        return res({ user_id: "17841400000000001", username: "silver250", account_type: "BUSINESS" });
      });
    const r = await exchangeIgLoginCode({ appId: "a", appSecret: "s", redirectUri: "r", code: "CODE123#_" }, fetchImpl);
    expect(r).toEqual({ accessToken: "long", expiresIn: 5000, userId: "17841400000000001", username: "silver250", accountType: "BUSINESS" });
  });

  it("throws a readable error when Instagram rejects the code", async () => {
    const fetchImpl = vi.fn().mockReturnValue(res({ error_message: "Invalid platform app" }));
    await expect(exchangeIgLoginCode({ appId: "a", appSecret: "s", redirectUri: "r", code: "x" }, fetchImpl)).rejects.toThrow(/Invalid platform app/);
  });

  it("refreshes a long-lived token", async () => {
    const fetchImpl = vi.fn().mockReturnValue(res({ access_token: "new", expires_in: 100 }));
    expect(await refreshIgLoginToken("old", fetchImpl)).toEqual({ accessToken: "new", expiresIn: 100 });
    expect(fetchImpl.mock.calls[0][0]).toContain("grant_type=ig_refresh_token");
  });

  it("baseline uses graph.instagram.com for Instagram Login accounts", async () => {
    const urls: string[] = [];
    const fetchImpl = (url: string) => {
      urls.push(url);
      return url.includes("/insights")
        ? res({ data: [{ name: "reach", total_value: { value: 10 } }] })
        : res({ followers_count: 5, media_count: 2 });
    };
    const r = await fetchInstagramBaseline("tok", "123", fetchImpl, Date.now(), "instagram");
    expect(r.ok).toBe(true);
    expect(urls.every((u) => u.startsWith("https://graph.instagram.com/v21.0/123"))).toBe(true);
  });
});
