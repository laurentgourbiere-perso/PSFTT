import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Application installée : un serveur autonome (avec ses seules dépendances) embarqué avec Node.js
  output: "standalone",
  outputFileTracingRoot: process.cwd(), // le projet est rangé dans le dépôt PSFTT : on ne remonte pas au-dessus
  experimental: { serverActions: { bodySizeLimit: "200mb" } }, // import d'une sauvegarde
  // Application locale : pas de télémétrie ni d'en-tête révélant la technologie
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
