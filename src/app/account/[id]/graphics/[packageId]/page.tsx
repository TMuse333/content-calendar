"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Image,
  LayoutGrid,
  AlertCircle,
  Home,
  CheckCircle,
  Calendar,
  Tag,
  MapPin,
  ExternalLink,
  MessageSquare,
  Clock,
  ChevronRight,
  X,
  Target,
  Users,
  Sparkles,
  ListOrdered,
  MousePointer,
  Palette,
  Megaphone,
  Layers,
  RefreshCw,
  Play,
  CheckSquare,
  Square,
  Zap,
} from "lucide-react";
import { CarouselWizard } from "@/components/CarouselWizard";
import {
  ENTROPY_LEVELS,
  LEVEL_COLORS,
  type EntropyLevel,
} from "@/lib/entropy";
import type {
  GraphicPackage,
  AnnouncementUsage,
  AnnouncementType,
  QuestionBankItem,
  ScheduledCarousel,
} from "@/lib/types/graphic-package";

const graphicTypeConfig: Record<
  AnnouncementType,
  { label: string; color: string; bgColor: string }
> = {
  "new-listing": {
    label: "New Listing",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  sold: {
    label: "Sold",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  "open-house": {
    label: "Open House",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  "price-change": {
    label: "Price Change",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  other: {
    label: "Other",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
};

const categoryConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  buyer: { label: "Buyer", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  seller: { label: "Seller", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  general: { label: "General", color: "text-slate-400", bgColor: "bg-slate-500/20" },
};

export default function GraphicPackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentAccount } = useAccount();
  const packageId = params.packageId as string;

  const [pkg, setPkg] = useState<GraphicPackage | null>(null);
  const [usage, setUsage] = useState<AnnouncementUsage[]>([]);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledCarousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogUsage, setShowLogUsage] = useState(false);
  const [logging, setLogging] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "schedule" | "render">("schedule");

  // Carousel detail modal
  const [selectedCarousel, setSelectedCarousel] = useState<ScheduledCarousel | null>(null);

  // Render queue state
  const [renderFilter, setRenderFilter] = useState<"all" | "draft" | "ready" | "published">("all");
  const [selectedForRender, setSelectedForRender] = useState<Set<string>>(new Set());

  // Wizard state (replaces old render modal)
  const [wizardCarousel, setWizardCarousel] = useState<ScheduledCarousel | null>(null);

  // New usage form
  const [newUsage, setNewUsage] = useState({
    listingAddress: "",
    graphicType: "new-listing" as AnnouncementType,
    graphicUrl: "",
    notes: "",
  });

  const fetchPackage = useCallback(async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const [pkgRes, usageRes, questionsRes, scheduleRes] = await Promise.all([
        fetch(`/api/accounts/${currentAccount.id}/graphic-packages/${packageId}`),
        fetch(`/api/accounts/${currentAccount.id}/graphic-packages/${packageId}/usage`),
        fetch(`/api/accounts/${currentAccount.id}/graphic-packages/${packageId}/questions`),
        fetch(`/api/accounts/${currentAccount.id}/graphic-packages/${packageId}/schedule`),
      ]);

      const pkgData = await pkgRes.json();
      const usageData = await usageRes.json();
      const questionsData = await questionsRes.json();
      const scheduleData = await scheduleRes.json();

      if (pkgData.data) setPkg(pkgData.data);
      if (usageData.data) setUsage(usageData.data);
      if (questionsData.data) setQuestions(questionsData.data);
      if (scheduleData.data) setScheduled(scheduleData.data);
    } catch (error) {
      console.error("Failed to fetch package:", error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount, packageId]);

  useEffect(() => {
    fetchPackage();
  }, [fetchPackage]);

  const handleLogUsage = async () => {
    if (!currentAccount || !newUsage.listingAddress.trim()) return;
    setLogging(true);
    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/graphic-packages/${packageId}/usage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUsage),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setShowLogUsage(false);
        setNewUsage({
          listingAddress: "",
          graphicType: "new-listing",
          graphicUrl: "",
          notes: "",
        });
        if (data.package) setPkg(data.package);
        if (data.data) setUsage((prev) => [data.data, ...prev]);
      }
    } finally {
      setLogging(false);
    }
  };

  const handleTopUp = async (additional: number) => {
    if (!currentAccount) return;
    const res = await fetch(
      `/api/accounts/${currentAccount.id}/graphic-packages/${packageId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topup", additional }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.data) setPkg(data.data);
    }
  };

  const handleOpenWizard = (carousel: ScheduledCarousel) => {
    setSelectedCarousel(null); // Close detail modal if open
    setWizardCarousel(carousel); // Open wizard
  };

  const handleWizardSave = async (carouselId: string, data: Partial<ScheduledCarousel>) => {
    if (!currentAccount) return;
    await fetch(
      `/api/accounts/${currentAccount.id}/graphic-packages/${packageId}/schedule/${carouselId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  };

  const handleWizardComplete = (carouselId: string) => {
    setWizardCarousel(null);
    fetchPackage(); // Refresh data
  };

  if (!currentAccount) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Select an account</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Package not found</p>
      </div>
    );
  }

  const isAnnouncements = pkg.type === "announcements";
  const remaining = isAnnouncements ? (pkg.allocation || 0) - (pkg.used || 0) : null;
  const lowStock = remaining !== null && remaining <= 2;

  // Group scheduled carousels by month
  const scheduledByMonth = scheduled.reduce((acc, item) => {
    const date = new Date(item.scheduledDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, ScheduledCarousel[]>);

  const formatMonthKey = (key: string) => {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Filter carousels for render queue
  const filteredForRender = scheduled.filter((c) => {
    if (renderFilter === "all") return true;
    return c.status === renderFilter;
  });

  const needsRenderCount = scheduled.filter((c) => c.status === "draft").length;
  const readyCount = scheduled.filter((c) => c.status === "ready").length;
  const publishedCount = scheduled.filter((c) => c.status === "published").length;

  // Toggle selection for render
  const toggleRenderSelection = (id: string) => {
    const newSet = new Set(selectedForRender);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForRender(newSet);
  };

  const selectAllForRender = () => {
    if (selectedForRender.size === filteredForRender.length) {
      setSelectedForRender(new Set());
    } else {
      setSelectedForRender(new Set(filteredForRender.map((c) => c.id)));
    }
  };


  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push(`/account/${currentAccount.id}/graphics`)}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Packages
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              isAnnouncements ? "bg-blue-500/20" : "bg-purple-500/20"
            }`}
          >
            {isAnnouncements ? (
              <Image className="w-7 h-7 text-blue-400" />
            ) : (
              <LayoutGrid className="w-7 h-7 text-purple-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{pkg.name}</h1>
              {pkg.status === "proposed" && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Pending Approval
                </span>
              )}
            </div>
            <p className="text-slate-400 mt-1">
              {isAnnouncements ? "Announcement Package" : "Carousel Subscription"}
              {!isAnnouncements && pkg.monthlyFrequency && (
                <span className="text-slate-500"> • {pkg.monthlyFrequency}/month</span>
              )}
            </p>
          </div>
        </div>

        {/* Stats */}
        {isAnnouncements && (
          <div className="text-right">
            <div className="flex items-center gap-2">
              {lowStock && <AlertCircle className="w-5 h-5 text-amber-400" />}
              <span
                className={`text-3xl font-bold ${lowStock ? "text-amber-400" : "text-white"}`}
              >
                {pkg.used || 0}/{pkg.allocation || 0}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {remaining} remaining{pkg.price ? ` • $${pkg.price}` : ""}
            </p>
            {lowStock && (
              <button
                onClick={() => handleTopUp(16)}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                + Top up 16 more
              </button>
            )}
          </div>
        )}

        {/* Carousel Stats */}
        {!isAnnouncements && (
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {scheduled.length}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              scheduled{pkg.monthlyRate ? ` • $${pkg.monthlyRate}/mo` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isAnnouncements && pkg.status === "active" && (
        <div className="mb-6">
          <button
            onClick={() => setShowLogUsage(true)}
            disabled={remaining === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
            Log Usage
          </button>
        </div>
      )}

      {/* Announcement Usage History */}
      {isAnnouncements && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Usage History ({usage.length})
          </h2>

          {usage.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Home className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-2">No usage logged yet</p>
              <p className="text-sm text-slate-500">
                Log graphics as you create them for this client
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {usage.map((item) => {
                const typeConfig = graphicTypeConfig[item.graphicType];
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.bgColor}`}
                        >
                          {item.graphicType === "sold" ? (
                            <CheckCircle className={`w-5 h-5 ${typeConfig.color}`} />
                          ) : item.graphicType === "open-house" ? (
                            <Calendar className={`w-5 h-5 ${typeConfig.color}`} />
                          ) : item.graphicType === "price-change" ? (
                            <Tag className={`w-5 h-5 ${typeConfig.color}`} />
                          ) : (
                            <Home className={`w-5 h-5 ${typeConfig.color}`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span className="font-medium text-white">
                              {item.listingAddress}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}
                            >
                              {typeConfig.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-slate-400 mt-2">{item.notes}</p>
                          )}
                        </div>
                      </div>
                      {item.graphicUrl && (
                        <a
                          href={item.graphicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Carousel Content */}
      {!isAnnouncements && (
        <div>
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 p-1 bg-slate-900 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "schedule"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Schedule ({scheduled.length})
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "questions"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Question Bank ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab("render")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "render"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Play className="w-4 h-4 inline mr-2" />
              Render Queue
              {needsRenderCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                  {needsRenderCount}
                </span>
              )}
            </button>
          </div>

          {/* Schedule View */}
          {activeTab === "schedule" && (
            <div>
              {scheduled.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">No carousels scheduled</p>
                  <p className="text-sm text-slate-500">
                    Schedule questions from the question bank
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(scheduledByMonth)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([monthKey, items]) => (
                      <div key={monthKey}>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                          {formatMonthKey(monthKey)}
                        </h3>
                        <div className="space-y-2">
                          {items
                            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                            .map((item) => {
                              const date = new Date(item.scheduledDate);
                              const hasBrief = item.brief && (item.brief.goal || item.brief.keyPoints?.length);
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedCarousel(item)}
                                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                                    item.status === "published"
                                      ? "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40"
                                      : item.status === "ready"
                                      ? "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
                                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                                          item.status === "published"
                                            ? "bg-purple-500/20"
                                            : item.status === "ready"
                                            ? "bg-emerald-500/20"
                                            : "bg-slate-800"
                                        }`}
                                      >
                                        <span
                                          className={`text-lg font-bold ${
                                            item.status === "published"
                                              ? "text-purple-400"
                                              : item.status === "ready"
                                              ? "text-emerald-400"
                                              : "text-white"
                                          }`}
                                        >
                                          {date.getDate()}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase">
                                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-white">
                                          {item.question || "Untitled carousel"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span
                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                              item.status === "published"
                                                ? "bg-purple-500/20 text-purple-400"
                                                : item.status === "ready"
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-amber-500/20 text-amber-400"
                                            }`}
                                          >
                                            {item.status}
                                          </span>
                                          {hasBrief && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                                              has brief
                                            </span>
                                          )}
                                          {item.level && (
                                            <span
                                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                                                LEVEL_COLORS[item.level as EntropyLevel]?.bg || "bg-slate-700"
                                              } ${
                                                LEVEL_COLORS[item.level as EntropyLevel]?.text || "text-slate-300"
                                              }`}
                                            >
                                              {item.level}
                                            </span>
                                          )}
                                          {item.isEvergreen && (
                                            <RefreshCw className="w-3 h-3 text-emerald-400" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-600" />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Questions View */}
          {activeTab === "questions" && (
            <div>
              {questions.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">No questions in bank</p>
                  <p className="text-sm text-slate-500">
                    Add questions from client calls to build content
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {questions.map((q) => {
                    const catConfig = categoryConfig[q.category || "general"] || categoryConfig.general;
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border transition-colors ${
                          q.status === "published"
                            ? "bg-purple-500/10 border-purple-500/20"
                            : q.status === "scheduled"
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-white">{q.question}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${catConfig.bgColor} ${catConfig.color}`}
                              >
                                {catConfig.label}
                              </span>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  q.status === "published"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : q.status === "scheduled"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-slate-500/20 text-slate-400"
                                }`}
                              >
                                {q.status}
                              </span>
                            </div>
                            {q.notes && (
                              <p className="text-sm text-slate-500 mt-2">{q.notes}</p>
                            )}
                          </div>
                          {q.status === "unused" && (
                            <button className="p-2 text-slate-500 hover:text-emerald-400 transition-colors">
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Render Queue View */}
          {activeTab === "render" && (
            <div>
              {/* Filter bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRenderFilter("all")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      renderFilter === "all"
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({scheduled.length})
                  </button>
                  <button
                    onClick={() => setRenderFilter("draft")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      renderFilter === "draft"
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Needs Render ({needsRenderCount})
                  </button>
                  <button
                    onClick={() => setRenderFilter("ready")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      renderFilter === "ready"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Ready ({readyCount})
                  </button>
                  <button
                    onClick={() => setRenderFilter("published")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      renderFilter === "published"
                        ? "bg-purple-500/20 text-purple-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Published ({publishedCount})
                  </button>
                </div>

                {selectedForRender.size > 0 && (
                  <button
                    onClick={() => {
                      const first = scheduled.find((c) => selectedForRender.has(c.id));
                      if (first) handleOpenWizard(first);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    Open Wizard ({selectedForRender.size} selected)
                  </button>
                )}
              </div>

              {/* Select all */}
              {filteredForRender.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={selectAllForRender}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {selectedForRender.size === filteredForRender.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Select All
                  </button>
                </div>
              )}

              {/* Carousel list */}
              {filteredForRender.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <Play className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">No carousels to render</p>
                  <p className="text-sm text-slate-500">
                    {renderFilter === "all"
                      ? "Schedule some carousels to get started"
                      : `No carousels with status "${renderFilter}"`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredForRender.map((carousel) => {
                    const isSelected = selectedForRender.has(carousel.id);
                    const date = new Date(carousel.scheduledDate);
                    return (
                      <div
                        key={carousel.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-slate-800 border-emerald-500/50"
                            : carousel.status === "published"
                            ? "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40"
                            : carousel.status === "ready"
                            ? "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleRenderSelection(carousel.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                            )}
                          </button>

                          {/* Date */}
                          <div
                            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                              carousel.status === "published"
                                ? "bg-purple-500/20"
                                : carousel.status === "ready"
                                ? "bg-emerald-500/20"
                                : "bg-slate-800"
                            }`}
                          >
                            <span
                              className={`text-lg font-bold ${
                                carousel.status === "published"
                                  ? "text-purple-400"
                                  : carousel.status === "ready"
                                  ? "text-emerald-400"
                                  : "text-white"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">
                              {date.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {carousel.question || "Untitled carousel"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  carousel.status === "published"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : carousel.status === "ready"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                              >
                                {carousel.status}
                              </span>
                              {carousel.suggestedFormat && (
                                <span className="text-xs text-slate-500">
                                  {carousel.suggestedFormat}
                                </span>
                              )}
                              {carousel.level && (
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                                    LEVEL_COLORS[carousel.level as EntropyLevel]?.bg || "bg-slate-700"
                                  } ${
                                    LEVEL_COLORS[carousel.level as EntropyLevel]?.text || "text-slate-300"
                                  }`}
                                >
                                  {carousel.level}
                                </span>
                              )}
                              {carousel.isEvergreen && (
                                <RefreshCw className="w-3 h-3 text-emerald-400" />
                              )}
                              {carousel.clientFeedback && (
                                <span className="text-xs text-amber-400">
                                  Has feedback
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Render button */}
                          <button
                            onClick={() => handleOpenWizard(carousel)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                              carousel.status === "draft"
                                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600"
                                : carousel.status === "ready"
                                ? "bg-slate-700 text-white hover:bg-slate-600"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <Play className="w-4 h-4" />
                            {carousel.status === "draft"
                              ? "Render"
                              : carousel.clientFeedback
                              ? "Revise"
                              : "View"}
                          </button>
                        </div>

                        {/* Preview thumbnail if ready - only show for real URLs */}
                        {carousel.graphicUrl && !carousel.graphicUrl.includes("example.com") && !carousel.graphicUrl.includes("placeholder") && (
                          <div className="mt-3 ml-8 pl-3">
                            <img
                              src={carousel.graphicUrl}
                              alt="Preview"
                              className="w-24 h-24 object-cover rounded-lg border border-slate-700"
                              onError={(e) => {
                                // Hide broken images
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log Usage Modal */}
      {showLogUsage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Log Graphic Usage</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Listing Address
                </label>
                <input
                  type="text"
                  value={newUsage.listingAddress}
                  onChange={(e) =>
                    setNewUsage({ ...newUsage, listingAddress: e.target.value })
                  }
                  placeholder="123 Main St, Charlottetown"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Graphic Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(graphicTypeConfig) as AnnouncementType[]).map((type) => {
                    const config = graphicTypeConfig[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewUsage({ ...newUsage, graphicType: type })}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          newUsage.graphicType === type
                            ? `${config.bgColor} border-current ${config.color}`
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graphic URL */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Graphic URL{" "}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={newUsage.graphicUrl}
                  onChange={(e) => setNewUsage({ ...newUsage, graphicUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Notes <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newUsage.notes}
                  onChange={(e) => setNewUsage({ ...newUsage, notes: e.target.value })}
                  placeholder="Any notes about this graphic..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => setShowLogUsage(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogUsage}
                disabled={!newUsage.listingAddress.trim() || logging}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {logging && <Loader2 className="w-4 h-4 animate-spin" />}
                Log Usage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carousel Detail Modal */}
      {selectedCarousel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      selectedCarousel.status === "published"
                        ? "bg-purple-500/20 text-purple-400"
                        : selectedCarousel.status === "ready"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {selectedCarousel.status}
                  </span>
                  <span className="text-sm text-slate-500">
                    {new Date(selectedCarousel.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white mt-2">
                  {selectedCarousel.question}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCarousel(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entropy Level Section */}
            {(selectedCarousel.level || selectedCarousel.uncertaintyAddressed || selectedCarousel.isEvergreen) && (
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Content Strategy</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedCarousel.level && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        LEVEL_COLORS[selectedCarousel.level as EntropyLevel]?.bg || "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`text-xs font-mono font-bold ${
                          LEVEL_COLORS[selectedCarousel.level as EntropyLevel]?.text || "text-slate-300"
                        }`}
                      >
                        {selectedCarousel.level}
                      </span>
                      <span className="text-sm text-slate-300">
                        {ENTROPY_LEVELS[selectedCarousel.level as EntropyLevel]?.name}
                      </span>
                    </div>
                  )}

                  {selectedCarousel.isEvergreen && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-lg">
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Evergreen</span>
                    </div>
                  )}

                  {selectedCarousel.uncertaintyAddressed && (
                    <div className="w-full mt-1">
                      <span className="text-xs text-slate-500">Resolves: </span>
                      <span className="text-xs text-slate-300">{selectedCarousel.uncertaintyAddressed}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCarousel.brief ? (
                <div className="space-y-6">
                  {/* Goal */}
                  {selectedCarousel.brief.goal && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-slate-400">Goal</span>
                      </div>
                      <p className="text-white">{selectedCarousel.brief.goal}</p>
                    </div>
                  )}

                  {/* Target Audience */}
                  {selectedCarousel.brief.targetAudience && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-slate-400">Target Audience</span>
                      </div>
                      <p className="text-white">{selectedCarousel.brief.targetAudience}</p>
                    </div>
                  )}

                  {/* Hook */}
                  {selectedCarousel.brief.hook && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-slate-400">Hook</span>
                      </div>
                      <p className="text-white italic">"{selectedCarousel.brief.hook}"</p>
                    </div>
                  )}

                  {/* Key Points */}
                  {selectedCarousel.brief.keyPoints && selectedCarousel.brief.keyPoints.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ListOrdered className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-slate-400">Key Points (Slide by Slide)</span>
                      </div>
                      <div className="space-y-2">
                        {selectedCarousel.brief.keyPoints.map((point, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <p className="text-white text-sm">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  {selectedCarousel.brief.cta && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MousePointer className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-medium text-slate-400">Call to Action</span>
                      </div>
                      <p className="text-white">{selectedCarousel.brief.cta}</p>
                    </div>
                  )}

                  {/* Tone & Design */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCarousel.brief.tone && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Megaphone className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-slate-400">Tone</span>
                        </div>
                        <p className="text-white">{selectedCarousel.brief.tone}</p>
                      </div>
                    )}
                    {selectedCarousel.brief.designNotes && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="w-4 h-4 text-pink-400" />
                          <span className="text-sm font-medium text-slate-400">Design Notes</span>
                        </div>
                        <p className="text-white">{selectedCarousel.brief.designNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No strategy brief yet</p>
                  <p className="text-sm text-slate-500">
                    Add goal, key points, and design direction for this carousel
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedCarousel(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenWizard(selectedCarousel)}
                className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all ${
                  selectedCarousel.status === "draft"
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                }`}
              >
                <Play className="w-4 h-4" />
                {selectedCarousel.status === "draft"
                  ? "Render Carousel"
                  : selectedCarousel.clientFeedback
                    ? "Revise Carousel"
                    : "View in Graphics"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carousel Wizard */}
      {wizardCarousel && currentAccount && (
        <CarouselWizard
          carousel={wizardCarousel}
          accountId={currentAccount.id}
          onClose={() => setWizardCarousel(null)}
          onComplete={handleWizardComplete}
          onSave={handleWizardSave}
        />
      )}
    </div>
  );
}
