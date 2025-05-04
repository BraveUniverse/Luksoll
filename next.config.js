/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  basePath: '', 
  swcMinify: false, 

  // --> YENİ AYAR BAŞLANGIÇ <--
  transpilePackages: [
    '@erc725/erc725.js',
    // Muhtemelen erc725'in kullandığı veya etkileşimde olduğu diğerleri:
    // '@lukso/web3', // Eğer @lukso/web3 kullanılıyorsa (varsa yorumu kaldır)
    'web3', // Eğer genel web3 paketi kullanılıyorsa
    '@lukso/up-provider' // Bağlantı için
    // Not: Eğer başka LSP standart kütüphaneleri kullanılıyorsa (LSP4, LSP5 vb.)
    // ve onlar da sorun çıkarıyorsa buraya eklenebilir.
  ],
  // --> YENİ AYAR BİTİŞ <--

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.universalprofile.cloud',
      },
    ],

  },
  // Üretim build'inde console loglarını kaldır
  
  // Build sırasında ESLint hatalarını görmezden gel
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 
