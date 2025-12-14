import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  // Transpile local monorepo packages
  transpilePackages: ["@selectchatgpt/common"],
  // Static export에서는 이미지 최적화 비활성화
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
