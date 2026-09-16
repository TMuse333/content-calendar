"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Target,
  MoreVertical,
  Edit,
  Trash2,
  Pause,
  Play,
  CheckCircle,
} from "lucide-react";
import type { Campaign } from "@/lib/types/account";

const NEED_LABELS: Record<string, string> = {
  security: "Security",
  status: "Status",
  belonging: "Belonging",
  autonomy: "Autonomy",
  certainty: "Certainty",
  growth: "Growth",
  meaning: "Meaning",
};

const STYLE_LABELS: Record<string, string> = {
  "calm-authority": "Calm Authority",
  energetic: "Energetic",
  educational: "Educational",
  "raw-authentic": "Raw & Authentic",
  professional: "Professional",
  conversational: "Conversational",
};

export default function CampaignsPage() {
  const { currentAccount } = useAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAccount) return;

    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`/api/accounts/${currentAccount.id}/campaigns`);
        const data = await res.json();
        if (data.success) {
          setCampaigns(data.campaigns);
        }
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [currentAccount]);

  const handleStatusChange = async (campaignId: string, newStatus: "active" | "paused" | "completed") => {
    if (!currentAccount) return;

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setCampaigns(campaigns.map((c) =>
          c.id === campaignId ? { ...c, status: newStatus } : c
        ));
      }
    } catch (error) {
      console.error("Failed to update campaign:", error);
    }
    setOpenMenu(null);
  };

  const handleDelete = async (campaignId: string) => {
    if (!currentAccount) return;
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCampaigns(campaigns.filter((c) => c.id !== campaignId));
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
    setOpenMenu(null);
  };

  if (!currentAccount) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 mt-1">
            Manage your content strategy campaigns
          </p>
        </div>
        <Link
          href={`/account/${currentAccount.id}/campaigns/new`}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Campaigns Yet</h2>
          <p className="text-slate-400 mb-6">
            Create your first campaign to start tracking your content strategy
          </p>
          <Link
            href={`/account/${currentAccount.id}/campaigns/new`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        campaign.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : campaign.status === "paused"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-slate-400 mb-3">{campaign.description}</p>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      {campaign.informationPoints.length} info points
                    </span>
                    {campaign.underlyingNeed && (
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                        {NEED_LABELS[campaign.underlyingNeed] || campaign.underlyingNeed}
                      </span>
                    )}
                    {campaign.deliveryStyle && (
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                        {STYLE_LABELS[campaign.deliveryStyle] || campaign.deliveryStyle}
                      </span>
                    )}
                    {campaign.postsPerWeek && (
                      <span className="text-slate-500">
                        {campaign.postsPerWeek} posts/week
                      </span>
                    )}
                  </div>

                  {/* Info Points Preview */}
                  {campaign.informationPoints.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {campaign.informationPoints.slice(0, 3).map((point) => (
                        <div
                          key={point.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-sm text-slate-300 truncate max-w-[200px]">
                            {point.text}
                          </span>
                        </div>
                      ))}
                      {campaign.informationPoints.length > 3 && (
                        <span className="text-sm text-slate-500 px-2 py-1.5">
                          +{campaign.informationPoints.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === campaign.id ? null : campaign.id)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openMenu === campaign.id && (
                    <div className="absolute right-0 top-10 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                      <Link
                        href={`/account/${currentAccount.id}/campaigns/${campaign.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Campaign
                      </Link>
                      {campaign.status === "active" ? (
                        <button
                          onClick={() => handleStatusChange(campaign.id, "paused")}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white w-full"
                        >
                          <Pause className="w-4 h-4" />
                          Pause Campaign
                        </button>
                      ) : campaign.status === "paused" ? (
                        <button
                          onClick={() => handleStatusChange(campaign.id, "active")}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white w-full"
                        >
                          <Play className="w-4 h-4" />
                          Resume Campaign
                        </button>
                      ) : null}
                      {campaign.status !== "completed" && (
                        <button
                          onClick={() => handleStatusChange(campaign.id, "completed")}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white w-full"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Completed
                        </button>
                      )}
                      <div className="border-t border-slate-700" />
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Campaign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
