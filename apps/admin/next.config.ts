import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@omniheaven/ui",
    "@omniheaven/trpc",
    "@omniheaven/validators",
    "@omniheaven/auth",
  ],
};

export default withNextIntl(nextConfig);
