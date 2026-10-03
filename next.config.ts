import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker build (see Dockerfile): produces .next/standalone,
  // a self-contained server.js + pruned node_modules, instead of a build that
  // expects `next start` with the full project tree present.
  output: "standalone",
  async headers() {
    return [
      // The worker itself must never be HTTP-cached, or updates stall.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/models/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
