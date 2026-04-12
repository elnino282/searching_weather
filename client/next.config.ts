import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: false, //disable reactStrictMode
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    //Ignore eslint errors during vercel deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    //Ignore typescript errors during vercel deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
