# Architecture — `notify.syntellic.ai`, the notification gateway

Status: PROPOSAL (not built). Owner: Thomas. Last updated: 2026-11-19.
Scope: ecosystem-wide. This doc is the source of truth — hand it to any app session.

---

## 1. The problem

Email sending today is **copy-paste reuse**. The greg-caseley site has Resend
wired directly into `src/app/api/send-email/route.ts` — the SDK call, the HTML
template, and the hardcoded recipient all live in the app. If every app does
this:

- the `RESEND_API_KEY` gets sprayed into every app's env (N places to rotate),
- the `syntellic.ai` domain verification pain repeats per app (already hit once
  when domain ownership moved to a new Google account),
- templates/branding drift,
- there is no single log of what was sent across the ecosystem.

Intel (the old 3007 "orchestration brain") is **legacy** — do not centralize on
it. We need a home that outlives whatever is legacy next.

---

## 2. Core principle

**Three layers that compose — never merge them.**

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Brain** (agent app / Waterline + content library) | Decides WHAT to say, WHO to tell, WHEN, WHY | "this lead matches the non-resident node → send the Saint John story" |
| **notify** (`notify.syntellic.ai`) | Delivery only: render a message + push it out reliably | renders template, calls Resend, logs it |
| **Channels** (adapters) | The actual provider | email→Resend, sms→Twilio, slack→webhook |

Discipline (the two invariants that keep this healthy):

1. **notify never makes content decisions.** It is an actuator: "deliver THIS to
   THAT recipient via THESE channels." A brainless contact form and a fully
   agentic outreach flow call the *exact same* API.
2. **The brain never holds provider keys.** Secrets live only in notify.

Mental model: **content library = brain → notify = nervous system → channels =
muscles.**

---

## 3. The proposal (ASCII)

```
                            CALLERS (anyone, anything)
   ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
   │ greg-caseley  │  │ strategy-app │  │  converse    │  │ video.syntellic  │
   │ (contact form)│  │  (the brain) │  │  (product)   │  │ (preview opened) │
   └───────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘
           │                 │                 │                   │
           │   sendNotification({ accountId, event, to, channels, data })
           │                 │                 │                   │
           └─────────────────┴────────┬────────┴───────────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │     notify.syntellic.ai       │
                        │     POST /api/send            │
                        │                               │
                        │  • auth (service token)       │
                        │  • resolve account config     │
                        │      (from-addr, recipients)  │
                        │  • pick template by `event`    │
                        │  • render PER channel          │
                        │  • idempotency / throttle      │
                        │  • queue + retry (later)       │
                        │  • LOG every send              │
                        └───────────────┬───────────────┘
                                        │  fan out to adapters
             ┌──────────────┬───────────┼───────────┬──────────────┐
             ▼              ▼           ▼           ▼              ▼
        ┌─────────┐   ┌─────────┐  ┌────────┐  ┌────────┐   ┌──────────┐
        │  email  │   │   sms   │  │ slack  │  │  push  │   │  notion  │
        │ (Resend)│   │(Twilio) │  │(webhook)│ │        │   │ (DB row) │
        │  v1 ✅  │   │  next   │  │ later  │  │ later  │   │  later   │
        └────┬────┘   └─────────┘  └────────┘  └────────┘   └──────────┘
             │
             │  Resend fires webhooks: email.opened / clicked / bounced
             ▼
        ┌──────────────────────────────────────────────┐
        │  ENGAGEMENT EVENTS (inbound telemetry)         │
        │  notify receives them → emits an event         │
        └───────────────────────┬────────────────────────┘
                                 │
                                 ▼  feeds back to the brain / rules
                         ┌───────────────┐
                         │     BRAIN      │  decides what an open MEANS,
                         │               │  may call notify again (alert you)
                         └───────────────┘


   FIRST-PARTY VIEW TRACKING (your own hosted URLs — NOT email opens)
   ─────────────────────────────────────────────────────────────────
   App sends client a link to your own domain, e.g. video.syntellic.ai/preview/abc.
   Because the page is YOURS, it just tells you when it loads — no pixel needed.

        client opens  video.syntellic.ai/preview/abc
                 │
                 ▼
        route calls  trackClientView({ app, resourceId, clientId })
                 │          (thin shared helper, per-app instrumentation)
                 ▼
        notify.send({ recipient: OPERATOR, event:"client-viewed-preview",
                      channels:["notion"],          ← today; swap to ["sms"] later
                      data:{ client, resource, url } })
                 │
                 ▼
        Notion adapter writes a row  →  you get pinged
        (dedup/throttle by clientId+resourceId so refreshes don't spam you)
```

---

## 4. API contract

One endpoint, one function. The ergonomic surface:

```ts
sendNotification({
  accountId: "greg-caseley",      // who it's on behalf of (multi-tenant)
  event:     "contact-lead",      // maps to a template + default channels
  to:        { email, phone?, userId? },  // explicit destination…
  // …OR: recipientId: "rec_123"  // …which notify resolves to channels + prefs
  channels?: ["email"],           // optional override; else event defaults
  data:      { text, url, ...params },    // template fills from this
  idempotencyKey?: "lead-abc-2026-11-19", // dedup / throttle
}) : Promise<{ notificationId, status }>
```

- `event` selects a **template** that renders **per channel** — email gets HTML,
  sms gets ≤160 chars, push gets title+body, all from the same `data`.
- `to` is an explicit destination OR a `recipientId` notify resolves to a
  person's channels + preferences ("Greg: leads by email+sms; team: Slack").
- Recipients can be **external** (clients) or **internal** (operators/you).
  notify does not care.

### Adapter interface (how channels plug in)

```ts
interface ChannelAdapter {
  channel: "email" | "sms" | "slack" | "push" | "notion" | "webhook";
  send(rendered: RenderedMessage, recipient: Recipient): Promise<{ providerId }>;
}
```

Adding a channel = **one adapter file + one template variant.** Nothing that
calls notify changes. This is the whole payoff of a gateway over a shared Resend
wrapper.

### Thin client (per app)

Mirrors the existing `src/lib/intel.ts` → `fetchListingsFromIntel()` pattern:

```ts
// lib/notify.ts
export async function sendNotification(params) {
  const res = await fetch(`${NOTIFY_URL}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json",
               "Authorization": `Bearer ${NOTIFY_TOKEN}` },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`notify ${res.status}`);
  return res.json();
}
```

greg-caseley's `route.ts` then collapses to:
```ts
sendNotification({ accountId, event: "contact-lead", data: form, to: { email: RECIPIENT } });
```
No Resend SDK, no key, no HTML in the app.

---

## 5. Channels

| Channel | Provider | Status | Notes |
|---------|----------|--------|-------|
| email   | Resend   | **v1** | Lift greg-caseley's HTML as the `contact-lead` template. Resend also gives open/click webhooks for free. |
| sms     | Twilio   | next   | Most likely 2nd channel. 160-char template variant. |
| notion  | Notion API | later | A **destination adapter** (writes a page/row), used for operator alerts like view-tracking. NOT a special function. |
| slack   | incoming webhook | later | Team alerts. |
| push    | web push | later | In-app / browser. |
| webhook | generic  | later | Fire arbitrary JSON at any URL. |

---

## 6. Two distinct capabilities (don't conflate)

**(a) Notification (outbound)** — notify's core job. Send a message to a
recipient over channels.

**(b) Tracking (inbound telemetry)** — "did they open it?" Two sub-cases:

- **Email link opens** → **don't build this.** Resend already tracks open/click
  and fires `email.opened` / `email.clicked` webhooks. notify just subscribes.
- **First-party URL opens** (your own hosted pages, e.g.
  `video.syntellic.ai/preview/…`) → the page is yours, so it instruments itself:
  the route calls `trackClientView(...)` on load, which fires an event at notify.
  No pixel. Needs **dedup/throttle** (first open, or once/day) keyed by
  `clientId + resourceId` so refreshes don't spam.

Detection is per-app. Delivery of the resulting alert is notify. Deciding what an
open *means* is the brain.

---

## 7. Phasing

- **v1 (build now):** standalone `notify` service, **email-only** adapter,
  multi-channel interface + contract frozen. First caller = greg-caseley contact
  form. Synchronous send OK. One Resend key, one verified domain.
- **v2:** Twilio/SMS adapter + per-event channel defaults.
- **v3:** recipient model + preferences + opt-outs; queue + retry; idempotency
  store.
- **v4:** engagement events — Resend webhooks + first-party `trackClientView`
  helper + Notion/Slack operator alerts.
- **v5:** brain-driven proactive outreach (content library → notify), closing
  the loop.

Build v1 small, but freeze the `sendNotification` contract now so every later
phase is **additive, not a refactor** of every app.

---

## 7b. Slack: operator hub + shared human/agent context bus

Thomas is adopting Slack as the system's comms surface (replacing ad-hoc
iMessage from clients like Greg). Slack plays **three** roles here — only the
first is "just a notify channel":

1. **Output channel (adapter)** — notify posts events into Slack
   (`#greg-caseley`, `#system`). Easy; sits next to SMS in the channels table.
2. **Operator cockpit (bidirectional)** — you *reply and command from* Slack.
   A Slack reply → notify → SMS to Greg. Slash commands → the brain. More work:
   inbound webhooks, Twilio two-way, thread↔conversation mapping.
3. **Shared human/agent context bus** — message history becomes ambient context
   any future agent can read. An agent dropped into `#greg-caseley` scrolls the
   channel and sees everything (Greg's asks, your decisions, notify events, prior
   agent actions) instead of a custom briefing. Agents are first-class members:
   @mentioned, reply in-thread, post updates.

**Bridge, don't migrate.** Do NOT move the client onto Slack — Greg texting is
frictionless for him and you don't control his adoption. Bridge instead:

```
   Greg texts  ──▶  Twilio number  ──▶  notify  ──▶  #greg-caseley (Slack)
   (iMessage/SMS)                                         │
   Greg's phone  ◀──  Twilio SMS   ◀──  notify   ◀────────┘  (you reply in Slack)
```

Greg never knows Slack exists; you get searchable, per-client, programmatically
reachable history.

**Caveat — Slack is the collaboration/visibility layer, NOT the system of
record.** Free-tier history caps ~90 days and the API rate-limits bulk reads.
Durable agent memory stays in the brain / content library; Slack is shared
*working* memory. An agent that trusts Slack as source-of-truth loses context at
the 90-day cliff.

**Fit with the model:** this is operator-UX, distinct from the client-notify
core. Role 1 (output adapter) is an early add (v2). Roles 2–3 (cockpit + agent
bus + SMS bridge) are their own mini-project (v3–v4) — name them so they don't
balloon v1. The recipient-preferences concept (§4) already expresses it:
operator pref = `slack`, client pref = `sms`, same `sendNotification` call.

Day-one adoption is tiny: free workspace, a couple channels, no bots/bridge yet.

## 8. Open decisions

1. **Where does notify run** — standalone repo/deploy at `notify.syntellic.ai`
   (recommended for something this cross-cutting) vs. a route inside an existing
   non-legacy app for v1?
2. **Auth between apps and notify** — static service token per app, or something
   richer?
3. **Account config source** — where does notify read per-account `from` address
   + default recipients? (Reuse strategy-app's account config, or notify's own?)
4. **Recipient/preference store** — deferred to v3, but decide early whether it's
   notify's DB or the brain's.

---

## 9. Invariants (the rules that keep it from rotting)

1. notify never decides content; the brain never holds keys.
2. No per-provider functions (`setNotionNotification` ❌). One `sendNotification`;
   providers are adapters.
3. Detection (tracking) is per-app and first-party where possible; notify
   delivers, the brain interprets.
4. The `sendNotification` contract is frozen at v1 — new capability is additive.
