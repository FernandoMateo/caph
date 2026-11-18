"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "./Icon";

const EVENT = "caph:validar";

/** Lo que devuelve /api/caph/validar (pb_hooks/fichas.js): solo lo necesario para confirmar que es socio. */
type Resultado = { numero: string; nombre: string; tipo: "asociado" | "profesional"; vigente: boolean };

type Estado =
  | { tipo: "inicio" }
  | { tipo: "corto" }
  | { tipo: "buscando" }
  | { tipo: "error" }
  | { tipo: "listo"; consulta: string; resultados: Resultado[] };

const largo = (q: string) => q.replace(/[^\p{L}\p{N}@]/gu, "").length;

export function Validador() {
  const id = useId();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "inicio" });

  async function buscar(consulta: string) {
    const c = consulta.trim();
    if (!c) return setEstado({ tipo: "inicio" });
    if (largo(c) < 3 && !/\d/.test(c)) return setEstado({ tipo: "corto" });
    setEstado({ tipo: "buscando" });
    try {
      const res = await fetch(`/api/caph/validar?q=${encodeURIComponent(c)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const { resultados } = (await res.json()) as { resultados: Resultado[] };
      setEstado({ tipo: "listo", consulta: c, resultados });
    } catch {
      setEstado({ tipo: "error" });
    }
  }

  useEffect(() => {
    const onEvent = (e: Event) => {
      const v = String((e as CustomEvent).detail ?? "");
      setQ(v);
      void buscar(v);
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, []);

  return (
    <div className="validador">
      <form
        className="validador__form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void buscar(q);
        }}
      >
        <label htmlFor={id} className="field-label">
          Nombre o apellido, N.º de asociado o email
        </label>
        <div className="validador__row">
          <div className="validador__field">
            <Icon name="search" className="validador__icon" />
            <input
              id={id}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej.: Pérez, 45 o nombre@correo.com"
              autoComplete="off"
              maxLength={80}
            />
          </div>
          <button type="submit" className="btn btn--navy" disabled={estado.tipo === "buscando"}>
            {estado.tipo === "buscando" ? "Buscando…" : "Verificar"}
          </button>
        </div>
      </form>

      <div className="validador__results" aria-live="polite">
        {estado.tipo === "inicio" && <p className="validador__hint">El resultado aparece acá. La búsqueda no distingue mayúsculas ni acentos.</p>}
        {estado.tipo === "corto" && <p className="validador__hint">Escribí al menos 3 letras del nombre o apellido.</p>}
        {estado.tipo === "error" && <p className="validador__hint">No pudimos consultar el padrón ahora. Probá de nuevo en unos minutos.</p>}
        {estado.tipo === "listo" && estado.resultados.length === 0 && (
          <div className="validador__empty">
            <p>
              <strong>No encontramos “{estado.consulta}” en el padrón.</strong>
            </p>
            <p>Revisá cómo lo escribiste o probá con el N.º de asociado o el email. Si creés que es un error, escribinos por WhatsApp.</p>
          </div>
        )}
        {estado.tipo === "listo" && estado.resultados.length > 0 && (
          <ul className="validador__list">
            {estado.resultados.map((a, i) => (
              <li key={`${a.numero}-${a.nombre}-${i}`}>
                {a.numero && <span className="validador__num">N.º {a.numero}</span>}
                <span className="validador__name">
                  {a.nombre}
                  <small className="validador__tipo">{a.tipo === "profesional" ? "Profesional" : "Administrador de consorcio asociado"}</small>
                </span>
                <span className="status" data-active={a.vigente || undefined}>
                  <Icon name={a.vigente ? "check" : "x"} size={16} />
                  {a.vigente ? "Socio activo" : "No vigente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
