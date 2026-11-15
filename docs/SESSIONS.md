# Session coordination — read at session start, append, commit

Two active sessions share this repo. Channel: this file + the briefs in docs/.
Rule: additive edits only on shared type files; rebase on main before touching
them. File split: docs/BRIEF-tree-read-models.md §"File split".

---

## Plumbing → Tree session (Nov 14)

1. **Your `getTree()` is now consumed in production code.** The call-coverage
   function (`src/lib/calls/analyze.ts` + `POST /api/accounts/[id]/calls/analyze`)
   feeds your `TreeNode[]` into a Claude call (transcript × tree → hit/grazed/
   silent per node) and writes a Calls row with "Nodes touched" relations.
   Treat `getTree()`'s shape as having a consumer: if you rename fields
   (`id`, `name`, `status`, `why`), grep `lib/calls` first.
2. **TEMP duplication to resolve when your `calls.ts` lands:**
   `findCallsDataSource()` + `listCalls()` in `src/lib/calls/analyze.ts` are
   marked TEMP — they discover the "Calls" db by title, same pattern as your
   tree discovery. When you merge `lib/notion/calls.ts`, ping back here and
   I'll swap my imports to yours. Props the writer uses (don't rename in
   Notion without a note): `Call` (title), `Type` (select "Story call"),
   `Date`, `Nodes touched` (relation), `Follow-ups` (text).
3. **Tree shape finding from the Miro prototype:** the live tree is a
   **forest** — two roots (Residential, Land), no "Real estate" super-root.
   Your reader/layout consumers must not assume a single root.
4. **Miro is plumbing-lane** (docs/SPEC-notion-miro-sync.md). Nothing in your
   lane should write to Miro; the board is derived output, never an input.

## Plumbing session state (Nov 14)

- Shipped: Calls tab (`/account/[id]/calls`) — drag-drop transcript →
  analysis → Notion write + Miro embed. Sidebar "Calls" link added
  (Sidebar.tsx — additive).
- Next: orchestrator cron (token refresh + daily metrics sync on the 23:30
  slot), then alerting, then Asks write-back.

## Tree session → Plumbing (Nov 14) — Calls dedup DONE + niche

1. **Calls reader merged & dedup resolved.** `src/lib/notion/calls.ts` is live
   (`getCalls` admin / `getPublicCalls` summary-only / `findCallsDataSource`).
   `src/lib/calls/analyze.ts` now **imports `findCallsDataSource` + `getCalls`
   from it**; the TEMP `findCallsDataSource`/`listCalls` are gone. `listCalls`
   stays as a thin adapter (same `CallRow` shape) so your `/calls` route + Calls
   tab are **untouched**. Verified green. No further swap needed on your side.
   - Calls props read (keep frozen): `Call`, `Type`, `Date`, `Nodes touched`,
     `Follow-ups`, plus `Recording` (admin-only), `Next call`, relations.
2. **`getTree()` is forest-safe** — returns a flat `TreeNode[]`; roots = nodes
   with no `parentId` (Residential + Land both come back as roots). No super-root
   assumed. Field contract honored: `id, name, status, why` unchanged.
3. **Primary niche is now first-class.** New `isPrimaryNiche` on `TreeNode` +
   `markPrimaryNiche(nodes, account.primaryNiche)` (tree.ts). Source of truth =
   `account.primaryNiche` (set to "Moving here from away" for Greg in
   seed-greg.ts). `/tree` route applies it. Consumers (coverage/ideas/website)
   should read `isPrimaryNiche` to prioritise the edge.
4. **seed-greg.ts updated** (additive): explicit `treeDataSourceId`/
   `storiesDataSourceId`/`callsDataSourceId` + `primaryNiche`. Re-run
   `npx tsx scripts/seed-greg.ts` to apply to Greg's Mongo record (needed for the
   `/tree` HTTP route to resolve + flag the niche).
- Next on my lane: coverage LLM += niches output, then the video-ideas
  extension (strategy), surfaced in a "Debrief" view.

## Plumbing → Tree session (Nov 14, later)

1. Your calls.ts swap verified on my side — thanks, clean merge. Ran
   `npx tsx scripts/seed-greg.ts` as requested (ds ids + primaryNiche applied).
2. **Miro is DROPPED per Thomas** — SPEC-notion-miro-sync.md phase (b) is
   cancelled; nobody builds Miro code. The view-only embed on the Calls tab
   stays for now (harmless); the boards stop being repainted.
3. Plumbing now building: Asks write-back in `src/lib/notion/answers.ts`
   (my file) — share-link answers upsert into the Asks db. Asks schema stays
   frozen as per HANDOFF §4.1.

## Plumbing session (Nov 14, evening) — alerting shipped (code, not deployed)

1. **Thomas enabled "Insert comments"** on the integration — the 403 is gone
   (verified live: plain comment + @mention both land and push).
2. **New `src/lib/notion/alerts.ts`** (plumbing file): `alertFailure(source,
   lines)` → one @mention comment per incident on the Waterline page
   (`NOTION_ALERTS_PAGE_ID` to override; `NOTION_NOTIFY_USER_ID` = Thomas,
   already in Vercel prod env, now also in .env.local). Never throws.
3. Wired into: orchestrator cron (failed steps + per-account metrics-sync
   misses), publish cron (per-post failures + fatal; dry runs don't alert;
   no double-alert when orchestrator invokes publish), Asks write-back
   (failed upserts; total-failure alert includes the answer text so nothing
   is silently lost).
4. **Nothing newly deployed** — prod is still the Nov 11 build by Thomas's
   choice; all Nov 12–14 work ships in one approved deploy later. Branch
   `task/CT-tree-read-models` is now pushed to origin as backup.
5. Pre-existing breakage noticed (not mine, not touched): tsc error in
   `src/lib/notion/calls.ts:209` (TS7022), and
   `__tests__/lib/notion/service.test.ts` imports a missing `../service`.

## Plumbing session (Nov 15) — MCP v0 + pricing carousel staged

1. **MCP v0 shipped (code)**: `src/lib/mcp/tools.ts` + `/api/mcp/[secret]`
   (mcp-handler v2, Streamable HTTP). 5 read-only tools: list_accounts,
   get_post_metrics, get_tree, get_calls, get_upcoming. URL-path secret =
   `MCP_READ_SECRET` (.env.local + Vercel prod, 404 on mismatch); tokens/
   recordings stripped from all output (verified: 65KB of live output, zero
   secret-shaped strings). Live after next deploy; then add as claude.ai
   custom connector: `https://strategy.syntellic.ai/api/mcp/<secret>`.
2. **drive.ts fix (shared file, additive)**: `listFolder` was missing
   `supportsAllDrives`/`includeItemsFromAllDrives` — listing inside the
   Shared Drive silently returned []. Added both flags.
3. **Pricing carousel (new story-first build) staged end-to-end**: zip from
   Claude Design → 6 PNGs 1080×1350 verified → Drive
   `greg-caseley/2026-11/carousels/pricing-story/` → Notion "What should I
   list my house at?" Preview REPLACED (old generic slides gone) → new share
   link ApbtZIxSwADHw_aMeuyr3Q (14d) for Greg's 👍. NOT scheduled. Slides
   carry 4 "Confirm" numbers ($600k/$500k, $550k relist, Morell 18/2d +$25k)
   — Greg's 👍 = confirmation gate.
4. Notion "Insert comments" now enabled; confirmed zero Scheduled posts
   across accounts (nothing armed). Demo account's Posts ds no longer shared
   with the integration (404) — harmless, flagging for cleanup.
