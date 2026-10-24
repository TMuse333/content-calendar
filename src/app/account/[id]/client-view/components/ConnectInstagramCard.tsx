import { TrendingUp, Target, Calendar } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";

/** Full-screen wall shown until the client connects Instagram. */
export function ConnectInstagramCard({ accountId }: { accountId: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center">
        {/* Instagram gradient icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
          <InstagramIcon className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Connect Instagram
        </h1>

        <p className="text-slate-400 mb-6 leading-relaxed">
          Connect your Instagram account to track what content actually works —
          so we can double down on winners instead of guessing.
        </p>

        <div className="space-y-3 text-left mb-8">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-300">See which posts get the most engagement</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-300">Track which topics resonate with your audience</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-300">View your content calendar with real results</p>
          </div>
        </div>

        <a
          href={`/api/auth/instagram/connect?accountId=${accountId}&source=client-view`}
          className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-500 hover:via-pink-400 hover:to-orange-300 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/25"
        >
          <InstagramIcon className="w-5 h-5" />
          Connect Instagram
        </a>

        <p className="text-xs text-slate-500 mt-4">
          Takes 30 seconds · We only read public metrics
        </p>
      </div>
    </div>
  );
}
