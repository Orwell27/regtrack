import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Boletines estáticos en /public/boletines, servidos con URL limpia
      { source: "/boletin/:slug", destination: "/boletines/:slug.html" },
    ];
  },
};

export default nextConfig;
