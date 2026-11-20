/**
 * Internal recap preview — the operator's view of a call's client recap. Prefers
 * the stored (edited) copy so what you see here matches what the client will get;
 * falls back to building it live if no draft has been generated yet.
 */
import { buildRecap } from "@/lib/calls/recap";
import { getRecap, effectiveRecap } from "@/lib/mongodb/recaps";
import RecapView from "../../RecapView";

export const dynamic = "force-dynamic";

const NOTICE: Record<string, string> = {
  "no-account": "We couldn't find this account.",
  "no-config": "This account isn't connected to Notion yet.",
  "not-analyzed":
    "This call hasn't been analyzed yet. Open it in the Tree (call view) and run the analysis first, then come back here.",
};

function Notice({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#0b0b0d", color: "#b4b2ba", minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <p style={{ maxWidth: 520, textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>{msg}</p>
    </div>
  );
}

export default async function RecapPage({ params }: { params: Promise<{ id: string; callId: string }> }) {
  const { id, callId } = await params;

  // prefer the stored (edited) draft so the preview matches what's sent
  const stored = await getRecap(id, callId);
  if (stored) return <RecapView data={effectiveRecap(stored)} />;

  const result = await buildRecap(id, callId);
  if (!result.ok) return <Notice msg={NOTICE[result.reason]} />;
  return <RecapView data={result.data} />;
}
