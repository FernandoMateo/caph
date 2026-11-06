"use client";

import { useEffect, useState } from "react";
import type { CarnetPublico as Datos } from "../../lib/content";
import { Icon } from "../Icon";
import { telHref, telLabel } from "../Proveedores";
import { Carnet } from "./Carnet";

function whatsapp(tel: string) {
  let d = tel.replace(/\D/g, "").replace(/^0+/, "");
  if (!d.startsWith("54")) d = `549${d}`;
  return `https://wa.me/${d}`;
}

/** Tarjeta de contacto (.vcf) para guardar al socio en la agenda del teléfono. */
function vcard(c: Datos) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  let tel = c.telefono.replace(/\D/g, "").replace(/^0+/, "");
  if (tel && !tel.startsWith("54")) tel = `549${tel}`;
  const lineas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(c.nombre)}`,
    `N:;${esc(c.nombre)};;;`,
    `ORG:${esc(c.rol === "Proveedor" ? c.detalle || c.nombre : "CAPH Santa Fe")}`,
    c.subtitulo && `TITLE:${esc(c.subtitulo)}`,
    tel && `TEL;TYPE=CELL:+${tel}`,
    c.email && `EMAIL;TYPE=WORK:${esc(c.email)}`,
    c.web && `URL:${esc(c.web)}`,
    `NOTE:${esc(`${c.rol} de CAPH Santa Fe${c.numero ? ` · N.º ${c.numero}` : ""}`)}`,
    "END:VCARD",
  ].filter(Boolean);
  return lineas.join("\r\n");
}

/** Comparte el link con el menú del teléfono; si no hay, lo copia. */
export async function compartir(url: string, titulo: string): Promise<"compartido" | "copiado" | "cancelado"> {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: titulo, url });
      return "compartido";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelado";
    }
  }
  await navigator.clipboard.writeText(url);
  return "copiado";
}

export function CarnetPublico({ datos }: { datos: Datos }) {
  const [volteado, setVolteado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => setUrl(window.location.href.split("#")[0]), []);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  const titulo = `${datos.nombre} · ${datos.rol} de CAPH Santa Fe`;

  return (
    <div className="tarjeta">
      <Carnet
        datos={{
          nombre: datos.nombre,
          subtitulo: datos.subtitulo,
          rol: datos.rol,
          numero: datos.numero,
          detalle: datos.detalle,
          detalleLabel: datos.detalleLabel,
          foto: datos.foto,
          // el QR lleva a la verificación (la usa quien tiene el carnet impreso)
          verificar: url ? new URL(`/verificar/${datos.id}`, url).href : `/verificar/${datos.id}`,
          vigente: true,
        }}
        volteado={volteado}
        onVoltear={() => setVolteado((v) => !v)}
      />
      <p className="portal__pista">Tocá el carnet para darlo vuelta.</p>

      <div className="tarjeta__info">
        <h1>{datos.nombre}</h1>
        <p>{[datos.subtitulo, datos.localidad].filter(Boolean).join(" · ")}</p>
        {datos.descripcion && <p className="tarjeta__desc">{datos.descripcion}</p>}
      </div>

      <div className="tarjeta__acciones">
        {datos.telefono && (
          <>
            <a className="btn btn--navy" href={whatsapp(datos.telefono)} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" size={18} /> WhatsApp
            </a>
            <a className="btn btn--ghost-dark" href={telHref(datos.telefono)} title={telLabel(datos.telefono)}>
              <Icon name="phone" size={18} /> Llamar
            </a>
          </>
        )}
        {datos.email && (
          <a className="btn btn--ghost-dark" href={`mailto:${datos.email}`}>
            <Icon name="mail" size={18} /> Email
          </a>
        )}
        {datos.web && (
          <a className="btn btn--ghost-dark" href={datos.web} target="_blank" rel="noopener noreferrer">
            <Icon name="link" size={18} /> Web
          </a>
        )}
      </div>

      <div className="tarjeta__acciones tarjeta__acciones--sec">
        <button
          type="button"
          className="btn btn--ghost-dark btn--sm"
          onClick={() => {
            const blob = new Blob([vcard(datos)], { type: "text/vcard;charset=utf-8" });
            const href = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = href;
            a.download = `${datos.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").toLowerCase()}.vcf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(href), 10_000);
          }}
        >
          <Icon name="download" size={16} /> Guardar contacto
        </button>
        <button
          type="button"
          className="btn btn--ghost-dark btn--sm"
          onClick={async () => {
            const r = await compartir(url, titulo).catch(() => "cancelado" as const);
            if (r === "copiado") setAviso("Link copiado");
          }}
        >
          <Icon name="link" size={16} /> Compartir
        </button>
      </div>
      <p className="tarjeta__aviso" role="status" aria-live="polite">
        {aviso}
      </p>

      <a href="/" className="tarjeta__camara">
        Cámara de la Propiedad Horizontal de Santa Fe <Icon name="arrow" size={14} />
      </a>
    </div>
  );
}
