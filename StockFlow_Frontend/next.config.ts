import type { NextConfig } from "next";

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
