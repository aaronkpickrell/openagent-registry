import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Mount the entire app under /open-agent-registry so it lives at
  // myagi.bot/open-agent-registry. All next/link href values get the prefix
  // automatically; next/image src does too. Asset prefix is auto-derived.
  basePath: "/open-agent-registry",
};

export default nextConfig;
