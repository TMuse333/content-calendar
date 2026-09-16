"use client";

import { useState } from "react";
import { Plus, GripVertical, Trash2, Check, Save } from "lucide-react";

// Settings page - Account, info points, goal, platforms

// Mock data
const initialAccount = {
  handle: "@thomasmusial",
  name: "Thomas Musial",
  goal: "Prove I can take complex ideas and make them visual + actionable",
  context: "3 years lead gen, websites → video. Information theory approach.",
  informationPoints: [
    { id: "who-i-am", text: "Who Thomas is and his background", order: 0 },
    { id: "video-vs-web", text: "Why video > websites for trust", order: 1 },
    { id: "deep-work", text: "Deep work enables quality output", order: 2 },
    { id: "systems", text: "Systems > motivation", order: 3 },
    { id: "info-theory", text: "Information theory basics", order: 4 },
    { id: "built-system", text: "How I built the video system", order: 5 },
    { id: "the-offer", text: "The offer / how to work together", order: 6 },
  ],
  platforms: {
    instagram: { connected: true },
    youtube: { connected: false },
  },
};

export default function SettingsPage() {
  const [account, setAccount] = useState(initialAccount);
  const [newPoint, setNewPoint] = useState("");
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save to API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const addInfoPoint = () => {
    if (!newPoint.trim()) return;

    const newId = newPoint.toLowerCase().replace(/\s+/g, "-").slice(0, 20);
    setAccount({
      ...account,
      informationPoints: [
        ...account.informationPoints,
        {
          id: newId,
          text: newPoint.trim(),
          order: account.informationPoints.length,
        },
      ],
    });
    setNewPoint("");
    setIsAddingPoint(false);
  };

  const removeInfoPoint = (id: string) => {
    setAccount({
      ...account,
      informationPoints: account.informationPoints.filter((p) => p.id !== id),
    });
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-zinc-400">Manage your account and content strategy</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Account Info */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Handle
            </label>
            <input
              type="text"
              value={account.handle}
              onChange={(e) => setAccount({ ...account, handle: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Name
            </label>
            <input
              type="text"
              value={account.name}
              onChange={(e) => setAccount({ ...account, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      </section>

      {/* Strategic Framing */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Strategic Framing</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Goal
          </label>
          <textarea
            value={account.goal}
            onChange={(e) => setAccount({ ...account, goal: e.target.value })}
            rows={2}
            placeholder="What are you trying to prove or demonstrate?"
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Context
          </label>
          <textarea
            value={account.context}
            onChange={(e) => setAccount({ ...account, context: e.target.value })}
            rows={2}
            placeholder="Background, why this matters, your approach"
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
          />
        </div>
      </section>

      {/* Information Points */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Information Points</h2>
            <p className="text-sm text-zinc-500">
              What uncertainties are you reducing for your audience?
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-4">
          {account.informationPoints.map((point, index) => (
            <li
              key={point.id}
              className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg group"
            >
              <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
              <span className="text-sm text-zinc-500 w-6">{index + 1}.</span>
              <span className="flex-1 text-zinc-300">{point.text}</span>
              <button
                onClick={() => removeInfoPoint(point.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-700 rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-400" />
              </button>
            </li>
          ))}
        </ul>

        {isAddingPoint ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newPoint}
              onChange={(e) => setNewPoint(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInfoPoint()}
              placeholder="What information do you want to transmit?"
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              autoFocus
            />
            <button
              onClick={addInfoPoint}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingPoint(false);
                setNewPoint("");
              }}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingPoint(true)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add information point
          </button>
        )}
      </section>

      {/* Connected Platforms */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Connected Platforms</h2>

        <div className="space-y-3">
          {/* Instagram */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Instagram</p>
                <p className="text-sm text-zinc-500">
                  {account.platforms.instagram.connected
                    ? "Connected"
                    : "Not connected"}
                </p>
              </div>
            </div>
            {account.platforms.instagram.connected ? (
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <button className="text-sm text-zinc-400 hover:text-zinc-300">
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors">
                Connect
              </button>
            )}
          </div>

          {/* YouTube */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">YouTube</p>
                <p className="text-sm text-zinc-500">
                  {account.platforms.youtube.connected
                    ? "Connected"
                    : "Not connected"}
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors">
              Connect
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
