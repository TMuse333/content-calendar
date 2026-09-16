"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleDevSignIn = async () => {
    await signIn("dev-bypass", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Strategy</h1>
          <p className="text-slate-400 text-sm">Content orchestration platform</p>
        </div>

        {process.env.NODE_ENV === "development" ? (
          <button
            onClick={handleDevSignIn}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
          >
            Continue as Dev Admin
          </button>
        ) : (
          <div className="text-center text-slate-400">
            <p>Production auth not configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SignInContent />
    </Suspense>
  );
}
