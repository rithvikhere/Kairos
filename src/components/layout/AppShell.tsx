"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar.js";
import { TopBar } from "./TopBar.js";
import { RiskSilkBackground } from "../background/RiskSilkBackground.js";

export interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell manages conditional presentation:
 * - On the landing page (`/`), it provides an unconstrained full-width container
 *   with its own editorial layout, without workspace sidebar/topbar.
 * - On workspace routes (`/projects`, `/projects/*`), it renders the full
 *   workspace frame with Sidebar, TopBar, and RiskSilkBackground.
 */
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isStandalone = pathname === "/" || pathname.startsWith("/projects");

  if (isStandalone) {
    return (
      <main className="min-h-screen w-full bg-[#f6f4ef] text-[#221f1b]">
        {children}
      </main>
    );
  }

  return (
    <>
      {/* Animated Risk-Responsive Background for Workspace */}
      <RiskSilkBackground />

      <div className="relative z-10 flex min-h-screen">
        {/* Workspace Sidebar */}
        <Sidebar />

        {/* Main Application Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default AppShell;
