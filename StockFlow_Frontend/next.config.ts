import type { NextConfig } from "next";

// Ảnh hàng hóa lưu trên máy chủ API, DB ghi đường dẫn tương đối "/api/uploads/...".
// Chạy dev (web :3000, API :5000) cần chuyển tiếp đường dẫn này sang API.
// Bản Docker build với NEXT_PUBLIC_API_URL="" (cùng địa chỉ, Caddy đã chuyển /api/*) nên không thêm rewrite.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    if (!apiBaseUrl) return [];
    return [
      {
        source: "/api/uploads/:path*",
        destination: `${apiBaseUrl}/api/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/products/pricing',
        destination: '/products/price-books',
        permanent: true,
      },
    ];
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
