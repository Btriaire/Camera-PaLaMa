import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker build only (the Dockerfile sets DOCKER_BUILD): produces
  // .next/standalone, a self-contained server.js. Off elsewhere (Vercel).
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
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
