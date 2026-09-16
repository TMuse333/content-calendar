"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { StrategyAccount } from "@/lib/types/account";

interface AccountContextType {
  accounts: StrategyAccount[];
  currentAccount: StrategyAccount | null;
  loading: boolean;
  error: string | null;
  switchAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = "strategy_selected_account";

// Routes that don't require an account context
const GLOBAL_ROUTES = ["/admin", "/auth"];

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<StrategyAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<StrategyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Extract account ID from pathname
  const getAccountIdFromPath = useCallback(() => {
    const match = pathname.match(/^\/account\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Check if current path is a global route
  const isGlobalRoute = useCallback(() => {
    return GLOBAL_ROUTES.some((route) => pathname.startsWith(route));
  }, [pathname]);

  // Fetch accounts from API
  const fetchAccounts = useCallback(async (): Promise<StrategyAccount[]> => {
    try {
      setError(null);
      const res = await fetch("/api/accounts");
      const data = await res.json();

      if (data.success && data.accounts) {
        setAccounts(data.accounts);
        return data.accounts;
      } else {
        throw new Error(data.error || "Failed to load accounts");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load accounts";
      setError(message);
      console.error("Failed to fetch accounts:", err);
      return [];
    }
  }, []);

  // Switch to a different account
  const switchAccount = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        setCurrentAccount(account);
        localStorage.setItem(STORAGE_KEY, accountId);

        // Navigate to the new account
        const pathAccountId = getAccountIdFromPath();
        if (pathAccountId) {
          // We're on an account route, swap the account ID
          const currentSubPath = pathname.replace(/^\/account\/[^/]+/, "");
          const newPath = `/account/${accountId}${currentSubPath || "/calendar"}`;
          router.push(newPath);
        } else {
          // We're on a non-account route, go to calendar
          router.push(`/account/${accountId}/calendar`);
        }
      }
    },
    [accounts, pathname, router, getAccountIdFromPath]
  );

  // Initialize: fetch accounts and set current from URL or localStorage
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const fetchedAccounts = await fetchAccounts();
      setLoading(false);

      if (fetchedAccounts.length === 0) {
        return;
      }

      // Skip redirect logic for global routes
      if (isGlobalRoute()) {
        // Still set current account from storage if available
        const storedAccountId = localStorage.getItem(STORAGE_KEY);
        if (storedAccountId) {
          const account = fetchedAccounts.find((a) => a.id === storedAccountId);
          if (account) {
            setCurrentAccount(account);
          }
        }
        return;
      }

      // Priority: URL > localStorage > first account
      const pathAccountId = getAccountIdFromPath();
      const storedAccountId = localStorage.getItem(STORAGE_KEY);

      let targetAccountId = pathAccountId || storedAccountId || fetchedAccounts[0].id;
      let targetAccount = fetchedAccounts.find((a) => a.id === targetAccountId);

      // If stored/path account doesn't exist, fall back to first
      if (!targetAccount) {
        targetAccount = fetchedAccounts[0];
        targetAccountId = targetAccount.id;
      }

      setCurrentAccount(targetAccount);
      localStorage.setItem(STORAGE_KEY, targetAccountId);

      // If we're on root, redirect to account path
      if (pathname === "/" || pathname === "") {
        router.replace(`/account/${targetAccountId}/calendar`);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current account when URL changes
  useEffect(() => {
    if (loading || accounts.length === 0) return;

    const pathAccountId = getAccountIdFromPath();
    if (pathAccountId) {
      const account = accounts.find((a) => a.id === pathAccountId);
      if (account && account.id !== currentAccount?.id) {
        setCurrentAccount(account);
        localStorage.setItem(STORAGE_KEY, account.id);
      }
    }
  }, [pathname, accounts, currentAccount?.id, loading, getAccountIdFromPath]);

  const refreshAccounts = useCallback(async () => {
    await fetchAccounts();
  }, [fetchAccounts]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        currentAccount,
        loading,
        error,
        switchAccount,
        refreshAccounts,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
