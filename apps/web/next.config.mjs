/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Strict offline behavior: disable external image optimization domains
  images: {
    unoptimized: true
  }
};

export default nextConfig;
