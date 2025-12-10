import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Transpile local monorepo packages
  transpilePackages: ["@selectchatgpt/common"],
};

export default nextConfig;
