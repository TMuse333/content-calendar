/**
 * Client reaction to a post in a share link.
 * Body: { postId, reaction: "looks-good" | "change", comment? }
 * - Always: saved in Mongo + comment on the Notion post (best effort)
 * - If the post is "Ready for review": also Approve / Request changes
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveShare } from "@/lib/share/context";
import { saveShareReaction } from "@/lib/mongodb/share-links";
import { reactionComment, type Reaction } from "@/lib/share/links";
import { commentOnPost } from "@/lib/notion/answers";
import { getPostById, updatePostStatus, createPostFeedback } from "@/lib/notion";
import { performReviewAction } from "@/lib/review/action";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await resolveShare(code);
  if (!ctx || !ctx.config) return NextResponse.json({ error: "This link has expired or isn't valid." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const postId = typeof body.postId === "string" ? body.postId : "";
  const reaction = body.reaction as Reaction;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";

  if (!ctx.link.postIds.includes(postId)) return NextResponse.json({ error: "Post not in this link" }, { status: 404 });
  if (reaction !== "looks-good" && reaction !== "change") return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  if (reaction === "change" && !comment) return NextResponse.json({ error: "Tell me what to change." }, { status: 400 });

  await saveShareReaction({ code, accountId: ctx.account.id, postId, reaction, comment: comment || undefined });
  await commentOnPost(postId, reactionComment(ctx.account.name, reaction, comment));

  const post = await getPostById(ctx.config, postId);
  if (post?.status === "Ready for review") {
    try {
      await performReviewAction(
        { getPostById, updatePostStatus, createPostFeedback },
        ctx.config,
        postId,
        reaction === "looks-good" ? "approve" : "request-changes",
        comment
      );
    } catch (err) {
      console.warn("[share:react] status update failed", err);
    }
  }

  return NextResponse.json({
    success: true,
    message: reaction === "looks-good" ? "Thanks! Noted." : "Got it. I'll make that change.",
  });
}
