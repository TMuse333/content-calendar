# Entropy Reduction Levels — Content Strategy Framework

## Core Idea

Every piece of content reduces a prospect's uncertainty about the business.
When enough uncertainty is resolved, booking feels like the obvious next step.
Content progresses from broad (who is this?) to specific (this person understands my exact situation).

- **Lower levels** = broad reach, build recognition
- **Higher levels** = narrower audience, build trust and drive bookings

---

## The Seven Levels

| Level | Name | Question It Answers | Example (Real Estate) |
|-------|------|---------------------|----------------------|
| **L1** | Identity | Who are you, what do you do, where? | "Greg Caseley, RE/MAX agent, PEI" |
| **L2** | Offer | Is this for me? How do I start? | "Helping PEI sellers and buyers. Book a call." |
| **L3** | Process | How does it work? Cost? Timing? | "What selling your home actually costs" |
| **L4** | Proof | Has it worked for people like me? | Sold stats, client stories, testimonials |
| **L5** | Expertise | Do you know this market deeply? | "Is winter a bad time to list in PEI?" |
| **L6** | Situations | Do you understand MY exact situation? | Downsizing, inherited homes, relocating |
| **L7** | Personality | Do I trust and like this person? | Values, behind the scenes, why him |

---

## Level Details

### L1: Identity
- **Purpose:** Basic awareness — they know you exist
- **Content:** Logo, headshot, "Hi I'm X", location tags
- **Reach:** Broadest — anyone in market
- **Goal:** Recognition

### L2: Offer
- **Purpose:** Qualify — is this relevant to them?
- **Content:** Service description, "I help X do Y", clear CTA
- **Reach:** Broad — people considering buying/selling
- **Goal:** Self-selection

### L3: Process
- **Purpose:** Demystify — remove fear of the unknown
- **Content:** Timelines, costs, what to expect, step-by-step
- **Reach:** Medium — people actively considering
- **Goal:** Reduce anxiety, build confidence

### L4: Proof
- **Purpose:** Validate — has this worked before?
- **Content:** Testimonials, sold stats, before/after, case studies
- **Reach:** Medium — people evaluating options
- **Goal:** Trust through evidence

### L5: Expertise
- **Purpose:** Demonstrate depth — do you REALLY know this?
- **Content:** Market insights, trends, local knowledge, advice
- **Reach:** Narrower — engaged prospects
- **Goal:** Authority, "this person knows more than me"

### L6: Situations
- **Purpose:** Mirror — do you understand MY specific case?
- **Content:** Niche scenarios, "if you're X dealing with Y"
- **Reach:** Narrow — specific segments
- **Goal:** "They get me" feeling

### L7: Personality
- **Purpose:** Connect — do I like/trust this person?
- **Content:** Values, stories, humor, behind-the-scenes
- **Reach:** Narrowest — relationship building
- **Goal:** Emotional connection, loyalty

---

## Rules for Content Generation

1. **One level per piece** — Every post targets ONE primary level. Tag it: `level: L1-L7`
2. **One uncertainty resolved** — Every piece resolves ONE specific uncertainty
3. **Packaging requirements:**
   - Hook: surprise / myth vs truth (unexpected = attention)
   - One psychological lever: curiosity gap, social proof, loss aversion, specificity, authority
   - One literary device: contrast, story, concrete numbers
   - One CTA: keyword DM or booking link (UTM tagged)
4. **Accuracy first** — Never alter facts or imply features that don't exist

---

## Content Mix Guidelines

Target distribution (adjust based on performance data):

| Levels | Percentage | Focus |
|--------|------------|-------|
| L1-L2 | ~20% | Listings, branding, recognition |
| L3-L4 | ~30% | Process, proof |
| L5-L6 | ~40% | Expertise, specific situations |
| L7 | ~10% | Personality, trust |

---

## Auditing Existing Content

### Process
1. Pull the last 20-30 posts
2. Tag each post with its primary level
3. Count posts per level and find gaps
4. Typical finding: heavy L1-L2 (listing photos, branding), little L3-L6

### Common Gaps
- **L3 (Process)** — Most agents assume people know how it works
- **L5 (Expertise)** — Agents have knowledge but don't share it
- **L6 (Situations)** — Rarely addressed, highest conversion potential

### Priority
Fill gaps first: L3 (process) and L5-L6 (expertise, situations) usually drive the most inquiries.

---

## LLM Audit Prompt

Use this prompt to classify existing content:

```
Analyze this social media post and classify it according to the Entropy Reduction Framework.

POST CONTENT:
{post_caption}
{post_type: IMAGE/VIDEO/CAROUSEL}

LEVELS:
- L1 (Identity): Who are you, what do you do, where?
- L2 (Offer): Is this for me? How do I start?
- L3 (Process): How does it work? Cost? Timing?
- L4 (Proof): Has it worked for people like me?
- L5 (Expertise): Do you know this market deeply?
- L6 (Situations): Do you understand MY exact situation?
- L7 (Personality): Do I trust and like this person?

Respond in JSON:
{
  "level": "L1-L7",
  "confidence": 0.0-1.0,
  "uncertainty_addressed": "one sentence describing what uncertainty this resolves",
  "reasoning": "brief explanation of classification"
}
```

---

## Monthly Planning Template

```
Client: [Name]
Month: [Month Year]
Audit Date: [Date]
Posts Audited: [N]

CURRENT MIX:
- L1: X%
- L2: X%
- L3: X%
- L4: X%
- L5: X%
- L6: X%
- L7: X%

GAPS IDENTIFIED:
- [Level]: [Why it matters]

GOALS THIS MONTH:
- L3: X posts (topics: ...)
- L5: X posts (topics: ...)
- L6: X posts (topics: ...)

SCHEDULED:
| Date | Level | Topic | Uncertainty Addressed |
|------|-------|-------|----------------------|
```

---

## Tracking

Log per post:
- Level
- Uncertainty addressed
- Hook type
- Format
- Metrics at 24h / 72h:
  - Views
  - Watch time
  - Saves
  - Shares
  - Profile visits
  - Link taps
  - DMs

Compare performance by level over time to refine the mix.

---

## Integration Points

### Strategy App
- Stores audit results per account
- Tracks goals vs actuals
- Assigns levels to scheduled posts

### Graphics App
- Reads target level for each post
- Applies appropriate hooks/devices from playbooks
- Ensures content matches level intent

### Data Model

```typescript
// Account content strategy
contentStrategy: {
  auditedAt: Date,
  postsAudited: number,
  currentMix: { L1: number, L2: number, ... },
  gaps: string[],
  monthlyGoals: {
    month: string, // "2024-01"
    targets: { L3: 2, L5: 4, L6: 2 },
    completed: { L3: 1, L5: 2, L6: 0 }
  }
}

// Per scheduled post
{
  level: "L5",
  uncertaintyAddressed: "Whether winter is a good time to list in PEI",
  // ... other fields
}
```
