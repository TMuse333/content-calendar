/**
 * THE THIN CLIENT — copy this single file into any app (or publish as
 * @syntellic/notify-client later). Mirrors the greg-caseley intel.ts pattern.
 *
 * FIRE-AND-FORGET BY CONTRACT: this function NEVER throws and NEVER blocks
 * the caller's critical path for long — a notify outage must not fail the
 * request that triggered the event. (website-agent's notifyListingUpdate
 * already enforces this locally; the gateway keeps the same promise.)
 *
 * App env:
 *   NOTIFY_URL      e.g. http://localhost:3010 (later https://notify.syntellic.ai)
 *   NOTIFY_APP_KEY  this app's bearer key (matches notify's NOTIFY_APP_KEYS)
 */

export interface NotifyParams {
  accountId: string;
  event: string;
  data: Record<string, unknown>;
  visibility?: "internal" | "client";
  to?: { email?: string; phone?: string; userId?: string };
  channels?: Array<"email" | "slack">;
  lineage?: { callId?: string; projectId?: string; token?: string };
  idempotencyKey?: string;
}

export interface NotifyResult {
  ok: boolean;
  notificationId?: string;
  status?: "sent" | "skipped" | "failed";
  error?: string;
}

export async function sendNotification(params: NotifyParams): Promise<NotifyResult> {
  const base = process.env.NOTIFY_URL;
  if (!base) {
    console.warn("[notify-client] NOTIFY_URL unset — event dropped:", params.event);
    return { ok: false, error: "NOTIFY_URL unset" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base.replace(/\/$/, "")}/api/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.NOTIFY_APP_KEY ? { authorization: `Bearer ${process.env.NOTIFY_APP_KEY}` } : {}),
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const json = (await res.json().catch(() => ({}))) as Partial<NotifyResult> & { error?: string };
    if (!res.ok && res.status !== 502) {
      console.warn(`[notify-client] ${res.status} for ${params.event}:`, json.error);
      return { ok: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, notificationId: json.notificationId, status: json.status };
  } catch (err) {
    console.warn("[notify-client] send failed (non-fatal):", params.event, err instanceof Error ? err.message : err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
