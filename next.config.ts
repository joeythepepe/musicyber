import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin turbopack root to this app dir (silences multi-lockfile warning)
  turbopack: { root: __dirname },
};

export default nextConfig;
