"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { coincide } from "../lib/buscar";
import type { Guia } from "../lib/instructivo";
import { Icon } from "./Icon";

/**
 * Instructivo: índice con buscador y cada guía con sus pasos numerados y la captura de pantalla de cada uno.
 * Se puede entrar directo a una guía con /ayuda#credencial.
 */
export function Instructivo({ guias, titulo, bajada }: { guias: Guia[]; titulo: string; bajada: string }) {
  const buscarId = useId();
  const [q, setQ] = useState("");
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null);

  const visibles = useMemo(
    () => guias.filter((g) => coincide(q, [g.titulo, g.resumen, g.nota, ...g.pasos.map((p) => p.texto)])),
    [guias, q]
  );

  useEffect(() => {
    if (!ampliada) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAmpliada(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ampliada]);

  return (
    <div className="instructivo">
      <header className="instructivo__cabecera">
        <h1>{titulo}</h1>
        <p>{bajada}</p>
        <div className="instructivo__buscar">
          <label htmlFor={buscarId} className="sr-only">
            Buscar en el instructivo
          </label>
          <Icon name="search" size={18} />
          <input id={buscarId} type="search" placeholder="¿Qué querés hacer?" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <div className="instructivo__cuerpo">
        <nav className="instructivo__indice" aria-label="Guías">
          <ol>
            {visibles.map((g) => (
              <li key={g.id}>
                <a href={`#${g.id}`}>
                  <strong>{g.titulo}</strong>
                  <span>{g.resumen}</span>
                </a>
              </li>
            ))}
          </ol>
          {visibles.length === 0 && <p className="instructivo__vacio">Ninguna guía coincide con “{q}”.</p>}
        </nav>

        <div className="instructivo__guias">
          {visibles.map((g) => (
            <article key={g.id} id={g.id} className="instructivo__guia" aria-labelledby={`${g.id}-titulo`}>
              <h2 id={`${g.id}-titulo`}>{g.titulo}</h2>
              <p className="instructivo__resumen">{g.resumen}</p>
              <ol className="instructivo__pasos">
                {g.pasos.map((p, n) => (
                  <li key={n}>
                    <span className="instructivo__num" aria-hidden="true">
                      {n + 1}
                    </span>
                    <div>
                      <p>{p.texto}</p>
                      {p.imagen && (
                        <button
                          type="button"
                          className="instructivo__img"
                          onClick={() => setAmpliada({ src: p.imagen!, alt: p.alt ?? "" })}
                          aria-label={`Ampliar imagen: ${p.alt ?? g.titulo}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imagen} alt={p.alt ?? ""} loading="lazy" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {g.nota && <p className="instructivo__nota">{g.nota}</p>}
              <a href="#top" className="instructivo__arriba" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0 }))}>
                Volver al índice
              </a>
            </article>
          ))}
        </div>
      </div>

      {ampliada && (
        <div className="instructivo__zoom" role="dialog" aria-modal="true" aria-label={ampliada.alt || "Imagen ampliada"} onClick={() => setAmpliada(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada.src} alt={ampliada.alt} />
          <button type="button" className="instructivo__cerrar" aria-label="Cerrar" autoFocus>
            <Icon name="x" size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
