import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL ? new URL(process.env.NEXT_PUBLIC_CDN_URL) : null;

const nextConfig: NextConfig = {
  transpilePackages: ["@azza/shared"],
  images: {
    // Course covers and portraits come from the API's /media and uploaded files from the CDN.
    remotePatterns: [
      new URL(`${apiUrl.origin}/media/**`),
      new URL(`${apiUrl.origin}/uploads/**`),
      ...(cdnUrl ? [new URL(`${cdnUrl.origin}/**`)] : []),
    ],
    // The dev API runs on localhost, which the optimizer refuses by default (SSRF guard).
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
