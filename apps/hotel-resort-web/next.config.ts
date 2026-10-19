import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@omniheaven/ui", "@omniheaven/validators", "@omniheaven/db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
