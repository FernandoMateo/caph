import type { Metadata } from "next";
import { Icon } from "../../../../components/Icon";
import { LogoMark } from "../../../../components/Logo";
import { getCertificado, type Certificado } from "../../../../lib/content";
import { TIPOS_CAPACITACION } from "../../../../lib/cursos";
import { LINKS } from "../../../../lib/data";
import "../../../admin/admin.css";
import "../../verificar.css";

export const metadata: Metadata = {
  title: "Verificación de certificado · CAPH Santa Fe",
  robots: { index: false, follow: false },
};

const fechaLarga = (ymd: string) =>
  new Date(`${ymd}T12:00:00-03:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// La página que abre el QR de un certificado: confirma que lo emitió la Cámara.
export default async function VerificarCertificado({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  let cert: Certificado | null = null;
  let caido = false;
  try {
    cert = await getCertificado(codigo);
  } catch {
    caido = true;
  }

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
        ) : cert ? (
          <>
            <p className="verificar__estado" data-vigente="">
              <Icon name="check" size={18} /> Certificado válido
            </p>
            <h1>{cert.nombre}</h1>
            <p>
              Completó el {(TIPOS_CAPACITACION[cert.tipo] ?? "curso").toLowerCase()} <strong>«{cert.curso}»</strong>
              {cert.horas > 0 && `, ${cert.horas} ${cert.horas === 1 ? "hora" : "horas"}`}, el {fechaLarga(cert.fecha)}.
            </p>
            {cert.certificacion && <p className="verificar__detalle">{cert.certificacion}</p>}
            <p className="verificar__fecha">Código {cert.codigo} · emitido por CAPH Santa Fe.</p>
          </>
        ) : (
          <>
            <p className="verificar__estado">
              <Icon name="x" size={18} /> No válido
            </p>
            <h1>No encontramos este certificado</h1>
            <p>Revisá el código o consultá a la Cámara.</p>
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
