/**
 * Results System Types
 *
 * For tracking content → outcomes → revenue attribution
 */

// Baseline snapshot - captured before campaign starts
export interface Baseline {
  id: string;
  accountId: string;
  capturedAt: Date;
  period: "30d" | "7d" | "all";

  instagram?: {
    reach: number;
    profileVisits: number;
    websiteClicks: number;
    accountsEngaged: number;
    totalInteractions: number;
    followers: number;
    followersGained: number;
    postsCount: number;
    avgEngagementRate: number;
  };

  website?: {
    visits: number;
    uniqueVisitors: number;
    formSubmissions: number;
    bookings: number;
    avgTimeOnSite: number;
  };

  // What client reports manually
  clientEstimate?: {
    inquiriesPerMonth: number;
    meetingsPerMonth: number;
    dealsPerMonth: number;
    notes: string;
  };

  notes?: string;
}

// Individual outcome (meeting, deal, inquiry)
export interface Outcome {
  id: string;
  accountId: string;

  // Type and description
  type: "inquiry" | "dm" | "call" | "meeting" | "deal" | "listing" | "sale";
  title: string;
  description?: string;

  // Value
  value?: number; // Deal value, commission, etc.
  currency?: string;

  // When it happened
  occurredAt: Date;
  closedAt?: Date;

  // Attribution - which content contributed
  attributions: Attribution[];

  // Tracking data (from UTM, DM keywords, etc.)
  source?: string; // instagram, facebook, website, referral, direct
  medium?: string; // organic, paid, bio, story, post
  campaign?: string; // carousel-greg-001
  keyword?: string; // DM keyword like "VALUE"
  referrer?: string;

  // Lead info
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;

  // Status tracking
  status: "new" | "contacted" | "qualified" | "meeting_scheduled" | "won" | "lost";

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Single attribution record
export interface Attribution {
  contentType: "post" | "carousel" | "video" | "graphic" | "story";
  contentId: string;
  postId?: string; // Instagram post ID
  caption?: string;
  postedAt?: Date;
  confidence: "direct" | "likely" | "possible";
  creditPercentage?: number; // For multi-touch attribution
}

// Tracking event from website/app
export interface TrackingEvent {
  id: string;
  accountId: string;
  eventType: "page_view" | "form_submit" | "booking" | "click" | "dm" | "custom";

  // UTM parameters
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };

  referrer?: string;
  url?: string;
  userAgent?: string;

  // Event-specific data
  metadata?: Record<string, unknown>;

  timestamp: Date;
  processedAt?: Date;
}

// Content with tracking ID
export interface TrackedContent {
  trackingId: string; // e.g., "carousel-greg-001"
  accountId: string;
  contentType: "post" | "carousel" | "video" | "graphic";
  contentId: string;
  instagramPostId?: string;

  // Generated tracking URLs
  trackingUrl?: string;
  shortUrl?: string;
  dmKeyword?: string;

  // Performance
  clicks?: number;
  conversions?: number;
  revenue?: number;

  createdAt: Date;
}

// Monthly report data
export interface MonthlyReport {
  id: string;
  accountId: string;
  period: {
    start: Date;
    end: Date;
    month: string; // "October 2026"
  };

  // Headlines
  headline: {
    meetings: number;
    meetingsBaseline: number;
    inquiries: number;
    inquiriesBaseline: number;
    deals?: number;
    revenue?: number;
  };

  // Funnel metrics
  funnel: {
    views: number;
    profileVisits: number;
    linkClicks: number;
    siteVisits: number;
    dmsAndForms: number;
    booked: number;
  };

  // Attribution breakdown
  attributions: {
    contentId: string;
    contentType: string;
    caption?: string;
    outcomes: number;
    outcomeTypes: string[];
  }[];

  // Top performers
  topContent: {
    contentId: string;
    caption?: string;
    metric: string;
    value: number;
    whyItWorked?: string;
  }[];

  // Client-reported wins
  clientWins?: string[];

  // Recommendations
  nextMonth?: string[];

  // Time spent (ideally ~0)
  clientTimeSpent?: string;

  generatedAt: Date;
}

// Funnel stage for visualization
export interface FunnelStage {
  name: string;
  value: number;
  percentage?: number;
  icon?: string;
  color?: string;
}

// Form field type
export interface FormField {
  name: string;
  type: "text" | "email" | "tel" | "select" | "textarea";
  label: string;
  required: boolean;
  options?: string[]; // for select
  placeholder?: string;
}

// Embeddable form configuration
export interface FormConfig {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitText: string;
  successMessage: string;
  redirectUrl?: string;
  styling?: {
    primaryColor?: string;
    fontFamily?: string;
    borderRadius?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Form submission record
export interface FormSubmission {
  id: string;
  formId: string;
  accountId: string;
  data: Record<string, string>;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  sessionId?: string;
  referrer?: string;
  url?: string;
  userAgent?: string;
  submittedAt: Date;
  outcomeId?: string; // Link to created Outcome
}
