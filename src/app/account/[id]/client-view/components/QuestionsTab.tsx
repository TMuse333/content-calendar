import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, ChevronRight, Loader2, Mic } from "lucide-react";
import { QUESTION_SETS, type QuestionSetId } from "@/lib/questions/sets";

/**
 * Questions the client answers in their own time (content / strategy /
 * client wins). Answers go to /api/accounts/[id]/answers → Mongo +
 * the account's Answers database in Notion.
 */

interface Submission {
  id: string;
  setId?: QuestionSetId;
  answers: Record<string, string>;
  createdAt: string;
}

const SET_ORDER: QuestionSetId[] = ["carousels", "clients", "content", "strategy"];

export function QuestionsTab({ accountId }: { accountId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSet, setOpenSet] = useState<QuestionSetId | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/accounts/${accountId}/answers`);
      const j = await r.json();
      if (r.ok) setSubmissions(j.submissions ?? []);
    } catch {
      /* page still renders; sets just show as unanswered */
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  // Latest submission per set ("content" was the implicit default before setId existed)
  const latestFor = (setId: QuestionSetId): Submission | undefined =>
    submissions.find((s) => (s.setId ?? "content") === setId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Questions</h2>
      <p className="text-slate-400 mb-6">
        Your answers make the posts sound like you, not generic. Short answers are fine, and skip any you want.
      </p>

      <div className="space-y-4">
        {SET_ORDER.map((setId) => {
          const set = QUESTION_SETS[setId];
          const latest = latestFor(setId);
          return (
            <QuestionSetCard
              key={setId}
              accountId={accountId}
              setId={setId}
              label={set.label}
              intro={set.intro}
              questions={set.questions}
              latest={latest}
              open={openSet === setId}
              onToggle={() => setOpenSet(openSet === setId ? null : setId)}
              onSubmitted={() => {
                setOpenSet(null);
                load();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function QuestionSetCard({
  accountId,
  setId,
  label,
  intro,
  questions,
  latest,
  open,
  onToggle,
  onSubmitted,
}: {
  accountId: string;
  setId: QuestionSetId;
  label: string;
  intro: string;
  questions: { id: string; prompt: string; hint?: string }[];
  latest?: Submission;
  open: boolean;
  onToggle: () => void;
  onSubmitted: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(latest?.answers ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/accounts/${accountId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j?.error || "Couldn't save. Please try again.");
        return;
      }
      onSubmitted();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-5 text-left flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{label}</h3>
            {latest ? (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Answered{" "}
                {new Date(latest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                {questions.length} questions
              </span>
            )}
          </div>
          {!open && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{intro}</p>}
        </div>
        <ChevronRight
          className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-800">
          <p className="text-sm text-slate-400 mt-4 mb-5">{intro}</p>

          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div key={q.id}>
                <label className="block text-sm text-white mb-1">
                  <span className="text-slate-500 mr-1.5">{idx + 1}.</span>
                  {q.prompt}
                </label>
                {q.hint && <p className="text-xs text-slate-500 mb-1.5">{q.hint}</p>}
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Type here, or skip it"
                />
              </div>
            ))}
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500 mt-4">
            <Mic className="w-3.5 h-3.5" />
            Prefer talking? Send Thomas a voice note instead — these are just prompts.
          </p>

          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting || answeredCount === 0}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {latest ? "Update answers" : "Send answers"}
            {answeredCount > 0 && ` (${answeredCount}/${questions.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
