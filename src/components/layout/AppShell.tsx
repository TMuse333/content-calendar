"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Don't render shell for auth, onboard, client-view, or review routes (client-facing)
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboard") ||
    pathname.includes("/client-view") ||
    pathname.startsWith("/review")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
