"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  Calendar,
  BarChart3,
  Target,
  MessageSquare,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Video,
  Image,
  Zap,
  TrendingUp,
  Users,
  Eye,
  Heart,
  AlertCircle,
  Camera,
  Link2,
} from "lucide-react";

interface OnboardingData {
  account: {
    id: string;
    name: string;
    handle?: string;
    brand?: {
      primaryColor?: string;
      secondaryColor?: string;
    };
    platforms?: {
      instagram?: {
        connected: boolean;
        username?: string;
      };
    };
  };
  onboarding?: {
    welcomeMessage?: string;
    proposedSchedule?: {
      postsPerWeek: number;
      contentMix: { type: string; percentage: number }[];
      startDate?: string;
    };
    questions?: { id: string; question: string; required?: boolean }[];
    expectedResults?: {
      baseline?: { followers?: number; avgReach?: number; avgEngagement?: number };
      targets?: { followers?: number; avgReach?: number; avgEngagement?: number };
      timeline?: string;
    };
  };
  upcomingContent?: {
    type: "carousel" | "video";
    title: string;
    scheduledAt: string;
  }[];
  videoPackages?: {
    name: string;
    description?: string;
    goal?: string;
    episodeCount: number;
    status: string;
  }[];
}

export default function OnboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const accountId = params.accountId as string;

  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    prerequisites: true,
    connect: false,
    schedule: false,
    questions: false,
    analytics: false,
    results: false,
  });

  // Check if just connected
  const justConnected = searchParams.get("instagram") === "connected";
  const connectedUsername = searchParams.get("username");

  useEffect(() => {
    fetchOnboardingData();
  }, [accountId]);

  const fetchOnboardingData = async () => {
    try {
      const res = await fetch(`/api/onboard/${accountId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Account not found. Please check the link and try again.");
        } else {
          setError("Failed to load onboarding data.");
        }
        return;
      }
      const json = await res.json();
      setData(json);

      // Auto-expand connect section if prerequisites are likely done
      if (json.account && !json.account.platforms?.instagram?.connected) {
        setExpandedSections((prev) => ({ ...prev, connect: true }));
      }
    } catch (err) {
      setError("Failed to load onboarding data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isConnected = data?.account?.platforms?.instagram?.connected;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Oops!</h1>
          <p className="text-slate-400">{error || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  const primaryColor = data.account.brand?.primaryColor || "#06b6d4";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {data.account.name}!
          </h1>
          <p className="text-slate-400 mt-1">
            Let&apos;s get your content strategy set up.
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {justConnected && (
        <div className="bg-green-500/10 border-b border-green-500/20">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-400">
              Successfully connected {connectedUsername || "Instagram"}! We can now sync your analytics.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {/* Section 1: Prerequisites */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("prerequisites")}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-cyan-500 font-semibold text-sm">1</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Prerequisites</h2>
                <p className="text-sm text-slate-400">Set up your Facebook Page & Instagram Business Account</p>
              </div>
            </div>
            {expandedSections.prerequisites ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.prerequisites && (
            <div className="px-4 pb-4 border-t border-slate-800">
              <div className="mt-4 space-y-6">
                {/* Step 1: Facebook Page */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">Step 1: Create a Facebook Page</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Meta requires a Facebook Page to access Instagram analytics. This takes about 2 minutes
                      and the page doesn&apos;t need to be used publicly.
                    </p>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">1.</span>
                        <span>
                          Go to{" "}
                          <a
                            href="https://www.facebook.com/pages/create"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            facebook.com/pages/create
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">2.</span>
                        <span>Choose &quot;Business or Brand&quot;</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">3.</span>
                        <span>Name it anything (your name or business works)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">4.</span>
                        <span>Skip all optional steps (profile photo, bio, etc.)</span>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Step 2: Business/Creator Account */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-pink-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">Step 2: Switch to Business/Creator Account</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Your Instagram account needs to be a Business or Creator account (not Personal)
                      to access analytics.
                    </p>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">1.</span>
                        <span>Open Instagram → Settings → Account</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">2.</span>
                        <span>Tap &quot;Switch to Professional Account&quot;</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">3.</span>
                        <span>Choose &quot;Business&quot; or &quot;Creator&quot; (either works)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">4.</span>
                        <span>Select a category and complete setup</span>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Step 3: Link to Facebook */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">Step 3: Connect Instagram to Facebook Page</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Link your Instagram Business Account to the Facebook Page you created.
                    </p>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">1.</span>
                        <span>On Instagram, go to Settings → Account → Sharing to Other Apps</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">2.</span>
                        <span>Tap &quot;Facebook&quot;</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">3.</span>
                        <span>Log in if needed, then select the Page you created</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-500">4.</span>
                        <span>Done! Your accounts are now linked</span>
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
                  <p className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">Why is this needed?</strong> Meta (Facebook/Instagram)
                      requires this setup to allow third-party apps to access your Instagram analytics.
                      The Facebook Page is just a technical requirement &mdash; you don&apos;t need to post to it.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Connect Instagram */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("connect")}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isConnected ? "bg-green-500/20" : "bg-pink-500/20"
                }`}
              >
                {isConnected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <span className="text-pink-500 font-semibold text-sm">2</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Connect Instagram</h2>
                <p className="text-sm text-slate-400">
                  {isConnected
                    ? `Connected as ${data.account.platforms?.instagram?.username || data.account.handle}`
                    : "Link your account to enable analytics sync"}
                </p>
              </div>
            </div>
            {expandedSections.connect ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.connect && (
            <div className="px-4 pb-4 border-t border-slate-800">
              <div className="mt-4">
                {isConnected ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="text-green-400 font-medium">Instagram Connected</p>
                        <p className="text-sm text-slate-400">
                          Your account is connected and we can sync your analytics.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 text-sm mb-4">
                      Once you&apos;ve completed the prerequisites above, click the button below to connect
                      your Instagram account. You&apos;ll be redirected to Facebook to authorize the connection.
                    </p>
                    <a
                      href={`/api/auth/instagram/connect?accountId=${accountId}&source=onboard`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-medium rounded-lg transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Connect Instagram
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <p className="text-xs text-slate-500 mt-3">
                      We&apos;ll request access to your account analytics and posting capabilities.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Proposed Schedule */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("schedule")}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Proposed Schedule</h2>
                <p className="text-sm text-slate-400">Your content calendar and posting rhythm</p>
              </div>
            </div>
            {expandedSections.schedule ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.schedule && (
            <div className="px-4 pb-4 border-t border-slate-800">
              <div className="mt-4 space-y-4">
                {/* Video Packages */}
                {data.videoPackages && data.videoPackages.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-400 mb-3">Video Packages</p>
                    <div className="space-y-2">
                      {data.videoPackages.map((pkg, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-white">{pkg.name}</h4>
                              {pkg.description && (
                                <p className="text-sm text-slate-400 mt-1">{pkg.description}</p>
                              )}
                              {pkg.goal && (
                                <p className="text-xs text-cyan-400 mt-2">Goal: {pkg.goal}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-white">{pkg.episodeCount}</span>
                              <p className="text-xs text-slate-500">episodes</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule Stats */}
                {data.onboarding?.proposedSchedule && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400">Posts per Week</p>
                        <p className="text-2xl font-bold text-white">
                          {data.onboarding.proposedSchedule.postsPerWeek}
                        </p>
                      </div>
                      {data.onboarding.proposedSchedule.startDate && (
                        <div className="bg-slate-800/50 rounded-lg p-4">
                          <p className="text-sm text-slate-400">Starting</p>
                          <p className="text-2xl font-bold text-white">
                            {new Date(data.onboarding.proposedSchedule.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {data.onboarding.proposedSchedule.contentMix && data.onboarding.proposedSchedule.contentMix.length > 0 && (
                      <div>
                        <p className="text-sm text-slate-400 mb-3">Content Mix</p>
                        <div className="space-y-2">
                          {data.onboarding.proposedSchedule.contentMix.map((item) => (
                            <div key={item.type} className="flex items-center gap-3">
                              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-cyan-500"
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-2 w-32">
                                {item.type.toLowerCase().includes("video") ? (
                                  <Video className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <Image className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="text-sm text-slate-300">{item.type}</span>
                                <span className="text-xs text-slate-500">{item.percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Upcoming Content */}
                {data.upcomingContent && data.upcomingContent.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-400 mb-3">Upcoming Content</p>
                    <div className="space-y-2">
                      {data.upcomingContent.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.type === "video" ? "bg-pink-500/20" : "bg-cyan-500/20"
                          }`}>
                            {item.type === "video" ? (
                              <Video className="w-4 h-4 text-pink-500" />
                            ) : (
                              <Image className="w-4 h-4 text-cyan-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.title}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(item.scheduledAt).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!data.onboarding?.proposedSchedule && !data.videoPackages?.length && !data.upcomingContent?.length && (
                  <div className="text-center py-8 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Schedule details coming soon</p>
                    <p className="text-sm text-slate-500 mt-1">
                      We&apos;ll finalize your content calendar together.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Strategy Questions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("questions")}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Strategy Questions</h2>
                <p className="text-sm text-slate-400">Help us understand your goals</p>
              </div>
            </div>
            {expandedSections.questions ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.questions && (
            <div className="px-4 pb-4 border-t border-slate-800">
              <div className="mt-4 space-y-4">
                {data.onboarding?.questions && data.onboarding.questions.length > 0 ? (
                  data.onboarding.questions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white mb-2">
                        {idx + 1}. {q.question}
                        {q.required && <span className="text-red-400 ml-1">*</span>}
                      </p>
                      <textarea
                        placeholder="Your answer..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        rows={3}
                      />
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white mb-2">1. What&apos;s your primary goal with content?</p>
                      <textarea
                        placeholder="e.g., Get more listing appointments, build brand awareness..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        rows={3}
                      />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white mb-2">2. Who is your ideal client?</p>
                      <textarea
                        placeholder="e.g., First-time homebuyers in Halifax, luxury sellers..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        rows={3}
                      />
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white mb-2">3. What topics are you comfortable talking about?</p>
                      <textarea
                        placeholder="e.g., Market updates, home buying tips, neighborhood guides..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Analytics Explanation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("analytics")}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">What We&apos;ll Track</h2>
                <p className="text-sm text-slate-400">The metrics that matter for your business</p>
              </div>
            </div>
            {expandedSections.analytics ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.analytics && (
            <div className="px-4 pb-4 border-t border-slate-800">
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <Eye className="w-6 h-6 text-cyan-500 mb-2" />
                  <h4 className="font-medium text-white">Reach</h4>
                  <p className="text-sm text-slate-400">
                    How many unique people see your content
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <Heart className="w-6 h-6 text-pink-500 mb-2" />
                  <h4 className="font-medium text-white">Engagement</h4>
                  <p className="text-sm text-slate-400">
                    Likes, comments, saves, and shares
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <Users className="w-6 h-6 text-purple-500 mb-2" />
                  <h4 className="font-medium text-white">Follower Growth</h4>
                  <p className="text-sm text-slate-400">
                    New followers from your content
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <TrendingUp className="w-6 h-6 text-green-500 mb-2" />
                  <h4 className="font-medium text-white">Performance Trends</h4>
                  <p className="text-sm text-slate-400">
                    What&apos;s working and what to do more of
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Monthly Reports Include:</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Top performing content analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    AI-powered content insights
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Video comparison breakdowns
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Business outcome tracking (leads, meetings)
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Expected Results */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("results")}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Expected Results</h2>
                <p className="text-sm text-slate-400">What success looks like</p>
              </div>
            </div>
            {expandedSections.results ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.results && (
            <div className="px-4 pb-4 border-t border-slate-800">
              <div className="mt-4">
                {data.onboarding?.expectedResults ? (
                  <div className="space-y-4">
                    {data.onboarding.expectedResults.timeline && (
                      <p className="text-slate-400">
                        Timeline: <span className="text-white">{data.onboarding.expectedResults.timeline}</span>
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Current (Baseline)</p>
                        <div className="space-y-2">
                          {data.onboarding.expectedResults.baseline?.avgReach && (
                            <div className="bg-slate-800/50 rounded p-3">
                              <p className="text-xs text-slate-400">Avg Reach</p>
                              <p className="text-lg font-semibold text-white">
                                {data.onboarding.expectedResults.baseline.avgReach.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-green-500 mb-2">Target</p>
                        <div className="space-y-2">
                          {data.onboarding.expectedResults.targets?.avgReach && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                              <p className="text-xs text-green-400">Avg Reach</p>
                              <p className="text-lg font-semibold text-green-400">
                                {data.onboarding.expectedResults.targets.avgReach.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-slate-400 text-sm">
                      After connecting your Instagram, we&apos;ll establish your baseline metrics and set realistic targets together.
                    </p>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">Typical Results (3-6 months)</h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-cyan-500" />
                          2-3x increase in average reach per post
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-cyan-500" />
                          Higher engagement rates from targeted content
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-cyan-500" />
                          Consistent posting rhythm (no more guessing)
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-cyan-500" />
                          Clear attribution: which content drives business
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>Questions? Reply to the email that sent you this link.</p>
        </div>
      </div>
    </div>
  );
}
