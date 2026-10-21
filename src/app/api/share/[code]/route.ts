/**
 * Client: everything behind a share link (client-safe fields only).
 */
import { NextRequest, NextResponse, after } from "next/server";
import { resolveShare } from "@/lib/share/context";
import { recordShareOpen } from "@/lib/mongodb/share-links";
import { notifyOnClientPage } from "@/lib/notion/answers";
import { getPostById } from "@/lib/notion";
import { QUESTION_SETS } from "@/lib/questions/sets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await resolveShare(code);
  if (!ctx) return NextResponse.json({ error: "This link has expired or isn't valid." }, { status: 404 });

  const posts = ctx.config
    ? (await Promise.all(ctx.link.postIds.map((pid) => getPostById(ctx.config!, pid)))).filter(Boolean).map((p) => ({
        id: p!.id,
        title: p!.title,
        questionAnswered: p!.questionAnswered,
        type: p!.type,
        status: p!.status,
        postDate: p!.postDate,
        caption: p!.caption,
        previewUrls: p!.previewUrls?.length ? p!.previewUrls : p!.previewUrl ? [p!.previewUrl] : [],
      }))
    : [];

  // Open tracking. Admin previews (?preview=1 from the Share panel) don't count.
  if (req.nextUrl.searchParams.get("preview") !== "1") {
    after(async () => {
      try {
        const first = await recordShareOpen(code);
        if (first && ctx.config) {
          const who = ctx.account.name.split(" ")[0] || "Client";
          await notifyOnClientPage(ctx.config, `${who} opened your share link (${ctx.link.postIds.length} posts${ctx.link.questionSet ? " + questions" : ""}).`);
        }
      } catch (err) {
        console.warn("[share] open tracking failed", err);
      }
    });
  }

  const set = ctx.link.questionSet ? QUESTION_SETS[ctx.link.questionSet] : null;
  return NextResponse.json({
    clientName: ctx.account.name,
    message: ctx.link.message ?? null,
    posts,
    questionSet: set ? { id: set.id, label: set.label, intro: set.intro, questions: set.questions.map(({ id, prompt, hint }) => ({ id, prompt, hint })) } : null,
  });
}
