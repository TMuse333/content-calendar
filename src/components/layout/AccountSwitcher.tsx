"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { ChevronDown, Check, User, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import type { StrategyAccount } from "@/lib/types/account";

interface AccountSwitcherProps {
  collapsed?: boolean;
}

export function AccountSwitcher({ collapsed = false }: AccountSwitcherProps) {
  const { accounts, currentAccount, loading, switchAccount } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get brand color or default
  const getBrandColor = (account: StrategyAccount) => {
    return account.brand?.primaryColor || "#06b6d4";
  };

  if (loading) {
    return (
      <div className="px-3 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-800 rounded mt-1 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="px-3 py-3 border-b border-slate-800">
        <Link
          href="/admin"
          className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm">Create account</p>
            </div>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative border-b border-slate-800" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-3 py-3
          hover:bg-slate-800/50 transition-colors
          ${isOpen ? "bg-slate-800/50" : ""}
        `}
        title={collapsed ? currentAccount?.name : undefined}
      >
        {/* Account Avatar */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: currentAccount ? getBrandColor(currentAccount) : "#06b6d4" }}
        >
          {currentAccount ? getInitials(currentAccount.name) : <User className="w-4 h-4" />}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {currentAccount?.name || "Select Account"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {currentAccount?.handle || "No handle set"}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl
            ${collapsed ? "left-full ml-2 top-0 w-64" : "left-2 right-2 top-full mt-1"}
          `}
        >
          <div className="p-2 border-b border-slate-800">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-2">
              Switch Account
            </p>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {accounts.map((account) => {
              const isSelected = account.id === currentAccount?.id;
              return (
                <button
                  key={account.id}
                  onClick={() => {
                    switchAccount(account.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-left
                    hover:bg-slate-800 transition-colors
                    ${isSelected ? "bg-slate-800/50" : ""}
                  `}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: getBrandColor(account) }}
                  >
                    {getInitials(account.name)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-white truncate">{account.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {account.handle || account.id}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-slate-800">
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
