"use client";

/**
 * Recap editor — review a draft, edit the copy, approve it, then send it to the
 * client. Left: editable fields (which ideas, their titles, the "we'll confirm"
 * list). Right: a live preview of exactly what the client will receive.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, Send, Save, ArrowLeft, ExternalLink } from "lucide-react";

interface Video {
  title: string;
  node: string;
  lens: string;
  format: string;
  edge: boolean;
  source: string;
}
interface RecapData {
  client: string;
  callTitle: string;
  callDate: string;
  videos: Video[];
  confirm: string[];
  [k: string]: unknown;
}
type Status = "draft" | "approved" | "sent";

export default function RecapEditor() {
  const { id, callId } = useParams<{ id: string; callId: string }>();
  const [status, setStatus] = useState<Status>("draft");
  const [token, setToken] = useState<string>("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [videos, setVideos] = useState<(Video & { include: boolean })[]>([]);
  const [confirm, setConfirm] = useState<string>("");
  const [client, setClient] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [previewV, setPreviewV] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${id}/recaps/${callId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Not found");
      const data: RecapData = d.data;
      setStatus(d.status);
      setToken(d.token);
      setSentTo(d.sentTo);
      setClient(data.client);
      setVideos(data.videos.map((v) => ({ ...v, include: true })));
      setConfirm((data.confirm ?? []).join("\n"));
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [id, callId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(`/api/accounts/${id}/recaps/${callId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      return d;
    } finally {
      setBusy(null);
    }
  };

  const saveEdits = async () => {
    const edits = {
      videos: videos.filter((v) => v.include).map(({ include: _i, ...v }) => v),
      confirm: confirm.split("\n").map((l) => l.trim()).filter(Boolean),
    };
    try {
      await act("edits", { edits });
      setPreviewV((v) => v + 1);
      setMsg({ kind: "ok", text: "Saved. Preview updated." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    }
  };

  const approve = async () => {
    try {
      await saveEdits();
      await act("approve");
      setStatus("approved");
      setMsg({ kind: "ok", text: "Approved — the client link is now live." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Approve failed" });
    }
  };

  const send = async () => {
    try {
      const d = await act("send", { to });
      setStatus("sent");
      setSentTo(d.to);
      setMsg({ kind: "ok", text: `Sent to ${d.to}.` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Send failed" });
    }
  };

  const publicLink = typeof window !== "undefined" && token ? `${window.location.origin}/r/${token}` : "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <Link href={`/account/${id}/recaps`} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Recaps
        </Link>
        <div className="flex-1">
          <div className="text-sm font-semibold">{client ? `${client}'s recap` : "Recap"}</div>
        </div>
        <StatusPill status={status} />
      </header>

      {loading ? (
        <div className="flex-1 grid place-items-center text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid lg:grid-cols-2 min-h-0">
          {/* edit panel */}
          <div className="overflow-y-auto border-r border-zinc-800 p-6 space-y-6">
            {msg && (
              <div className={`text-sm rounded-lg px-3 py-2 ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                {msg.text}
              </div>
            )}

            <section>
              <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-3">Ideas for videos</h2>
              <div className="space-y-2">
                {videos.map((v, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${v.include ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-900/40 opacity-60"}`}>
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={v.include}
                        onChange={(e) => setVideos((prev) => prev.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                        className="mt-1 accent-cyan-400"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
                          {v.edge && <span className="text-cyan-400">★ edge</span>}
                          <span>{v.format}</span>
                          <span>· {v.lens}</span>
                        </div>
                        <textarea
                          value={v.title}
                          rows={2}
                          onChange={(e) => setVideos((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                          className="w-full bg-transparent text-sm text-zinc-100 resize-none outline-none border-b border-transparent focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">We&rsquo;ll double-check (one per line)</h2>
              <textarea
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
              />
            </section>

            {/* actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
              <button onClick={saveEdits} disabled={!!busy} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50">
                {busy === "edits" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
              {status === "draft" && (
                <button onClick={approve} disabled={!!busy} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50">
                  {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                </button>
              )}
            </div>

            {/* send (only once approved) */}
            {status !== "draft" && (
              <section className="pt-2 border-t border-zinc-800 space-y-3">
                <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">Send to client</h2>
                {publicLink && (
                  <a href={publicLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> {publicLink}
                  </a>
                )}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="client@email.com"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-600"
                  />
                  <button onClick={send} disabled={!!busy || !to} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">
                    {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                  </button>
                </div>
                {sentTo && <p className="text-xs text-emerald-400">Last sent to {sentTo}.</p>}
              </section>
            )}
          </div>

          {/* live preview */}
          <div className="overflow-hidden bg-zinc-950">
            <iframe key={previewV} src={`/recap/${id}/${callId}?v=${previewV}`} className="w-full h-full border-0" title="Recap preview" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    draft: { label: "Draft", c: "#f59e0b", b: "rgba(245,158,11,.1)" },
    approved: { label: "Approved", c: "#22d3ee", b: "rgba(34,211,238,.1)" },
    sent: { label: "Sent", c: "#10b981", b: "rgba(16,185,129,.1)" },
  }[status];
  return (
    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ color: map.c, background: map.b }}>
      {map.label}
    </span>
  );
}
