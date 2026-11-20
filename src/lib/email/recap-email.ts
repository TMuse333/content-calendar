/**
 * Send a client recap by email via Resend's REST API (no SDK dependency).
 *
 * Env:
 *   RESEND_API_KEY   — required
 *   RECAP_FROM_EMAIL — e.g. "Waterline <hello@yourdomain.com>" (must be a Resend-
 *                      verified sender; defaults to Resend's sandbox address)
 *
 * This is only ever called from an explicit operator action (approve → send).
 */
interface SendRecapArgs {
  to: string;
  clientName: string;
  callTitle: string;
  link: string;
}

export async function sendRecapEmail(args: SendRecapArgs): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set — add it to .env.local." };
  const from = process.env.RECAP_FROM_EMAIL || "Waterline <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: `Your content plan — from our call`,
      html: emailHtml(args),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 240)}` };
  }
  return { ok: true };
}

function emailHtml({ clientName, callTitle, link }: SendRecapArgs): string {
  const first = clientName.split(" ")[0] || clientName;
  return `<div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif;background:#0b0b0d;color:#f5f3ef;padding:40px 24px">
  <div style="max-width:520px;margin:0 auto">
    <p style="font-size:15px;line-height:1.6;color:#b4b2ba">Hi ${esc(first)},</p>
    <p style="font-size:15px;line-height:1.6;color:#f5f3ef">
      Here are the takeaways from ${esc(callTitle)} — the situations we talked about and the video ideas that came out of it.
    </p>
    <p style="margin:28px 0">
      <a href="${esc(link)}" style="display:inline-block;background:#35d0e0;color:#0b0b0d;font-weight:600;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:9px">
        View your content plan
      </a>
    </p>
    <p style="font-size:12.5px;line-height:1.6;color:#817f89">Or paste this link into your browser:<br>${esc(link)}</p>
    <p style="font-size:13px;line-height:1.6;color:#b4b2ba;margin-top:28px">— Waterline</p>
  </div>
</div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
