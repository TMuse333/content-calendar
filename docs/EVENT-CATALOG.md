# Event Catalog — the system's dictionary of information transfers

Status: DRAFT (no code). Owner: CMD-01. Last updated: 2026-11-20.
Companion to `ARCHITECTURE-notify.md`. This is the **catalog** (the types that
*can* occur). The **log** (instances that *did* occur) is a separate append-only
store queried by the console for per-client + aggregate views.

Seed registry — defined from the 5 SITREPs' emit points. Grows deliberately;
v1 only needs the handful the first caller emits.

---

## Conventions (read first)

**Naming.** `domain.verb_noun`, lowercase, dot-namespaced. One domain prefix per
source concern (`listing.*`, `recap.*`). The prefix is what makes Slack channels
parseable and aggregates possible.

**Envelope (auto-attached by notify — never in payload).** Every event carries:
`{ accountId, event, emittedAt, source, idempotencyKey? }`. Payload below is only
the event-specific `data`.

**Visibility (default-deny).** Default is `internal`. An event is only `client`
if marked so here **and** on the account's allowlist. Catalog default is a
recommendation; the per-account allowlist is the real gate.

**Severity.** `info` (log it) · `notable` (worth a glance) · `warning` (degraded)
· `critical` (act now). Drives ordering + which land in `#alerts`.

**Channels.** Logical defaults. The *actual* Slack channel is resolved from the
account config + visibility (`client` → `#<account>`, `internal` →
`#<account>-internal` / `#system` / `#alerts`).

**Idempotency.** Events that can fire repeatedly (first-view hooks, cron retries)
MUST send an `idempotencyKey` so notify dedupes. Flagged ⟲ below.

**Templates.** `client` events MUST define client copy (friendly, no raw JSON).
`internal` events render compact/raw.

**Evolution.** Payload is additive-only. A new *required* field = a new event or
a `.v2`. Never repurpose an existing name.

---

## listing.*  — source: syntellic-agent

| Event | Payload (data) | Vis | Chan | Sev | Client copy / notes |
|---|---|---|---|---|---|
| `listing.added` | listingId, address, price, propertyType, mlsNumber | client | slack | info | "🏡 New listing: {address} — {price}" |
| `listing.status_changed` | listingId, address, from, to, price? | client | slack, email | info | sub-states: listed · price_adjustment · accepted_offer · closed. "🏡 {address} is now {to}" / price: "💲 {address} now {price}" |
| `listing.open_house_toggled` | listingId, address, open, datetime? | client | slack | info | "📅 Open house {open?scheduled:cancelled}: {address}" |

## lead.*  — source: syntellic-agent chatbot + greg-caseley form

| Event | Payload | Vis | Chan | Sev | Client copy / notes |
|---|---|---|---|---|---|
| `lead.captured` | name, email?, phone?, source, intent?, message? | client | slack, email | notable | `source`: website_form \| chatbot. "🎯 New lead: {name} — {intent}" |

> **Consolidation:** `contact.lead` (website form) and `lead.captured` (chatbot)
> are the same transfer. **Deprecate `contact.lead`** → `lead.captured` with
> `source: "website_form"`. One event, one aggregate.

## question.*  — source: syntellic-agent chatbot

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `question.unanswered` | question, sessionId | internal | slack-internal | notable | A content gap — feeds back to the brain (strategy-app) to author coverage. High-value signal, not noise. |

## booking.*  — source: syntellic-agent

| Event | Payload | Vis | Chan | Sev | Client copy |
|---|---|---|---|---|---|
| `booking.made` | name, email, datetime, type | client | slack, email | notable | "📆 {name} booked a {type} — {datetime}" |

## content.*  — source: syntellic-agent ingest

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `content.synced` | itemsAdded, itemsUpdated, source, durationMs | internal | system | info | Ingest run complete. |

## recap.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Client copy / notes |
|---|---|---|---|---|---|
| `recap.ready` | recapId, callId, client | internal | slack | notable | Draft staged for operator review. "📝 Recap ready to review: {client}" |
| `recap.approved` | recapId, client | internal | slack | info | |
| `recap.sent` | recapId, client, link, title | client | email | notable | "Your recap: {title} → {link}". ⚠ `link` MUST be the public custom domain, never *.vercel.app (SSO-walled). |

## call.*  — source: strategy-app (future)

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `call.transcript_landed` | callId, client, durationMs | internal | slack | info | Future — Zoom webhook pipeline. |

## render.*  — source: video-syntellic (runs local)

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `render.completed` | renderId, projectId, durationMs, blobUrl | internal | system | info | Thomas waits on this. Carry lineage {accountId, projectId}. |
| `render.failed` | renderId, projectId, error | internal | alerts | warning | "⚠️ Render failed: {project} — {error}" |

## review.*  — source: video-syntellic review pipeline

| Event | Payload | Vis | Chan | Sev | Client copy / notes |
|---|---|---|---|---|---|
| `review.published` | reviewId, projectId, token, link | client | slack, email | notable | "🎥 Your video is ready to review: {link}". Lineage {accountId, projectId, token}. |
| `review.viewed` ⟲ | reviewId, token, firstViewedAt | internal | slack-internal | notable | **Dedupe to true first-view** (idempotencyKey = reviewId) — fires on every GET today, must not cry wolf. The "did the client open it" signal Thomas wanted. |
| `review.feedback` | reviewId, decision, notes? | internal | slack | notable | decision: approve \| request_changes |
| `review.approved` | reviewId, projectId | internal | slack | info | |
| `review.changes_requested` | reviewId, notes | internal | alerts | notable | Needs operator action. |

## post.*  — source: strategy-app (PLUMB)

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `post.published` | postId, permalink, trigger | internal | system | info | trigger: cron \| manual \| mcp. "📣 Published: {permalink}" |
| `post.publish_failed` | postId, error | internal | alerts | critical | "🚑 Publish failed: {error}" |
| `post.scheduled` | postId, scheduledFor | internal | slack | info | |

## cron.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `cron.step_failed` ⟲ | job, step, error | internal | alerts | critical | Crons retry → send idempotencyKey so one failure isn't N pings. |

## ig.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `ig.token_refreshed` | accountId | internal | system | info | |
| `ig.token_expiring` | accountId, expiresIn | internal | alerts | warning | "⏰ IG token for {account} expires in {expiresIn}" |

## share_link.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `share_link.opened` ⟲ | linkId, resource | internal | slack-internal | info | Same first-open/dedupe pattern as `review.viewed`. |
| `share_link.reaction` | linkId, reaction, resource | internal | slack | notable | reaction: 👍 \| ✏️. "{reaction} on {resource}" |

## answers.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `answers.submitted` | formId, count | internal | slack | notable | Client submitted Asks/answers. |

## carousel.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `carousel.staged` | carouselId | internal | slack | info | Zip → staged carousel ready for approval. |

## metrics.*  — source: strategy-app

| Event | Payload | Vis | Chan | Sev | Notes |
|---|---|---|---|---|---|
| `metrics.synced` | reach, posts, period | internal | system | info | Nightly. Candidate to become a *client-facing digest* later (would flip to `client`). |

---

## Ground-truth corrections (code analysis · 2026-11-20)

Read directly from `_legacy/notify`, `website-agent`, and `strategy-app`. These
override the SITREP-seeded entries above where they conflict.

**listing.*** (website-agent `src/lib/notify/listingUpdate.ts`)
- Real seam: `notifyListingUpdate(accountId, listing, action)`, `action =
  "added" | "status" | "updated"`. **Add `listing.updated`** (non-status patches:
  price, description, isPublic). `status` sub-states confirmed: listed ·
  price_adjustment · accepted_offer · closed.
- **Drop `listing.open_house_toggled`** — `openHouse` is a boolean *field* on the
  listing, noted inline, not its own event.

**lead.*** (website-agent `src/lib/chat/{engine,brief}.ts`)
- Both leads fire `sendLeadBrief()`. Real payload is the full `Lead` brief:
  name, contact, situationSummary, personalQuestion, stageReached, **leadType**
  ("booking"|"nurture"), meeting?, utm, topicId, listingIds, questionTrail,
  conversationId. (My earlier payload was far too thin.)
- `booking.made` = `lead.captured` with `leadType:"booking"` — **candidate merge**
  (keep split only if the aggregate value justifies it).
- `question.unanswered` → actual name `unanswered_question`, payload `{ question }`.
- Recipient = `account.agent.notifyEmail`. From = `LEADS_FROM_EMAIL`
  (default `leads@syntellic.ai`).

**strategy-app** (`src/lib/notion/alerts.ts`, `src/lib/email/recap-email.ts`)
- ⚠ **Alerting today is NOTION, not Slack** — `alertFailure(source, lines)`
  writes a Notion page *comment* + optional @mention (`NOTION_NOTIFY_USER_ID`).
  So the **Notion adapter matters sooner than "v2"** if we want parity; interim
  plan = dual-emit (keep Notion, add notify-slack).
- `ig.token_expiring` **does not exist** — real events are `ig.token_refreshed`
  and `ig.token_refresh_failed` (the one worth alerting).
- `recap.sent` payload = `{ to, clientName, callTitle, link }`. Link =
  `${req.nextUrl.origin}/r/<token>` → **will be a *.vercel.app SSO-walled URL
  unless origin is the custom domain. Must force `strategy.syntellic.ai`.**
- ⚠ **recap email currently sends from `onboarding@resend.dev` (Resend SANDBOX)**
  — deliverability-limited; a real consolidation win is moving it to a verified
  from-address in notify.
- `share_link.opened` already dedupes to first-open in-app. `share_link.reaction`
  values: "looks-good" | "change" (+ optional comment).
- strategy-app has **no EventEmitter** — events are implicit (Mongo/Notion writes,
  API responses). Wiring to notify = *adding* explicit `sendNotification` calls at
  those points.

**video-system** (`src/app/api/render/*`, `src/app/api/review/*`)
- **Nothing notification-wise is built — fully clean seam.** Render signals via an
  SSE stream (`done`/`failed`) to the browser; there's no fired `render.completed`
  event. Add the emit after `recordRender()` (ledger write). Payload available:
  `{ projectId, url, duration, quality:"draft"|"final" }`, `failed:{ error }`.
- `review.viewed` **already dedupes** — `reviewFirstViewedAt` is set once (only
  `reviewViews` counts every GET). So first-view emit is trivial; the SITREP's
  "fires on every GET" was wrong at the data layer.
- Review decisions are `"approve"|"changes"` (not `approved`/`changes_requested`).
  It's **one event** `review.feedback{ decision, comments[{tSec?,text}] }` that
  sets `reviewStatus` — collapse `review.approved`/`review.changes_requested` into
  it (or derive from `decision`).
- Token = `randomBytes(18).toString("base64url")` (24-char), URL `/review/{token}`,
  30-day TTL.
- ⚠ **`accountId` does NOT exist in video-system** — models carry `projectId` +
  `recipient` (a person name or strategy-app slug), not an account. notify's
  contract requires `accountId`, so integration needs either an `accountId` added
  to video-system or a `recipient → accountId` resolver. Real gap, not a SITREP
  detail.
- 🔴 **SECURITY — ALL `/api/*` endpoints are unauthenticated** (no middleware).
  Worse than "just `/api/generate`": `/api/studio/reviews` **publicly lists every
  review token + all feedback**, and anyone can mint tokens via `/api/review/publish`
  or burn Kling credits via `/api/generate`. Elevate to CRITICAL alongside the
  leaked SA key.
- Env: no `RESEND_API_KEY` — video-system sends no email at all today.

**From-address fragmentation (the consolidation target).** Four+ senders in the
wild today: `listings@syntellic.ai`, `leads@syntellic.ai`, `noreply@syntellic.ai`
(greg), `notifications@syntellic.ai` (legacy), `onboarding@resend.dev` (recap
sandbox). notify's per-account/per-stream `from` config collapses these.

**Two naming conventions in the wild.** website-agent uses snake_case
(`booking_made`, `lead_captured`); strategy-app events are implicit. **notify owns
the canonical `dot.namespaced` vocabulary**; each caller maps its internal name →
canonical when it calls `sendNotification`. Translation lives in the caller.

**Analytics ≠ notifications.** website-agent logs many events to Mongo
(`site_visit`, `topic_matched`, `listing_matched`, `chat_start`…) that are NOT
notify-worthy. The catalog marks which events reach notify; the rest stay
analytics-only.

**Integration seams found (make wiring cheap):**
- website-agent: a `NotifyNotifier` dropped into `createProviders()` (alongside
  `FileNotifier`/`ResendNotifier`) — provider swap, not surgery.
- strategy-app: `alertFailure()` and `sendRecapEmail()` are single choke points;
  each gets one added `sendNotification` call.

## Cross-cutting notes

**Client-safe set (allowlist candidates — per-account opt-in):**
`listing.added`, `listing.status_changed`, `listing.open_house_toggled`,
`lead.captured`, `booking.made`, `recap.sent`, `review.published`.
Everything else defaults internal. Greg may not want *all* of these — the
account allowlist is the real switch.

**First-open / dedupe family (⟲):** `review.viewed`, `share_link.opened`,
`cron.step_failed`. All need idempotency so refreshes/retries don't spam.

**Consolidations found:** `contact.lead` → fold into `lead.captured`. Watch for
others as apps report — the catalog is where duplicate transfers get merged
before they fragment the aggregates.

**Severity → routing rule of thumb:** `critical`/`warning` always also hit
`#alerts` regardless of domain, so failures surface in one place.

**What v1 actually needs:** just `lead.captured` (greg-caseley contact form) +
whichever the first caller emits (`listing.status_changed` for AGENT-RT, or
`recap.sent` for STRAT-B). The rest is defined-but-dormant until its app wires in.

---

## Per-client vs aggregate (why this catalog exists)

- **Per-client:** `log WHERE accountId = X` → one client's activity stream.
- **Aggregate:** `log GROUP BY event / domain / status / day` → counts, rates,
  trends across the whole system.

Both are only possible because events are **typed and namespaced here**. Untyped
string events can't be rolled up; defined ones can. This catalog is the contract
that makes the console's two views — and notify's routing — data-driven rather
than hardcoded.
