"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  Loader2,
  Plus,
  Calendar,
  MessageSquare,
  Phone,
  Users,
  CheckCircle,
  DollarSign,
  X,
  Home,
  TrendingUp,
} from "lucide-react";
import type { Outcome } from "@/lib/types/results";

type OutcomeType = "inquiry" | "dm" | "call" | "meeting" | "deal" | "listing" | "sale";

const outcomeTypes: { value: OutcomeType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "inquiry", label: "Inquiry", icon: <MessageSquare className="w-4 h-4" />, color: "bg-blue-500" },
  { value: "dm", label: "DM", icon: <MessageSquare className="w-4 h-4" />, color: "bg-indigo-500" },
  { value: "call", label: "Call", icon: <Phone className="w-4 h-4" />, color: "bg-purple-500" },
  { value: "meeting", label: "Meeting", icon: <Users className="w-4 h-4" />, color: "bg-emerald-500" },
  { value: "listing", label: "Listing", icon: <Home className="w-4 h-4" />, color: "bg-amber-500" },
  { value: "deal", label: "Deal", icon: <CheckCircle className="w-4 h-4" />, color: "bg-green-500" },
  { value: "sale", label: "Sale", icon: <DollarSign className="w-4 h-4" />, color: "bg-yellow-500" },
];

export default function OutcomesPage() {
  const { currentAccount } = useAccount();
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; totalValue: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<OutcomeType | "all">("all");

  // Form state
  const [formData, setFormData] = useState({
    type: "inquiry" as OutcomeType,
    title: "",
    description: "",
    value: "",
    occurredAt: new Date().toISOString().split("T")[0],
    source: "",
    leadName: "",
    leadEmail: "",
    notes: "",
  });

  // Fetch outcomes
  useEffect(() => {
    if (!currentAccount) return;

    const fetchOutcomes = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${currentAccount.id}/outcomes`);
        const data = await res.json();
        setOutcomes(data.outcomes || []);
        setStats(data.stats || {});
      } catch (err) {
        console.error("Failed to fetch outcomes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOutcomes();
  }, [currentAccount]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount || !formData.title) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/outcomes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value: formData.value ? parseFloat(formData.value) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOutcomes((prev) => [data.outcome, ...prev]);
        setShowModal(false);
        setFormData({
          type: "inquiry",
          title: "",
          description: "",
          value: "",
          occurredAt: new Date().toISOString().split("T")[0],
          source: "",
          leadName: "",
          leadEmail: "",
          notes: "",
        });
      }
    } catch (err) {
      console.error("Failed to save outcome:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  const filteredOutcomes = filterType === "all"
    ? outcomes
    : outcomes.filter((o) => o.type === filterType);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Outcomes</h1>
          <p className="text-slate-400 mt-1">Log meetings, inquiries, and deals</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white"
        >
          <Plus className="w-4 h-4" />
          Log Outcome
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {outcomeTypes.slice(0, 4).map((type) => {
          const stat = stats[type.value];
          return (
            <div
              key={type.value}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 ${type.color}/20 rounded`}>
                  {type.icon}
                </div>
                <span className="text-sm text-slate-400">{type.label}s</span>
              </div>
              <div className="text-2xl font-bold text-white">{stat?.count || 0}</div>
              {stat?.totalValue > 0 && (
                <div className="text-xs text-slate-500 mt-1">
                  ${stat.totalValue.toLocaleString()} total
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 inline-flex">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            filterType === "all"
              ? "bg-slate-700 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All
        </button>
        {outcomeTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilterType(type.value)}
            className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5 ${
              filterType === type.value
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {/* Outcomes List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : filteredOutcomes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Outcomes Yet</h2>
          <p className="text-slate-400 mb-6">
            Start logging meetings, inquiries, and deals to track your ROI.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white mx-auto"
          >
            <Plus className="w-5 h-5" />
            Log Your First Outcome
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOutcomes.map((outcome) => {
            const typeInfo = outcomeTypes.find((t) => t.value === outcome.type);
            return (
              <div
                key={outcome.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${typeInfo?.color || "bg-slate-700"}/20`}>
                      {typeInfo?.icon || <MessageSquare className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeInfo?.color || "bg-slate-700"}/20 text-white`}>
                          {outcome.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(outcome.occurredAt).toLocaleDateString()}
                        </span>
                        {outcome.source && (
                          <span className="text-xs text-slate-600">via {outcome.source}</span>
                        )}
                      </div>
                      <h3 className="text-white font-medium">{outcome.title}</h3>
                      {outcome.description && (
                        <p className="text-sm text-slate-400 mt-1">{outcome.description}</p>
                      )}
                      {outcome.leadName && (
                        <p className="text-xs text-slate-500 mt-2">
                          Lead: {outcome.leadName}
                          {outcome.leadEmail && ` (${outcome.leadEmail})`}
                        </p>
                      )}
                    </div>
                  </div>

                  {outcome.value && (
                    <div className="text-right">
                      <div className="text-lg font-semibold text-emerald-400">
                        ${outcome.value.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">value</div>
                    </div>
                  )}
                </div>

                {outcome.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-500">{outcome.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Outcome Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Log Outcome</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {outcomeTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                        formData.type === type.value
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className={`p-1.5 rounded ${type.color}/20`}>{type.icon}</div>
                      <span className="text-xs text-slate-300">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Call with John about listing"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Date & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.occurredAt}
                    onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Value ($)</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Lead Name</label>
                  <input
                    type="text"
                    value={formData.leadName}
                    onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                    placeholder="John Smith"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Lead Email</label>
                  <input
                    type="email"
                    value={formData.leadEmail}
                    onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
                    placeholder="john@email.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select source...</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="direct">Direct</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional details..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Log Outcome
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
