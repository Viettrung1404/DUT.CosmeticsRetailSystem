import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  // ADR-002: opt in only once public cache/invalidation contracts exist.
  cacheComponents: false,
  images: { remotePatterns: [] },
};

export default config;
