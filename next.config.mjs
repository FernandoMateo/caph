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
  // PocketBase detrás del mismo dominio que la web: alcanza con un solo dominio
  // (NEXT_PUBLIC_PB_URL puede ser la URL pública de la propia web).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${pbUrl}/api/:path*` },
      { source: "/_/:path*", destination: `${pbUrl}/_/:path*` },
    ];
  },
};

export default nextConfig;
