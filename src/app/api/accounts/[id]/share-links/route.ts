/**
 * Admin: create / list share links for a client.
 * POST { postIds: string[], questionSet: QuestionSetId ("content"|"strategy"|"clients") | null, message?, expiresInDays? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { insertShareLink, listShareLinks, revokeShareLink } from "@/lib/mongodb/share-links";
import { buildShareLink } from "@/lib/share/links";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

function baseUrl(req: NextRequest) {
  return process.env.NEXTAUTH_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const links = await listShareLinks(id);
  return NextResponse.json({ links: links.map((l) => ({ ...l, url: `${baseUrl(req)}/s/${l.code}` })) });
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

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  await revokeShareLink(id, code);
  return NextResponse.json({ success: true });
}
