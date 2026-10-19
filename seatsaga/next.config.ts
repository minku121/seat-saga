import type { NextConfig } from "next";

const RAW_INVENTORY_URL = process.env.INVENTORY_API_URL || "https://seat-saga-inventory.onrender.com";
const INVENTORY_URL = RAW_INVENTORY_URL.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/inventory/:path*",
        destination: `${INVENTORY_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;