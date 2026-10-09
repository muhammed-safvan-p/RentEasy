import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";
import InstallPrompt from "@/components/InstallPrompt";
import IOSInstallBanner from "@/components/IOSInstallBanner";
import RequirePhoneModal from "@/components/auth/RequirePhoneModal";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RentEasy",
  description: "Vehicle rental booking and fleet management system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RentEasy",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-black flex justify-center">
        {/* App Shell container to restrict to mobile size on desktop */}
        <div className="app-shell w-full flex flex-col pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
          <Providers>
            <main className="flex-1 w-full relative">{children}</main>
            <RequirePhoneModal />
            <InstallPrompt />
            <IOSInstallBanner />
            <BottomNav />
          </Providers>
        </div>
      </body>
    </html>
  );
}
