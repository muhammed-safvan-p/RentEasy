import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RentEasy",
  description: "Vehicle rental booking and fleet management system.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b0b18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-black flex justify-center">
        {/* App Shell container to restrict to mobile size on desktop */}
        <div className="app-shell w-full flex flex-col pb-16">
          <Providers>
            <main className="flex-1 w-full relative">{children}</main>
            <BottomNav />
          </Providers>
        </div>
      </body>
    </html>
  );
}
