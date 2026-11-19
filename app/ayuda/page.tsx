import type { Metadata } from "next";
import { Instructivo } from "../../components/Instructivo";
import { LogoMark } from "../../components/Logo";
import { GUIAS_SOCIOS } from "../../lib/instructivo";
import { LINKS } from "../../lib/data";
import "../../components/instructivo.css";
import "./ayuda.css";

export const metadata: Metadata = {
  title: "Ayuda · CAPH Santa Fe",
  description: "Instructivo paso a paso del portal de la Cámara de la Propiedad Horizontal de Santa Fe: alta, credencial, ficha y contraseña.",
};

export default function AyudaPage() {
  return (
    <div className="ayuda" id="top">
      <header className="ayuda__barra">
        <a href="/" className="ayuda__marca" title="Ir a la web">
          <svg viewBox="10 0 82 63" aria-hidden="true">
            <LogoMark ground="#091135" />
          </svg>
          <span>
            CAPH <small>Ayuda</small>
          </span>
        </a>
        <nav aria-label="Accesos">
          <a href="/">La web</a>
          <a href="/portal">Mi portal</a>
        </nav>
      </header>
      <main className="ayuda__main">
        <Instructivo
          guias={GUIAS_SOCIOS}
          titulo="¿Cómo te ayudamos?"
          bajada="El paso a paso de todo lo que podés hacer en la web y en tu portal de la Cámara."
        />
        <p className="ayuda__contacto">
          ¿No encontrás lo que buscás?{" "}
          <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
            Escribinos por WhatsApp
          </a>
          .
        </p>
      </main>
    </div>
  );
}
