import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@omniheaven/ui",
    "@omniheaven/trpc",
    "@omniheaven/validators",
    "@omniheaven/auth",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
