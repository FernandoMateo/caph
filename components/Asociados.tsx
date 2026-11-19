"use client";

import { useId, useMemo, useState } from "react";
import { coincide } from "../lib/buscar";
import type { AsociadoPublico } from "../lib/content";
import { Icon } from "./Icon";
import { iniciales } from "./Proveedores";

/**
 * Directorio de asociados (administradores de consorcio), con el mismo formato que el de proveedores:
 * filtro por localidad, buscador y un adelanto hasta que se busca o se pide la lista entera.
 * Muestra solo datos públicos: nombre, N.º, estudio, localidad y web.
 */
export function Asociados({ asociados }: { asociados: AsociadoPublico[] }) {
  const searchId = useId();
  const [localidad, setLocalidad] = useState("todas");
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);

  // las localidades con más asociados primero (las de uno solo quedan en "Todas")
  const localidades = useMemo(() => {
    const c = new Map<string, number>();
    asociados.forEach((a) => a.localidad && c.set(a.localidad, (c.get(a.localidad) ?? 0) + 1));
    return [...c.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).slice(0, 6);
  }, [asociados]);

  const list = useMemo(
    () =>
      asociados.filter(
        (a) => (localidad === "todas" || a.localidad === localidad) && coincide(q, [a.nombre, a.estudio, a.localidad, a.numero && `N.º ${a.numero}`, a.numero])
      ),
    [asociados, localidad, q]
  );
  const shown = all || localidad !== "todas" || q.trim() ? list : list.slice(0, 9);

  return (
    <div className="board">
      <div className="board__controls">
        <div className="board__chips" role="group" aria-label="Filtrar por localidad">
          <button type="button" aria-pressed={localidad === "todas"} onClick={() => setLocalidad("todas")}>
            Todas <span>{asociados.length}</span>
          </button>
          {localidades.map(([l, n]) => (
            <button type="button" key={l} aria-pressed={localidad === l} onClick={() => setLocalidad(l)}>
              {l} <span>{n}</span>
            </button>
          ))}
        </div>
        <div className="board__search">
          <label htmlFor={searchId} className="sr-only">
            Buscar asociado por nombre, estudio, localidad o N.º
          </label>
          <Icon name="search" size={18} />
          <input id={searchId} type="search" placeholder="Nombre, estudio, localidad o N.º" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <ul className="board__list" aria-live="polite">
        {shown.map((a) => (
          <li key={a.id} className="board__row">
            <span className="board__logo board__logo--persona" aria-hidden="true">
              {a.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.foto} alt="" loading="lazy" />
              ) : (
                iniciales(a.nombre)
              )}
            </span>
            <span className="board__name">
              {a.nombre}
              <span className="board__verified" title="Asociado activo">
                <Icon name="check" size={14} />
                <span className="sr-only">Asociado activo</span>
              </span>
            </span>
            <span className="board__rubro">{a.numero ? `Asociado N.º ${a.numero}` : "Asociado"}</span>
            {(a.estudio || a.localidad) && <span className="board__desc">{[a.estudio, a.localidad].filter(Boolean).join(" · ")}</span>}
            <span className="board__actions">
              <a href={`/verificar/${a.id}`} aria-label={`Verificar a ${a.nombre}`} title="Verificar credencial">
                <Icon name="check" size={16} />
                <span>Verificar</span>
              </a>
              {a.web ? (
                <a href={a.web} target="_blank" rel="noopener noreferrer" aria-label={`Sitio de ${a.nombre} (abre en otra pestaña)`}>
                  <Icon name="link" size={16} />
                </a>
              ) : (
                <span className="board__slot" aria-hidden="true" />
              )}
            </span>
          </li>
        ))}
        {list.length === 0 && (
          <li className="board__empty">
            {asociados.length === 0 ? (
              "Todavía no hay asociados para mostrar."
            ) : (
              <>
                Ningún asociado coincide con “{q}”.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setLocalidad("todas");
                  }}
                >
                  Ver todos
                </button>
              </>
            )}
          </li>
        )}
      </ul>
      {list.length > shown.length && (
        <button type="button" className="board__more btn btn--navy" onClick={() => setAll(true)}>
          Ver los {list.length} asociados
        </button>
      )}
    </div>
  );
}
