/**
 * Public client recap — the link emailed to the client. No app chrome, no auth.
 * Only resolves once the operator has approved it (draft stays private).
 */
import { getRecapByToken, effectiveRecap } from "@/lib/mongodb/recaps";
import RecapView from "../../recap/RecapView";

export const dynamic = "force-dynamic";

function Gone() {
  return (
    <div style={{ background: "#0b0b0d", color: "#b4b2ba", minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <p style={{ maxWidth: 420, textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>
        This recap isn&rsquo;t available.
      </p>
    </div>
  );
}

export default async function PublicRecapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await getRecapByToken(token);
  if (!doc || doc.status === "draft") return <Gone />;
  return <RecapView data={effectiveRecap(doc)} />;
}
