import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers.js";
import { AppShell } from "../components/layout/AppShell.js";

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
      <body className="bg-[#f6f4ef] text-[#221f1b] min-h-screen flex flex-col font-sans antialiased selection:bg-[#2c4356] selection:text-[#f6f4ef]">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
