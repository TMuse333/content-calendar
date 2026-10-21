"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Mic } from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  hint?: string;
}

const DRAFT_KEY = (id: string) => `answers-draft:${id}`;

export default function QuestionsPage() {
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${id}/answers`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Not found");
        setName(j.accountName ?? "");
        setQuestions(j.questions ?? []);
      })
      .catch(() => setError("This link isn't working. Please let Thomas know."))
      .finally(() => setLoading(false));
    try {
      const saved = localStorage.getItem(DRAFT_KEY(id));
      if (saved) setAnswers(JSON.parse(saved));
    } catch {
      /* drafts are optional */
    }
  }, [id]);

  const update = (qid: string, value: string) => {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    try {
      localStorage.setItem(DRAFT_KEY(id), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const answered = questions.filter((q) => answers[q.id]?.trim()).length;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/accounts/${id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setDone(true);
      try {
        localStorage.removeItem(DRAFT_KEY(id));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Thanks{name ? `, ${name.split(" ")[0]}` : ""}!</h1>
          <p className="text-slate-400">
            Got it. I&apos;ll turn these into posts and you&apos;ll see them in your review link to approve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 pb-32">
        <p className="text-xs tracking-widest text-blue-400 uppercase mb-3">Syntellic · Your content</p>
        <h1 className="text-2xl font-bold leading-tight mb-2">
          A few questions{name ? `, ${name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-400 mb-4">
          Your answers make the posts sound like you, not generic. Short answers are fine, and skip any you want.
        </p>
        <div className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-3 mb-8">
          <Mic className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <span>Faster: tap the 🎤 on your phone&apos;s keyboard and just talk.</span>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id}>
              <label htmlFor={q.id} className="block font-medium mb-1">
                <span className="text-slate-500 mr-1">{i + 1}.</span> {q.prompt}
              </label>
              {q.hint && <p className="text-xs text-slate-500 mb-2">{q.hint}</p>}
              <textarea
                id={q.id}
                rows={4}
                value={answers[q.id] ?? ""}
                onChange={(e) => update(q.id, e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none p-3 text-base text-white placeholder-slate-600"
                placeholder="Type or talk…"
              />
            </div>
          ))}
        </div>

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
      </div>

      {questions.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-800 p-4">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <span className="text-sm text-slate-400 flex-1">
              {answered}/{questions.length} answered
            </span>
            <button
              onClick={submit}
              disabled={submitting || answered === 0}
              className="px-5 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 font-semibold"
            >
              {submitting ? "Sending…" : "Send answers"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
