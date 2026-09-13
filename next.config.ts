import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/x", destination: "https://x.com/tunardev", permanent: false },
      { source: "/twitter", destination: "https://x.com/tunardev", permanent: false },
      { source: "/gloree", destination: "https://gloree.ai", permanent: false },
      { source: "/github", destination: "https://github.com/tunardev", permanent: false },
      { source: "/instagram", destination: "https://instagram.com/tunar.tech", permanent: false },
      { source: "/linkedin", destination: "https://linkedin.com/in/tunardev", permanent: false },
      { source: "/rss", destination: "/feed.xml", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
