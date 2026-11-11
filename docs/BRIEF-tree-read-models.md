# Brief — Tree/Stories/Calls read models (new session)

Branch: `task/CT-tree-read-models`. Runs in parallel with the plumbing session
(Asks write-back, preview guard, platform connections). Session protocol per
CLAUDE.md: board row on Claude Coding Tasks, `Now` updates, Thomas merges.

## The model (post-Nov 5–6 restructure; System Spec/Playbook are stale)

Waterline has two core objects; posts are derived:

- **CALL** — recorded story call every 2 weeks: transcript, summary, date.
  Produces Stories (client's real cases, with permission flag), Asks (open
  questions to client), Questions (what viewers ask).
- **NODE** — a situation on the client's tree ("Out-of-province buyers",
  "Listing in winter"), Status Untested → Testing → Working/Dropped.
  Stories land on nodes. Posts/clips "train" a node. Chatbot answers come
  from a node's stories.

CALL → STORY → NODE; POST / CLIP / SITE / CHATBOT all derived.

## Notion sources (Greg — Waterline page `40f08d8fd60281ddbacdd90132082d29`)

- Tree      `collection://0c99ea02-46b2-4002-9994-953cce6163bf`
- Stories   `collection://c0d322e6-d700-4494-9189-5734e7116117`
- Calls     `collection://5b5284d1-bcab-49a3-804a-462fdefc3207`
- Posts     `collection://09d0f481-0d99-4e07-a65d-685ac13c4304`
  (has Node / Question / Story / From call relations; Topic is gone)
- Global: Seed Tree `collection://97500f45-a27b-45a2-bba9-2eda9e980d07`,
  Questions `collection://c8f9da4b-665e-4d1c-b82b-4fadeae60f7a`
- New-client template: `40f08d8fd60281618141d97cfa0d32b3`

Do NOT hardcode Greg's ids in lib code: discover child dbs by title on the
account's Notion page (same pattern as the Asks discovery in
`src/lib/notion/answers.ts`), with optional per-account id overrides in
`account.notion`. That makes the client template work for client #2.

## Architecture decision (agreed with plumbing session)

**No Notion→Mongo sync in v1.** strategy-app has no such sync anywhere —
everything is live Notion reads + short TTL in-memory caches (see `getPosts`,
answers.ts discovery cache). Build the same way: live-read endpoints behind
the API contract below. Add a Mongo mirror later, behind the same API, only
when a consumer needs it (likely the Remotion renderer). The API contract is
the deliverable; persistence is an invisible optimization.

## Scope

1. `src/lib/notion/tree.ts`, `stories.ts`, `calls.ts` — readers + types.
2. Read API:
   - `GET /api/accounts/[id]/tree` — nodes, status, linked-story counts
   - `GET /api/accounts/[id]/stories` — PERMISSION-FILTERED: only Yes /
     Anonymous-only; names stripped on anonymous. Server-side, no leaks.
   - `GET /api/accounts/[id]/calls` — summary only. The transcript NEVER
     leaves admin auth (verbatim client speech).
   - Internal fields (Why, Notes, internal Status) behind admin auth.
3. Posts mapper: surface Node / Story / From-call relation ids on posts
   (this session owns the posts parser in `src/lib/notion/`).
4. UI: Tree tab (nodes + post counts); calendar/client-view show the node a
   post trains.
5. NOT now: MCP endpoint over the read models (later), website-agent
   migration itself (separate repo — but this API is its replacement for the
   dead Topics sync, so endpoint shape stability matters).

## First checkpoint (testable by Thomas via curl)

`GET /api/accounts/greg-caseley/tree` returns live nodes with status + story
counts; `GET .../stories` returns only permission-cleared stories, names
stripped on anonymous ones. Negative test: a story with permission "No"
never appears in the response.

## File split vs the plumbing session (do not cross)

- THIS session owns: `src/lib/notion/{tree,stories,calls}.ts` (new), the
  posts parser additions, `src/app/api/accounts/[id]/{tree,stories,calls}/`,
  Tree tab UI components.
- Plumbing session owns: `src/lib/notion/answers.ts`, `src/app/s/` + share
  components, `src/lib/google/drive.ts`, cron/publish routes, accounts
  `connections[]`.
- Shared files — ADDITIVE EDITS ONLY, rebase on main before touching:
  `src/lib/types/account.ts`, `src/lib/notion/types.ts`. Nobody touches
  `src/lib/notion/client.ts`.
- Asks db schema (HANDOFF-2026-11-09.md §4.1) is frozen; plumbing writes
  answers into it, Calls processing creates rows in it. Schema changes
  require a note to the other session.

## Context docs

- `docs/HANDOFF-2026-11-09.md` — overall state. Note §3 (Drive migration)
  is DONE since Nov 9; structure is `01-clients/<account-id>/<YYYY-MM>/…`
  on Shared Drive `0ABt-iZKvN_xeUk9PVA`.
- Publishing pipeline is live end-to-end (first cron publish Nov 10,
  second scheduled Nov 11, 15:00 UTC cron).
