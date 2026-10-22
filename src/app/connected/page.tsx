"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

function Body() {
  const sp = useSearchParams();
  const status = sp.get("status");
  const username = sp.get("username");
  const message = sp.get("message");

  if (status === "error") {
    return (
      <>
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Couldn&apos;t connect Instagram</h1>
        <p className="text-slate-400">{message || "Something went wrong. Please try again."}</p>
      </>
    );
  }
  if (status === "deleted") {
    return (
      <>
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Your data has been deleted</h1>
        <p className="text-slate-400">Confirmation code: {sp.get("code")}</p>
      </>
    );
  }
  return (
    <>
      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
      <h1 className="text-xl font-bold mb-2">Instagram connected{username ? ` · @${username}` : ""}</h1>
      <p className="text-slate-400">All set. You can close this page.</p>
    </>
  );
}

export default function ConnectedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <Suspense>
          <Body />
        </Suspense>
      </div>
    </div>
  );
}
