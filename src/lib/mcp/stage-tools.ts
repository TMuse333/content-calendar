/**
 * MCP staging tools — the "zip in Drive → scheduled post" path, phone-only.
 *
 * Served from the publish endpoint (/api/mcp-publish/<PUBLISH_SECRET>) because
 * everything here writes. The flow these enable from Claude web:
 *
 *   1. Thomas drops a carousel zip in  Syntellic/00-inbox  (Drive app, 2 taps)
 *   2. stage_carousel   — unzip → slides to Drive masters + a Notion post's
 *                         Preview (existing post, or a fresh Draft)
 *   3. create_share_link — URL to text the client for approval
 *   4. schedule_post    — Status=Scheduled + date → the 11:00 Atlantic cron
 *
 * Hard rules:
 *   - stage_carousel never touches Instagram and never changes Status.
 *   - schedule_post requires confirm:true — it ARMS a real auto-publish.
 *   - processed zips move to 00-inbox/processed (a zip stages exactly once).
 */
import { z } from "zod";
import { unzipSync } from "fflate";
import sharp from "sharp";
import type { McpServer } from "@modelcontextprotocol/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostById, updatePostStatus } from "@/lib/notion";
import { getNotionClient } from "@/lib/notion/client";
import { getDrive, listFolder, downloadFile, uploadFile, ensureFolder } from "@/lib/google/drive";
import { uploadFileToNotion, setFilesProperty } from "@/lib/notion/file-upload";
import { buildShareLink } from "@/lib/share/links";
import { insertShareLink } from "@/lib/mongodb/share-links";
import { publishBlockers, slidesOf } from "./publish-tools";
import { sendNotification } from "@/lib/notify";
import type { NotionConfig } from "@/lib/notion/types";

const SYNTELLIC_ROOT = "1fFF2gLOvCRsvrknhHDQGkCYQSPaglBuU"; // Shared Drive › Syntellic
const CLIENTS_FOLDER = "01-clients";
const INBOX_NAME = "00-inbox";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAccount = any;

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function requireNotion(accountId: string): Promise<{ account: AnyAccount; notion: NotionConfig }> {
  const account = (await getAccountById(accountId)) as AnyAccount;
  if (!account) throw new Error(`Account "${accountId}" not found`);
  if (!account.notion?.postsDataSourceId) throw new Error(`Account "${accountId}" has no Notion config`);
  return {
    account,
    notion: { postsDataSourceId: account.notion.postsDataSourceId, topicsDataSourceId: account.notion.topicsDataSourceId || "" },
  };
}

/** "greg-ottawa-coming-home.zip" → "greg-ottawa-coming-home" */
export function slugFromZipName(name: string): string {
  return name
    .replace(/\.zip$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "carousel";
}

/** Pick the slide images out of a zip's entries: sorted, junk filtered. */
export function pickSlides(entries: Record<string, Uint8Array>): Array<{ name: string; data: Uint8Array }> {
  return Object.entries(entries)
    .filter(([path, data]) =>
      /\.(png|jpe?g)$/i.test(path) &&
      !/(^|\/)(__MACOSX|\._|\.)/.test(path) &&
      data.length > 0
    )
    .map(([path, data]) => ({ name: path.split("/").pop()!, data }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function inboxFolderId(): Promise<string> {
  return ensureFolder(SYNTELLIC_ROOT, INBOX_NAME);
}

export function registerStageTools(server: McpServer) {
  server.registerTool(
    "list_inbox",
    {
      title: "List staging inbox",
      description:
        `Zips waiting in Drive "${INBOX_NAME}" (Syntellic Shared Drive). Drop a carousel zip there from any device, then stage_carousel it. Read-only.`,
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const files = (await listFolder(await inboxFolderId())).filter((f) => !f.isFolder);
        return json(files.map((f) => ({ name: f.name, modified: f.modifiedTime, size: f.size })));
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to list inbox");
      }
    }
  );

  server.registerTool(
    "stage_carousel",
    {
      title: "Stage a carousel from the Drive inbox",
      description:
        `Takes a zip of slide images from Drive "${INBOX_NAME}" (newest zip if zipName is omitted), files the slides under the account's Drive masters, and attaches them as the Preview on a Notion post — an existing post when postId is given (REPLACES its slides), else a new Draft titled from title/the zip name. Never publishes, never changes Status. The zip then moves to ${INBOX_NAME}/processed.`,
      inputSchema: z.object({
        accountId: z.string().describe('Account slug id, e.g. "greg-caseley"'),
        zipName: z.string().optional().describe("Zip filename in the inbox; omit = newest zip"),
        postId: z.string().optional().describe("Existing Notion post to attach slides to (replaces its Preview)"),
        title: z.string().optional().describe("Title for the new Draft post (when no postId); default = zip name"),
      }),
    },
    async ({ accountId, zipName, postId, title }) => {
      try {
        const { notion } = await requireNotion(accountId);
        const inbox = await inboxFolderId();

        // resolve the zip
        const zips = (await listFolder(inbox)).filter((f) => !f.isFolder && /\.zip$/i.test(f.name));
        if (!zips.length) return fail(`No zips in ${INBOX_NAME} — drop the carousel zip into Drive first`);
        const zip = zipName
          ? zips.find((f) => f.name === zipName)
          : zips.sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""))[0];
        if (!zip) return fail(`"${zipName}" not found in ${INBOX_NAME}. Available: ${zips.map((f) => f.name).join(", ")}`);

        // unzip + validate
        const slides = pickSlides(unzipSync(new Uint8Array(await downloadFile(zip.id))));
        if (slides.length < 2 || slides.length > 10) {
          return fail(`Zip has ${slides.length} usable images — carousels need 2–10`);
        }
        const warnings: string[] = [];
        for (const s of slides) {
          const meta = await sharp(Buffer.from(s.data)).metadata();
          if (meta.width !== 1080 || meta.height !== 1350) {
            warnings.push(`${s.name} is ${meta.width}×${meta.height}, expected 1080×1350`);
          }
        }

        // Drive masters: 01-clients/<account>/<YYYY-MM>/carousels/<slug>/
        const slug = slugFromZipName(zip.name);
        const month = new Date().toISOString().slice(0, 7);
        let folder = await ensureFolder(SYNTELLIC_ROOT, CLIENTS_FOLDER);
        for (const part of [accountId, month, "carousels", slug]) folder = await ensureFolder(folder, part);
        for (const s of slides) {
          await uploadFile({ folderId: folder, name: s.name, data: Buffer.from(s.data), mimeType: "image/png" });
        }

        // Notion: upload slides, attach to post (existing or new Draft)
        const uploads: Array<{ id: string; name: string }> = [];
        for (const s of slides) {
          const mime = /\.png$/i.test(s.name) ? "image/png" : "image/jpeg";
          uploads.push({ id: await uploadFileToNotion(s.name, s.data, mime), name: s.name });
        }
        let targetId = postId;
        let created = false;
        if (!targetId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const page = await (getNotionClient().pages as any).create({
            parent: { type: "data_source_id", data_source_id: notion.postsDataSourceId.replace("collection://", "") },
            properties: {
              Post: { title: [{ text: { content: title ?? slug } }] },
              Status: { status: { name: "Draft" } },
            },
          });
          targetId = page.id as string;
          created = true;
        }
        await setFilesProperty(targetId!, "Preview", uploads);

        // a zip stages exactly once
        const processed = await ensureFolder(inbox, "processed");
        await getDrive().files.update({ fileId: zip.id, addParents: processed, removeParents: inbox, supportsAllDrives: true });

        const post = await getPostById(notion, targetId!);
        await sendNotification({
          accountId,
          event: "carousel.staged",
          data: { title: post?.title ?? title ?? slug, postId: targetId, slides: slides.length, zip: zip.name, created },
        });
        return json({
          staged: true,
          zip: zip.name,
          slides: slides.length,
          driveFolder: `01-clients/${accountId}/${month}/carousels/${slug}`,
          post: { id: targetId, title: post?.title, status: post?.status, created },
          next: created
            ? "New Draft — add a Caption in Notion, then create_share_link for approval"
            : "Slides replaced — create_share_link for approval, or schedule_post if already approved",
          ...(warnings.length ? { warnings } : {}),
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Staging failed");
      }
    }
  );

  server.registerTool(
    "create_share_link",
    {
      title: "Create a client share link",
      description:
        "Creates a share link showing the given posts for the client's 👍/✏️ approval. Returns the URL to text them. Their taps land as Notion comments automatically.",
      inputSchema: z.object({
        accountId: z.string(),
        postIds: z.array(z.string()).min(1).describe("Notion post ids to show"),
        message: z.string().optional().describe("Short note shown at the top of the link"),
        expiresInDays: z.number().int().min(1).max(60).default(14),
      }),
    },
    async ({ accountId, postIds, message, expiresInDays }) => {
      try {
        await requireNotion(accountId); // validates the account exists
        const link = buildShareLink({ accountId, postIds, questionSet: null, message, expiresInDays } as never);
        if ("error" in link) return fail(link.error);
        await insertShareLink(link);
        return json({ url: `https://strategy.syntellic.ai/s/${link.code}`, expiresAt: link.expiresAt });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to create share link");
      }
    }
  );

  server.registerTool(
    "propose_set",
    {
      title: "Propose a content set to the client",
      description:
        "Creates a share link for the series AND sends ONE content.proposed email via notify (the permanent propose step — no manual link texting). ALWAYS dry-run first (dryRun:true routes the email to the operator); only send with dryRun:false after the operator's explicit GO. Re-running with the returned shareCode reuses the link and cannot double-email (idempotencyKey = share code).",
      inputSchema: z.object({
        accountId: z.string(),
        postIds: z.array(z.string()).optional().describe("Posts in the series (omit when shareCode is given)"),
        shareCode: z.string().optional().describe("Reuse an existing share link, e.g. the real send after a dry run"),
        title: z.string().describe('Series name shown in the email, e.g. "From-away series"'),
        kind: z.string().default("carousels"),
        message: z.string().optional().describe("Short note shown at the top of the share page"),
        expiresInDays: z.number().int().min(1).max(60).default(14),
        callId: z.string().optional().describe("Call the series traces to (lineage)"),
        dryRun: z.boolean().default(true).describe("true = email the operator, not the client"),
      }),
    },
    async (input) => {
      try {
        await requireNotion(input.accountId);
        const { proposeContentSet } = await import("@/lib/share/propose");
        const result = await proposeContentSet(input);
        if ("error" in result) return fail(result.error);
        return json(result);
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Propose failed");
      }
    }
  );

  server.registerTool(
    "schedule_post",
    {
      title: "Schedule a post (arms auto-publish)",
      description:
        "Sets Status=Scheduled and the Post date: the publish cron will put it on the client's LIVE Instagram at ~11:00 Atlantic on that date. Only call after the user explicitly said to schedule this specific post. Pre-flight blocks anything unpublishable.",
      inputSchema: z.object({
        accountId: z.string(),
        postId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Publish date, YYYY-MM-DD"),
        confirm: z.literal(true).describe("Must be true — the user explicitly approved scheduling"),
      }),
    },
    async ({ accountId, postId, date, confirm }) => {
      if (confirm !== true) return fail("Refused: confirm must be true");
      try {
        const { notion } = await requireNotion(accountId);
        const post = await getPostById(notion, postId);
        if (!post) return fail("Post not found in Notion");
        const blockers = publishBlockers(post).filter((b) => !b.startsWith("Status is"));
        if (blockers.length) return fail(`Not scheduled: ${blockers.join("; ")}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (getNotionClient().pages as any).update({
          page_id: postId,
          properties: { "Post date": { date: { start: date } } },
        });
        await updatePostStatus(notion, postId, "Scheduled");
        await sendNotification({
          accountId,
          event: "post.scheduled",
          data: { title: post.title, postId, date, slides: slidesOf(post).length, via: "mcp" },
        });
        return json({
          scheduled: true,
          title: post.title,
          date,
          slides: slidesOf(post).length,
          publishesAt: "~11:00 Atlantic (15:00 UTC cron, ±1h) on that date; nightly backstop if missed",
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to schedule");
      }
    }
  );
}
