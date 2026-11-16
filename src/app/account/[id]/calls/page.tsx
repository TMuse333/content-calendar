"use client";

/**
 * Calls tab — drop a story-call transcript, watch the LLM map it to the
 * situation tree, see the result, and view the live Miro board.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Phone, Upload, ExternalLink, CheckCircle2 } from "lucide-react";

const SECRET_KEY = "publish-secret";

interface CallRow {
  id: string;
  url: string;
  title: string;
  date?: string;
  nodeIds: string[];
}

interface NodeVerdict {
  nodeId: string;
  nodeName: string;
  verdict: "hit" | "grazed" | "silent";
  evidence?: string;
}

interface CallAnalysis {
  summary: string;
  coverage: NodeVerdict[];
  newStories: { title: string; summary: string }[];
  factsConfirmed: string[];
  stillOpen: string[];
}

/** Per-account Miro board (config catches up later — account field planned). */
const MIRO_BOARDS: Record<string, string> = {
  "greg-caseley": "uXjVERN-9qM=",
};

function getSecret(): string | null {
  let secret = "";
  try {
    secret = localStorage.getItem(SECRET_KEY) ?? "";
  } catch {
    /* fall through */
  }
  if (!secret) {
    secret = window.prompt("Admin code (PUBLISH_SECRET):")?.trim() ?? "";
    if (!secret) return null;
    try {
      localStorage.setItem(SECRET_KEY, secret);
    } catch {
      /* ignore */
    }
  }
  return secret;
}

export default function CallsPage() {
  const params = useParams<{ id: string }>();
  const accountId = params.id;

  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{ analysis: CallAnalysis; notion: { url: string } | null } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/calls`)
      .then((r) => r.json())
      .then((d) => setCalls(d.data ?? []))
      .catch(() => setCalls([]));
  }, [accountId]);

  const readFile = useCallback((file: File) => {
    if (!/\.(txt|vtt|srt|md)$/i.test(file.name)) {
      setError("Drop a .txt transcript file");
      return;
    }
    file.text().then((text) => {
      setTranscript(text);
      setFileName(file.name);
      setError("");
      setStatus("idle");
      setResult(null);
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const runAnalysis = useCallback(async () => {
    if (!transcript) return;
    const secret = getSecret();
    if (!secret) return;
    setStatus("analyzing");
    setError("");
    try {
      const res = await fetch(`/api/accounts/${accountId}/calls/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publish-secret": secret },
        body: JSON.stringify({ transcript, title: fileName ? `Story call — ${fileName}` : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem(SECRET_KEY);
          } catch {
            /* ignore */
          }
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
      setStatus("done");
      // refresh the calls list — the new row should appear
      fetch(`/api/accounts/${accountId}/calls`)
        .then((r) => r.json())
        .then((d) => setCalls(d.data ?? []))
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStatus("error");
    }
  }, [accountId, transcript, fileName]);

  const board = MIRO_BOARDS[accountId];
  const hit = result?.analysis.coverage.filter((c) => c.verdict === "hit") ?? [];
  const grazed = result?.analysis.coverage.filter((c) => c.verdict === "grazed") ?? [];
  const silent = result?.analysis.coverage.filter((c) => c.verdict === "silent") ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Phone className="w-6 h-6" /> Story calls
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Drop a transcript — it gets mapped against the situation tree and saved to Notion.
        </p>
      </div>

      {/* Calls list */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Past calls</h2>
        {calls === null ? (
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : calls.length === 0 ? (
          <div className="text-sm text-gray-400">No calls yet.</div>
        ) : (
          <ul className="divide-y border rounded-lg bg-white">
            {calls.map((c) => (
              <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-gray-500">
                    {c.date ?? "undated"} · {c.nodeIds.length} nodes touched
                  </div>
                </div>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Analyze */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Analyze a new transcript</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"
          }`}
        >
          <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
          {fileName ? (
            <div className="text-sm">
              <span className="font-medium">{fileName}</span>{" "}
              <span className="text-gray-500">({Math.round(transcript.length / 1000)}k chars) — ready</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Drag a .txt transcript here, or click to pick one</div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.vtt,.srt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
            }}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={runAnalysis}
            disabled={!transcript || status === "analyzing"}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-40 flex items-center gap-2"
          >
            {status === "analyzing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing — ~30–60s…
              </>
            ) : (
              "Run analysis"
            )}
          </button>
          {status === "done" && (
            <span className="text-sm text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved to Notion
              {result?.notion?.url && (
                <a href={result.notion.url} target="_blank" rel="noreferrer" className="underline ml-1">
                  view row
                </a>
              )}
            </span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      {/* Result */}
      {result && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Result</h2>
          <p className="text-sm bg-white border rounded-lg p-4">{result.analysis.summary}</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-800 mb-2">HIT ({hit.length})</div>
              <ul className="space-y-2 text-sm">
                {hit.map((c) => (
                  <li key={c.nodeId}>
                    <span className="font-medium">{c.nodeName}</span>
                    {c.evidence && <div className="text-xs text-blue-700 mt-0.5">&ldquo;{c.evidence}&rdquo;</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <div className="text-xs font-semibold text-amber-800 mb-2">TOUCHED ({grazed.length})</div>
              <ul className="space-y-1 text-sm">
                {grazed.map((c) => (
                  <li key={c.nodeId}>{c.nodeName}</li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">SILENT ({silent.length})</div>
              <div className="text-sm text-gray-500">{silent.map((c) => c.nodeName).join(" · ")}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">New story candidates</div>
              <ul className="space-y-2 text-sm">
                {result.analysis.newStories.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.title}</span>
                    <div className="text-xs text-gray-500">{s.summary}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Facts confirmed</div>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                {result.analysis.factsConfirmed.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Still open — next call&rsquo;s agenda</div>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                {result.analysis.stillOpen.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Miro board */}
      {board && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            The board (live Miro)
          </h2>
          <div className="border rounded-xl overflow-hidden bg-white">
            <iframe
              src={`https://miro.com/app/live-embed/${board}/?embedMode=view_only_without_ui`}
              width="100%"
              height="600"
              frameBorder="0"
              allowFullScreen
              title="Waterline board"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            View-only. Coverage badges update when the board is repainted (manual until Miro sync phase b).
          </p>
        </section>
      )}
    </div>
  );
}
