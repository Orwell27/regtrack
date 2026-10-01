import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '/*': ['./.knowledge/**/*', './artifacts/**/*', './.env*', './.git/**/*', './integrations/config.local.json'],
  },
};

export default nextConfig;
