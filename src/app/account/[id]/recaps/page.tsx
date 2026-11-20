/**
 * Recaps inbox — the operator's review queue. Every analyzed call shows up here
 * as a recap: draft (needs review) → approved → sent. Drafts auto-generate when a
 * debrief finishes; this page also back-fills any analyzed call that's missing one.
 */
import Link from "next/link";
import { listDebriefs } from "@/lib/mongodb/debriefs";
import { listRecaps, upsertDraft } from "@/lib/mongodb/recaps";
import { buildRecap } from "@/lib/calls/recap";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft · needs review", color: "#f59e0b", bg: "rgba(245,158,11,.1)" },
  approved: { label: "Approved", color: "#22d3ee", bg: "rgba(34,211,238,.1)" },
  sent: { label: "Sent", color: "#10b981", bg: "rgba(16,185,129,.1)" },
};

export default async function RecapsInbox({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // back-fill: any analyzed call without a recap gets a draft generated
  const [debriefs, existing] = await Promise.all([listDebriefs(id), listRecaps(id)]);
  const have = new Set(existing.map((r) => r.callId));
  const missing = debriefs.filter((d) => !have.has(d.callId));
  for (const m of missing) {
    const r = await buildRecap(id, m.callId);
    if (r.ok) await upsertDraft(id, m.callId, r.data);
  }
  const recaps = missing.length ? await listRecaps(id) : existing;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Recaps</h1>
        <p className="text-zinc-400 mb-6 text-sm">
          Client takeaways, one per analyzed call. Review and edit a draft, approve it, then send it to the client.
        </p>

        {recaps.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-500 text-sm">
            No recaps yet. Analyze a call in the <span className="text-zinc-300">Tree</span> (call view) and its recap
            will appear here.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {recaps.map((r) => {
              const s = STATUS[r.status];
              return (
                <Link
                  key={r.callId}
                  href={`/account/${id}/recaps/${r.callId}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-100 text-sm font-medium truncate">{r.data.callTitle}</div>
                    <div className="text-zinc-500 text-xs">
                      {r.data.callDate || "—"} · {r.data.videos.length} ideas
                      {r.sentTo ? ` · sent to ${r.sentTo}` : ""}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full flex-none"
                    style={{ color: s.color, background: s.bg }}
                  >
                    {s.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
