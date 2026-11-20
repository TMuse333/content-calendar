# Resume — Strategy session (tree/stories/calls + Debrief + Tree)

## Session update — Nov 18 (recap pipeline)

**Shipped + committed (`1c4115a`):**
- Tree = call visualizer: merged Debrief into `/account/[id]/tree`. Overall mode
  (nodes by Status) ↔ per-call mode (nodes by hit/grazed/silent) via the "View"
  dropdown; right slide-over with Coverage / Ideas / **Analysis** (summary, facts
  on tape, new stories, still-open); node drawer; drag-to-pan; Fit; hide-quiet
  toggle. Debrief removed from sidebar (folded in).
- Debrief Mongo cache (`src/lib/mongodb/debriefs.ts`): GET-first, hash-invalidated;
  POST computes+caches. Click a call = instant unless miss.
- `tree-evidence.ts`: per-node `posts[]` (each post = a "test") + aggregate metrics.
- Client recap export: `/recap/[id]/[callId]` print→PDF page (`RecapView` shared
  component), each idea traced to its real transcript window (`matchSources` in
  `src/lib/calls/recap.ts`). "Export recap" button in Tree call-mode.

**Built but NOT committed — recap lifecycle (generate→approve/edit→send):**
- `src/lib/mongodb/recaps.ts` — `recaps` collection, status draft→approved→sent,
  `data`+`edits` (merge via `effectiveRecap`), public `token`.
- Auto-draft on debrief finish (debrief route) + lazy back-fill in inbox.
- Inbox `/account/[id]/recaps`, editor `/account/[id]/recaps/[callId]` (edit copy +
  live preview iframe, Approve, Send), Sidebar "Recaps" item.
- Public link `/r/[token]` (only resolves once approved).
- Resend email: `src/lib/email/recap-email.ts` (REST via fetch, no SDK),
  `POST /api/accounts/[id]/recaps/[callId]` {action: edits|approve|send}.
- Verified locally: draft gated → approve → public link renders; bad email → 400.

**To make a recap actually public / sendable (TODO):**
1. Commit the recap-lifecycle files above.
2. `NEXT_PUBLIC_PUBLIC_BASE_URL=https://strategy.syntellic.ai` + use it for the
   shared/emailed link (editor + email currently use request/window origin).
3. Resend: verify a sending domain, set `RESEND_API_KEY` + `RECAP_FROM_EMAIL`
   (local .env.local AND Vercel). Sandbox sender only emails your own address.
4. Deploy: **only `strategy.syntellic.ai` is public** — all `*.vercel.app` are
   SSO-locked (`ssoProtection: all_except_custom_domains`). Prod builds from `main`
   → **Thomas merge gate**. Latest prod deploy = ERROR (fix before shipping).
5. Share `https://strategy.syntellic.ai/r/<token>` (email optional on top).

**Handoff prompt** for another Claude Code (pick up Nov 12 video ideas → Reels via
`story-request.ts`) was drafted in chat — not yet saved to a file.

---


Branch: `task/CT-tree-read-models`. This is the **strategy lane** (read models +
coverage/ideas LLM + Debrief + Tree UI). Plumbing lane (other Claude) owns
`answers.ts`, `src/app/s/`, `drive.ts`, cron, Asks. Video-app + website-agent are
separate sessions. Canonical model: `docs/BRIEF-tree-read-models.md` + Notion
System Spec (stale) + memory `waterline-north-star`, `dark-mode-ui`.

## The goal
A story call → **see what it covered on the client's situation tree + generate
video ideas** → send approved ideas to the **video-system** app to make Reels.
Tree = faceted taxonomy: **situation (node) × lens** (Who/What/When/Where/Why/
How/How much/What if). First client: **greg-caseley** (PEI); primary niche =
**"Moving here from away"** (out-of-province / US buyers — his strongest edge).

## What's built (all on this branch)
**Readers** (`src/lib/notion/`):
- `tree.ts` — `getTree`, `markPrimaryNiche`, `findTreeDataSource`; `TreeNode` has
  `isPrimaryNiche`. Tree is a **forest** (2 roots: Residential, Land — no super-root).
- `stories.ts` — `getStories` (admin) / `getPublicStories` (permission-filtered,
  fail-closed: only Yes/Anon; anon withholds name-prose). No structured name field
  → anon serves only an optional "Anonymized summary" field if present.
- `calls.ts` — `getCalls`/`getPublicCalls` (transcript never a property; `Recording`
  admin-only), `findCallsDataSource`, **`getCallTranscript(callPageId)`** (reads the
  "Transcript —" child page under a call row).
- `tree-evidence.ts` — `getTreeWithEvidence(accountId, config, primaryNiche)`:
  node + storyCount/topBreakthrough/postCount + IG metrics (reach/saves via
  node.postIds → Notion posts → tracked_posts). Metrics empty until IG synced.

**LLM** (`src/lib/calls/`): `analyze.ts` → `analyzeTranscript` (coverage:
hit/grazed/silent per node) + `writeCallAnalysisToNotion` + `listCalls` (adapter
over `getCalls`). `ideas.ts` → `generateVideoIdeas` (VideoIdea[]: node×lens, belief
shift, 3 hooks tagged spoken|card + one preferred, advisory format, factsToConfirm;
**niche-first**; spoken hooks HARD-validated verbatim-in-transcript else → card;
`norm()` strips [mm:ss] timestamps).

**Contract**: `src/lib/video/story-request.ts` — `StoryRequest` + `PublicBrand`
(the shape video-system renders from).

**API**: `GET /tree`, `GET /tree/evidence`, `POST /debrief` ({callId} → pulls
transcript from Notion → coverage + ideas), plus plumbing's `/calls`,
`/calls/analyze`.

**UI** (dark — zinc-950 ground, cyan accents, NEVER white):
- `/account/[id]/debrief` — click a call (neon-blue chips) → pulls transcript from
  Notion → expandable summary + coverage + niche-first video ideas.
- `/account/[id]/tree` — React Flow interactive tree; click node → evidence panel.
- Sidebar has **Debrief** (Sparkles) + **Tree** (Network) links.

**Scripts** (`scripts/`): `test-tree`, `test-stories`, `test-calls`, `test-ideas
<file?>`, `test-evidence`, `seed-greg` (now `$setOnInsert` platforms — never wipes
IG), `push-transcript <callPageId> <file> "<title>"` (writes a transcript into
Notion; = the future Zoom-webhook handler).

## How to run / verify
`.env.local` needs `NOTION_API_KEY`, `ANTHROPIC_API_KEY`, `MONGODB_URI`.
```
npx tsx scripts/test-tree.ts        # tree + ★EDGE
npx tsx scripts/test-ideas.ts /Users/thomasmusial/Downloads/greg-2026-11-12-interview-transcript.txt
npm run dev  → /account/greg-caseley/debrief (click "Story call #2 — Nov 12")
             → /account/greg-caseley/tree
```

## Key ids
- Greg account `greg-caseley`, `primaryNiche: "Moving here from away"`.
- Data sources: tree `0c99ea02-46b2-4002-9994-953cce6163bf`, stories
  `c0d322e6-d700-4494-9189-5734e7116117`, calls `5b5284d1-bcab-49a3-804a-462fdefc3207`,
  posts `09d0f481-0d99-4e07-a65d-685ac13c4304`, questions
  `c8f9da4b-665e-4d1c-b82b-4fadeae60f7a`, seed-tree `97500f45-a27b-45a2-bba9-2eda9e980d07`,
  tree-changes `daf68cf4-8382-45b6-aa2c-91577780075d`.
- Nov 12 call page `41808d8f-d602-813a-8ff4-ee08db0e1317` (transcript now a child page ✓).
- Nov 5 transcript page `40f08d8fd602818ba173daa28cd2e0dc`.

## Gotchas
- **Dark mode only** (zinc-950 / cyan); no white. [memory: dark-mode-ui]
- **Few git commits** — batch, commit when asked.
- **Miro is DROPPED** (SESSIONS.md) — never read/write the board; React Flow tree is
  the visual now.
- localhost vs live IG "connected" differs = **different Mongo DBs** (IG is per-DB).
  seed-greg no longer wipes platforms.
- UI is **blind-built** — expect a styling fix pass (Debrief grid, React Flow layout).

## Next (roadmap, priority order)
1. Run the UI, fix styling pass. Tree **export** (add `html-to-image`) for Greg.
2. **StoryRequest emitter**: approved idea → StoryRequest → video-system. Needs
   video-app `/api/render` intake + Greg `BrandProfile` (video-app session).
3. **Zoom auto-pipeline**: Server-to-Server OAuth app → `recording.transcript_completed`
   webhook → pull VTT → `push-transcript` logic → Notion. Meeting ends = Debrief ready.
4. website-agent: public `/stories` + `/questions` endpoints (it consumes them).
5. getTreeWithEvidence metrics populate once `tracked_posts` sync (plumbing cron).

## Pending offers
- Backfill Nov 5 already has a transcript; Nov 12 done.
- Write the video-app prompt (auto-push transcripts + render intake).
