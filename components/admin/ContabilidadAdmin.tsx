"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage, fileUrl, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import {
  MEDIOS,
  aFechaPb,
  cuenta,
  dia,
  dinero,
  fechaCorta,
  hoy,
  leerPesos,
  linkRecordatorio,
  nombrePeriodo,
  saldo,
  textoEstado,
  type Cuenta,
  type Cuota,
  type Estado,
  type Pago,
  type Suscripcion,
} from "./cuentas";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Proveedor = { id: string; nombre: string; telefono: string; activo: boolean; oculto_mora: boolean };

const ESTADO_PILL: Record<Estado, string | undefined> = {
  mora: "off",
  deuda: "warn",
  pronto: "warn",
  "al-dia": "next",
  "sin-cuota": undefined,
  "sin-cobro": undefined,
};

/** Campo de pesos; recibe de <Field> el id y la ayuda y se los pasa al input. */
function Pesos({ value, onChange, required, ...aria }: { value: string; onChange: (v: string) => void; required?: boolean; id?: string; "aria-describedby"?: string }) {
  return (
    <span className="money-input">
      <input {...aria} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </span>
  );
}

/* ---------- campos de la cuota (también los usa el alta de proveedores) ---------- */

export type DatosCuota = { cuota_monto: string; inscripcion_monto: string; fecha_alta: string; dia_vencimiento: string };

export const cuotaVacia = (): DatosCuota => ({
  cuota_monto: "",
  inscripcion_monto: "",
  fecha_alta: hoy(),
  dia_vencimiento: String(+hoy().slice(8, 10)),
});

export function validarCuota(d: DatosCuota): string | null {
  if (!(leerPesos(d.cuota_monto) > 0)) return "Completá el monto de la cuota mensual.";
  if (d.inscripcion_monto.trim() && !(leerPesos(d.inscripcion_monto) >= 0)) return "El monto de la inscripción no es válido.";
  if (!d.fecha_alta) return "Completá la fecha de alta.";
  const dv = Number(d.dia_vencimiento);
  if (!Number.isInteger(dv) || dv < 1 || dv > 31) return "El día de vencimiento tiene que ser un número del 1 al 31.";
  return null;
}

export const payloadCuota = (proveedor: string, d: DatosCuota) => ({
  proveedor,
  cuota_monto: leerPesos(d.cuota_monto),
  inscripcion_monto: leerPesos(d.inscripcion_monto) || 0,
  fecha_alta: aFechaPb(d.fecha_alta),
  dia_vencimiento: Number(d.dia_vencimiento),
  activa: true,
});

export function CamposCuota({ value, onChange, alta = true }: { value: DatosCuota; onChange: (d: DatosCuota) => void; alta?: boolean }) {
  const set = (k: keyof DatosCuota, v: string) => onChange({ ...value, [k]: v });
  return (
    <>
      <Field label="Cuota mensual">
        <Pesos value={value.cuota_monto} onChange={(v) => set("cuota_monto", v)} required />
      </Field>
      {alta && (
        <Field label="Inscripción" hint="Se cobra una sola vez. Dejalo vacío si no hay.">
          <Pesos value={value.inscripcion_monto} onChange={(v) => set("inscripcion_monto", v)} />
        </Field>
      )}
      {alta && (
        <Field label="Fecha de alta" hint="La primera cuota vence ese día.">
          <input
            type="date"
            value={value.fecha_alta}
            onChange={(e) => onChange({ ...value, fecha_alta: e.target.value, dia_vencimiento: e.target.value ? String(+e.target.value.slice(8, 10)) : value.dia_vencimiento })}
            required
          />
        </Field>
      )}
      <Field label="Día de vencimiento" hint="Cada mes vence ese día (en meses más cortos, el último día).">
        <input type="number" min={1} max={31} value={value.dia_vencimiento} onChange={(e) => set("dia_vencimiento", e.target.value)} required />
      </Field>
    </>
  );
}

/* ---------- alta de cuota para un proveedor que no tiene ---------- */

function AltaCuota({ proveedor, onSaved }: { proveedor: Proveedor; onSaved: () => void }) {
  const toast = useToast();
  const [datos, setDatos] = useState(cuotaVacia);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const err = validarCuota(datos);
        if (err) return toast("error", err);
        setBusy(true);
        try {
          await pb().collection("suscripciones").create(payloadCuota(proveedor.id, datos));
          toast("ok", `Cuota de ${proveedor.nombre} dada de alta.`);
          onSaved();
        } catch (er) {
          toast("error", errorMessage(er));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="section-hint" data-wide>
        Desde la fecha de alta se genera una cuota por mes. Si una cuota queda impaga 1 mes y 10 días después de vencer, {proveedor.nombre} se oculta
        de la web hasta ponerse al día.
      </p>
      <CamposCuota value={datos} onChange={setDatos} />
      <div className="form-actions" data-wide>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : "Dar de alta la cuota"}
        </button>
      </div>
    </form>
  );
}

/* ---------- registrar un pago ---------- */

function NuevoPago({ proveedor, sugerido, onSaved }: { proveedor: Proveedor; sugerido: number; onSaved: () => void }) {
  const toast = useToast();
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState(sugerido > 0 ? String(Math.round(sugerido * 100) / 100).replace(".", ",") : "");
  const [medio, setMedio] = useState("transferencia");
  const [nota, setNota] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const importe = leerPesos(monto);
        if (!(importe > 0)) return toast("error", "Completá el monto del pago.");
        setBusy(true);
        try {
          const data: Record<string, unknown> = { proveedor: proveedor.id, fecha: aFechaPb(fecha), monto: importe, medio, nota: nota.trim() };
          if (comprobante) data.comprobante = comprobante;
          await pb().collection("pagos").create(data);
          toast("ok", `Pago de ${dinero(importe)} registrado.`);
          setMonto("");
          setNota("");
          setComprobante(null);
          onSaved();
        } catch (er) {
          toast("error", errorMessage(er));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Monto">
        <Pesos value={monto} onChange={setMonto} required />
      </Field>
      <Field label="Fecha del pago">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </Field>
      <Field label="Medio de pago">
        <select value={medio} onChange={(e) => setMedio(e.target.value)}>
          {Object.entries(MEDIOS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Comprobante" hint="Opcional. PDF o foto, hasta 10 MB.">
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setComprobante(e.target.files?.[0] ?? null)} />
      </Field>
      <Field label="Nota" hint="Opcional." wide>
        <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} />
      </Field>
      <div className="form-actions" data-wide>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}

/* ---------- cuenta de un proveedor ---------- */

function CuentaProveedor({ proveedor, c, onChange }: { proveedor: Proveedor; c: Cuenta; onChange: () => void }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const s = c.suscripcion;
  const [ajustes, setAjustes] = useState(() => ({
    cuota_monto: String(s?.cuota_monto ?? ""),
    dia_vencimiento: String(s?.dia_vencimiento ?? ""),
    activa: s?.activa ?? true,
  }));
  const [editCuota, setEditCuota] = useState<{ id: string; monto: string; nota: string } | null>(null);
  const wa = linkRecordatorio(proveedor.nombre, proveedor.telefono, c);
  // lo vencido más lo que vence hoy; si no hay nada, la próxima cuota
  const exigible = c.cuotas.filter((q) => dia(q.vencimiento) <= hoy()).reduce((t, q) => t + saldo(q), 0);
  const sugerido = exigible || (c.proxima ? saldo(c.proxima) : 0);

  if (!s && !c.cuotas.length) return <AltaCuota proveedor={proveedor} onSaved={onChange} />;

  return (
    <div className="cuenta">
      <div className="cuenta__resumen">
        <div>
          <span className="cuenta__label">Deuda vencida</span>
          <strong className="cuenta__num">{dinero(c.deudaVencida)}</strong>
        </div>
        <div>
          <span className="cuenta__label">Estado</span>
          <span className="pill" data-state={ESTADO_PILL[c.estado]}>
            {textoEstado(c)}
          </span>
        </div>
        <div>
          <span className="cuenta__label">Próximo vencimiento</span>
          <span>
            {c.proxima
              ? `${fechaCorta(c.proxima.vencimiento)} · ${dinero(saldo(c.proxima))}`
              : c.proximaFecha
                ? `${fechaCorta(c.proximaFecha)} · ${dinero(s?.cuota_monto ?? 0)}`
                : "—"}
          </span>
        </div>
      </div>
      {c.estado === "deuda" && c.seOculta && <p className="cuenta__aviso">Si no paga, se oculta de la web el {fechaCorta(c.seOculta)}.</p>}
      {c.estado === "mora" && <p className="cuenta__aviso">No aparece en la web. Vuelve a aparecer solo cuando se registre el pago de lo adeudado.</p>}
      {wa && (
        <a className="btn btn--ghost-dark btn--sm" href={wa} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={16} /> Enviar recordatorio por WhatsApp
        </a>
      )}

      <section className="cuenta__bloque">
        <h3>Registrar pago</h3>
        <NuevoPago key={c.pagos.length} proveedor={proveedor} sugerido={sugerido} onSaved={onChange} />
      </section>

      <section className="cuenta__bloque">
        <h3>Cuotas</h3>
        {c.cuotas.length === 0 ? (
          <p className="section-hint">Todavía no hay cuotas generadas.</p>
        ) : (
          <ul className="ledger">
            {[...c.cuotas].reverse().map((q) => {
              const pendiente = saldo(q);
              const vencida = pendiente > 0 && dia(q.vencimiento) < hoy();
              return (
                <li key={q.id}>
                  {editCuota?.id === q.id ? (
                    <form
                      className="ledger__edit"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const monto = leerPesos(editCuota.monto);
                        if (!(monto >= 0)) return toast("error", "El monto no es válido.");
                        try {
                          await pb().collection("cuotas").update(q.id, { monto, nota: editCuota.nota.trim() });
                          setEditCuota(null);
                          toast("ok", "Cuota actualizada.");
                          onChange();
                        } catch (er) {
                          toast("error", errorMessage(er));
                        }
                      }}
                    >
                      <strong>{nombrePeriodo(q)}</strong>
                      <span className="money-input">
                        <input inputMode="decimal" value={editCuota.monto} onChange={(e) => setEditCuota({ ...editCuota, monto: e.target.value })} aria-label="Monto de la cuota" autoFocus />
                      </span>
                      <input value={editCuota.nota} onChange={(e) => setEditCuota({ ...editCuota, nota: e.target.value })} placeholder="Motivo (ej.: bonificada)" aria-label="Nota de la cuota" maxLength={300} />
                      <span className="ledger__actions">
                        <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setEditCuota(null)}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn btn--navy btn--sm">
                          Guardar
                        </button>
                      </span>
                    </form>
                  ) : (
                    <>
                      <span className="ledger__main">
                        <strong>{nombrePeriodo(q)}</strong>
                        <small>
                          Vence {fechaCorta(q.vencimiento)}
                          {q.nota && ` · ${q.nota}`}
                        </small>
                      </span>
                      <span className="ledger__amount">
                        {dinero(q.monto)}
                        {pendiente > 0 && q.pagado > 0 && <small>Pagó {dinero(q.pagado)}</small>}
                      </span>
                      <span className="pill" data-state={pendiente === 0 ? "next" : vencida ? "off" : undefined}>
                        {pendiente === 0 ? "Pagada" : vencida ? (q.pagado > 0 ? "Parcial vencida" : "Vencida") : q.pagado > 0 ? "Parcial" : "Pendiente"}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Ajustar ${nombrePeriodo(q)}`}
                        title="Ajustar monto (bonificar, corregir)"
                        onClick={() => setEditCuota({ id: q.id, monto: String(q.monto), nota: q.nota })}
                      >
                        <Icon name="pencil" size={16} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cuenta__bloque">
        <h3>Pagos</h3>
        {c.pagos.length === 0 ? (
          <p className="section-hint">No hay pagos registrados.</p>
        ) : (
          <ul className="ledger">
            {c.pagos.map((p) => (
              <li key={p.id}>
                <span className="ledger__main">
                  <strong>{fechaCorta(p.fecha)}</strong>
                  <small>
                    {MEDIOS[p.medio] ?? p.medio}
                    {p.nota && ` · ${p.nota}`}
                    {p.cargado_por && ` · cargó ${p.cargado_por}`}
                  </small>
                </span>
                <span className="ledger__amount">{dinero(p.monto)}</span>
                {p.comprobante ? (
                  <a className="row-link" href={fileUrl(p, p.comprobante)} target="_blank" rel="noopener noreferrer" aria-label="Ver comprobante" title="Ver comprobante">
                    <Icon name="download" size={16} />
                  </a>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Eliminar el pago del ${fechaCorta(p.fecha)}`}
                  onClick={async () => {
                    if (!(await confirm(`¿Eliminar el pago de ${dinero(p.monto)} del ${fechaCorta(p.fecha)}? Las cuotas se vuelven a calcular.`))) return;
                    try {
                      await pb().collection("pagos").delete(p.id);
                      toast("ok", "Pago eliminado.");
                      onChange();
                    } catch (er) {
                      toast("error", errorMessage(er));
                    }
                  }}
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {s && (
        <section className="cuenta__bloque">
          <h3>Configuración de la cuota</h3>
          <p className="section-hint">
            Alta: {fechaCorta(s.fecha_alta)}
            {s.inscripcion_monto > 0 && ` · Inscripción: ${dinero(s.inscripcion_monto)}`}. Los cambios se aplican a las cuotas que todavía no vencieron.
          </p>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const monto = leerPesos(ajustes.cuota_monto);
              const dv = Number(ajustes.dia_vencimiento);
              if (!(monto > 0)) return toast("error", "Completá el monto de la cuota mensual.");
              if (!Number.isInteger(dv) || dv < 1 || dv > 31) return toast("error", "El día de vencimiento tiene que ser un número del 1 al 31.");
              try {
                await pb().collection("suscripciones").update(s.id, { cuota_monto: monto, dia_vencimiento: dv, activa: ajustes.activa });
                toast("ok", "Cuota actualizada.");
                onChange();
              } catch (er) {
                toast("error", errorMessage(er));
              }
            }}
          >
            <Field label="Cuota mensual">
              <Pesos value={ajustes.cuota_monto} onChange={(v) => setAjustes({ ...ajustes, cuota_monto: v })} />
            </Field>
            <Field label="Día de vencimiento">
              <input type="number" min={1} max={31} value={ajustes.dia_vencimiento} onChange={(e) => setAjustes({ ...ajustes, dia_vencimiento: e.target.value })} />
            </Field>
            <div className="field" data-wide>
              <Toggle checked={ajustes.activa} onChange={(v) => setAjustes({ ...ajustes, activa: v })} label="Generar cuotas todos los meses" />
              <span className="field__hint">Desactivalo si el proveedor se da de baja: deja de generar cuotas nuevas, la deuda anterior se mantiene.</span>
            </div>
            <div className="form-actions" data-wide>
              <button type="submit" className="btn btn--navy">
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
      )}
      {dialog}
    </div>
  );
}

/* ---------- pantalla ---------- */

export function ContabilidadAdmin() {
  const toast = useToast();
  const [data, setData] = useState<{ proveedores: Proveedor[]; suscripciones: Suscripcion[]; cuotas: Cuota[]; pagos: Pago[] } | null>(null);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "deuda" | "mora" | "al-dia" | "sin-cuota">("todos");
  const [abierto, setAbierto] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = pb();
      // genera las cuotas del día y revisa la mora antes de leer
      await c.send("/api/caph/contabilidad/actualizar", { method: "POST" }).catch(() => {});
      const [proveedores, suscripciones, cuotas, pagos] = await Promise.all([
        c.collection("proveedores").getFullList<Proveedor>({ sort: "nombre", fields: "id,nombre,telefono,activo,oculto_mora" }),
        c.collection("suscripciones").getFullList<Suscripcion>(),
        c.collection("cuotas").getFullList<Cuota>(),
        c.collection("pagos").getFullList<Pago>(),
      ]);
      setData({ proveedores, suscripciones, cuotas, pagos });
    } catch (err) {
      toast("error", errorMessage(err));
      setData((d) => d ?? { proveedores: [], suscripciones: [], cuotas: [], pagos: [] });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cuentas = useMemo(() => {
    const m = new Map<string, Cuenta>();
    if (!data) return m;
    for (const p of data.proveedores) {
      m.set(
        p.id,
        cuenta(
          data.suscripciones.find((s) => s.proveedor === p.id),
          data.cuotas.filter((c) => c.proveedor === p.id),
          data.pagos.filter((x) => x.proveedor === p.id),
          p.oculto_mora
        )
      );
    }
    return m;
  }, [data]);

  const resumen = useMemo(() => {
    if (!data) return null;
    const h = hoy();
    const mes = h.slice(0, 7);
    let deuda = 0;
    let porCobrar = 0;
    for (const c of data.cuotas) {
      const s = saldo(c);
      if (dia(c.vencimiento) < h) deuda += s;
      else if (dia(c.vencimiento).slice(0, 7) === mes) porCobrar += s;
    }
    return {
      cobrado: data.pagos.filter((p) => dia(p.fecha).slice(0, 7) === mes).reduce((s, p) => s + p.monto, 0),
      deuda,
      porCobrar,
      mora: data.proveedores.filter((p) => p.oculto_mora).length,
    };
  }, [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const n = q.trim().toLowerCase();
    return data.proveedores.filter((p) => {
      const c = cuentas.get(p.id)!;
      if (n && !p.nombre.toLowerCase().includes(n)) return false;
      if (filtro === "deuda") return c.estado === "deuda" || c.estado === "mora";
      if (filtro === "al-dia") return c.estado === "al-dia" || c.estado === "pronto";
      if (filtro !== "todos") return c.estado === filtro;
      return true;
    });
  }, [data, cuentas, q, filtro]);

  const actual = abierto && data ? data.proveedores.find((p) => p.id === abierto) : undefined;
  const mesActual = nombrePeriodo({ tipo: "mensual", periodo: hoy().slice(0, 7) });

  return (
    <>
      <PageHead
        title="Contabilidad"
        text="Cuotas mensuales de los proveedores. Las cuotas se generan solas cada mes; registrá acá los pagos. Quien deba una cuota más de 1 mes y 10 días se oculta de la web."
      />

      {resumen && (
        <div className="stats">
          <div className="stat">
            <span>Cobrado en {mesActual.toLowerCase()}</span>
            <strong>{dinero(resumen.cobrado)}</strong>
          </div>
          <div className="stat">
            <span>Por cobrar este mes</span>
            <strong>{dinero(resumen.porCobrar)}</strong>
          </div>
          <div className="stat" data-tone={resumen.deuda > 0 ? "warn" : undefined}>
            <span>Deuda vencida</span>
            <strong>{dinero(resumen.deuda)}</strong>
          </div>
          <div className="stat" data-tone={resumen.mora > 0 ? "off" : undefined}>
            <span>Ocultos por mora</span>
            <strong>{resumen.mora}</strong>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar proveedor" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar proveedor" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por estado">
          <option value="todos">Todos</option>
          <option value="deuda">Con deuda</option>
          <option value="mora">Ocultos por mora</option>
          <option value="al-dia">Al día</option>
          <option value="sin-cuota">Sin cuota</option>
        </select>
        {data && (
          <span className="toolbar__count">
            {list.length} de {data.proveedores.length}
          </span>
        )}
      </div>

      {!data ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty text="Ningún proveedor coincide con el filtro." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">Cuota</th>
                <th scope="col">Próximo vencimiento</th>
                <th scope="col">Deuda vencida</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const c = cuentas.get(p.id)!;
                return (
                  <tr key={p.id} data-muted={(!p.activo && c.estado !== "mora") || undefined}>
                    <th scope="row">
                      <button type="button" className="link-btn" onClick={() => setAbierto(p.id)}>
                        {p.nombre}
                      </button>
                    </th>
                    <td data-label="Cuota" className="num-cell">
                      {c.suscripcion ? dinero(c.suscripcion.cuota_monto) : "—"}
                    </td>
                    <td data-label="Próximo vencimiento" className="num-cell">
                      {c.proximaFecha ? fechaCorta(c.proximaFecha) : "—"}
                    </td>
                    <td data-label="Deuda vencida" className="num-cell">
                      {c.deudaVencida ? dinero(c.deudaVencida) : "—"}
                    </td>
                    <td data-label="Estado">
                      <span className="pill" data-state={ESTADO_PILL[c.estado]}>
                        {textoEstado(c)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setAbierto(p.id)}>
                        {c.estado === "sin-cuota" ? "Dar de alta cuota" : "Ver cuenta"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!actual} title={actual ? `Cuenta de ${actual.nombre}` : ""} onClose={() => setAbierto(null)}>
        {actual && <CuentaProveedor key={`${actual.id}-${cuentas.get(actual.id)?.suscripcion?.id ?? "nueva"}`} proveedor={actual} c={cuentas.get(actual.id)!} onChange={load} />}
      </Drawer>
    </>
  );
}
