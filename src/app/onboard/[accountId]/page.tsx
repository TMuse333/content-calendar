"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Camera,
  Link2,
  Zap,
  Send,
} from "lucide-react";

interface AccountData {
  id: string;
  name: string;
  handle?: string;
  platforms?: {
    instagram?: {
      connected: boolean;
      username?: string;
    };
  };
}

export default function OnboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const accountId = params.accountId as string;

  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [baselineCaptured, setBaselineCaptured] = useState(false);

  // Check if just connected or if there's an error
  const justConnected = searchParams.get("instagram") === "connected";
  const connectedUsername = searchParams.get("username");
  const connectionError = searchParams.get("error");

  useEffect(() => {
    fetchData();
  }, [accountId]);

  // Auto-capture baseline after connection (silent, no display)
  useEffect(() => {
    if (justConnected && account?.platforms?.instagram?.connected && !baselineCaptured) {
      captureBaselineSilently();
    }
  }, [justConnected, account, baselineCaptured]);

  const fetchData = async () => {
    try {
      const accountRes = await fetch(`/api/accounts/${accountId}`);
      if (!accountRes.ok) {
        setError("Account not found");
        return;
      }
      const accountData = await accountRes.json();
      setAccount(accountData);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Capture baseline silently - saves to DB, no UI update
  const captureBaselineSilently = async () => {
    try {
      await fetch(`/api/accounts/${accountId}/baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Initial baseline on connection" }),
      });
      setBaselineCaptured(true);
    } catch (err) {
      console.error("Failed to capture baseline:", err);
    }
  };

  const handleSendFeedback = async () => {
    // TODO: Save feedback to DB
    setFeedbackSent(true);
  };

  const isConnected = account?.platforms?.instagram?.connected;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !account) {
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {account.name}!
          </h1>
          <p className="text-slate-400 mt-1">
            Let&apos;s kick off your content strategy.
          </p>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && !isConnected && (
        <div className="bg-red-500/10 border-b border-red-500/20">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Connection failed</p>
              <p className="text-sm text-red-300/80">{connectionError}</p>
              <p className="text-sm text-slate-400 mt-2">
                Double-check the steps below and try again. If it still doesn&apos;t work, reply to the email that sent you this link.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Connected State - Thank You */}
        {isConnected ? (
          <>
            {/* Success Card */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  You&apos;re all set, {account.name}!
                </h2>
                <p className="text-slate-400 mb-1">
                  Connected as <span className="text-emerald-400">@{account.platforms?.instagram?.username}</span>
                </p>
                <p className="text-slate-500 text-sm">
                  We&apos;re capturing your baseline metrics and will follow up with your proposed content plan.
                </p>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">While you&apos;re here...</h3>
                <p className="text-sm text-slate-400">Any thoughts or topics you want to focus on?</p>
              </div>
              <div className="p-5">
                {feedbackSent ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <p className="text-emerald-400">Thanks! I&apos;ll include this in the plan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g., Topics you're comfortable with, your ideal clients, what's worked before..."
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <button
                      onClick={handleSendFeedback}
                      disabled={!feedback.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Not Connected - Show Connect Flow */
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                <span className="text-pink-500 font-semibold text-sm">1</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Connect Instagram</h2>
                <p className="text-sm text-slate-400">Link your account to get started</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Quick Prerequisites */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Link2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">1. Have a Facebook Page</p>
                    <p className="text-slate-400">
                      Go to Facebook → Menu → Pages → Create New Page (2 min)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Camera className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">2. Business/Creator Account</p>
                    <p className="text-slate-400">Instagram → Settings → Account → Switch to Professional</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">3. Link to Facebook Page</p>
                    <p className="text-slate-400">Instagram → Settings → Sharing to Other Apps → Facebook</p>
                  </div>
                </div>
              </div>

              <a
                href={`/api/auth/instagram/connect?accountId=${accountId}&source=onboard`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-medium rounded-lg transition-all"
              >
                <Camera className="w-5 h-5" />
                Connect Instagram
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-slate-500 text-sm">
          <p>Questions? Reply to the email that sent you this link.</p>
        </div>
      </div>
    </div>
  );
}
