/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  basePath: '',


  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.universalprofile.cloud',
      },
    ],

  },
  compiler: {
    removeConsole: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 
