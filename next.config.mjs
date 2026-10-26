import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pbUrl = (process.env.PB_URL || "http://127.0.0.1:8090").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: root,
  // El dashboard de PocketBase vive en /_/ con barra final; sin esto Next la quita y entra en bucle.
  skipTrailingSlashRedirect: true,
  // PocketBase detrás del mismo dominio que la web: el navegador (panel, archivos) solo habla con la web.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${pbUrl}/api/:path*` },
      { source: "/_/", destination: `${pbUrl}/_/` },
      { source: "/_/:path+", destination: `${pbUrl}/_/:path+` },
    ];
  },
};

export default nextConfig;
