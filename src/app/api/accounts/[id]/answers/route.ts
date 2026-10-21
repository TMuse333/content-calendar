/**
 * Client answers to content questions.
 *
 * GET  /api/accounts/[id]/answers  → questions + previous submissions
 * POST /api/accounts/[id]/answers  → { answers: { [questionId]: string } }
 *
 * Stored in Mongo (client_answers). Thomas/Claude turn them into posts.
 */
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb/clientPromise";
import { getAccountById } from "@/lib/mongodb/accounts";
import { cleanAnswers, questionsFor, QUESTION_SETS } from "@/lib/questions/sets";
import { writeAnswersToNotion } from "@/lib/notion/answers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function collection() {
  const client = await clientPromise;
  return client.db("strategy").collection("client_answers");
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const account = await getAccountById(id);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const col = await collection();
  const submissions = await col.find({ accountId: id }).sort({ createdAt: -1 }).limit(20).toArray();
  return NextResponse.json({
    accountName: account.name,
    questions: questionsFor(id),
    submissions: submissions.map(({ _id, ...s }) => ({ id: String(_id), ...s })),
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const account = await getAccountById(id);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const answers = cleanAnswers(body.answers, questionsFor(id));
  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "Please answer at least one question." }, { status: 400 });
  }
  const notion = account.notion?.postsDataSourceId
    ? await writeAnswersToNotion(
        { postsDataSourceId: account.notion.postsDataSourceId, topicsDataSourceId: account.notion.topicsDataSourceId || "" },
        { clientName: account.name, setLabel: QUESTION_SETS.content.label, questions: QUESTION_SETS.content.questions, answers, source: "Questions page" }
      )
    : null;
  const col = await collection();
  await col.insertOne({ accountId: id, setId: "content", answers, createdAt: new Date(), usedInPosts: false, notionPageId: notion?.pageId ?? null });
  return NextResponse.json({ success: true, saved: Object.keys(answers).length });
}
