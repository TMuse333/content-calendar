"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { Settings, Plus, Trash2, Target, Loader2, Save, Check, X, Camera } from "lucide-react";
import type { Campaign, InformationPoint } from "@/lib/types/account";

export default function SettingsPage() {
  const { currentAccount, refreshAccounts } = useAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New campaign form
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");

  // New info point
  const [newInfoPoint, setNewInfoPoint] = useState<{ campaignId: string; text: string } | null>(null);

  // Instagram connection
  const [instagramUserId, setInstagramUserId] = useState("");
  const [instagramAccessToken, setInstagramAccessToken] = useState("");
  const [showInstagramForm, setShowInstagramForm] = useState(false);
  const [savingInstagram, setSavingInstagram] = useState(false);

  useEffect(() => {
    if (!currentAccount) return;
    setCampaigns(currentAccount.campaigns || []);
    // Load existing Instagram credentials if connected
    if (currentAccount.platforms?.instagram?.connected) {
      setInstagramUserId(currentAccount.platforms.instagram.userId || "");
      setInstagramAccessToken(currentAccount.platforms.instagram.accessToken || "");
    }
    setLoading(false);
  }, [currentAccount]);

  const handleSaveInstagram = async () => {
    if (!instagramUserId.trim() || !instagramAccessToken.trim() || !currentAccount) return;

    setSavingInstagram(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: {
            instagram: {
              connected: true,
              userId: instagramUserId.trim(),
              accessToken: instagramAccessToken.trim(),
              connectedAt: new Date().toISOString(),
            },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInstagramForm(false);
        await refreshAccounts();
      }
    } catch (error) {
      console.error("Failed to save Instagram credentials:", error);
    } finally {
      setSavingInstagram(false);
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!currentAccount) return;

    setSavingInstagram(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: {
            instagram: {
              connected: false,
              userId: null,
              accessToken: null,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstagramUserId("");
        setInstagramAccessToken("");
        await refreshAccounts();
      }
    } catch (error) {
      console.error("Failed to disconnect Instagram:", error);
    } finally {
      setSavingInstagram(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim() || !currentAccount) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns([...campaigns, data.campaign]);
        setNewCampaignName("");
        setShowNewCampaign(false);
        await refreshAccounts();
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddInfoPoint = async (campaignId: string, text: string) => {
    if (!text.trim() || !currentAccount) return;

    setSaving(true);
    try {
      // Update campaign with new info point
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      const newPoint: InformationPoint = {
        id: Math.random().toString(36).substring(2, 10),
        text,
      };

      const updatedInfoPoints = [...campaign.informationPoints, newPoint];

      // For now, we'll update via the account update endpoint
      // In a full implementation, there would be a dedicated endpoint
      const updatedCampaigns = campaigns.map((c) =>
        c.id === campaignId ? { ...c, informationPoints: updatedInfoPoints } : c
      );

      setCampaigns(updatedCampaigns);
      setNewInfoPoint(null);

      // Refresh to sync with server
      await refreshAccounts();
    } catch (error) {
      console.error("Failed to add info point:", error);
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

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-7 h-7 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Account Settings</h1>
          <p className="text-slate-400">{currentAccount.name}</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Account Info</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={currentAccount.name}
              readOnly
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Handle</label>
            <input
              type="text"
              value={currentAccount.handle || ""}
              readOnly
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Platform Connections */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Platform Connections</h2>

        {/* Instagram */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">Instagram</h3>
                {currentAccount.platforms?.instagram?.connected ? (
                  <p className="text-sm text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Connected (ID: {currentAccount.platforms.instagram.userId})
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">Not connected</p>
                )}
              </div>
            </div>

            {currentAccount.platforms?.instagram?.connected ? (
              <button
                onClick={handleDisconnectInstagram}
                disabled={savingInstagram}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                {savingInstagram ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disconnect"}
              </button>
            ) : (
              <button
                onClick={() => setShowInstagramForm(!showInstagramForm)}
                className="px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                Connect
              </button>
            )}
          </div>

          {/* Instagram Credentials Form */}
          {showInstagramForm && !currentAccount.platforms?.instagram?.connected && (
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
              <p className="text-sm text-slate-400">
                Get these from{" "}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Meta Graph API Explorer
                </a>
              </p>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Instagram User ID</label>
                <input
                  type="text"
                  value={instagramUserId}
                  onChange={(e) => setInstagramUserId(e.target.value)}
                  placeholder="e.g., 17841400123456789"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Access Token</label>
                <input
                  type="password"
                  value={instagramAccessToken}
                  onChange={(e) => setInstagramAccessToken(e.target.value)}
                  placeholder="EAAaZA..."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveInstagram}
                  disabled={savingInstagram || !instagramUserId.trim() || !instagramAccessToken.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2"
                >
                  {savingInstagram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowInstagramForm(false);
                    setInstagramUserId("");
                    setInstagramAccessToken("");
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Campaigns</h2>
          <button
            onClick={() => setShowNewCampaign(true)}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* New Campaign Form */}
        {showNewCampaign && (
          <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Campaign name..."
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                onClick={handleCreateCampaign}
                disabled={saving || !newCampaignName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setShowNewCampaign(false);
                  setNewCampaignName("");
                }}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No campaigns yet</p>
            <p className="text-slate-500 text-sm">Create a campaign to define your content strategy</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">{campaign.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      campaign.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                {/* Info Points */}
                <div className="space-y-2 mb-3">
                  {campaign.informationPoints.map((point) => (
                    <div
                      key={point.id}
                      className="flex items-center gap-2 p-2 bg-slate-900/50 rounded"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-sm text-slate-300 flex-1">{point.text}</span>
                      <button className="text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Info Point */}
                {newInfoPoint?.campaignId === campaign.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newInfoPoint.text}
                      onChange={(e) => setNewInfoPoint({ ...newInfoPoint, text: e.target.value })}
                      placeholder="What info are you trying to transmit?"
                      className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddInfoPoint(campaign.id, newInfoPoint.text);
                        }
                        if (e.key === "Escape") {
                          setNewInfoPoint(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddInfoPoint(campaign.id, newInfoPoint.text)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewInfoPoint({ campaignId: campaign.id, text: "" })}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add info point
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
