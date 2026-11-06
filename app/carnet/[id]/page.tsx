import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { Icon } from "../../../components/Icon";
import { LogoMark } from "../../../components/Logo";
import { CarnetPublico } from "../../../components/portal/CarnetPublico";
import { getCarnetPublico } from "../../../lib/content";
import { LINKS } from "../../../lib/data";
import "../../admin/admin.css";
import "../../portal/portal.css";
import "../../verificar/verificar.css";
import "./carnet.css";

// Tarjeta pública de un socio, para compartir. Muestra solo lo que ya es público en la web.

const datos = cache(async (id: string) => {
  try {
    return { carnet: await getCarnetPublico(id), caido: false };
  } catch {
    return { carnet: null, caido: true };
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { carnet } = await datos(id);
  if (!carnet) return { title: "Carnet · CAPH Santa Fe", robots: { index: false } };
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const titulo = `${carnet.nombre} · ${carnet.rol} de CAPH Santa Fe`;
  const descripcion = [carnet.subtitulo, carnet.localidad, carnet.numero && `N.º ${carnet.numero}`].filter(Boolean).join(" · ");
  return {
    title: titulo,
    description: descripcion || "Credencial de la Cámara de la Propiedad Horizontal de Santa Fe.",
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      description: descripcion || undefined,
      type: "profile",
      images: carnet.foto ? [{ url: new URL(carnet.foto, origen).href, width: 400, height: 400 }] : undefined,
    },
  };
}

export default async function CarnetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { carnet, caido } = await datos(id);

  if (carnet)
    return (
      <main className="portal tarjeta-pagina">
        <CarnetPublico datos={carnet} />
      </main>
    );

  return (
    <main className="login">
      <div className="login__card verificar">
        <svg viewBox="10 0 82 63" className="login__mark" aria-hidden="true">
          <LogoMark ground="#ffffff" />
        </svg>
        {caido ? (
          <>
            <h1>No pudimos cargar el carnet</h1>
            <p>Probá de nuevo en unos minutos.</p>
          </>
        ) : (
          <>
            <p className="verificar__estado">
              <Icon name="x" size={18} /> No vigente
            </p>
            <h1>Este carnet no está disponible</h1>
            <p>No existe o no está vigente. Si creés que es un error, consultá a la Cámara.</p>
          </>
        )}
        <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--ghost-dark btn--block">
          <Icon name="chat" size={18} /> Consultar a la Cámara
        </a>
        <a href="/" className="login__back">
          Ir a caphsf.ar
        </a>
      </div>
    </main>
  );
}
