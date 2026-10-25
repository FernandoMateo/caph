"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Foto } from "../lib/content";
import { Icon } from "./Icon";

// Anillo 3D de fotos: se gira arrastrando, con flechas o teclado; la foto de frente se abre en grande.

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function Galeria3D({ fotos }: { fotos: Foto[] }) {
  const n = fotos.length;
  const ring = n >= 3;
  const step = 360 / Math.max(n, 1);

  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const lightbox = useRef<HTMLDialogElement>(null);

  const rot = useRef(0); // grados actuales
  const target = useRef<number | null>(null); // grados a los que se anima
  const drag = useRef<{ x: number; rot: number; moved: boolean } | null>(null);
  const hover = useRef(false);
  const visible = useRef(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [radius, setRadius] = useState(420);

  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // radio según el ancho de las tarjetas
  useEffect(() => {
    if (!ring || !stage.current) return;
    const el = stage.current;
    const measure = () => {
      const w = cards.current[0]?.offsetWidth ?? 260;
      setRadius(Math.round(w / 2 / Math.tan(Math.PI / n) + w * 0.18));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n, ring]);

  const goTo = useCallback(
    (i: number) => {
      if (!ring) return setActive(mod(i, n));
      // camino más corto hasta la tarjeta i
      const current = -rot.current / step;
      let delta = mod(i - current, n);
      if (delta > n / 2) delta -= n;
      target.current = -(current + delta) * step;
    },
    [n, ring, step]
  );

  // bucle de animación
  useEffect(() => {
    if (!ring) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    if (stage.current) io.observe(stage.current);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible.current) return;
      if (target.current !== null) {
        rot.current += (target.current - rot.current) * (reduced ? 1 : 0.12);
        if (Math.abs(target.current - rot.current) < 0.05) {
          rot.current = target.current;
          target.current = null;
        }
      } else if (!drag.current && !hover.current && !reduced && open === null) {
        rot.current -= 0.06;
      }
      if (track.current) track.current.style.transform = `translateZ(${-radius}px) rotateY(${rot.current}deg)`;
      // tarjetas de atrás más oscuras y chicas
      cards.current.forEach((c, i) => {
        if (!c) return;
        const a = ((i * step + rot.current) * Math.PI) / 180;
        const facing = (Math.cos(a) + 1) / 2;
        c.style.setProperty("--f", facing.toFixed(3));
      });
      const front = mod(Math.round(-rot.current / step), n);
      setActive((prev) => (prev === front ? prev : front));
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [n, open, radius, reduced, ring, step]);

  useEffect(() => {
    if (open !== null) lightbox.current?.showModal();
    else lightbox.current?.close();
  }, [open]);

  if (!n) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ring) return;
    drag.current = { x: e.clientX, rot: rot.current, moved: false };
    target.current = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    rot.current = drag.current.rot + dx * 0.3;
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) goTo(Math.round(-rot.current / step));
  };

  const foto = fotos[active];

  return (
    <div className="galeria" data-ring={ring || undefined}>
      <div
        ref={stage}
        className="galeria__stage"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Fotos de la comunidad"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") (e.preventDefault(), goTo(active + 1));
          if (e.key === "ArrowLeft") (e.preventDefault(), goTo(active - 1));
          if (e.key === "Enter") setOpen(active);
        }}
        onPointerEnter={() => (hover.current = true)}
        onPointerLeave={() => ((hover.current = false), onPointerUp())}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onFocus={() => (hover.current = true)}
        onBlur={() => (hover.current = false)}
      >
        <div ref={track} className="galeria__track">
          {fotos.map((f, i) => (
            <button
              key={f.id}
              ref={(el) => {
                cards.current[i] = el;
              }}
              type="button"
              className="galeria__card"
              style={ring ? { transform: `rotateY(${i * step}deg) translateZ(${radius}px)` } : undefined}
              aria-label={f.titulo ? `Ver foto: ${f.titulo}` : `Ver foto ${i + 1} de ${n}`}
              tabIndex={i === active ? 0 : -1}
              aria-current={i === active || undefined}
              onClick={() => {
                if (drag.current?.moved) return;
                if (ring && i !== active) goTo(i);
                else setOpen(i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.thumb} alt="" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
        <div className="galeria__floor" aria-hidden="true" />
      </div>

      <div className="galeria__bar">
        <button type="button" className="galeria__nav" onClick={() => goTo(active - 1)} aria-label="Foto anterior">
          <Icon name="arrow" size={20} className="flip" />
        </button>
        <div className="galeria__caption" aria-live="polite">
          {foto?.titulo && <p className="galeria__title">{foto.titulo}</p>}
          {foto?.descripcion && <p className="galeria__desc">{foto.descripcion}</p>}
          <p className="galeria__count">
            {active + 1} / {n}
          </p>
        </div>
        <button type="button" className="galeria__nav" onClick={() => goTo(active + 1)} aria-label="Foto siguiente">
          <Icon name="arrow" size={20} />
        </button>
      </div>

      <dialog ref={lightbox} className="lightbox" onCancel={() => setOpen(null)} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
        {open !== null && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotos[open].src} alt={fotos[open].titulo || `Foto ${open + 1} de la comunidad`} />
            {(fotos[open].titulo || fotos[open].descripcion) && (
              <figcaption>
                {fotos[open].titulo && <strong>{fotos[open].titulo}</strong>}
                {fotos[open].descripcion && <span>{fotos[open].descripcion}</span>}
              </figcaption>
            )}
            <div className="lightbox__nav">
              <button type="button" onClick={() => setOpen(mod(open - 1, n))} aria-label="Foto anterior">
                <Icon name="arrow" size={20} className="flip" />
              </button>
              <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar">
                <Icon name="x" size={20} />
              </button>
              <button type="button" onClick={() => setOpen(mod(open + 1, n))} aria-label="Foto siguiente">
                <Icon name="arrow" size={20} />
              </button>
            </div>
          </figure>
        )}
      </dialog>
    </div>
  );
}
