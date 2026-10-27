"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { coincide } from "../lib/buscar";
import type { Profesional } from "../lib/content";
import { Icon } from "./Icon";
import { iniciales, telHref, telLabel } from "./Proveedores";

function whatsapp(tel: string) {
  let d = tel.replace(/\D/g, "").replace(/^0+/, "");
  if (!d.startsWith("54")) d = `549${d}`;
  return `https://wa.me/${d}`;
}

/**
 * Tarjetas con inclinación 3D: siguen al puntero (mouse o lápiz) con un brillo que se mueve encima.
 * Un solo listener para toda la grilla; en pantallas táctiles y con "reducir movimiento" quedan quietas.
 */
function useTilt(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let activa: HTMLElement | null = null;

    const soltar = (card: HTMLElement | null) => {
      if (!card) return;
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.removeAttribute("data-tilt");
    };
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element).closest<HTMLElement>(".pro-card");
      if (card !== activa) {
        soltar(activa);
        activa = card;
      }
      if (!card) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.setAttribute("data-tilt", "");
        card.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
        card.style.setProperty("--ry", `${(x - 0.5) * 18}deg`);
        card.style.setProperty("--gx", `${x * 100}%`);
        card.style.setProperty("--gy", `${y * 100}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      soltar(activa);
      activa = null;
    };
    grid.addEventListener("pointermove", onMove);
    grid.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      grid.removeEventListener("pointermove", onMove);
      grid.removeEventListener("pointerleave", onLeave);
    };
  }, [ref]);
}

function Tarjeta({ p, i }: { p: Profesional; i: number }) {
  const anio = new Date().getFullYear();
  return (
    <li className="pro-card" style={{ "--i": i % 4 } as React.CSSProperties}>
      <article className="pro-card__inner" aria-labelledby={`pro-${p.id}`}>
        <span className="pro-card__glare" aria-hidden="true" />
        <span className="pro-card__beam" aria-hidden="true" />
        <header className="pro-card__head">
          <span className="pro-card__avatar" aria-hidden="true">
            {p.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.foto} alt="" loading="lazy" />
            ) : (
              <span>{iniciales(p.nombre)}</span>
            )}
          </span>
          {p.numero && <span className="pro-card__num">N.º {p.numero}</span>}
        </header>
        <div className="pro-card__body">
          <h3 id={`pro-${p.id}`} className="pro-card__name">
            {p.nombre}
            {p.verificado && (
              <span className="board__verified" title="Asociado verificado">
                <Icon name="check" size={14} />
                <span className="sr-only">Asociado verificado</span>
              </span>
            )}
          </h3>
          {p.estudio && <p className="pro-card__studio">{p.estudio}</p>}
          {p.titulo && <p className="pro-card__title">{p.titulo}</p>}
          {p.descripcion && <p className="pro-card__desc">{p.descripcion}</p>}
          {(p.localidad || p.desde > 0) && (
            <p className="pro-card__meta">
              {p.localidad && (
                <span>
                  <Icon name="pin" size={14} /> {p.localidad}
                </span>
              )}
              {p.desde > 0 && p.desde <= anio && <span>{anio - p.desde > 0 ? `${anio - p.desde} años de trayectoria` : "Desde este año"}</span>}
            </p>
          )}
        </div>
        <footer className="pro-card__actions">
          {p.telefono && (
            <>
              <a href={whatsapp(p.telefono)} target="_blank" rel="noopener noreferrer" className="pro-card__cta">
                <Icon name="chat" size={16} /> WhatsApp
              </a>
              <a href={telHref(p.telefono)} className="pro-card__icon" aria-label={`Llamar a ${p.nombre} al ${telLabel(p.telefono)}`} title={telLabel(p.telefono)}>
                <Icon name="phone" size={16} />
              </a>
            </>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="pro-card__icon" aria-label={`Escribir a ${p.nombre}`} title={p.email}>
              <Icon name="mail" size={16} />
            </a>
          )}
          {p.web && (
            <a href={p.web} target="_blank" rel="noopener noreferrer" className="pro-card__icon" aria-label={`Sitio de ${p.nombre} (abre en otra pestaña)`}>
              <Icon name="link" size={16} />
            </a>
          )}
        </footer>
      </article>
    </li>
  );
}

export function Profesionales({ profesionales }: { profesionales: Profesional[] }) {
  const searchId = useId();
  const grid = useRef<HTMLUListElement>(null);
  const [q, setQ] = useState("");
  const [todos, setTodos] = useState(false);
  useTilt(grid);

  const list = useMemo(
    () =>
      profesionales.filter((p) =>
        coincide(q, [p.nombre, p.estudio, p.numero, p.titulo, p.localidad, p.direccion, p.email, p.web, p.descripcion], [p.telefono])
      ),
    [profesionales, q]
  );
  const shown = todos || q.trim() ? list : list.slice(0, 8);

  return (
    <div className="pros">
      <div className="pros__controls">
        <div className="board__search">
          <label htmlFor={searchId} className="sr-only">
            Buscar profesional por nombre, estudio, teléfono u otro dato
          </label>
          <Icon name="search" size={18} />
          <input id={searchId} type="search" placeholder="Nombre, estudio, teléfono, localidad…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="pros__count" aria-live="polite">
          {q.trim() ? `${list.length} de ${profesionales.length} profesionales` : `${profesionales.length} profesionales asociados`}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="board__empty pros__empty">
          Ningún profesional coincide con “{q}”.{" "}
          <button type="button" onClick={() => setQ("")}>
            Ver todos
          </button>
        </p>
      ) : (
        <ul className="pros__grid" ref={grid}>
          {shown.map((p, i) => (
            <Tarjeta key={p.id} p={p} i={i} />
          ))}
        </ul>
      )}
      {list.length > shown.length && (
        <button type="button" className="board__more btn btn--navy" onClick={() => setTodos(true)}>
          Ver los {list.length} profesionales
        </button>
      )}
    </div>
  );
}
