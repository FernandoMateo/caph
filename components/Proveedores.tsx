"use client";

import { useId, useMemo, useState } from "react";
import { RUBROS } from "../lib/data";
import type { Proveedor } from "../lib/content";
import { Icon } from "./Icon";

const ORDER = Object.keys(RUBROS);

function telHref(t: string) {
  const digits = t.replace(/\D/g, "");
  return `tel:${digits}`;
}

function telLabel(t: string) {
  // normaliza a 10 dígitos: quita 0 de larga distancia, prefijo 54 9 y el 1 de discado
  let d = t.replace(/\D/g, "").replace(/^0/, "");
  if (d.length === 13 && d.startsWith("549")) d = d.slice(3);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return d;
  // CABA (11): 11 XXXX-XXXX · interior: 342 XXX-XXXX
  if (d.startsWith("11")) return `11 ${d.slice(2, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}`;
}

function iniciales(nombre: string) {
  const palabras = nombre.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 1 || /\d/.test(w));
  return (palabras.slice(0, 2).map((w) => w[0]).join("") || nombre.slice(0, 2)).toUpperCase();
}

export function Proveedores({ proveedores: PROVEEDORES }: { proveedores: Proveedor[] }) {
  const searchId = useId();
  const [rubro, setRubro] = useState<string>("todos");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    PROVEEDORES.forEach((p) => (c[p.r] = (c[p.r] ?? 0) + 1));
    return c;
  }, [PROVEEDORES]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return PROVEEDORES.filter((p) => (rubro === "todos" || p.r === rubro) && (!n || p.n.toLowerCase().includes(n))).sort(
      (a, b) => ORDER.indexOf(a.r) - ORDER.indexOf(b.r) || a.n.localeCompare(b.n, "es")
    );
  }, [rubro, q, PROVEEDORES]);

  // la lista completa es larga en el teléfono: se muestra un adelanto hasta que se filtra, busca o pide verla entera
  const [all, setAll] = useState(false);
  const shown = all || rubro !== "todos" || q.trim() ? list : list.slice(0, 9);

  return (
    <div className="board">
      <div className="board__controls">
        <div className="board__chips" role="group" aria-label="Filtrar por rubro">
          <button type="button" aria-pressed={rubro === "todos"} onClick={() => setRubro("todos")}>
            Todos <span>{PROVEEDORES.length}</span>
          </button>
          {ORDER.filter((r) => counts[r]).map((r) => (
            <button type="button" key={r} aria-pressed={rubro === r} onClick={() => setRubro(r)}>
              {RUBROS[r]} <span>{counts[r]}</span>
            </button>
          ))}
        </div>
        <div className="board__search">
          <label htmlFor={searchId} className="sr-only">
            Buscar proveedor por nombre
          </label>
          <Icon name="search" size={18} />
          <input id={searchId} type="search" placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <ul className="board__list" aria-live="polite">
        {shown.map((p, i) => (
          <li key={`${p.n}-${i}`} className="board__row">
            <span className="board__logo" aria-hidden="true">
              {p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logo} alt="" loading="lazy" />
              ) : (
                iniciales(p.n)
              )}
            </span>
            <span className="board__name">
              {p.n}
              {p.v && (
                <span className="board__verified" title="Asociado verificado">
                  <Icon name="check" size={14} />
                  <span className="sr-only">Asociado verificado</span>
                </span>
              )}
            </span>
            <span className="board__rubro">{RUBROS[p.r] ?? RUBROS.otros}</span>
            <span className="board__actions">
              {p.tel && (
                <a href={telHref(p.tel)} aria-label={`Llamar a ${p.n}`}>
                  <Icon name="phone" size={16} />
                  <span>{telLabel(p.tel)}</span>
                </a>
              )}
              {p.web ? (
                <a href={p.web} target="_blank" rel="noopener noreferrer" aria-label={`Sitio de ${p.n} (abre en otra pestaña)`}>
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
            Ningún proveedor coincide con “{q}”.{" "}
            <button
              type="button"
              onClick={() => {
                setQ("");
                setRubro("todos");
              }}
            >
              Ver todos
            </button>
          </li>
        )}
      </ul>
      {list.length > shown.length && (
        <button type="button" className="board__more btn btn--navy" onClick={() => setAll(true)}>
          Ver los {list.length} proveedores
        </button>
      )}
    </div>
  );
}
