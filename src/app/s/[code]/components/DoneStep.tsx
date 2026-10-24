import { CheckCircle2 } from "lucide-react";
import { fmtDate, type ShareData } from "./types";

export function DoneStep({
  firstName,
  approved,
  changes,
  answered,
  totalQuestions,
  answersSent,
  answerError,
  comingUp,
  onReview,
}: {
  firstName: string;
  approved: number;
  changes: number;
  answered: number;
  totalQuestions: number;
  answersSent: boolean;
  answerError: string | null;
  comingUp: ShareData["comingUp"];
  onReview: () => void;
}) {
  const bits = [
    approved > 0 ? `${approved} approved` : null,
    changes > 0 ? `${changes} change request${changes === 1 ? "" : "s"}` : null,
    totalQuestions > 0 ? `${answered}/${totalQuestions} questions answered` : null,
  ].filter(Boolean);

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold">All done — thanks {firstName}!</h2>
      {bits.length > 0 && <p className="text-slate-400 mt-2">{bits.join(" · ")}</p>}
      <p className="text-slate-400 mt-2 text-sm">
        Thomas gets this right away. Anything you asked to change comes back for another look.
      </p>
      {answerError && (
        <p className="mt-3 text-sm text-red-400">
          Your answers didn&apos;t send: {answerError} — go back and hit Finish again.
        </p>
      )}
      {!answersSent && answered > 0 && !answerError && (
        <p className="mt-3 text-sm text-amber-400">Heads up: your answers haven&apos;t been sent yet.</p>
      )}

      <button onClick={onReview} className="mt-6 text-sm text-blue-400 hover:text-blue-300">
        ← Look through everything again
      </button>

      {comingUp && comingUp.length > 0 && (
        <div className="mt-10 text-left">
          <h3 className="text-lg font-bold mb-1">Coming up</h3>
          <p className="text-slate-400 text-sm mb-3">The rest of the plan — you&apos;ll get these in later links.</p>
          <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {comingUp.map((c, i) => (
              <li key={i} className="flex gap-3 p-3 text-sm">
                <span className="w-24 flex-shrink-0 text-slate-400">{fmtDate(c.date)}</span>
                <span className="flex-1 text-slate-200">{c.title}</span>
                {c.type && <span className="text-xs text-slate-500">{c.type}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
