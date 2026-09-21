import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      // TIER 1 — NETWORK-ONLY for all safety-critical data.
      // If the network fails, the request fails immediately. Zero stale fallback.
      // Crucial to prevent double-bookings and ensure real-time vehicle availability.
      {
        urlPattern: /^https?:\/\/.*\/api\/(bookings|availability|vehicle-locks|wallets|dealers|vehicles)/,
        handler: "NetworkOnly",
      },
      // TIER 2 — NETWORK-FIRST for any remaining /api/ routes (e.g. user profile, settings).
      // Falls back to cache only after a 10-second timeout.
      {
        urlPattern: /^https?:\/\/.*\/api\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-misc",
          networkTimeoutSeconds: 10,
        },
      },
      // STALE-WHILE-REVALIDATE for Next.js compiled static assets
      {
        urlPattern: /^\/_next\/static\//,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-static",
        },
      },
      // CACHE-FIRST for images
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      // NETWORK-FIRST for HTML page navigations — offline falls back to /offline
      {
        urlPattern: /^\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default withPWA(nextConfig);
