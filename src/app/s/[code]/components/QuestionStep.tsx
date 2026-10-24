import { Mic } from "lucide-react";

/** One question per screen; typing saves to the shared draft as you go. */
export function QuestionStep({
  prompt,
  hint,
  index,
  total,
  setLabel,
  value,
  onChange,
  onNext,
  isLast,
  submitting,
}: {
  prompt: string;
  hint?: string;
  index: number;
  total: number;
  setLabel: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  isLast: boolean;
  submitting: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">
        {setLabel} · {index + 1} of {total}
      </p>
      <h2 className="text-lg font-semibold leading-snug">{prompt}</h2>
      {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}

      <textarea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or talk…"
        autoFocus
        className="mt-4 w-full rounded-lg bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none p-3 text-base"
      />

      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <Mic className="w-3.5 h-3.5 text-blue-400" />
        Faster: tap the 🎤 on your phone&apos;s keyboard and just talk.
      </p>

      <div className="mt-4 flex gap-2">
        {!value.trim() && (
          <button onClick={onNext} disabled={submitting} className="px-5 py-3 rounded-lg bg-slate-800 text-slate-300 font-semibold">
            Skip
          </button>
        )}
        <button
          onClick={onNext}
          disabled={submitting}
          className="flex-1 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 font-semibold"
        >
          {submitting ? "Sending…" : isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </div>
  );
}
