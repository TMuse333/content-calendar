# Context handoff — Greg launch weekend (updated Oct 24, ~4:15 PM Atlantic)

For Claude web (you know the earlier history — this covers what the local
"Reports" session shipped today and one open question about link activity).

## The two links that matter

1. **Sent to Greg TODAY (the live one):**
   `https://strategy.syntellic.ai/s/gEHHgr6KhUKzssmU4lnebA`
   - Created today 2:27 PM Atlantic via SharePanel
   - 6 carousels (Oct 26 → Nov 8) + **content** question set
     (NOTE: content set was already answered by Greg on Oct 22 — the intended
     set was "carousels" (9 confirmations). Decision: let this link ride for
     approvals; send carousel confirmations + client-wins as Monday mini-links.)
2. **The old link Greg used Oct 22 ("a couple days ago"):**
   `https://strategy.syntellic.ai/s/voBCcKV593fx2s19DSnccw`
   - Oct 21, only 2 posts + content questions
   - Greg's confirmed activity: two 👍 (Oct 22 7:11 PM UTC) + full content answers (7:24 PM UTC)

(Also exists: `/s/x-pr7uIxfCbi_miZTZCprw` — this session's local test link,
6 carousels + carousels question set, 0 opens, ignore.)

## ⚠️ Unresolved: who tapped 👍 twice today?

Mongo `share_reactions` has two rows on TODAY'S link `gEHHgr6K`:
- `looks-good` on "What to fix before listing" — today 2:31 PM Atlantic
- `looks-good` on "What does selling actually cost me?" — today 2:40 PM Atlantic
Link opens: 5×, all between 2:27–2:40 PM today; silence since.

Thomas says he opened today's link but tapped nothing, and believes the 👍s
are Greg's from a while back. But Greg's Oct 22 reactions are separate rows
on the OLD link (voBCcKV5) — these two are new rows, today, on the new link.
So either (a) Thomas tapped them without realizing while checking the link,
or (b) Greg opened the link within minutes of receiving it and approved two
posts. Needs resolving before trusting "Greg approved Oct 26/28" — ask Greg
or wait for fresh activity (any opens after 4:02 PM Atlantic are Greg).

## What shipped today (all merged to main + deployed)

- Production build fixed (the 52-tsc-error break from the calendar refactor)
- Client-view: calendar-first tabs, components refactor, rich post modal
  (approve / request changes), Questions tab (all sets)
- Share page /s/[code] is now a step-by-step wizard (one post/question per
  screen, resume, list fallback, dev-only ?sandbox=1)
- Question sets: your "clients" set merged; new "carousels" set (9
  confirmations from the zip's "Questions for Greg.txt")
- Greg's 6 carousels: 36 slides uploaded into Notion Preview properties,
  posts set "Ready for review", dates Oct 26/28/30, Nov 1/6/8 (denser Notion
  schedule kept; zip's Friday dates NOT adopted)
- Admin: SharePanel shows reactions + client answers; admin calendar now
  shows planned Notion posts; NotionPostModal has a manual
  **Publish to Instagram** button (sharp → Vercel Blob → IG carousel →
  Notion write-back Status=Posted + IG link). PUBLISH_SECRET-gated.
  Verified end-to-end (test went to thomas-musial's IG — being deleted;
  Greg's account never touched).
- Feedback DBs wired for greg-caseley AND demo (set-feedback-db ran — the
  blocked THOMAS task is half-done, only tmp-notion-upload branch deletion left)
- "What the DM keywords mean" decoder page created in Greg's Notion hub

## Baseline & post-performance findings (Oct 24)

Baseline (30d window, auto-captured Oct 22 on IG connect, in Mongo
`baselines` + rendered at /account/greg-caseley/report):
779 followers · 1,438 reach · 73 accounts engaged · 143 interactions ·
46 profile visits · **0 website clicks** · 205 lifetime posts ·
**5.08% avg engagement** (good — audience likes him, too few see it,
content asks nothing of them).

Per-post sync ran Oct 24 (50 posts now in Mongo → /library, /insights):
- #1 post of the year: "Congratulations to Cassandra and Robin" —
  **709 reach, ~5× his typical post**. Client-win content is Greg's
  proven top format.
- #2: Caseley Classic Golf Tournament (418 reach, most likes) —
  personal/community beats business content.
- Listings/open-houses/scenery: 120–170 reach, bottom tier.
- ~0 saves and ~0 comments across all 50 posts — nothing save-worthy,
  which is what the question-answering carousels target.

Strategy implication (agreed with Thomas): integrate client success into
the carousels — captions of Nov 1/6/8 posts get real client micro-stories
woven in ONCE Greg's client-win answers arrive (never invent stories);
the Nov 4 Cassandra & Robin carousel is the pure client-win play; Monday's
client-wins link uses the "your C&R post was 5× your normal reach" framing.
Client-win becomes a standing format (~every 3rd post) in future planning.

Baseline text drafted for Thomas to send Greg (see session Oct 24) —
starting line + the client-story insight + "report in two weeks."

## Still open

- Thomas: add PUBLISH_SECRET to Vercel env (value in local .env.local) + delete test IG post
- Resolve the 👍 attribution above
- A share-link 👍 does NOT set Notion Status=Approved (only the approve
  buttons do). Before publishing, statuses must be flipped to Approved.
  Considered wiring react→approve; not done yet.
- Monday: mini-link(s) with "carousels" confirmations + "clients" set
  (client wins feed the on-hold Nov 4 Cassandra & Robin carousel)
- Drive: Thomas dropped carousels into a "Greg Caseley" folder, but
  GREG_CASELEY_FOLDER_ID points at "greg-graphics" (empty) — either move
  contents or update the env var with the new folder ID
