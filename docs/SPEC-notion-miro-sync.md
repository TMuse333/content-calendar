# Spec — Notion ⇄ Miro tree sync (plumbing lane)

**Owner:** plumbing session (integration work, like `drive.ts` / crons).
**Depends on:** `src/lib/notion/tree.ts` from the strategy session (`task/CT-tree-read-models`). **Consume that reader — do not parse Notion yourself.**
**Direction:** one-way, **Notion → Miro**. Notion is the source of truth; the Miro board is a derived picture. Never write Miro → Notion.

## 1. Why

Each client has a Notion "situation tree." There's already a per-client Miro board that is a hand-redrawn mirror ("edit in Notion, then redraw"). That manual redraw is the whole cost of keeping Miro around. This sync automates it, so each client gets an **always-current** board for free effort — which is what makes a paid Miro tier worth it later.

The tree changes ~once per story call (biweekly), so this is low-frequency, on-demand work — **not** a real-time pipeline.

## 2. Architecture

```
getTree(accountId)            // strategy lane — src/lib/notion/tree.ts
   → TreeNode[]               // the ONLY data source for this sync
      → layoutTree(nodes)     // compute x/y (layered tree)
         → drawMiro(board, laidOutNodes)   // Miro REST API v2
```

**Hard rule:** the sync reads the tree **through `tree.ts`**, the same read model video-system and the website will use. One source of logic. If `tree.ts` isn't merged yet, a throwaway prototype (section 7a) may read Notion via MCP, but mark it `// TEMP — replace with getTree()`.

## 3. Data contract (what `tree.ts` provides per node)

From the live "Greg's Tree" schema (`collection://0c99ea02-46b2-4002-9994-953cce6163bf`):

| field | use in the drawing |
|---|---|
| `name` | node label |
| `level` | `Structure` / `Situation` / `Sub-branch` (may be renamed later — **derive depth from the parent chain, not this label**, so a rename can't break layout) |
| `status` | `Untested` / `Testing` / `Working` / `Dropped` → node color |
| `parent`, `children` | tree edges (connectors) |
| `fromSeed` | provenance (optional: badge "from seed" vs client-carved) |
| `stories`, `posts`, `calls` | optional: small counts on the node |
| `why`, `notes` | optional: tooltip / secondary text |

Structure nodes (`Real estate`, `Residential`, `Buyers`, `Sellers`, `Land`) have no status — render them as plain containers, not status-colored.

## 4. The Miro drawing

- **Target board:** look up by name `Waterline – <Client name>` (Greg's is `uXjVERN-9qM=`). If absent, create it. Store the board id on the account (plumbing owns account config) so it's stable.
- **Layout:** layered, top-down by depth (root `Real estate` at top → Class → Side → Situation → Sub-branch). Space siblings so subtrees don't overlap — a simple "subtree width = max(1, leaf count) × gap" is fine; no need for a tidy-tree algorithm v1.
- **Node style by status:**
  - Untested → grey `#8a97a0`
  - Testing → amber `#c7891a`
  - Working → green `#2f8f4e`
  - Dropped → faded / strikethrough `#b0574a`
  - Structure (no status) → neutral outline
- **Connectors:** parent → child, straight or elbow.
- **Nice-to-have:** a legend frame (status colors) + a "generated from Notion · <date>" caption so no one mistakes it for hand-authored.

## 5. Repaint strategy

**Nuke-and-repaint on demand is acceptable and recommended for v1** (clear the board's generated items, redraw). It's simple and the tree is small. Caveat: it wipes any manual annotations — so either (a) accept that the board is machine-owned, or (b) draw everything inside one dedicated `frame` named `AUTO — do not edit` and only clear that frame, leaving the rest of the canvas for human notes. Prefer (b). Do **not** build a diff engine for v1.

## 6. Trigger

- ✅ **On-demand** — a button in the Tree tab (strategy session may add the button; it calls your sync endpoint) and/or a CLI script `scripts/sync-miro.ts <accountId>`.
- ✅ optional **nightly cron** (you own crons) as a safety refresh.
- ❌ **No** Notion-webhook / real-time sync — over-engineering for a biweekly change.

## 7. Two phases

**(a) Prototype — Claude-driven, via MCP (cheap validation, do first)**
A Claude skill/command that reads the tree (Notion MCP) and draws the board (Miro MCP — Canvas Composer SVG; load `canvas_get_canvas_composer_skill` first). No tokens, no app code. Purpose: prove the "living board" is actually useful before building (b). ~20 MCP calls; fine on Miro Free (100/day).

**(b) Productized — in-app function (the real deliverable)**
`src/lib/miro/sync.ts` (new, plumbing-owned):
- `syncTreeToMiro(accountId): Promise<{ boardUrl, nodeCount }>`
- reads `getTree(accountId)`, lays out, draws via **Miro REST API v2** (`/v2/boards/{id}/shapes|connectors|frames`).
- Endpoint: `POST /api/accounts/[id]/tree/miro-sync` (guard behind the same admin access as other internal routes).

## 8. Auth (for phase b)

Miro REST API needs an access token. Options: a Miro OAuth2 app, or a single long-lived board/team token in env (`MIRO_ACCESS_TOKEN`). A team token is simplest for a one-workspace internal tool. **Never expose it client-side**; the sync runs server-side only. Pattern-match `drive.ts`'s service-account approach (server-only credential).

## 9. Edge cases

- **Empty / all-Untested tree** (new client, day 1): draw the seeded nodes, all grey. Must not error on zero stories/posts.
- **Board missing:** create it, name it `Waterline – <Client>`, persist the id.
- **Level renamed** (Structure/Situation/Sub-branch → Field/Class/Side/…): layout must survive it → key depth off the parent chain, not the label.
- **Large tree:** Greg's is ~25 nodes; fine. If a client ever exceeds ~150 nodes, revisit spacing.

## 10. Acceptance

- `POST /api/accounts/greg-caseley/tree/miro-sync` redraws board `uXjVERN-9qM=` to match the live Notion tree: Residential (Buyers/Sellers) + Land branch, the three Nov-5 sub-branches (Out-of-province, US buyers, Listing in winter), colors matching each node's Status.
- Re-running is idempotent (same tree → same board, no duplicate items).
- Running on a fresh/empty client tree produces a valid all-grey seeded board, no crash.

## 11. Sequencing

1. **Wait for / coordinate on `tree.ts`** (strategy lane). Until merged, only the phase-(a) prototype, marked temporary.
2. Build phase (b) as a **consumer** of `tree.ts`.
3. Don't write Notion-parsing you'll throw away.

## References

- Strategy read model (dependency): `docs/BRIEF-tree-read-models.md`, `src/lib/notion/tree.ts`.
- Notion: Greg's Tree `collection://0c99ea02-46b2-4002-9994-953cce6163bf`; Seed Tree `collection://97500f45-a27b-45a2-bba9-2eda9e980d07`; Tree-changes `collection://daf68cf4-8382-45b6-aa2c-91577780075d`.
- Miro boards: `Waterline – Greg Caseley` `https://miro.com/app/board/uXjVERN-9qM=/`; `Waterline – Situation Tree` (seed) `https://miro.com/app/board/uXjVETYmKfM=/`.
- Miro REST API v2: boards / shapes / connectors / frames endpoints.
- Lane boundaries & frozen schemas: `CLAUDE.md` session protocol + `docs/BRIEF-tree-read-models.md` §"File split".
