import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname, // <-- FIX
  },
};

export default nextConfig;
