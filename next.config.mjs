import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pbUrl = (process.env.PB_URL || "http://127.0.0.1:8090").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Encabezados de seguridad: nadie puede meter la web en un iframe ajeno (clickjacking), el navegador no adivina
  // tipos de archivo, y no se filtran rutas internas a otros sitios.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
  outputFileTracingRoot: root,
  // El dashboard de PocketBase vive en /_/ con barra final; sin esto Next la quita y entra en bucle.
  skipTrailingSlashRedirect: true,
  // PocketBase detrás del mismo dominio que la web: el navegador (panel, archivos) solo habla con la web.
  // En producción Caddy manda /api directo a PocketBase y no publica el dashboard (deploy/setup-vps.sh).
  async rewrites() {
    const reglas = [{ source: "/api/:path*", destination: `${pbUrl}/api/:path*` }];
    // El dashboard /_/ por la web, solo en local: en el servidor se entra por túnel SSH.
    if (process.env.NODE_ENV !== "production") {
      reglas.push({ source: "/_/", destination: `${pbUrl}/_/` }, { source: "/_/:path+", destination: `${pbUrl}/_/:path+` });
    }
    return reglas;
  },
};

export default nextConfig;
