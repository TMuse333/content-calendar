/**
 * Client answers submitted through a share link.
 * Saved to Mongo, and to the client's Answers database in Notion when one exists.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveShare } from "@/lib/share/context";
import { saveClientAnswers } from "@/lib/mongodb/share-links";
import { cleanAnswers, QUESTION_SETS } from "@/lib/questions/sets";
import { writeAnswersToNotion } from "@/lib/notion/answers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await resolveShare(code);
  if (!ctx || !ctx.link.questionSet) return NextResponse.json({ error: "This link has expired or isn't valid." }, { status: 404 });

  const set = QUESTION_SETS[ctx.link.questionSet];
  const body = await req.json().catch(() => ({}));
  const answers = cleanAnswers(body.answers, set.questions);
  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "Please answer at least one question." }, { status: 400 });
  }

  const notion = ctx.config
    ? await writeAnswersToNotion(ctx.config, {
        clientName: ctx.account.name,
        setLabel: set.label,
        questions: set.questions,
        answers,
        source: `Share link /s/${code}`,
      })
    : null;

  await saveClientAnswers({ accountId: ctx.account.id, setId: set.id, answers, shareCode: code, notionPageId: notion?.pageId ?? null });
  return NextResponse.json({ success: true, saved: Object.keys(answers).length });
}
