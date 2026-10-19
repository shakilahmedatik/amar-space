import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@omniheaven/ui", "@omniheaven/validators"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
