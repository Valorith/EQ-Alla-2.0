import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@eq-alla/data", "@eq-alla/ui"]
};

export default nextConfig;
