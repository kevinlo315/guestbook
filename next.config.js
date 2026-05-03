/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support more image MIME types
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Ensure proper MIME types for static files
  headers: async () => [
    {
      source: '/uploads/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: '*',
        },
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
}

module.exports = nextConfig