"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { LINKS } from "../lib/data";

const NAV = [
  ["Honorarios", "#honorarios"],
  ["Capacitaciones", "#capacitaciones"],
  ["Proveedores", "#proveedores"],
  ["La Cámara", "#quienes-somos"],
  ["Contacto", "#contacto"],
];

export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <header className="site-header" data-solid={solid || open || undefined}>
      <div className="site-header__bar">
        <a href="#inicio" className="site-header__brand" aria-label="CAPH Santa Fe, inicio">
          <Logo ground="#0d1641" ink="#ffffff" withText={false} className="site-header__mark" />
          <span className="site-header__name">
            CAPH <span>Santa Fe</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Principal" data-open={open || undefined} id="site-nav">
          <ul>
            {NAV.map(([label, href]) => (
              <li key={href}>
                <a href={href} onClick={() => setOpen(false)}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <a className="btn btn--yellow btn--sm" href={LINKS.asociarse} target="_blank" rel="noopener noreferrer">
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
    </header>
  );
}
