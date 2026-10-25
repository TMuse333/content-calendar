"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, Loader2, X } from "lucide-react";
import { describeOpens } from "@/lib/share/opens";
import { QUESTION_SETS, isQuestionSetId, type QuestionSetId } from "@/lib/questions/sets";

export interface ShareablePost {
  id: string;
  title: string;
  status: string;
  slides: number;
}

interface LinkRow {
  code: string;
  url: string;
  postIds: string[];
  questionSet: string | null;
  createdAt: string;
  expiresAt: string;
  revoked?: boolean;
  openCount?: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
}

interface ReactionRow {
  code: string;
  postId: string;
  reaction: string;
  comment?: string;
  createdAt: string;
}

interface AnswerSubmission {
  id: string;
  setId?: string;
  answers: Record<string, string>;
  createdAt: string;
}

/** Map a stored answer id back to its question prompt. */
function promptFor(setId: string | undefined, questionId: string): string {
  const set = isQuestionSetId(setId) ? QUESTION_SETS[setId] : QUESTION_SETS.content;
  return set.questions.find((q) => q.id === questionId)?.prompt ?? questionId;
}

export function SharePanel({
  accountId,
  posts,
  onClose,
}: {
  accountId: string;
  posts: ShareablePost[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(
    posts.filter((p) => p.slides > 0 && p.status !== "Idea").map((p) => p.id)
  );
  const [questionSet, setQuestionSet] = useState<"" | QuestionSetId>("content");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [answerSubmissions, setAnswerSubmissions] = useState<AnswerSubmission[]>([]);
  const [openAnswers, setOpenAnswers] = useState<string | null>(null);

  const loadLinks = () => {
    fetch(`/api/accounts/${accountId}/share-links`)
      .then((r) => r.json())
      .then((j) => {
        setLinks(j.links ?? []);
        setReactions(j.reactions ?? []);
      })
      .catch(() => {});
    fetch(`/api/accounts/${accountId}/answers`)
      .then((r) => r.json())
      .then((j) => setAnswerSubmissions(j.submissions ?? []))
      .catch(() => {});
  };

  const titleOf = (postId: string) => posts.find((p) => p.id === postId)?.title ?? "Post";

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const r = await fetch(`/api/accounts/${accountId}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: selected, questionSet: questionSet || null, message }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setCreated(j.url);
      loadLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* user can long-press the link instead */
    }
  };

  const revoke = async (code: string) => {
    await fetch(`/api/accounts/${accountId}/share-links?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    loadLinks();
  };

  /**
   * Repoint a live link at a different question set. Same code, so the client
   * keeps the URL they already have along with their approvals and their
   * place in the wizard.
   */
  const changeSet = async (code: string, next: string) => {
    setError(null);
    try {
      const r = await fetch(`/api/accounts/${accountId}/share-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, questionSet: next || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not change the questions");
      loadLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the questions");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <button aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Share with client</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Link ready. Send it by text or email:</p>
            <div className="flex gap-2">
              <input readOnly value={created} className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white" onFocus={(e) => e.target.select()} />
              <button onClick={() => copy(created)} className="px-3 rounded-lg bg-blue-500 text-white flex items-center gap-1 text-sm">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <a href={`${created}?preview=1`} target="_blank" rel="noreferrer" className="inline-block text-sm text-blue-400">
              Preview what they&apos;ll see →
            </a>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Posts to include</p>
              {posts.length === 0 ? (
                <p className="text-xs text-slate-500">No posts in progress.</p>
              ) : (
                <div className="space-y-1">
                  {posts.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="w-4 h-4" />
                      <span className="flex-1 text-sm text-white">{p.title}</span>
                      <span className="text-xs text-slate-500">
                        {p.status}
                        {p.slides ? ` · ${p.slides}` : " · no slides"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Questions</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(
                  [
                    ["", "None"],
                    ["content", "Content"],
                    ["strategy", "Strategy"],
                    ["clients", "Client wins"],
                    ["carousels", "Carousel Qs"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setQuestionSet(v)}
                    className={`py-2 rounded-lg border ${
                      questionSet === v ? "border-blue-500 bg-blue-500/10 text-white" : "border-slate-800 text-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Note (optional)</p>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Two carousels for next week, plus a few questions."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-white"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={create}
              disabled={creating || (selected.length === 0 && !questionSet)}
              className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 font-semibold text-white flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create link
            </button>
          </>
        )}

        {reactions.length > 0 && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Client feedback</p>
            <div className="space-y-1.5">
              {reactions.slice(0, 12).map((r, i) => (
                <div key={`${r.code}-${r.postId}-${i}`} className="text-xs flex gap-2">
                  <span>{r.reaction === "looks-good" ? "👍" : "✏️"}</span>
                  <span className="flex-1">
                    <span className="text-white">{titleOf(r.postId)}</span>
                    {r.comment && <span className="text-slate-300"> — “{r.comment}”</span>}
                    <span className="text-slate-500"> · {new Date(r.createdAt).toLocaleString()}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {answerSubmissions.length > 0 && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Client answers</p>
            <div className="space-y-2">
              {answerSubmissions.slice(0, 8).map((s) => {
                const setId = isQuestionSetId(s.setId) ? s.setId : "content";
                const isOpen = openAnswers === s.id;
                const count = Object.keys(s.answers ?? {}).length;
                return (
                  <div key={s.id} className="text-xs">
                    <button
                      onClick={() => setOpenAnswers(isOpen ? null : s.id)}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className="text-white">{QUESTION_SETS[setId].label}</span>
                      <span className="text-slate-500 flex-1">
                        {count} answers · {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-blue-400">{isOpen ? "Hide" : "View"}</span>
                    </button>
                    {isOpen && (
                      <div className="mt-2 space-y-2 pl-2 border-l border-slate-800">
                        {Object.entries(s.answers ?? {}).map(([qid, answer]) => (
                          <div key={qid}>
                            <p className="text-slate-500">{promptFor(s.setId, qid)}</p>
                            <p className="text-slate-200 whitespace-pre-wrap">{answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Recent links</p>
            <div className="space-y-2">
              {links.slice(0, 5).map((l) => {
                const expired = new Date(l.expiresAt).getTime() < Date.now();
                const opens = describeOpens(l);
                return (
                  <div key={l.code} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-slate-400">
                        {new Date(l.createdAt).toLocaleDateString()} · {l.postIds.length} posts
                        {l.revoked ? " · revoked" : expired ? " · expired" : ""}
                      </span>
                      {!l.revoked && !expired && (
                        <>
                          <a href={`${l.url}?preview=1`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">Preview</a>
                          <button onClick={() => copy(l.url)} className="text-blue-400">Copy</button>
                          <button onClick={() => revoke(l.code)} className="text-slate-500 hover:text-red-400">Revoke</button>
                        </>
                      )}
                    </div>
                    {!l.revoked && !expired && (
                      <label className="mt-1 flex items-center gap-1.5 text-slate-500">
                        Asks
                        <select
                          value={l.questionSet ?? ""}
                          onChange={(e) => changeSet(l.code, e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300"
                        >
                          <option value="">no questions</option>
                          {Object.values(QUESTION_SETS).map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <span className="text-slate-600">· same link</span>
                      </label>
                    )}
                    <p className={`mt-0.5 flex items-center gap-1 ${opens.opened ? "text-emerald-400" : "text-slate-600"}`}>
                      <Eye className="w-3 h-3" /> {opens.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
