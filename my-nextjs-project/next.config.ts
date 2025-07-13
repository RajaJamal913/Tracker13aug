// my-nextjs-project/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // … any existing config options …

  // add this block:
  async rewrites() {
    return [
      {
        source: "/api/:path*",             // any request under /api/…
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/login",                  // your login path
        destination: "http://127.0.0.1:8000/login",
      },
      {
        source: "/login/:path*",
        destination: "http://127.0.0.1:8000/login/:path*",
      },
      // add more routes here as needed
    ];
  },
};

export default nextConfig;
