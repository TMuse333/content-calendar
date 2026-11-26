/**
 * Captions for the 6 from-away carousels (proposed Nov 23, share
 * wM2vd9x00QG3orXPKh7SRA) + Status Draft → Ready for review, so Greg's 👍 on
 * the share link auto-approves a publishable post.
 *
 *   npx tsx scripts/caption-drafts.ts            # dry run: show current → new
 *   npx tsx scripts/caption-drafts.ts --write    # apply to Notion
 *
 * Guardrails (BRIEF-carousels-call2.md): no DM keywords — CTA is call
 * 902-888-9232 / "send me a message"; stories anonymous; no numbers that
 * aren't in the brief or on the slides.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CAPTIONS: Record<string, string> = {
  // greg-why-they-come-home
  "42008d8f-d602-8102-b41e-fe2f6b1aa6df": `Why do people move to PEI from away? It's almost never square footage. It's pace.

Most of the folks who call me already have a connection here — roots, ancestors, summers here as a kid. And they're in a city somewhere, thinking: the commute is the longest part of my day, and I know my neighbours' cars but not their names.

If you've felt the pull, you're not being impractical. You're being early.

Thinking about coming home — or coming for the first time? Tell me what you're picturing. Call me at 902-888-9232 or send me a message.`,

  // greg-stratford-after-sale
  "42008d8f-d602-81bf-8b8e-ef167a3b4241": `I sold a house in Stratford in January. This is what — November? And they still text me. The last one was about the previous owner's mail.

When you live eight hours from your new house, your realtor isn't just the person who opened doors. He's your person on the Island after the keys change hands. That's the part of this job I take most seriously.

The sale is the start, not the end.

Buying on PEI from away? You'll want someone who still answers in November. Call me: 902-888-9232.`,

  // greg-ottawa-coming-home
  "42008d8f-d602-811d-9310-ea293a11e3e6": `I had a call from a lady from Ottawa. She wants to buy a property here — she's coming home to the Island.

She knows exactly what she's after: one level, a garage, a smaller footprint. The catch? The right house isn't on the market yet. So that's my job now — agent open houses, the network, knowing what's coming before it's listed.

You don't need to watch listings from 1,200 km away. You need one person here who knows what's coming.

Moving home to the Island? Tell me what you're looking for before it's listed. Call 902-888-9232 or send me a message.`,

  // greg-money-questions-from-away
  "42008d8f-d602-8121-a6d2-fa0fb2522a79": `Buying on PEI from out of province? There's no sense going ahead with anything else if there's no financing in place. That's not me being blunt — it saves people real heartbreak.

Four money questions to ask before you fall in love with a listing:
1. Will my bank treat this as a second property?
2. Does buying from another province change my down payment?
3. Are there rules about what non-residents can buy on PEI?
4. What do I need confirmed in writing before I book a trip to view?

Sort these first, and the trip is for choosing a house — not for finding out you can't buy it.

I walk from-away buyers through every one of these in 20 minutes. Call 902-888-9232 or send me a message.`,

  // greg-from-away-first-step
  "42008d8f-d602-8150-9208-c0ca5119a24c": `"So, if I'm someone from outside of PEI, how can I start looking?"

I get that question a lot. The answer isn't flights, and it isn't refreshing listings every night. It starts with a conversation.

Tell me what you're picturing, and I do the legwork from here: personal walkthrough videos of any house you're curious about — including the honest "skip this one, it's not for you."

You can't fly in for every showing. You don't have to. Distance isn't the obstacle you think it is.

Start with one call: 902-888-9232.`,

  // greg-from-away-checklist
  "42008d8f-d602-811a-895c-ebdb65b0afe2": `5 things to have ready before you call a PEI realtor from away:

1. Pre-approval. First, always — there's no sense going ahead with anything else if the financing isn't in place. From-away financing can have a few extra wrinkles, so ask your lender early.
2. Your real timeline.
3. Must-haves vs nice-to-haves — the honest version.
4. How you'll view from away. I do personal walkthrough videos, so you don't fly in for every showing.
5. Your questions about PEI's rules for non-resident buyers. There are rules — we'll walk through what applies to you.

Have the list half-ready? That's enough. Call me: 902-888-9232.`,
};

async function main() {
  const write = process.argv.includes("--write");
  const { getAccountById } = await import("../src/lib/mongodb/accounts");
  const { getPostById, updatePostCaption, updatePostStatus } = await import("../src/lib/notion");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = (await getAccountById("greg-caseley")) as any;
  const cfg = { postsDataSourceId: account.notion.postsDataSourceId, topicsDataSourceId: account.notion.topicsDataSourceId || "" };

  for (const [id, caption] of Object.entries(CAPTIONS)) {
    const post = await getPostById(cfg, id);
    if (!post) { console.error(`MISSING ${id}`); continue; }
    console.log(`\n── ${post.title} [${post.status}] caption:${post.caption ? "EXISTS" : "none"}`);
    if (post.caption && post.caption.trim()) { console.log("   has a caption already — skipping (won't overwrite)"); continue; }
    if (!write) { console.log(caption.split("\n")[0] + " …"); continue; }
    await updatePostCaption(cfg, id, caption);
    if (post.status === "Draft") await updatePostStatus(cfg, id, "Ready for review");
    console.log("   ✓ caption written" + (post.status === "Draft" ? ", status → Ready for review" : ""));
  }
  console.log(write ? "\nDone." : "\nDry run — re-run with --write to apply.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
