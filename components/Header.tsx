"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { LINKS } from "../lib/data";

// el popup (con el carnet y el cliente del portal) se baja recién cuando alguien lo abre
const PopupAsociados = dynamic(() => import("./portal/PopupAsociados"), { ssr: false });

const ASOCIADOS = "#asociados";

const NAV = [
  ["Honorarios", "#honorarios"],
  ["Capacitaciones", "#capacitaciones"],
  ["Proveedores", "#proveedores"],
  ["Profesionales", "#profesionales"],
  ["La Cámara", "#quienes-somos"],
  ["Contacto", "#contacto"],
  ["Asociados", ASOCIADOS],
  ["Mi portal", "/portal"],
];

export function Header({ profesionales = true }: { profesionales?: boolean }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [socios, setSocios] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // caphsf.ar/#asociados abre el popup directamente (sirve para mandarlo por WhatsApp)
  useEffect(() => {
    const revisar = () => window.location.hash === ASOCIADOS && setSocios(true);
    revisar();
    window.addEventListener("hashchange", revisar);
    return () => window.removeEventListener("hashchange", revisar);
  }, []);

  const cerrarSocios = () => {
    setSocios(false);
    if (window.location.hash === ASOCIADOS) history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  return (
    <header className="site-header" data-solid={solid || open || undefined}>
      <div className="site-header__bar">
        <a href="#inicio" className="site-header__brand" aria-label="CAPH Santa Fe, inicio">
          <Logo withText={false} className="site-header__mark" />
          <span className="site-header__name">
            CAPH <span>Santa Fe</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Principal" data-open={open || undefined} id="site-nav">
          <ul>
            {NAV.filter(([, href]) => profesionales || href !== "#profesionales").map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  aria-haspopup={href === ASOCIADOS ? "dialog" : undefined}
                  onClick={(e) => {
                    setOpen(false);
                    if (href !== ASOCIADOS) return;
                    e.preventDefault();
                    setSocios(true);
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <a className="btn btn--yellow btn--sm" href={LINKS.asociarse}>
            Quiero asociarme
          </a>
        </nav>

        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "x" : "menu"} size={20} />
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
      </div>
      {socios && <PopupAsociados onCerrar={cerrarSocios} />}
    </header>
  );
}
