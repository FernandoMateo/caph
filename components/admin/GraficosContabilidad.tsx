"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { dia, dinero, hoy, saldo, type Cuenta, type Cuota, type Pago } from "./cuentas";

// Resumen y gráficos de Contabilidad, en SVG propio (sin librerías).
// Colores validados con el validador de paletas (fondo blanco de las tarjetas):
// - Emitido / cobrado: azul y naranja (slots 1 y 2 de la paleta de referencia).
// - Estados: verde, gris neutro, naranja y rojo de la paleta de estados, en ese orden para que
//   ningún par vecino se confunda con daltonismo; cada parte lleva su número y hay vista en tabla.

type Tipo = "asociado" | "proveedor" | "profesional";
type Titular = { id: string; tipo: Tipo; oculto_mora: boolean };

const C = {
  emitido: "#eb6834",
  cobrado: "#2a78d6",
  barra: "#2a78d6",
  grid: "#e6e9f0",
  eje: "#c8cdd9",
  muted: "#6f7896",
  texto: "#4a5272",
};

const ESTADOS = [
  { clave: "al-dia", nombre: "Al día", color: "#0ca30c", icono: "check" },
  { clave: "sin-cuota", nombre: "Sin cuota", color: "#9aa3b5", icono: "x" },
  { clave: "deuda", nombre: "Con deuda", color: "#ec835a", icono: "calendar" },
  { clave: "mora", nombre: "Suspendido por mora", color: "#d03b3b", icono: "lock" },
] as const;

const TIPOS: Record<Tipo, string> = { asociado: "Asociados", proveedor: "Proveedores", profesional: "Profesionales" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const compacto = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
const corto = (n: number) => (n === 0 ? "$ 0" : `$ ${compacto.format(n)}`);
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

/** Ancho real del contenedor: el SVG se dibuja en píxeles, así los textos no se deforman. */
function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // primera medida en el acto (no depender de que el observador avise) y después, cada cambio de tamaño
    setAncho(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/** Marcas "redondas" del eje: 0 y 3-4 valores limpios hasta cubrir el máximo. */
function ticks(max: number) {
  if (max <= 0) return [0, 1];
  const crudo = max / 4;
  const pot = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= crudo)!;
  const out: number[] = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + paso);
  return out;
}

/** Columna con la punta redondeada (4px) y la base recta. */
function columna(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Tarjeta de un gráfico con su alternativa en tabla. */
function Tarjeta({ titulo, subtitulo, leyenda, tabla, children, ancha }: {
  titulo: string;
  subtitulo?: string;
  leyenda?: React.ReactNode;
  tabla: React.ReactNode;
  children: React.ReactNode;
  ancha?: boolean;
}) {
  const [verTabla, setVerTabla] = useState(false);
  const id = useId();
  return (
    <section className="viz-card" data-ancha={ancha || undefined} aria-labelledby={id}>
      <header className="viz-card__head">
        <div>
          <h3 id={id}>{titulo}</h3>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <button type="button" className="viz-card__toggle" onClick={() => setVerTabla((v) => !v)} aria-pressed={verTabla}>
          <Icon name={verTabla ? "chart" : "table"} size={16} />
          {verTabla ? "Gráfico" : "Tabla"}
        </button>
      </header>
      {!verTabla && leyenda}
      {verTabla ? <div className="viz-tabla">{tabla}</div> : children}
    </section>
  );
}

function Leyenda({ items }: { items: { nombre: string; color: string; icono?: string }[] }) {
  return (
    <ul className="viz-leyenda">
      {items.map((i) => (
        <li key={i.nombre}>
          <span className="viz-leyenda__swatch" style={{ background: i.color }} aria-hidden="true" />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

/* ---------- emitido vs cobrado por mes ---------- */

type Mes = { clave: string; etiqueta: string; largo: string; emitido: number; cobrado: number };

function ColumnasMensuales({ meses }: { meses: Mes[] }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const alto = 220;
  const pie = 28;
  const izq = 52;
  const der = 8;
  const arriba = 18;
  const max = Math.max(...meses.flatMap((m) => [m.emitido, m.cobrado]), 0);
  const marcas = ticks(max);
  const tope = marcas[marcas.length - 1] || 1;
  const plotW = Math.max(0, ancho - izq - der);
  const banda = meses.length ? plotW / meses.length : 0;
  const barra = Math.min(24, Math.max(4, (banda - 10) / 2));
  const y = (v: number) => arriba + (alto - arriba) * (1 - v / tope);
  // en pantallas angostas se rotula un mes por medio
  const cada = banda < 34 ? 2 : 1;
  const ultimo = meses.length - 1;
  const m = activo !== null ? meses[activo] : null;

  return (
    <div className="viz-plot" ref={ref} onMouseLeave={() => setActivo(null)}>
      {ancho > 0 && (
        <svg width={ancho} height={alto + pie} role="img" aria-label={`Emitido y cobrado por mes, últimos ${meses.length} meses`}>
          {marcas.map((t) => (
            <g key={t}>
              <line x1={izq} x2={ancho - der} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.eje : C.grid} strokeWidth={1} />
              <text x={izq - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz-eje">
                {corto(t)}
              </text>
            </g>
          ))}
          {meses.map((mes, i) => {
            const x0 = izq + i * banda + banda / 2 - barra - 1;
            const he = alto - y(mes.emitido);
            const hc = alto - y(mes.cobrado);
            return (
              <g key={mes.clave} opacity={activo === null || activo === i ? 1 : 0.45}>
                {activo === i && <rect x={izq + i * banda + 2} y={arriba - 6} width={banda - 4} height={alto - arriba + 6} rx={6} fill="#eef2f8" />}
                <path d={columna(x0, y(mes.emitido), barra, he)} fill={C.emitido} />
                <path d={columna(x0 + barra + 2, y(mes.cobrado), barra, hc)} fill={C.cobrado} />
                {i % cada === (ultimo % cada) && (
                  <text x={izq + i * banda + banda / 2} y={alto + 18} textAnchor="middle" className="viz-eje" fontWeight={i === ultimo ? 600 : 400}>
                    {mes.etiqueta}
                  </text>
                )}
                {/* zona de hover/foco más grande que las barras */}
                <rect
                  x={izq + i * banda}
                  y={arriba - 6}
                  width={banda}
                  height={alto - arriba + 6 + pie}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${mes.largo}: emitido ${dinero(mes.emitido)}, cobrado ${dinero(mes.cobrado)}`}
                  onMouseEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                />
              </g>
            );
          })}
          {/* rótulo directo: lo cobrado en el mes actual */}
          {meses[ultimo] && meses[ultimo].cobrado > 0 && activo === null && (
            <text x={izq + ultimo * banda + banda / 2 + barra / 2 + 1} y={y(meses[ultimo].cobrado) - 6} textAnchor="middle" className="viz-valor">
              {corto(meses[ultimo].cobrado)}
            </text>
          )}
        </svg>
      )}
      {m && activo !== null && (
        <div
          className="viz-tip"
          style={{ left: Math.min(Math.max(izq + activo * banda + banda / 2, 90), ancho - 90), top: 0 }}
          role="status"
        >
          <strong>{m.largo}</strong>
          <span>
            <i style={{ background: C.emitido }} /> Emitido <b>{dinero(m.emitido)}</b>
          </span>
          <span>
            <i style={{ background: C.cobrado }} /> Cobrado <b>{dinero(m.cobrado)}</b>
          </span>
          <small>Cobranza {pct(m.cobrado, m.emitido)}</small>
        </div>
      )}
    </div>
  );
}

/* ---------- estado de las cuentas (barra segmentada) ---------- */

/** Barra finita sin textos: la lista de al lado da el nombre y el número de cada parte. */
function BarraEstados({ partes, total }: { partes: { clave: string; nombre: string; color: string; n: number }[]; total: number }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const visibles = partes.filter((p) => p.n > 0);
  const gap = 2;
  const util = Math.max(0, ancho - gap * (visibles.length - 1));
  let x = 0;
  return (
    <div className="viz-plot" ref={ref}>
      {ancho > 0 && total > 0 && (
        <div className="viz-segmentos" role="img" aria-label={visibles.map((p) => `${p.nombre}: ${p.n}`).join(", ")}>
          {visibles.map((p) => {
            const w = (p.n / total) * util;
            const left = x;
            x += w + gap;
            return <span key={p.clave} className="viz-segmento" style={{ left, width: w, background: p.color }} title={`${p.nombre}: ${p.n} (${pct(p.n, total)})`} />;
          })}
        </div>
      )}
      {total === 0 && <p className="viz-vacio">Todavía no hay cuentas.</p>}
    </div>
  );
}

/* ---------- deuda vencida por tipo (barras horizontales) ---------- */

function BarrasHorizontales({ filas }: { filas: { nombre: string; valor: number; detalle: string }[] }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const max = Math.max(...filas.map((f) => f.valor), 0);
  if (max === 0) return <p className="viz-vacio">Nadie tiene deuda vencida.</p>;
  const etiqueta = 104;
  const valor = 84;
  const util = Math.max(0, ancho - etiqueta - valor);
  return (
    <div className="viz-plot" ref={ref}>
      {ancho > 0 && (
        <svg width={ancho} height={filas.length * 40} role="img" aria-label={filas.map((f) => `${f.nombre}: ${dinero(f.valor)}`).join(", ")}>
          {filas.map((f, i) => {
            const w = (f.valor / max) * util;
            const cy = i * 40 + 20;
            return (
              <g key={f.nombre}>
                <title>{`${f.nombre}: ${dinero(f.valor)} · ${f.detalle}`}</title>
                <text x={0} y={cy} dy="0.32em" className="viz-cat">
                  {f.nombre}
                </text>
                <line x1={etiqueta} x2={etiqueta} y1={cy - 14} y2={cy + 14} stroke={C.eje} />
                {w > 0 && (
                  <path
                    d={`M${etiqueta},${cy - 10}H${etiqueta + w - Math.min(4, w)}Q${etiqueta + w},${cy - 10} ${etiqueta + w},${cy - 10 + Math.min(4, w)}V${cy + 10 - Math.min(4, w)}Q${etiqueta + w},${cy + 10} ${etiqueta + w - Math.min(4, w)},${cy + 10}H${etiqueta}Z`}
                    fill={C.barra}
                  />
                )}
                <text x={etiqueta + w + 8} y={cy} dy="0.32em" className="viz-valor">
                  {corto(f.valor)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/* ---------- mini tendencia para la tarjeta de cobrado ---------- */

function Tendencia({ valores }: { valores: number[] }) {
  const w = 72;
  const h = 30;
  const max = Math.max(...valores, 1);
  const pts = valores.map((v, i) => [(i / Math.max(1, valores.length - 1)) * (w - 6) + 3, h - 4 - (v / max) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const [lx, ly] = pts[pts.length - 1] ?? [0, 0];
  return (
    <svg width={w} height={h} className="stat__trend" aria-hidden="true">
      <path d={d} fill="none" stroke="#b9c3d6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={4} fill={C.cobrado} stroke="#ffffff" strokeWidth={2} />
    </svg>
  );
}

/* ---------- resumen completo ---------- */

export function ResumenContable({
  cuotas,
  pagos,
  titulares,
  cuentas,
}: {
  cuotas: Cuota[];
  pagos: Pago[];
  titulares: Titular[];
  cuentas: Map<string, Cuenta>;
}) {
  const datos = useMemo(() => {
    const h = hoy();
    const [a, mm] = h.slice(0, 7).split("-").map(Number);
    const meses: Mes[] = [];
    for (let k = 11; k >= 0; k--) {
      const d = new Date(Date.UTC(a, mm - 1 - k, 1));
      const clave = d.toISOString().slice(0, 7);
      const mi = d.getUTCMonth();
      meses.push({ clave, etiqueta: MESES[mi], largo: `${MESES_LARGOS[mi][0].toUpperCase()}${MESES_LARGOS[mi].slice(1)} ${d.getUTCFullYear()}`, emitido: 0, cobrado: 0 });
    }
    const idx = new Map(meses.map((m, i) => [m.clave, i]));
    for (const c of cuotas) {
      const i = idx.get(dia(c.vencimiento).slice(0, 7));
      if (i !== undefined) meses[i].emitido += c.monto;
    }
    for (const p of pagos) {
      if (p.estado !== "confirmado") continue;
      const i = idx.get(dia(p.fecha).slice(0, 7));
      if (i !== undefined) meses[i].cobrado += p.monto;
    }

    const mes = h.slice(0, 7);
    let deuda = 0;
    let porCobrar = 0;
    for (const c of cuotas) {
      const s = saldo(c);
      if (dia(c.vencimiento) < h) deuda += s;
      else if (dia(c.vencimiento).slice(0, 7) === mes) porCobrar += s;
    }

    const conteo: Record<string, number> = { "al-dia": 0, "sin-cuota": 0, deuda: 0, mora: 0 };
    const porTipo: Record<Tipo, { valor: number; n: number }> = { asociado: { valor: 0, n: 0 }, proveedor: { valor: 0, n: 0 }, profesional: { valor: 0, n: 0 } };
    for (const t of titulares) {
      const c = cuentas.get(t.id);
      if (!c) continue;
      const e = c.estado === "pronto" ? "al-dia" : c.estado === "sin-cobro" ? "sin-cuota" : c.estado;
      conteo[e] = (conteo[e] ?? 0) + 1;
      if (c.deudaVencida > 0) {
        porTipo[t.tipo].valor += c.deudaVencida;
        porTipo[t.tipo].n += 1;
      }
    }
    const conDeuda = conteo.deuda + conteo.mora;
    return {
      meses,
      actual: meses[meses.length - 1],
      deuda,
      porCobrar,
      conDeuda,
      mora: titulares.filter((t) => t.oculto_mora).length,
      estados: ESTADOS.map((e) => ({ ...e, n: conteo[e.clave] ?? 0 })),
      total: titulares.length,
      porTipo: (Object.keys(porTipo) as Tipo[])
        .map((k) => ({ nombre: TIPOS[k], valor: porTipo[k].valor, detalle: porTipo[k].n === 1 ? "1 cuenta" : `${porTipo[k].n} cuentas` }))
        .sort((x, y) => y.valor - x.valor),
    };
  }, [cuotas, pagos, titulares, cuentas]);

  const { actual } = datos;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span>Cobrado en {actual.largo.split(" ")[0].toLowerCase()}</span>
          <div className="stat__fila">
            <strong>{dinero(actual.cobrado)}</strong>
            <Tendencia valores={datos.meses.map((m) => m.cobrado)} />
          </div>
          <small>{actual.emitido > 0 ? `${pct(actual.cobrado, actual.emitido)} de lo emitido` : "Sin cuotas emitidas"}</small>
        </div>
        <div className="stat">
          <span>Por cobrar este mes</span>
          <strong>{dinero(datos.porCobrar)}</strong>
          <small>Vencen en {actual.largo.split(" ")[0].toLowerCase()}</small>
        </div>
        <div className="stat" data-tone={datos.deuda > 0 ? "warn" : undefined}>
          <span>Deuda vencida</span>
          <strong>{dinero(datos.deuda)}</strong>
          <small>{datos.conDeuda === 1 ? "1 cuenta con deuda" : `${datos.conDeuda} cuentas con deuda`}</small>
        </div>
        <div className="stat" data-tone={datos.mora > 0 ? "off" : undefined}>
          <span>Suspendidos por mora</span>
          <strong>{datos.mora}</strong>
          <small>{datos.mora ? "Ocultos en la web" : "Nadie suspendido"}</small>
        </div>
      </div>

      <div className="viz-grid">
        <Tarjeta
          ancha
          titulo="Emitido y cobrado por mes"
          subtitulo="Últimos 12 meses. Emitido: cuotas que vencen en el mes. Cobrado: pagos confirmados."
          leyenda={
            <Leyenda
              items={[
                { nombre: "Emitido", color: C.emitido },
                { nombre: "Cobrado", color: C.cobrado },
              ]}
            />
          }
          tabla={
            <table>
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col">Emitido</th>
                  <th scope="col">Cobrado</th>
                  <th scope="col">Cobranza</th>
                </tr>
              </thead>
              <tbody>
                {[...datos.meses].reverse().map((m) => (
                  <tr key={m.clave}>
                    <th scope="row">{m.largo}</th>
                    <td>{dinero(m.emitido)}</td>
                    <td>{dinero(m.cobrado)}</td>
                    <td>{pct(m.cobrado, m.emitido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ColumnasMensuales meses={datos.meses} />
        </Tarjeta>

        <Tarjeta
          titulo="Estado de las cuentas"
          subtitulo={`${datos.total} ${datos.total === 1 ? "cuenta" : "cuentas"} de asociados, proveedores y profesionales.`}
          tabla={
            <table>
              <thead>
                <tr>
                  <th scope="col">Estado</th>
                  <th scope="col">Cuentas</th>
                  <th scope="col">Del total</th>
                </tr>
              </thead>
              <tbody>
                {datos.estados.map((e) => (
                  <tr key={e.clave}>
                    <th scope="row">{e.nombre}</th>
                    <td>{e.n}</td>
                    <td>{pct(e.n, datos.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <BarraEstados partes={[...datos.estados]} total={datos.total} />
          <ul className="viz-detalle">
            {datos.estados.map((e) => (
              <li key={e.clave}>
                <span className="viz-leyenda__swatch" style={{ background: e.color }} aria-hidden="true" />
                <Icon name={e.icono} size={15} className="viz-detalle__icono" />
                <span>{e.nombre}</span>
                <b>{e.n}</b>
                <small>{pct(e.n, datos.total)}</small>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta
          titulo="Deuda vencida por tipo"
          subtitulo="Lo que se debe de cuotas ya vencidas."
          tabla={
            <table>
              <thead>
                <tr>
                  <th scope="col">Tipo</th>
                  <th scope="col">Deuda vencida</th>
                  <th scope="col">Cuentas</th>
                </tr>
              </thead>
              <tbody>
                {datos.porTipo.map((f) => (
                  <tr key={f.nombre}>
                    <th scope="row">{f.nombre}</th>
                    <td>{dinero(f.valor)}</td>
                    <td>{f.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <BarrasHorizontales filas={datos.porTipo} />
        </Tarjeta>
      </div>
    </>
  );
}
