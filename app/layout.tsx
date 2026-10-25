import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CAPH Santa Fe · Cámara de la Propiedad Horizontal de Santa Fe",
  description:
    "La Cámara que representa a los administradores de consorcios de la 1.ª Circunscripción de Santa Fe: honorarios sugeridos, capacitaciones, proveedores verificados y asesoramiento para asociados.",
};

export const viewport: Viewport = {
  themeColor: "#091135",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
