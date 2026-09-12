import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers.js";
import { Sidebar } from "../components/layout/Sidebar.js";
import { TopBar } from "../components/layout/TopBar.js";
import { RiskSilkBackground } from "../components/background/RiskSilkBackground.js";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kairos — Decision Simulation & Scenario Intelligence",
  description:
    "Deterministic decision simulation engine with Monte Carlo uncertainty modeling and AI-assisted scenario intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakarta.variable}`}>
      <body className="bg-base text-ink min-h-screen flex flex-col font-sans antialiased selection:bg-accent selection:text-base">
        <Providers>
          {/* Animated Risk-Responsive Background */}
          <RiskSilkBackground />

          <div className="relative z-10 flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Application Column */}
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
