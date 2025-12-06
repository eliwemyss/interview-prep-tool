import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: '../public',
  trailingSlash: true,
};

export default nextConfig;
