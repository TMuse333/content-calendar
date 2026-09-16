"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import type { StrategyAccount } from "@/lib/types/account";

export default function AdminPage() {
  const [accounts, setAccounts] = useState<StrategyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", handle: "", email: "" });

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts([data.account, ...accounts]);
        setNewAccount({ name: "", handle: "", email: "" });
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to create account:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to deactivate account "${id}"?`)) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAccounts(accounts.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-amber-400" />
            Admin - Accounts
          </h1>
          <p className="text-slate-400 mt-1">Manage all accounts in the system</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Account
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Create Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name *</label>
              <input
                type="text"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="Thomas Musial"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Handle</label>
              <input
                type="text"
                value={newAccount.handle}
                onChange={(e) => setNewAccount({ ...newAccount, handle: e.target.value })}
                placeholder="@thomasmusial"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={newAccount.email}
                onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                placeholder="thomas@example.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newAccount.name.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No accounts yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first account to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: account.brand?.primaryColor || "#06b6d4" }}
              >
                {getInitials(account.name)}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/account/${account.id}/calendar`}
                  className="text-lg font-medium text-white hover:text-emerald-400 transition-colors"
                >
                  {account.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {account.handle || account.id} · {account.campaigns?.length || 0} campaigns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    account.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {account.status}
                </span>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
