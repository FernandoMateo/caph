import type { Metadata } from "next";
import { Alta } from "../../components/portal/Alta";
import "../admin/admin.css";
import "./alta.css";

export const metadata: Metadata = {
  title: "Sumate a la Cámara · CAPH Santa Fe",
  description: "Alta de administradores de consorcios, proveedores y profesionales en la Cámara de la Propiedad Horizontal de Santa Fe.",
};

export default async function AltaPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  return (
    <main className="login alta">
      <Alta rolInicial={rol === "asociado" || rol === "proveedor" || rol === "profesional" ? rol : null} />
    </main>
  );
}
