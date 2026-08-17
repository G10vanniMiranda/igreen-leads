import type { NextConfig } from "next";
import { createAdminSecurityHeaders, createSecurityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/:path*", headers: createSecurityHeaders(process.env) },
      { source: "/admin/:path*", headers: [...createAdminSecurityHeaders(process.env), ...privateHeaders] },
      { source: "/api/admin/:path*", headers: [...createAdminSecurityHeaders(process.env), ...privateHeaders] },
      { source: "/api/leads", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/lead-documents", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
