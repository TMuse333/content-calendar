"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Loader2,
  TrendingUp,
  Map,
  Clock,
  Scale,
  MessageCircle,
  GitCompare,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Users,
  User,
  LayoutGrid,
} from "lucide-react";

interface FormatQuestion {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

interface GraphicFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frames: number;
  day: string;
  audience: "buyers" | "sellers" | "both";
  sampleTopics: string[];
  questions: FormatQuestion[];
}

interface GraphicsLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (format: GraphicFormat) => void;
  carouselId?: string; // If selecting for a specific carousel
  accountId?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  TrendingUp,
  Map,
  Clock,
  Scale,
  MessageCircle,
  GitCompare,
  HelpCircle,
  Sparkles,
};

export function GraphicsLibraryModal({
  isOpen,
  onClose,
  onSelect,
  carouselId,
  accountId,
}: GraphicsLibraryModalProps) {
  const [formats, setFormats] = useState<GraphicFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<"all" | "buyers" | "sellers" | "both">("all");
  const [selectedFormat, setSelectedFormat] = useState<GraphicFormat | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFormats();
    }
  }, [isOpen]);

  const fetchFormats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/graphics/formats");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFormats(data.formats || []);
      }
    } catch (err) {
      setError("Failed to load graphics library");
    } finally {
      setLoading(false);
    }
  };

  const filteredFormats = useMemo(() => {
    return formats.filter((format) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        format.name.toLowerCase().includes(searchLower) ||
        format.description.toLowerCase().includes(searchLower) ||
        format.sampleTopics.some((t) => t.toLowerCase().includes(searchLower));

      // Audience filter
      const matchesAudience =
        audienceFilter === "all" ||
        format.audience === audienceFilter ||
        format.audience === "both";

      return matchesSearch && matchesAudience;
    });
  }, [formats, search, audienceFilter]);

  const handleSelect = (format: GraphicFormat) => {
    if (onSelect) {
      onSelect(format);
      onClose();
    } else {
      setSelectedFormat(format);
    }
  };

  const openInGraphicsApp = (format: GraphicFormat) => {
    const params = new URLSearchParams();
    if (carouselId) params.set("postId", carouselId);
    if (accountId) params.set("agentId", accountId);
    params.set("format", format.id);

    const url = `http://localhost:3003/wizard?${params.toString()}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Graphics Library</h2>
            <p className="text-sm text-slate-400">
              {formats.length} carousel formats available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search formats, topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Audience Filter */}
          <div className="flex gap-2">
            {[
              { value: "all", label: "All", icon: LayoutGrid },
              { value: "buyers", label: "Buyers", icon: User },
              { value: "sellers", label: "Sellers", icon: User },
              { value: "both", label: "Both", icon: Users },
            ].map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setAudienceFilter(filter.value as typeof audienceFilter)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    audienceFilter === filter.value
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={fetchFormats}
                className="text-sm text-cyan-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredFormats.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No formats match your search</p>
            </div>
          ) : selectedFormat ? (
            /* Format Detail View */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedFormat(null)}
                className="text-sm text-cyan-400 hover:underline"
              >
                ← Back to all formats
              </button>

              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedFormat.color}20` }}
                  >
                    {(() => {
                      const Icon = ICON_MAP[selectedFormat.icon] || Sparkles;
                      return <Icon className="w-7 h-7" style={{ color: selectedFormat.color }} />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{selectedFormat.name}</h3>
                    <p className="text-slate-400 mt-1">{selectedFormat.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-slate-500">{selectedFormat.frames} slides</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 capitalize">For {selectedFormat.audience}</span>
                    </div>
                  </div>
                </div>

                {/* Sample Topics */}
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Sample Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFormat.sampleTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Questions */}
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-3">This format asks:</p>
                  <div className="space-y-2">
                    {selectedFormat.questions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-2 text-sm">
                        <span className="text-slate-600">{i + 1}.</span>
                        <span className="text-slate-300">
                          {q.label}
                          {q.required && <span className="text-red-400 ml-1">*</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => openInGraphicsApp(selectedFormat)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                  >
                    Open in Graphics App
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  {onSelect && (
                    <button
                      onClick={() => handleSelect(selectedFormat)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Select Format
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Format Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFormats.map((format) => {
                const Icon = ICON_MAP[format.icon] || Sparkles;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format)}
                    className="text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${format.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: format.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          {format.name}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                          {format.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">
                            {format.frames} slides
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={{
                              backgroundColor: `${format.color}20`,
                              color: format.color,
                            }}
                          >
                            {format.audience}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
