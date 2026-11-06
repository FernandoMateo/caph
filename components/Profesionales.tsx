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
function useTilt(ref: React.RefObject<HTMLElement | null>, montada: boolean) {
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
  }, [ref, montada]);
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

/** Contacto de un profesional: WhatsApp, teléfono, email y web. */
function Contacto({ p, claro }: { p: Profesional; claro?: boolean }) {
  return (
    <span className="cf__contacto" data-claro={claro || undefined}>
      {p.telefono && (
        <>
          <a href={whatsapp(p.telefono)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${p.nombre}`} title="WhatsApp">
            <Icon name="chat" size={16} />
          </a>
          <a href={telHref(p.telefono)} aria-label={`Llamar a ${p.nombre} al ${telLabel(p.telefono)}`} title={telLabel(p.telefono)}>
            <Icon name="phone" size={16} />
          </a>
        </>
      )}
      {p.email && (
        <a href={`mailto:${p.email}`} aria-label={`Escribir a ${p.nombre}`} title={p.email}>
          <Icon name="mail" size={16} />
        </a>
      )}
      {p.web && (
        <a href={p.web} target="_blank" rel="noopener noreferrer" aria-label={`Sitio de ${p.nombre} (abre en otra pestaña)`} title="Web">
          <Icon name="link" size={16} />
        </a>
      )}
    </span>
  );
}

/**
 * Carrusel: la tarjeta del centro, grande y a color; las de los costados, más chicas y en gris.
 * Se desplaza con el dedo, la rueda, las flechas del teclado o los botones. Cada tarjeta guarda en
 * --d su distancia al centro y el CSS decide escala, gris y opacidad a partir de eso.
 */
function Carrusel({ list }: { list: Profesional[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [activo, setActivo] = useState(0);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const medir = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const centro = r.left + r.width / 2;
      let mejor = 0;
      let menor = Infinity;
      el.querySelectorAll<HTMLElement>(".cf__item").forEach((item, i) => {
        const b = item.getBoundingClientRect();
        const d = (b.left + b.width / 2 - centro) / b.width;
        item.style.setProperty("--d", d.toFixed(3));
        item.style.setProperty("--ad", Math.min(Math.abs(d), 3).toFixed(3));
        if (Math.abs(d) < menor) {
          menor = Math.abs(d);
          mejor = i;
        }
      });
      setActivo(mejor);
      const max = el.scrollWidth - el.clientWidth;
      setProgreso(max > 0 ? el.scrollLeft / max : 1);
    };
    const pedir = () => {
      if (!frame) frame = requestAnimationFrame(medir);
    };
    medir();
    el.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
    };
  }, [list]);

  // al cambiar el filtro, vuelve al principio
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
  }, [list]);

  const ir = (i: number) => {
    const el = track.current;
    const item = el?.querySelectorAll<HTMLElement>(".cf__item")[Math.max(0, Math.min(list.length - 1, i))];
    if (!el || !item) return;
    const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2, behavior: suave ? "smooth" : "auto" });
  };

  const actual = list[activo];

  return (
    <div className="cf">
      <ul
        className="cf__track"
        ref={track}
        tabIndex={0}
        aria-label="Profesionales: usá las flechas para recorrer"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") (e.preventDefault(), ir(activo + 1));
          if (e.key === "ArrowLeft") (e.preventDefault(), ir(activo - 1));
        }}
      >
        {list.map((p, i) => (
          <li key={p.id} className="cf__item" data-activo={i === activo || undefined} style={{ "--i": Math.min(i, 6) } as React.CSSProperties}>
            <div
              className="cf__foto"
              onClick={() => i !== activo && ir(i)}
              aria-hidden={i !== activo || undefined}
            >
              {p.retrato ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.retrato} alt="" loading={i < 4 ? "eager" : "lazy"} draggable={false} />
              ) : (
                <span className="cf__iniciales">{iniciales(p.nombre)}</span>
              )}
              {p.numero && <span className="cf__num">N.º {p.numero}</span>}
              {i === activo && <Contacto p={p} claro />}
            </div>
            <p className="cf__nombre">
              {p.nombre}
              {p.verificado && (
                <span className="inline-check" title="Verificado por la Cámara">
                  <Icon name="check" size={11} />
                  <span className="sr-only">Verificado por la Cámara</span>
                </span>
              )}
            </p>
            <p className="cf__rol">{p.estudio || p.titulo}</p>
          </li>
        ))}
      </ul>

      <div className="cf__pie">
        <span className="cf__barra" aria-hidden="true">
          <span style={{ width: `${Math.max(8, progreso * 100)}%` }} />
        </span>
        <span className="cf__pos" aria-live="polite">
          {activo + 1} / {list.length}
        </span>
        <button type="button" className="cf__flecha" onClick={() => ir(activo - 1)} disabled={activo === 0} aria-label="Anterior">
          <Icon name="arrow" size={18} />
        </button>
        <button type="button" className="cf__flecha" onClick={() => ir(activo + 1)} disabled={activo >= list.length - 1} aria-label="Siguiente">
          <Icon name="arrow" size={18} />
        </button>
      </div>

      {actual && (
        <div className="cf__detalle" key={actual.id}>
          <div>
            <p className="cf__detalle-tipo">{actual.rol === "profesional" ? "Profesional" : "Administrador asociado"}</p>
            <h3 className="cf__detalle-nombre">{actual.nombre}</h3>
            {[actual.titulo, actual.estudio, actual.localidad].filter(Boolean).length > 0 && (
              <p className="cf__detalle-datos">{[actual.titulo, actual.estudio, actual.localidad].filter(Boolean).join(" · ")}</p>
            )}
            {actual.descripcion && <p className="cf__detalle-desc">{actual.descripcion}</p>}
          </div>
          {actual.telefono && (
            <a href={whatsapp(actual.telefono)} target="_blank" rel="noopener noreferrer" className="btn btn--navy btn--sm">
              <Icon name="chat" size={16} /> Escribir por WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}

type Vista = "carrusel" | "grilla";
type Filtro = "todos" | "asociado" | "profesional";

export function Profesionales({ profesionales }: { profesionales: Profesional[] }) {
  const searchId = useId();
  const grid = useRef<HTMLUListElement>(null);
  const [q, setQ] = useState("");
  const [todos, setTodos] = useState(false);
  const [vista, setVista] = useState<Vista>("carrusel");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  useTilt(grid, vista === "grilla");

  const hayTipos = profesionales.some((p) => p.rol === "profesional") && profesionales.some((p) => p.rol === "asociado");
  const list = useMemo(
    () =>
      profesionales.filter(
        (p) =>
          (filtro === "todos" || p.rol === filtro) &&
          coincide(q, [p.nombre, p.estudio, p.numero, p.titulo, p.localidad, p.direccion, p.email, p.web, p.descripcion], [p.telefono])
      ),
    [profesionales, q, filtro]
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
        {hayTipos && (
          <div className="pros__chips" role="group" aria-label="Filtrar por tipo">
            {(
              [
                ["todos", "Todos"],
                ["asociado", "Administradores"],
                ["profesional", "Profesionales"],
              ] as [Filtro, string][]
            ).map(([k, v]) => (
              <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
                {v}
              </button>
            ))}
          </div>
        )}
        <div className="pros__vista" role="group" aria-label="Vista">
          <button type="button" aria-pressed={vista === "carrusel"} onClick={() => setVista("carrusel")}>
            Carrusel
          </button>
          <button type="button" aria-pressed={vista === "grilla"} onClick={() => setVista("grilla")}>
            Grilla
          </button>
        </div>
        <p className="pros__count" aria-live="polite">
          {q.trim() || filtro !== "todos" ? `${list.length} de ${profesionales.length}` : `${profesionales.length} en el directorio`}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="board__empty pros__empty">
          {q.trim() ? `Ningún profesional coincide con “${q}”.` : "No hay nadie en este filtro."}{" "}
          <button
            type="button"
            onClick={() => {
              setQ("");
              setFiltro("todos");
            }}
          >
            Ver todos
          </button>
        </p>
      ) : vista === "carrusel" ? (
        <Carrusel list={list} />
      ) : (
        <>
          <ul className="pros__grid" ref={grid}>
            {shown.map((p, i) => (
              <Tarjeta key={p.id} p={p} i={i} />
            ))}
          </ul>
          {list.length > shown.length && (
            <button type="button" className="board__more btn btn--navy" onClick={() => setTodos(true)}>
              Ver los {list.length} profesionales
            </button>
          )}
        </>
      )}
    </div>
  );
}
