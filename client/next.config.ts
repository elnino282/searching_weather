import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: false, //disable reactStrictMode
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["http://localhost:3100", "http://127.0.0.1:3100"],
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
