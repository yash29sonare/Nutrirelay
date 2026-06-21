import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `after()` from next/server is stable in Next.js 16 — no experimental flag needed
  allowedDevOrigins: ['twenty-tools-hunt.loca.lt', '192.168.29.17', 'localhost:3000'],
};

export default nextConfig;
