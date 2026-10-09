"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LayoutDashboard,
  Sparkles,
  StickyNote,
  TrendingUp,
  Grid,
  UserPlus,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { AccountSwitcher } from "./AccountSwitcher";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentAccount } = useAccount();

  const accountId = currentAccount?.id;
  const accountBase = accountId ? `/account/${accountId}` : "";

  // Simplified navigation - only what we need
  const accountNavSections: NavSection[] = [
    {
      title: "Core",
      items: [
        {
          label: "Dashboard",
          href: `${accountBase}/dashboard`,
          icon: LayoutDashboard,
          description: "Kickoff & overview",
        },
        {
          label: "Calendar",
          href: `${accountBase}/calendar`,
          icon: Calendar,
          description: "Schedule & posts",
        },
        {
          label: "Insights",
          href: `${accountBase}/insights`,
          icon: Sparkles,
          description: "Post performance",
        },
      ],
    },
    {
      title: "Strategy",
      items: [
        {
          label: "Results",
          href: `${accountBase}/results`,
          icon: TrendingUp,
          description: "What we achieved",
        },
        {
          label: "Library",
          href: `${accountBase}/library`,
          icon: Grid,
          description: "All posts",
        },
        {
          label: "Notes",
          href: `${accountBase}/notes`,
          icon: StickyNote,
          description: "Monthly notes",
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          label: "Account",
          href: `${accountBase}/settings`,
          icon: Settings,
          description: "Configuration",
        },
      ],
    },
  ];

  const isActiveLink = (href: string) => {
    if (!href) return false;
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  };

  return (
    <aside
      className={`
        flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300
        ${isCollapsed ? "w-16" : "w-56"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white">Strategy</h1>
            <p className="text-[10px] text-slate-500 truncate">Content Platform</p>
          </div>
        )}
      </div>

      {/* Account Switcher */}
      <AccountSwitcher collapsed={isCollapsed} />

      {/* Account-Scoped Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {currentAccount ? (
          accountNavSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!isCollapsed && (
                <p className="px-4 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = isActiveLink(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group
                        ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                        }
                      `}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div
                        className={`
                        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${
                          isActive
                            ? "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/30"
                            : "bg-slate-800 group-hover:bg-slate-700"
                        }
                      `}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
                      </div>
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.description && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500">Select an account</p>
            <p className="text-xs text-slate-600 mt-1">to view its data</p>
          </div>
        )}
      </nav>

      {/* Onboarding Status */}
      {currentAccount && (
        <div className="border-t border-slate-800 p-2">
          {!isCollapsed && (
            <p className="px-2 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Client Status
            </p>
          )}
          <div className="space-y-1">
            {/* Status indicator */}
            <div
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                ${currentAccount.platforms?.instagram?.connected
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-amber-500/10 border border-amber-500/20"
                }
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${currentAccount.platforms?.instagram?.connected
                    ? "bg-green-500/20"
                    : "bg-amber-500/20"
                  }
                `}
              >
                {currentAccount.platforms?.instagram?.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${
                    currentAccount.platforms?.instagram?.connected
                      ? "text-green-400"
                      : "text-amber-400"
                  }`}>
                    {currentAccount.platforms?.instagram?.connected
                      ? "Connected"
                      : "Not Connected"
                    }
                  </span>
                  <p className="text-[10px] text-slate-500 truncate">
                    {currentAccount.platforms?.instagram?.connected
                      ? currentAccount.platforms.instagram.username
                      : "Instagram pending"
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Open onboarding link */}
            <a
              href={`/onboard/${currentAccount.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors group"
              title={isCollapsed ? "Open Onboarding Page" : undefined}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Onboard Link</span>
                    <p className="text-[10px] text-slate-500 truncate">
                      Send to client
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </div>
              )}
            </a>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
