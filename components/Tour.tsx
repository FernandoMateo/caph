"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./tour.css";

// Recorrido guiado del primer ingreso (portal y panel): oscurece la pantalla, ilumina un elemento por vez
// y explica para qué sirve. Los pasos sin elemento en pantalla (o con el elemento oculto) se saltean;
// un paso sin `selector` se muestra centrado (bienvenida, cierre).

export type PasoTour = { selector?: string; titulo: string; texto: string };

const MARGEN = 8;
const visible = (el: Element | null) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

export function Tour({ pasos: todos, onFin }: { pasos: PasoTour[]; onFin: () => void }) {
  const tituloId = useId();
  const card = useRef<HTMLDivElement>(null);
  const [pasos, setPasos] = useState<PasoTour[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; abajo: boolean } | null>(null);

  // qué pasos existen de verdad en esta pantalla (sin carnet, sin cuotas, menú cerrado en el teléfono…)
  useEffect(() => {
    setPasos(todos.filter((p) => !p.selector || visible(document.querySelector(p.selector))));
  }, [todos]);

  const paso = pasos?.[i];

  const medir = useCallback(() => {
    if (!paso) return;
    const el = paso.selector ? document.querySelector(paso.selector) : null;
    setRect(el && visible(el) ? el.getBoundingClientRect() : null);
  }, [paso]);

  // al cambiar de paso: lleva el elemento a la vista y lo sigue si se mueve la página
  useEffect(() => {
    if (!paso) return;
    const el = paso.selector ? document.querySelector(paso.selector) : null;
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: quieto ? "auto" : "smooth" });
    medir();
    const t = window.setTimeout(medir, quieto ? 0 : 420);
    let frame = 0;
    const seguir = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(medir);
    };
    window.addEventListener("scroll", seguir, { passive: true, capture: true });
    window.addEventListener("resize", seguir);
    card.current?.focus();
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", seguir, { capture: true });
      window.removeEventListener("resize", seguir);
    };
  }, [paso, medir]);

  // la tarjeta va debajo del elemento si entra; si no, arriba; si tampoco, abajo de la pantalla
  useLayoutEffect(() => {
    const c = card.current;
    if (!c) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    if (!rect) return setPos(null);
    const left = Math.min(Math.max(rect.left, 16), vw - w - 16);
    if (rect.bottom + MARGEN + 12 + h < vh) return setPos({ top: rect.bottom + MARGEN + 12, left, abajo: true });
    if (rect.top - MARGEN - 12 - h > 0) return setPos({ top: rect.top - MARGEN - 12 - h, left, abajo: false });
    // elemento alto: al costado, si hay lugar (primero a la derecha)
    const top = Math.min(Math.max(rect.top, 16), vh - h - 16);
    if (rect.right + MARGEN + 16 + w < vw) return setPos({ top, left: rect.right + MARGEN + 16, abajo: true });
    if (rect.left - MARGEN - 16 - w > 0) return setPos({ top, left: rect.left - MARGEN - 16 - w, abajo: true });
    setPos({ top: vh - h - 16, left, abajo: true });
  }, [rect, i]);

  const terminar = useCallback(() => onFin(), [onFin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") terminar();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, (pasos?.length ?? 1) - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pasos, terminar]);

  if (!pasos || !paso) return null;
  const ultimo = i === pasos.length - 1;

  return createPortal(
    <div className="tour" data-centrado={!rect || undefined}>
      {rect ? (
        <div
          className="tour__hueco"
          aria-hidden="true"
          style={{ top: rect.top - MARGEN, left: rect.left - MARGEN, width: rect.width + MARGEN * 2, height: rect.height + MARGEN * 2 }}
        />
      ) : (
        <div className="tour__velo" aria-hidden="true" />
      )}
      <div
        ref={card}
        className="tour__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        style={rect ? (pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }) : undefined}
      >
        <p className="tour__paso">
          Paso {i + 1} de {pasos.length}
        </p>
        <h2 id={tituloId}>{paso.titulo}</h2>
        <p>{paso.texto}</p>
        <div className="tour__puntos" aria-hidden="true">
          {pasos.map((_, n) => (
            <span key={n} data-activo={n === i || undefined} />
          ))}
        </div>
        <div className="tour__acciones">
          {!ultimo && (
            <button type="button" className="tour__saltar" onClick={terminar}>
              Saltar
            </button>
          )}
          {i > 0 && (
            <button type="button" className="btn btn--ghost-dark btn--sm tour__btn" onClick={() => setI(i - 1)}>
              Anterior
            </button>
          )}
          <button type="button" className="btn btn--navy btn--sm tour__btn" onClick={() => (ultimo ? terminar() : setI(i + 1))}>
            {ultimo ? "¡Listo!" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
