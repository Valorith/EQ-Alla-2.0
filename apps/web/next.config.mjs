import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import path from "node:path";

export default function nextConfig(phase) {
  return {
    allowedDevOrigins: ["127.0.0.1"],
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    output: "standalone",
    outputFileTracingRoot: path.join(process.cwd(), "../.."),
    transpilePackages: ["@eq-alla/data", "@eq-alla/ui"]
  };
}
