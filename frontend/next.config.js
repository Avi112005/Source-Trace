// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the root for Turbopack is set to the project directory
  experimental: {
    turbopack: {
      root: '.'
    }
  },
  // Enable React Strict Mode (optional but good for catching bugs)
  reactStrictMode: true,
  // Enable SWC minify for better performance
  swcMinify: true,
  // Typescript strict mode
  typescript: {
    // !! WARN !!
    // This will cause build to fail on type errors (good for production)
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
