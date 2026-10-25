"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { PADRON_DEMO, type Asociado } from "../lib/data";
import { Icon } from "./Icon";

const EVENT = "caph:validar";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\s]/g, "");
}

function search(q: string): Asociado[] {
  const n = normalize(q);
  if (n.length < 2) return [];
  return PADRON_DEMO.filter(
    (a) => normalize(a.nombre).includes(n) || a.dni.includes(n) || a.numero.replace(/^0+/, "") === n.replace(/^0+/, "")
  );
}

export function Validador() {
  const id = useId();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  useEffect(() => {
    const onEvent = (e: Event) => {
      const v = String((e as CustomEvent).detail ?? "");
      setQ(v);
      setSubmitted(v);
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, []);

  const results = useMemo(() => search(submitted), [submitted]);
  const tooShort = submitted.length > 0 && normalize(submitted).length < 2;

  return (
    <div className="validador">
      <form
        className="validador__form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <label htmlFor={id} className="field-label">
          Nombre, DNI o N.º de asociado
        </label>
        <div className="validador__row">
          <div className="validador__field">
            <Icon name="search" className="validador__icon" />
            <input
            id={id}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej.: Ejemplo, 00000001 o 0001"
            autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn--navy">
            Verificar
          </button>
        </div>
      </form>

      <div className="validador__results" aria-live="polite">
        {!submitted && <p className="validador__hint">El resultado aparece acá. La búsqueda no distingue mayúsculas ni acentos.</p>}
        {tooShort && <p className="validador__hint">Escribí al menos 2 caracteres.</p>}
        {submitted && !tooShort && results.length === 0 && (
          <div className="validador__empty">
            <p>
              <strong>No encontramos “{submitted}” en el padrón.</strong>
            </p>
            <p>Revisá cómo lo escribiste o probá con tu DNI. Si creés que es un error, escribinos por WhatsApp.</p>
          </div>
        )}
        {results.length > 0 && (
          <ul className="validador__list">
            {results.map((a) => (
              <li key={a.numero}>
                <span className="validador__num">N.º {a.numero}</span>
                <span className="validador__name">{a.nombre}</span>
                <span className="status" data-active={a.activo || undefined}>
                  <Icon name={a.activo ? "check" : "x"} size={16} />
                  {a.activo ? "Asociado activo" : "Sin cuota al día"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="demo-note">
        Datos de ejemplo: el padrón real de asociados se conecta antes de publicar.
      </p>
    </div>
  );
}
