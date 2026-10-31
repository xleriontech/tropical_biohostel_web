/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // El service worker nunca debe quedar cacheado: si no, los dispositivos con
  // la PWA instalada seguirían sirviendo una versión antigua.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json; charset=utf-8" }],
      },
      // El manual de identidad se marca "uso interno y de partners autorizados":
      // se sirve público pero fuera del índice de los buscadores, y revalidado
      // para que una corrección de marca no tarde un día en llegar.
      {
        source: "/manual-de-imagen.html",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nosnippet" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },

};

module.exports = nextConfig;
