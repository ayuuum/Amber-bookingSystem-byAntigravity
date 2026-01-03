import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // 開発モードのインジケーターを無効化
  devIndicators: false,
  // Webpackの設定でパスエイリアスを明示的に設定（Turbopackのフォールバック用）
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
  // Turbopackの設定
  experimental: {
    turbo: {
      resolveAlias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
};

export default nextConfig;
