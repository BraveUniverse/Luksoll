/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  basePath: '',
//  output: 'export', // Statik dışa aktarma KULLANMIYORUZ

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.universalprofile.cloud',
      },
    ],

  },
  // Build sırasında ESLint hatalarını görmezden gel
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 
