import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@omniheaven/ui",
    "@omniheaven/trpc",
    "@omniheaven/validators",
    "@omniheaven/auth",
  ],
};

export default nextConfig;
