"use client";

/**
 * Client share page (/s/<code>) — wizard flow:
 * intro → one post per screen (👍 / change saves immediately) →
 * one question per screen (drafts to localStorage) → done.
 * "See all at once" switches to the single-page list for people who
 * prefer scrolling. Reactions persist per-tap server-side; question
 * answers submit once at the end.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Mic } from "lucide-react";
import { PostStep } from "./components/PostStep";
import { QuestionStep } from "./components/QuestionStep";
import { DoneStep } from "./components/DoneStep";
import { fmtDate, type ShareData, type Reaction } from "./components/types";

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;

  const [data, setData] = useState<ShareData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"wizard" | "list">("wizard");
  const [step, setStep] = useState(0); // 0 = intro
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [answersSent, setAnswersSent] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const draftKey = `share-draft:${code}`;
  const reactionsKey = `share-reactions:${code}`;

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    fetch(`/api/share/${code}${preview ? "?preview=1" : ""}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setData(j);
      })
      .catch((e) => setLoadError(e.message || "This link isn't working."));
    try {
      const savedAnswers = localStorage.getItem(draftKey);
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
      const savedReactions = localStorage.getItem(reactionsKey);
      if (savedReactions) setReactions(JSON.parse(savedReactions));
    } catch {
      /* drafts are optional */
    }
  }, [code, draftKey, reactionsKey]);

  const posts = useMemo(() => data?.posts ?? [], [data]);
  const questions = useMemo(() => data?.questionSet?.questions ?? [], [data]);
  // Steps: 0 intro · 1..P posts · P+1..P+Q questions · P+Q+1 done
  const totalWork = posts.length + questions.length;
  const doneStep = totalWork + 1;

  const setAnswer = (id: string, v: string) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      /* optional */
    }
  };

  const recordReaction = (postId: string, reaction: Reaction) => {
    const next = { ...reactions, [postId]: reaction };
    setReactions(next);
    try {
      localStorage.setItem(reactionsKey, JSON.stringify(next));
    } catch {
      /* optional */
    }
  };

  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;

  const submitAnswers = async (): Promise<boolean> => {
    if (answeredCount === 0 || answersSent) return true;
    setSending(true);
    setAnswerError(null);
    try {
      const r = await fetch(`/api/share/${code}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setAnswersSent(true);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* optional */
      }
      return true;
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setSending(false);
    }
  };

  /** First step with nothing done yet (for "Continue"). */
  const firstUnfinished = () => {
    const unreacted = posts.findIndex((p) => !reactions[p.id]);
    if (unreacted !== -1) return unreacted + 1;
    if (questions.length > 0 && !answersSent) return posts.length + 1;
    return doneStep;
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-white mb-2">Link expired or invalid</h1>
          <p className="text-slate-400">Please ask Thomas for a new link.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const first = data.clientName.split(" ")[0];
  const hasProgress = Object.keys(reactions).length > 0 || answeredCount > 0;
  const parts = [
    posts.length ? `${posts.length} post${posts.length === 1 ? "" : "s"} to look at` : null,
    questions.length ? `${questions.length} quick questions` : null,
  ].filter(Boolean);

  // ---------------------------------------------------------------- list view
  if (view === "list") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-xl mx-auto px-4 py-8 pb-16 space-y-8">
          <header>
            <p className="text-xs tracking-widest text-blue-400 uppercase mb-3">Syntellic · For {first}</p>
            <h1 className="text-2xl font-bold leading-tight">Hi {first}, {parts.join(" + ")}</h1>
            {data.message && <p className="text-slate-300 mt-3 whitespace-pre-line">{data.message}</p>}
            <button onClick={() => setView("wizard")} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
              ← Back to step-by-step
            </button>
          </header>

          {posts.map((p, i) => (
            <PostStep
              key={p.id}
              post={p}
              code={code}
              index={i}
              total={posts.length}
              priorReaction={reactions[p.id]}
              onReacted={recordReaction}
              onNext={() => {}}
              showNext={false}
            />
          ))}

          {data.questionSet && (
            <section className="pt-2">
              <h2 className="text-xl font-bold mb-1">{data.questionSet.label}</h2>
              <p className="text-slate-400 mb-4">{data.questionSet.intro}</p>
              {answersSent ? (
                <p className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" /> Thanks, got your answers!
                </p>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-3 mb-6">
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
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          placeholder="Type or talk…"
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none p-3 text-base"
                        />
                      </div>
                    ))}
                  </div>
                  {answerError && <p className="mt-4 text-sm text-red-400">{answerError}</p>}
                  <div className="mt-6 flex items-center gap-3">
                    <span className="text-sm text-slate-400 flex-1">{answeredCount}/{questions.length} answered</span>
                    <button
                      onClick={submitAnswers}
                      disabled={sending || answeredCount === 0}
                      className="px-5 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 font-semibold"
                    >
                      {sending ? "Sending…" : "Send answers"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {data.comingUp && data.comingUp.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-1">Coming up</h2>
              <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
                {data.comingUp.map((c, i) => (
                  <li key={i} className="flex gap-3 p-3 text-sm">
                    <span className="w-24 flex-shrink-0 text-slate-400">{fmtDate(c.date)}</span>
                    <span className="flex-1 text-slate-200">{c.title}</span>
                    {c.type && <span className="text-xs text-slate-500">{c.type}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- wizard view
  const isIntro = step === 0;
  const isDone = step >= doneStep;
  const postIndex = step - 1; // valid when 0 <= postIndex < posts.length
  const questionIndex = step - 1 - posts.length; // valid when 0 <= .. < questions.length
  const progress = isIntro ? 0 : isDone ? totalWork : Math.min(step, totalWork);

  const advance = async () => {
    if (questionIndex === questions.length - 1) {
      // Finishing the last question submits any typed answers first.
      const ok = await submitAnswers();
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, doneStep));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-6 pb-16">
        {/* Top bar: back, progress, see-all */}
        {!isIntro && (
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                aria-label="Back"
                className="p-1.5 -ml-1.5 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-xs text-slate-500 flex-1">
                {isDone ? "Done" : `Step ${progress} of ${totalWork}`}
              </span>
              {!isDone && (
                <button onClick={() => setView("list")} className="text-xs text-slate-500 hover:text-white">
                  See all at once
                </button>
              )}
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.round((progress / Math.max(totalWork, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {isIntro && (
          <div className="pt-10">
            <p className="text-xs tracking-widest text-blue-400 uppercase mb-3">Syntellic · For {first}</p>
            <h1 className="text-3xl font-bold leading-tight">Hi {first} 👋</h1>
            <p className="text-slate-300 mt-3 text-lg">{parts.join(" + ")} — about 2 minutes.</p>
            {data.message && <p className="text-slate-400 mt-4 whitespace-pre-line">{data.message}</p>}
            <button
              onClick={() => setStep(hasProgress ? firstUnfinished() : 1)}
              className="mt-8 w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-400 font-semibold text-lg"
            >
              {hasProgress ? "Continue where you left off →" : "Start →"}
            </button>
            <button onClick={() => setView("list")} className="mt-3 w-full text-sm text-slate-500 hover:text-white">
              Prefer to see everything at once?
            </button>
          </div>
        )}

        {!isIntro && !isDone && postIndex >= 0 && postIndex < posts.length && (
          <PostStep
            post={posts[postIndex]}
            code={code}
            index={postIndex}
            total={posts.length}
            priorReaction={reactions[posts[postIndex].id]}
            onReacted={recordReaction}
            onNext={() => setStep((s) => Math.min(s + 1, doneStep))}
          />
        )}

        {!isIntro && !isDone && questionIndex >= 0 && questionIndex < questions.length && (
          <>
            <QuestionStep
              prompt={questions[questionIndex].prompt}
              hint={questions[questionIndex].hint}
              index={questionIndex}
              total={questions.length}
              setLabel={data.questionSet?.label ?? "Questions"}
              value={answers[questions[questionIndex].id] ?? ""}
              onChange={(v) => setAnswer(questions[questionIndex].id, v)}
              onNext={advance}
              isLast={questionIndex === questions.length - 1}
              submitting={sending}
            />
            {answerError && <p className="mt-3 text-sm text-red-400">{answerError}</p>}
          </>
        )}

        {isDone && (
          <div className="pt-6">
            <DoneStep
              firstName={first}
              approved={Object.values(reactions).filter((r) => r === "looks-good").length}
              changes={Object.values(reactions).filter((r) => r === "change").length}
              answered={answeredCount}
              totalQuestions={questions.length}
              answersSent={answersSent || answeredCount === 0}
              answerError={answerError}
              comingUp={data.comingUp}
              onReview={() => setStep(posts.length > 0 ? 1 : 0)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
