"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { Target, Plus, Loader2 } from "lucide-react";
import type { Campaign } from "@/lib/types/account";

export default function DashboardPage() {
  const { currentAccount } = useAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Campaign coverage & information points</p>
        </div>
      </div>

      {/* Campaigns */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Campaigns</h2>
          <a
            href={`/account/${currentAccount.id}/settings`}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No campaigns yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Create a campaign to start tracking information coverage
            </p>
            <a
              href={`/account/${currentAccount.id}/settings`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">{campaign.name}</h3>
                    <p className="text-sm text-slate-500">
                      {campaign.informationPoints.length} information points
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      campaign.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                {/* Info Points */}
                <div className="space-y-2">
                  {campaign.informationPoints.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                      No information points defined yet
                    </p>
                  ) : (
                    campaign.informationPoints.map((point) => (
                      <div
                        key={point.id}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-sm text-slate-300">{point.text}</span>
                        <span className="ml-auto text-xs text-slate-500">0 posts</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
