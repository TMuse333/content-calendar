# Website Manager System - Claude Session Brief

**Context:** This is part of the Syntellic ecosystem. Read `/docs/RESULTS-SYSTEM.md` first for full context.

---

## The Problem

Syntellic creates content (carousels, videos) that drives traffic to client websites. We can track Instagram metrics but **lose visibility once someone clicks through to a website**. We need to:

1. Track what happens on client websites
2. Capture leads with customizable forms
3. Attribute conversions back to specific content pieces
4. (Later) Use a chatbot to help convert and retrieve content

---

## What To Build

### 1. Lead Gen Package (Priority 1)

A lightweight, embeddable script that any website can install:

```html
<!-- Syntellic Tracking -->
<script src="https://pkg.syntellic.com/track.js" data-account="greg-caseley"></script>
```

**Tracks:**
- Page views
- UTM parameters (source, medium, campaign, content)
- Referrer (instagram.com, facebook.com, etc.)
- Time on page, scroll depth
- Button/link clicks (optional data attributes)

**Sends to Strategy App:**
```typescript
POST https://strategy-app.vercel.app/api/tracking/event
{
  accountId: "greg-caseley",
  eventType: "page_view",
  url: "https://gregcaseley.com/home-value",
  referrer: "https://instagram.com",
  utm: {
    source: "instagram",
    medium: "bio",
    campaign: "carousel-greg-003"
  },
  timestamp: "2026-10-01T14:30:00Z",
  sessionId: "abc123",
  metadata: {
    scrollDepth: 75,
    timeOnPage: 45
  }
}
```

**Requirements:**
- Tiny bundle size (<5kb)
- No dependencies
- GDPR-friendly (no cookies option)
- Works on any site (WordPress, Squarespace, custom)

### 2. Embeddable Form (Priority 1)

A customizable lead capture form:

```html
<div id="syntellic-form" data-account="greg-caseley" data-form="home-value"></div>
<script src="https://pkg.syntellic.com/form.js"></script>
```

**Features:**
- Customizable fields per client (name, email, phone, etc.)
- Custom questions (e.g., "Buying or selling?", "Timeline?")
- "How did you hear about us?" field (backup attribution)
- Styled to match client brand (CSS variables)
- Submits to Strategy App with full UTM context

**Form config (stored in Strategy App):**
```typescript
{
  accountId: "greg-caseley",
  formId: "home-value",
  title: "Get Your Free Home Value Estimate",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "phone", type: "tel", required: false },
    { name: "address", type: "text", label: "Property Address" },
    { name: "timeline", type: "select", options: ["ASAP", "1-3 months", "3-6 months", "Just curious"] },
    { name: "source", type: "select", label: "How did you hear about Greg?",
      options: ["Instagram", "Facebook", "Google", "Referral", "Other"] }
  ],
  submitText: "Get My Estimate",
  successMessage: "Thanks! Greg will be in touch within 24 hours.",
  redirectUrl: "/thank-you"
}
```

**On submit:**
- Creates Outcome in Strategy App (type: "inquiry" or "form_submit")
- Includes UTM attribution
- Optional: webhook to client's CRM/email

### 3. Booking Integration (Priority 2)

Connect to Cal.com or Calendly:

```html
<div id="syntellic-booking" data-account="greg-caseley" data-calendar="cal.com/greg"></div>
```

**Features:**
- Embed booking widget
- On booking confirmed → webhook to Strategy App
- Creates Outcome (type: "meeting")
- Full attribution preserved

### 4. Converse Chatbot (Priority 3 - Later)

Location: `syntellic/products/converse` (already exists, needs connection)

**Phase 1: Meeting Booking**
- "Want to chat with Greg? Book a time here"
- Guides to booking form
- Logs conversation as Outcome

**Phase 2: Content Library**
- "What questions do you have about selling?"
- Retrieves relevant carousel/video content
- "Greg covered this in his recent post: [link]"
- Uses RAG with content from Strategy App

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     pkg.syntellic.com                        │
│  (CDN-hosted package)                                        │
├─────────────────────────────────────────────────────────────┤
│  /track.js     - Analytics tracking script                   │
│  /form.js      - Embeddable form component                   │
│  /form.css     - Default styles (customizable)               │
│  /booking.js   - Cal.com/Calendly wrapper                    │
│  /converse.js  - Chatbot embed (later)                       │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              Strategy App API Endpoints                      │
├─────────────────────────────────────────────────────────────┤
│  POST /api/tracking/event      - Receive page views, clicks │
│  POST /api/tracking/form       - Receive form submissions    │
│  POST /api/tracking/booking    - Receive booking webhooks    │
│  GET  /api/forms/[id]/config   - Get form configuration      │
│  GET  /api/content/[account]   - Get content for chatbot     │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Collections                       │
├─────────────────────────────────────────────────────────────┤
│  tracking_events  - Raw events from websites                 │
│  outcomes         - Converted leads, meetings, deals         │
│  forms            - Form configurations per account          │
│  sessions         - Visitor sessions for attribution         │
└─────────────────────────────────────────────────────────────┘
```

---

## Existing Code References

- **Strategy App:** `/Users/thomasmusial/Desktop/projects/strategy-app`
  - Results types: `/src/lib/types/results.ts`
  - Tracking endpoint needed: `/src/app/api/tracking/event/route.ts`

- **Converse (existing chatbot):** `/Users/thomasmusial/Desktop/syntellic/products/converse`
  - Review existing implementation
  - Connect to Strategy App

- **Syntellic Website:** Check for current structure to understand integration points

---

## Installation Flow (Client Perspective)

1. **In Strategy App:** Go to Settings → Lead Gen Package
2. **Copy snippet:** Get personalized `<script>` tag
3. **Paste in website:** Add before `</body>`
4. **Optional:** Configure form in Strategy App UI
5. **Embed form:** Copy form snippet to desired page
6. **Done:** Events start flowing to Strategy App

---

## Success Criteria

- [ ] Single script install tracks page views + UTM
- [ ] Form submissions create Outcomes in Strategy App
- [ ] Attribution chain preserved: Instagram post → website visit → form submit
- [ ] Works on Syntellic.com and Greg's website
- [ ] Dashboard shows website funnel: visits → form views → submissions

---

## Start Here

1. Read `/docs/RESULTS-SYSTEM.md` for full context
2. Check existing tracking endpoint: `/api/tracking/event/route.ts`
3. Build `track.js` (minimal analytics script)
4. Build `form.js` (embeddable form)
5. Test on Syntellic.com first
6. Deploy to CDN (Vercel edge, Cloudflare, etc.)

---

## Questions To Clarify

- Where to host the package? (Vercel, Cloudflare Workers, separate repo?)
- Cookie-based sessions or cookieless fingerprinting?
- Should forms be React components or vanilla JS?
- Cal.com vs Calendly - which does Greg use?

---

*This brief was generated on October 1, 2026. For latest context, check the Strategy App codebase.*
