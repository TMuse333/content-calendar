# Results System Specification

**Created:** October 1, 2026
**Goal:** Prove that Syntellic content produces booked meetings and closed deals.

---

## The Problem

We can track **views and engagement** but can't prove:
- "This carousel → this inquiry → this meeting"
- "These 8 carousels → 4 booked meetings → 2 closed deals"
- "Greg's $1,000/month investment → $X in commission"

## The Solution

A full-funnel tracking system that connects:
```
Content Posted → Views → Profile Visits → Link Clicks → Site Visits → DMs/Forms → Meetings → Deals
```

---

## Architecture

### 1. Lead Gen Package (for client websites)

A lightweight script/integration that any client website can add:

```html
<!-- Syntellic Tracking -->
<script src="https://tracking.syntellic.com/s.js" data-account="greg-caseley"></script>
```

**Tracks:**
- Page views with UTM parameter parsing
- Form submissions with source attribution
- Booking confirmations (Cal.com/Calendly webhooks)
- Time on page, scroll depth

**Sends to Strategy App:**
```typescript
POST /api/tracking/event
{
  accountId: "greg-caseley",
  eventType: "form_submit" | "page_view" | "booking",
  utm: { source, medium, campaign, content },
  referrer: "instagram.com",
  timestamp: "2026-10-01T14:00:00Z",
  metadata: { formName, leadEmail, ... }
}
```

### 2. Strategy App Additions

**New Database Collections:**

```typescript
// Baselines - snapshot before campaign starts
interface Baseline {
  accountId: string;
  capturedAt: Date;
  period: "30d";
  instagram: {
    reach: number;
    impressions: number;
    profileVisits: number;
    linkTaps: number;
    followers: number;
  };
  website?: {
    visits: number;
    formFills: number;
    bookings: number;
  };
  clientEstimate?: {
    inquiriesPerMonth: number;
    notes: string;
  };
}

// Outcomes - meetings, calls, deals
interface Outcome {
  accountId: string;
  type: "inquiry" | "dm" | "call" | "meeting" | "deal";
  description: string;
  value?: number;           // Deal value if applicable
  occurredAt: Date;

  // Attribution
  attributedTo: {
    contentType: "post" | "carousel" | "video" | "graphic";
    contentId: string;
    caption?: string;
    confidence: "direct" | "likely" | "possible";
  }[];

  // Tracking data
  utmCampaign?: string;
  utmSource?: string;
  keyword?: string;         // DM keyword like "VALUE"

  // Status
  status: "new" | "qualified" | "won" | "lost";
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Tracking Events - from Lead Gen Package
interface TrackingEvent {
  accountId: string;
  eventType: string;
  utm: Record<string, string>;
  referrer?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
```

**New Pages:**

1. `/account/[id]/results` - Results Dashboard
   - Headline metrics: meetings booked, inquiries, deals
   - Funnel visualization
   - Attribution breakdown by content
   - Comparison to baseline

2. `/account/[id]/outcomes` - Outcome Logger
   - Log meetings, calls, deals
   - Link to specific content pieces
   - Track status through pipeline

3. `/account/[id]/baseline` - Baseline Capture
   - One-click snapshot of current state
   - Store for comparison later

**New API Endpoints:**

- `POST /api/tracking/event` - Receive events from Lead Gen Package
- `POST /api/accounts/[id]/baseline` - Capture baseline
- `GET/POST /api/accounts/[id]/outcomes` - CRUD outcomes
- `GET /api/accounts/[id]/results/report` - Generate monthly report

### 3. Content Tagging

Every piece of content gets a tracking ID:

**Carousels:**
- ID: `carousel-greg-001`
- UTM: `?utm_source=instagram&utm_medium=carousel&utm_campaign=carousel-greg-001`
- DM Keyword: `VALUE001`

**Links in bio/stories:**
- `https://gregcaseley.com/home-value?utm_source=instagram&utm_medium=bio&utm_campaign=carousel-greg-001`

### 4. Instagram DM Tracking

Using Instagram Messaging API (requires business account):

- Set up webhook for incoming DMs
- Match keywords (e.g., "VALUE", "SOLD", "ESTIMATE")
- Auto-reply with booking link
- Log as outcome with attribution

---

## Implementation Phases

### Phase 1: Foundation (This Week)
- [ ] Create `baselines` collection
- [ ] Create `outcomes` collection
- [ ] Build baseline capture endpoint
- [ ] Build outcome logging UI
- [ ] Capture baseline for: Syntellic, Thomas Musial, Greg Caseley

### Phase 2: Attribution (Week 2)
- [ ] Add `trackingId` field to posts
- [ ] Generate UTM links for each post
- [ ] Build outcomes → content linking UI
- [ ] Create simple results dashboard

### Phase 3: Automation (Week 3)
- [ ] Build Lead Gen Package (tracking script)
- [ ] Website form integration
- [ ] Cal.com/Calendly webhook integration
- [ ] Instagram DM keyword tracking

### Phase 4: Reporting (Week 4)
- [ ] Monthly report generator
- [ ] PDF/image export for sharing
- [ ] Comparison to baseline
- [ ] Top performers analysis

---

## Monthly Report Format

```
+------------------------------------------+
|  GREG CASELEY - OCTOBER RESULTS          |
|  ======================================  |
|  4 booked meetings    (baseline: 0)      |
|  11 inquiries         (baseline: ~2)     |
|------------------------------------------|
|  FUNNEL                                  |
|  Views       18,400                      |
|  Profile       620                       |
|  Link clicks   140                       |
|  Site visits   120                       |
|  DMs / forms    11                       |
|  Booked          4                       |
|------------------------------------------|
|  WHERE BOOKINGS CAME FROM                |
|  Carousel 3 "Closing costs"   2  (IG)    |
|  Carousel 5 "Sell in winter?" 1  (IG)    |
|  Facebook post                1          |
|------------------------------------------|
|  YOUR TIME SPENT: ~0 hrs                 |
|  NEXT MONTH: test video b-roll format    |
+------------------------------------------+
```

---

## Testing on Syntellic First

Before rolling out to Greg:

1. **Capture Syntellic baseline today** (Oct 1)
2. **Post carousel** (already scheduled)
3. **Post EP02 video** (just posted)
4. **Set up landing page** with booking form
5. **Track outcomes** for 30 days
6. **Generate report** on Nov 1

This proves the system works before selling it.

---

## Files to Create

```
/src/lib/types/results.ts          # Baseline, Outcome, TrackingEvent types
/src/app/api/accounts/[id]/baseline/route.ts
/src/app/api/accounts/[id]/outcomes/route.ts
/src/app/api/tracking/event/route.ts
/src/app/account/[id]/results/page.tsx
/src/app/account/[id]/outcomes/page.tsx
/src/app/account/[id]/baseline/page.tsx
```

---

## Success Metrics

For Syntellic (Thomas) in October:
- [ ] Baseline captured
- [ ] 4+ content pieces posted with tracking IDs
- [ ] Landing page with form tracking
- [ ] At least 1 tracked inquiry/meeting
- [ ] November report generated

For Greg in November:
- [ ] Baseline captured before first carousel
- [ ] 8 carousels posted with tracking
- [ ] Website booking page live
- [ ] Monthly report delivered before renewal decision

---

*This document lives at `/docs/RESULTS-SYSTEM.md` and should be updated as the system evolves.*
