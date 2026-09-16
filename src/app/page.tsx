"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import { Loader2 } from "lucide-react";

// Root page - redirects to account calendar
export default function RootPage() {
  const router = useRouter();
  const { currentAccount, loading, accounts } = useAccount();

  useEffect(() => {
    if (loading) return;

    if (currentAccount) {
      router.replace(`/account/${currentAccount.id}/calendar`);
    } else if (accounts.length === 0) {
      // No accounts, go to admin to create one
      router.replace("/admin");
    }
  }, [currentAccount, loading, accounts, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
    </div>
  );
}
