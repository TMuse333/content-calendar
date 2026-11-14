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
