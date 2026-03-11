/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  
  // Optimisations pour réduire les coûts Vercel
  compress: true,
  
  async headers() {
    return [
      {
        source: '/api/suno/status',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/api/ai/generations',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=30, stale-while-revalidate=60' },
        ],
      },
      {
        source: '/api/tracks/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=30, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/ranking/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=30, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/users',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/playlists/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
  
  // Configuration des images
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Optimisation du bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Correction pour éviter les erreurs de référence
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Optimisation des chunks - seulement côté client
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
  
  // Configuration du service worker
  async rewrites() {
    return [
      {
        source: '/sw-polling.js',
        destination: '/_next/static/sw-polling.js',
      },
    ];
  },
};

module.exports = nextConfig; 