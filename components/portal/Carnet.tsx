"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { LINKS } from "../../lib/data";
import { LogoMark } from "../Logo";

export type DatosCarnet = {
  nombre: string;
  /** Profesión, estudio o rubro: la línea amarilla. */
  subtitulo: string;
  /** "Asociado", "Proveedor" o "Profesional". */
  rol: string;
  numero: string;
  /** Matrícula (personas) o razón social (proveedores). */
  detalle: string;
  detalleLabel: string;
  foto: string;
  /** Dirección pública que confirma la vigencia (la abre el QR). */
  verificar: string;
  vigente: boolean;
};

export const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Etiqueta de cada dato del frente ("Mat." → "Matrícula"). */
export function etiquetaDetalle(d: DatosCarnet) {
  if (d.detalleLabel) return d.detalleLabel.replace(/^Mat\.?$/i, "Matrícula");
  return d.rol === "Proveedor" ? "Razón social" : "Detalle";
}

function Marca({ oscura }: { oscura?: boolean }) {
  return (
    <span className="carnet__marca">
      <svg viewBox="10 0 82 63" aria-hidden="true">
        {/* ground = el color del fondo: dibuja las separaciones entre las piezas */}
        <LogoMark ground={oscura ? "#0f1b4f" : "#ffffff"} />
      </svg>
      <span>
        CAPH
        <small>Santa Fe</small>
      </span>
    </span>
  );
}

/**
 * Carnet digital con las dos caras: se da vuelta con clic, toque, Enter o Espacio.
 * En pantallas con mouse se inclina siguiendo al puntero; con "reducir movimiento" cambia de cara sin girar.
 * Frente oscuro con las formas del logo de fondo; dorso claro. El color de la píldora depende del tipo de socio.
 */
export function Carnet({ datos, volteado, onVoltear }: { datos: DatosCarnet; volteado: boolean; onVoltear: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    let vivo = true;
    QRCode.toString(datos.verificar, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#091135", light: "#ffffff" } })
      .then((svg) => vivo && setQr(svg))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [datos.verificar]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.setAttribute("data-tilt", "");
        el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * 16}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.removeAttribute("data-tilt");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const rol = datos.rol.toLowerCase();

  return (
    <button
      ref={ref}
      type="button"
      className="carnet"
      data-volteado={volteado || undefined}
      data-rol={rol}
      onClick={onVoltear}
      aria-pressed={volteado}
      aria-label={`Carnet de ${datos.nombre}. ${volteado ? "Mostrando el dorso" : "Mostrando el frente"}: tocá para darlo vuelta.`}
    >
      <span className="carnet__tilt">
        <span className="carnet__giro">
          {/* ---------- frente ---------- */}
          <span className="carnet__cara carnet__frente" aria-hidden={volteado}>
            <svg viewBox="10 0 82 63" className="carnet__formas" aria-hidden="true">
              <LogoMark ground="transparent" />
            </svg>
            <span className="carnet__cabecera">
              <Marca oscura />
              <span className="carnet__rol">{datos.rol}</span>
            </span>

            <span className="carnet__foto">
              <span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {datos.foto ? <img src={datos.foto} alt="" /> : <b>{iniciales(datos.nombre)}</b>}
              </span>
            </span>

            <span className="carnet__datos">
              <strong className="carnet__nombre">{datos.nombre}</strong>
              {datos.subtitulo && <span className="carnet__subtitulo">{datos.subtitulo}</span>}
              <span className="carnet__meta">
                {datos.numero && (
                  <span>
                    <small>N.º de socio</small>
                    {datos.numero}
                  </span>
                )}
                {datos.detalle && (
                  <span>
                    <small>{etiquetaDetalle(datos)}</small>
                    {datos.detalle}
                  </span>
                )}
              </span>
            </span>

            <span className="carnet__qr">
              <span dangerouslySetInnerHTML={{ __html: qr }} />
              <small>Escaneá para verificar</small>
            </span>

            <span className="carnet__pie">
              <span className="carnet__vigencia" data-vigente={datos.vigente || undefined}>
                {datos.vigente ? "Credencial vigente" : "Credencial no vigente"}
              </span>
              <span>caphsf.ar</span>
            </span>
            <span className="carnet__franja" aria-hidden="true" />
            <span className="carnet__brillo" aria-hidden="true" />
          </span>

          {/* ---------- dorso ---------- */}
          <span className="carnet__cara carnet__dorso" aria-hidden={!volteado}>
            <span className="carnet__franja carnet__franja--arriba" aria-hidden="true" />
            <svg viewBox="10 0 82 63" className="carnet__formas carnet__formas--dorso" aria-hidden="true">
              <LogoMark ground="transparent" />
            </svg>
            <span className="carnet__cabecera">
              <Marca />
              <span className="carnet__estado" data-vigente={datos.vigente || undefined}>
                {datos.vigente ? "Vigente" : "No vigente"}
              </span>
            </span>
            <span className="carnet__dorso-cuerpo">
              <span className="carnet__dorso-titulo">Credencial de {rol}</span>
              <span className="carnet__dorso-texto">
                Identifica a su titular como {rol} de la Cámara de la Propiedad Horizontal de Santa Fe, 1.ª Circunscripción.
              </span>
              <span className="carnet__dorso-dato">
                <small>Titular</small>
                {datos.nombre}
              </span>
            </span>
            <span className="carnet__dorso-pie">
              <span>
                <small>Verificación</small>
                Escaneá el QR del frente
              </span>
              <span>
                <small>Contacto</small>
                WhatsApp {LINKS.whatsappLabel}
              </span>
            </span>
            <span className="carnet__brillo" aria-hidden="true" />
          </span>
        </span>
      </span>
    </button>
  );
}
