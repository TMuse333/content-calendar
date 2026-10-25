/**
 * Admin: create / list share links for a client.
 * POST { postIds: string[], questionSet: QuestionSetId ("content"|"strategy"|"clients") | null, message?, expiresInDays? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getShareLinkByCode,
  insertShareLink,
  listShareLinks,
  listShareReactions,
  revokeShareLink,
  setShareLinkQuestionSet,
} from "@/lib/mongodb/share-links";
import { buildShareLink } from "@/lib/share/links";
import { isQuestionSetId } from "@/lib/questions/sets";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

function baseUrl(req: NextRequest) {
  return process.env.NEXTAUTH_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [links, reactions] = await Promise.all([listShareLinks(id), listShareReactions(id)]);
  return NextResponse.json({
    links: links.map((l) => ({ ...l, url: `${baseUrl(req)}/s/${l.code}` })),
    /** Client taps (👍 / ✏️ + comment) across all links, newest first. */
    reactions,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const account = await getAccountById(id);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const link = buildShareLink({ accountId: id, ...body });
  if ("error" in link) return NextResponse.json({ error: link.error }, { status: 400 });
  await insertShareLink(link);
  return NextResponse.json({ success: true, code: link.code, url: `${baseUrl(req)}/s/${link.code}`, expiresAt: link.expiresAt });
}

/**
 * Change the question set on a live link: PATCH { code, questionSet }.
 * Same code, same URL — the client keeps the link they already have, along
 * with their reactions so far and their resume position.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const questionSet = isQuestionSetId(body.questionSet) ? body.questionSet : null;
  if (body.questionSet != null && !questionSet) {
    return NextResponse.json({ error: "Unknown question set" }, { status: 400 });
  }

  const link = await getShareLinkByCode(code);
  if (!link || link.accountId !== id) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  if (!questionSet && link.postIds.length === 0) {
    return NextResponse.json({ error: "This link has no posts, so it needs a question set." }, { status: 400 });
  }

  await setShareLinkQuestionSet(id, code, questionSet);
  return NextResponse.json({ success: true, code, questionSet });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  await revokeShareLink(id, code);
  return NextResponse.json({ success: true });
}
