/**
 * Which Graph host an Instagram connection talks to.
 *  - "facebook": connected via Facebook Login (Page-linked IG business account)
 *  - "instagram": connected via Business Login for Instagram (no Facebook Page needed)
 * Stored as platforms.instagram.apiHost; missing means "facebook" (older connections).
 */
export type IgApiHost = "facebook" | "instagram";

export function graphHost(apiHost?: string | null): string {
  return apiHost === "instagram" ? "https://graph.instagram.com" : "https://graph.facebook.com";
}
