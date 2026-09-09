import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker build (see Dockerfile): produces .next/standalone,
  // a self-contained server.js + pruned node_modules, instead of a build that
  // expects `next start` with the full project tree present.
  output: "standalone",
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
