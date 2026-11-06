import type { Metadata } from "next";
import { Icon } from "../../../components/Icon";
import { LogoMark } from "../../../components/Logo";
import { getCredencial, type Credencial } from "../../../lib/content";
import { LINKS } from "../../../lib/data";
import "../../admin/admin.css";
import "../verificar.css";

export const metadata: Metadata = {
  title: "Verificación de carnet · CAPH Santa Fe",
  robots: { index: false, follow: false },
};

// La página que abre el QR del carnet: confirma si la credencial está vigente hoy.
export default async function VerificarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let credencial: Credencial | null = null;
  let caido = false;
  try {
    credencial = await getCredencial(id);
  } catch {
    caido = true;
  }
  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <main className="login">
      <div className="login__card verificar">
        <svg viewBox="10 0 82 63" className="login__mark" aria-hidden="true">
          <LogoMark ground="#ffffff" />
        </svg>
        {caido ? (
          <>
            <h1>No pudimos verificar ahora</h1>
            <p>Probá de nuevo en unos minutos o consultá a la Cámara.</p>
          </>
        ) : credencial ? (
          <>
            <p className="verificar__estado" data-vigente="">
              <Icon name="check" size={18} /> Carnet vigente
            </p>
            <div className="verificar__persona">
              <span className="verificar__foto" data-logo={credencial.rol === "Proveedor" || undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {credencial.foto ? <img src={credencial.foto} alt="" /> : credencial.nombre.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h1>{credencial.nombre}</h1>
                <p>
                  {credencial.rol} de CAPH Santa Fe{credencial.numero && ` · N.º ${credencial.numero}`}
                </p>
                {credencial.detalle && <p className="verificar__detalle">{credencial.detalle}</p>}
              </div>
            </div>
            <p className="verificar__fecha">Verificado el {hoy}.</p>
          </>
        ) : (
          <>
            <p className="verificar__estado">
              <Icon name="x" size={18} /> No vigente
            </p>
            <h1>Este carnet no está vigente</h1>
            <p>No existe o la Cámara lo dio de baja. Si creés que es un error, consultá a la Cámara.</p>
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
