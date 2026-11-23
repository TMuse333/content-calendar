/**
 * Recap lifecycle actions for one call.
 *
 *   GET                         → the recap doc (for the editor)
 *   POST { action: "edits",  edits }  → save operator overrides
 *   POST { action: "approve" }        → draft → approved (public link goes live)
 *   POST { action: "send", to }       → email the client (requires approved)
 *
 * The send action is the only outbound step; it runs solely from the operator's
 * explicit click and requires an approved recap + a recipient.
 */
import { NextRequest, NextResponse } from "next/server";
import { getRecap, saveEdits, approveRecap, markSent, effectiveRecap } from "@/lib/mongodb/recaps";
import { sendRecapEmail } from "@/lib/email/recap-email";
import { sendNotification } from "@/lib/notify";
import { publicBaseUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; callId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id, callId } = await params;
  const doc = await getRecap(id, callId);
  if (!doc) return NextResponse.json({ error: "No recap for this call yet" }, { status: 404 });
  return NextResponse.json({
    status: doc.status,
    token: doc.token,
    sentTo: doc.sentTo ?? null,
    data: effectiveRecap(doc),
    raw: doc.data,
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id, callId } = await params;
  const body = (await req.json()) as { action?: string; edits?: Record<string, unknown>; to?: string };

  const doc = await getRecap(id, callId);
  if (!doc) return NextResponse.json({ error: "No recap for this call yet" }, { status: 404 });

  try {
    if (body.action === "edits") {
      await saveEdits(id, callId, body.edits ?? {});
      return NextResponse.json({ ok: true });
    }

    if (body.action === "approve") {
      await approveRecap(id, callId);
      return NextResponse.json({ ok: true, status: "approved" });
    }

    if (body.action === "send") {
      if (doc.status === "draft") {
        return NextResponse.json({ error: "Approve the recap before sending." }, { status: 400 });
      }
      const to = (body.to ?? "").trim();
      if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
        return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
      }
      const data = effectiveRecap(doc);
      // Client links always on the custom domain — *.vercel.app is SSO-walled.
      const link = `${publicBaseUrl()}/r/${doc.token}`;
      const recapEvent = {
        accountId: id,
        event: "recap.sent",
        data: { to, clientName: data.client, callTitle: data.callTitle, link },
        lineage: { callId },
      };

      if (["1", "true"].includes(process.env.RECAP_VIA_NOTIFY ?? "")) {
        // Delivery through notify's verified sender; notify renders the
        // client email itself. Hard-fail (don't markSent) if it didn't send.
        const res = await sendNotification({
          ...recapEvent,
          visibility: "client",
          to: { email: to },
          channels: ["email"],
        });
        if (!res.ok || res.status !== "sent") {
          return NextResponse.json(
            { error: `notify delivery failed: ${res.error ?? res.status ?? "unknown"}` },
            { status: 502 }
          );
        }
      } else {
        const sent = await sendRecapEmail({ to, clientName: data.client, callTitle: data.callTitle, link });
        if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });
        // Direct path: still emit recap.sent, but forced internal — the client
        // already got the Resend email; notify must not send a second one.
        await sendNotification({ ...recapEvent, visibility: "internal" });
      }
      await markSent(id, callId, to);
      return NextResponse.json({ ok: true, status: "sent", to });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api:recaps]", e);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
