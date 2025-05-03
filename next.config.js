/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  basePath: '/miniapps/luksopoll',
//  output: 'export', // Statik dışa aktarma KULLANMIYORUZ

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.universalprofile.cloud',
      },
    ],
    // unoptimized: true, // Vercel optimizasyon yapacağı için kaldırılabilir veya kalabilir
  },
  // Üretim build'inde console loglarını kaldır
  compiler: {
    removeConsole: true,
  },
  // Build sırasında ESLint hatalarını görmezden gel
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 