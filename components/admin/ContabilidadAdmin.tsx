"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coincide } from "../../lib/buscar";
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
  titularDe,
  type CampoTitular,
  type Cuenta,
  type Cuota,
  type Estado,
  type Pago,
  type Suscripcion,
  type Tarifa,
} from "./cuentas";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Tipo = Tarifa["rol"];

/** Quien paga: un proveedor o un asociado/profesional. */
export type Titular = {
  id: string;
  nombre: string;
  telefono: string;
  activo: boolean;
  oculto_mora: boolean;
  tipo: Tipo;
  campo: CampoTitular;
};

const TIPOS: Record<Tipo, string> = { asociado: "Asociado", proveedor: "Proveedor", profesional: "Profesional" };

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

const pesosTexto = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100).replace(".", ",") : "");

/* ---------- campos de la cuota (también los usa el alta de proveedores) ---------- */

export type DatosCuota = { cuota_monto: string; inscripcion_monto: string; fecha_alta: string; dia_vencimiento: string };

/** Datos de una cuota nueva; con tarifa, arranca con sus montos. */
export const cuotaVacia = (tarifa?: Tarifa): DatosCuota => ({
  cuota_monto: tarifa?.cobrar ? pesosTexto(tarifa.cuota_monto) : "",
  inscripcion_monto: tarifa?.cobrar ? pesosTexto(tarifa.inscripcion_monto) : "",
  fecha_alta: hoy(),
  dia_vencimiento: String(tarifa?.dia_vencimiento || +hoy().slice(8, 10)),
});

export function validarCuota(d: DatosCuota): string | null {
  if (!(leerPesos(d.cuota_monto) > 0)) return "Completá el monto de la cuota mensual.";
  if (d.inscripcion_monto.trim() && !(leerPesos(d.inscripcion_monto) >= 0)) return "El monto de la inscripción no es válido.";
  if (!d.fecha_alta) return "Completá la fecha de alta.";
  const dv = Number(d.dia_vencimiento);
  if (!Number.isInteger(dv) || dv < 1 || dv > 31) return "El día de vencimiento tiene que ser un número del 1 al 31.";
  return null;
}

export const payloadCuota = (campo: CampoTitular, id: string, d: DatosCuota) => ({
  [campo]: id,
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

/* ---------- alta de cuota para quien no tiene ---------- */

function AltaCuota({ titular, tarifa, onSaved }: { titular: Titular; tarifa?: Tarifa; onSaved: () => void }) {
  const toast = useToast();
  const [datos, setDatos] = useState(() => cuotaVacia(tarifa));
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
          await pb().collection("suscripciones").create(payloadCuota(titular.campo, titular.id, datos));
          toast("ok", `Cuota de ${titular.nombre} dada de alta.`);
          onSaved();
        } catch (er) {
          toast("error", errorMessage(er));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="section-hint" data-wide>
        Desde la fecha de alta se genera una cuota por mes. Si una cuota queda impaga 1 mes y 10 días después de vencer, {titular.nombre} se oculta
        de la web y su carnet deja de estar vigente hasta ponerse al día.
        {tarifa && !tarifa.cobrar && ` Los ${TIPOS[titular.tipo].toLowerCase()}s hoy no pagan cuota: cargala solo si este caso es distinto.`}
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

function NuevoPago({ titular, sugerido, onSaved }: { titular: Titular; sugerido: number; onSaved: () => void }) {
  const toast = useToast();
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState(pesosTexto(sugerido));
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
          const data: Record<string, unknown> = { [titular.campo]: titular.id, fecha: aFechaPb(fecha), monto: importe, medio, nota: nota.trim() };
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

/* ---------- pago informado desde el portal: confirmar o rechazar ---------- */

function RevisarPago({ pago, onChange }: { pago: Pago; onChange: () => void }) {
  const toast = useToast();
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const guardar = async (cambios: Partial<Pago>, texto: string) => {
    setBusy(true);
    try {
      await pb().collection("pagos").update(pago.id, cambios);
      toast("ok", texto);
      onChange();
    } catch (er) {
      toast("error", errorMessage(er));
    } finally {
      setBusy(false);
    }
  };
  if (rechazo !== null)
    return (
      <form
        className="ledger__edit"
        onSubmit={(e) => {
          e.preventDefault();
          if (!rechazo.trim()) return toast("error", "Escribí el motivo: lo ve el usuario en su portal.");
          guardar({ estado: "rechazado", motivo: rechazo.trim() }, "Pago rechazado.");
        }}
      >
        <input value={rechazo} onChange={(e) => setRechazo(e.target.value)} placeholder="Motivo (ej.: no se acreditó)" aria-label="Motivo del rechazo" maxLength={300} autoFocus />
        <span className="ledger__actions">
          <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setRechazo(null)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--danger btn--sm" disabled={busy}>
            Rechazar
          </button>
        </span>
      </form>
    );
  return (
    <span className="ledger__actions">
      <button type="button" className="btn btn--ghost-dark btn--sm" disabled={busy} onClick={() => setRechazo("")}>
        Rechazar
      </button>
      <button type="button" className="btn btn--navy btn--sm" disabled={busy} onClick={() => guardar({ estado: "confirmado", motivo: "" }, `Pago de ${dinero(pago.monto)} confirmado.`)}>
        Confirmar
      </button>
    </span>
  );
}

function ComprobanteLink({ pago }: { pago: Pago }) {
  return pago.comprobante ? (
    <a className="row-link" href={fileUrl(pago, pago.comprobante)} target="_blank" rel="noopener noreferrer" aria-label="Ver comprobante" title="Ver comprobante">
      <Icon name="download" size={16} />
    </a>
  ) : (
    <span />
  );
}

/* ---------- cuenta de un titular ---------- */

function CuentaTitular({ titular, c, tarifa, onChange }: { titular: Titular; c: Cuenta; tarifa?: Tarifa; onChange: () => void }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const s = c.suscripcion;
  const [ajustes, setAjustes] = useState(() => ({
    cuota_monto: String(s?.cuota_monto ?? ""),
    dia_vencimiento: String(s?.dia_vencimiento ?? ""),
    activa: s?.activa ?? true,
  }));
  const [editCuota, setEditCuota] = useState<{ id: string; monto: string; nota: string } | null>(null);
  const wa = linkRecordatorio(titular.nombre, titular.telefono, c);
  // lo vencido más lo que vence hoy; si no hay nada, la próxima cuota
  const exigible = c.cuotas.filter((q) => dia(q.vencimiento) <= hoy()).reduce((t, q) => t + saldo(q), 0);
  const sugerido = exigible || (c.proxima ? saldo(c.proxima) : 0);

  if (!s && !c.cuotas.length && !c.pagos.length) return <AltaCuota titular={titular} tarifa={tarifa} onSaved={onChange} />;

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
      {c.estado === "deuda" && c.seOculta && <p className="cuenta__aviso">Si no paga, se oculta de la web y su carnet deja de estar vigente el {fechaCorta(c.seOculta)}.</p>}
      {c.estado === "mora" && <p className="cuenta__aviso">No aparece en la web y su carnet no está vigente. Vuelve solo cuando se registre el pago de lo adeudado.</p>}
      {wa && (
        <a className="btn btn--ghost-dark btn--sm" href={wa} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={16} /> Enviar recordatorio por WhatsApp
        </a>
      )}

      <section className="cuenta__bloque">
        <h3>Registrar pago</h3>
        <NuevoPago key={c.pagos.length} titular={titular} sugerido={sugerido} onSaved={onChange} />
      </section>

      {!s && (
        <section className="cuenta__bloque">
          <h3>Cuota mensual</h3>
          <AltaCuota titular={titular} tarifa={tarifa} onSaved={onChange} />
        </section>
      )}

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
              <li key={p.id} data-estado={p.estado}>
                <span className="ledger__main">
                  <strong>
                    {fechaCorta(p.fecha)}
                    {p.estado !== "confirmado" && (
                      <>
                        {" "}
                        <span className="pill" data-state={p.estado === "informado" ? "warn" : "off"}>
                          {p.estado === "informado" ? "A confirmar" : "Rechazado"}
                        </span>
                      </>
                    )}
                  </strong>
                  <small>
                    {MEDIOS[p.medio] ?? p.medio}
                    {p.nota && ` · ${p.nota}`}
                    {p.cargado_por && ` · ${p.estado === "informado" ? "informó" : "cargó"} ${p.cargado_por}`}
                    {p.motivo && ` · ${p.motivo}`}
                  </small>
                </span>
                <span className="ledger__amount">{dinero(p.monto)}</span>
                <ComprobanteLink pago={p} />
                {p.estado === "informado" ? (
                  <RevisarPago pago={p} onChange={onChange} />
                ) : (
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
                )}
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
              <span className="field__hint">Desactivalo si se da de baja: deja de generar cuotas nuevas, la deuda anterior se mantiene.</span>
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

/* ---------- tarifas y datos para transferir ---------- */

function Tarifas({ tarifas, cobro, onChange }: { tarifas: Tarifa[]; cobro: { id: string; datos_transferencia: string } | null; onChange: () => void }) {
  const toast = useToast();
  const [filas, setFilas] = useState(() =>
    tarifas.map((t) => ({ ...t, cuota: pesosTexto(t.cuota_monto), inscripcion: pesosTexto(t.inscripcion_monto), dia: t.dia_vencimiento ? String(t.dia_vencimiento) : "" }))
  );
  const [datos, setDatos] = useState(cobro?.datos_transferencia ?? "");
  const [busy, setBusy] = useState(false);
  const set = (id: string, cambios: Partial<(typeof filas)[number]>) => setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambios } : f)));

  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        for (const f of filas) {
          const dia = f.dia.trim() ? Number(f.dia) : 0;
          if (f.cobrar && !(leerPesos(f.cuota) > 0)) return toast("error", `Completá la cuota de ${TIPOS[f.rol].toLowerCase()}s o desactivá el cobro.`);
          if (!Number.isInteger(dia) || dia < 0 || dia > 31) return toast("error", "El día de vencimiento tiene que ser del 1 al 31 (o vacío).");
        }
        setBusy(true);
        try {
          await Promise.all([
            ...filas.map((f) =>
              pb()
                .collection("tarifas")
                .update(f.id, {
                  cuota_monto: leerPesos(f.cuota) || 0,
                  inscripcion_monto: leerPesos(f.inscripcion) || 0,
                  dia_vencimiento: f.dia.trim() ? Number(f.dia) : 0,
                  cobrar: f.cobrar,
                })
            ),
            cobro ? pb().collection("cobro").update(cobro.id, { datos_transferencia: datos.trim() }) : Promise.resolve(),
          ]);
          toast("ok", "Tarifas guardadas. Se aplican a las próximas altas.");
          onChange();
        } catch (er) {
          toast("error", errorMessage(er));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="section-hint">
        Se aplican al aprobar cada alta nueva desde Altas. Las cuotas de quienes ya tienen cuenta no cambian: se ajustan en su cuenta.
      </p>
      <div className="tarifas">
        {filas.map((f) => (
          <fieldset key={f.id} className="tarifa" data-off={!f.cobrar || undefined}>
            <legend>{TIPOS[f.rol]}s</legend>
            <Toggle checked={f.cobrar} onChange={(v) => set(f.id, { cobrar: v })} label={f.cobrar ? "Pagan cuota" : "Sin cargo"} />
            <Field label="Cuota mensual">
              <Pesos value={f.cuota} onChange={(v) => set(f.id, { cuota: v })} />
            </Field>
            <Field label="Inscripción">
              <Pesos value={f.inscripcion} onChange={(v) => set(f.id, { inscripcion: v })} />
            </Field>
            <Field label="Día de vencimiento" hint="Vacío: el día del alta.">
              <input type="number" min={1} max={31} value={f.dia} onChange={(e) => set(f.id, { dia: e.target.value })} />
            </Field>
          </fieldset>
        ))}
      </div>
      <Field label="Datos para transferir" hint="Los ve cada usuario en su portal al informar un pago: banco, titular, CBU, alias, CUIT." wide>
        <textarea rows={4} maxLength={1000} value={datos} onChange={(e) => setDatos(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : "Guardar tarifas"}
        </button>
      </div>
    </form>
  );
}

/* ---------- cuota para todos los que no tienen ---------- */

function AltaMasiva({ tarifas, titulares, conCuota, onChange }: { tarifas: Tarifa[]; titulares: Titular[]; conCuota: Set<string>; onChange: () => void }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [fecha, setFecha] = useState(hoy);
  const [inscripcion, setInscripcion] = useState(false);
  const [progreso, setProgreso] = useState("");
  const pendientes = tarifas
    .filter((t) => t.cobrar && t.cuota_monto > 0)
    .map((t) => ({ tarifa: t, sin: titulares.filter((x) => x.tipo === t.rol && !conCuota.has(x.id)) }))
    .filter((p) => p.sin.length);

  if (!pendientes.length) return null;

  return (
    <section className="admin-section">
      <h2>Cuota para todos los que no tienen</h2>
      <div className="card form-grid">
        <p className="section-hint" data-wide>
          Para quienes ya estaban antes del portal (por ejemplo, los asociados cargados a mano o importados). La primera cuota vence en la fecha de alta: elegí
          una de hoy en adelante para no generarles deuda hacia atrás.
        </p>
        <Field label="Fecha de alta">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <div className="field">
          <span className="field__label">Inscripción</span>
          <Toggle checked={inscripcion} onChange={setInscripcion} label={inscripcion ? "Cobrarles inscripción" : "Sin inscripción (ya son socios)"} />
        </div>
        <div className="form-actions" data-wide>
          {pendientes.map(({ tarifa, sin }) => (
            <button
              key={tarifa.id}
              type="button"
              className="btn btn--navy btn--sm"
              disabled={!!progreso || !fecha}
              onClick={async () => {
                const ok = await confirm(
                  `¿Dar de alta la cuota de ${dinero(tarifa.cuota_monto)} a ${sin.length} ${TIPOS[tarifa.rol].toLowerCase()}${sin.length === 1 ? "" : "s"} sin cuota, desde el ${fechaCorta(fecha)}?`,
                  "Dar de alta"
                );
                if (!ok) return;
                const datos: DatosCuota = {
                  cuota_monto: pesosTexto(tarifa.cuota_monto),
                  inscripcion_monto: inscripcion ? pesosTexto(tarifa.inscripcion_monto) : "",
                  fecha_alta: fecha,
                  dia_vencimiento: String(tarifa.dia_vencimiento || +fecha.slice(8, 10)),
                };
                let errores = 0;
                for (const [i, t] of sin.entries()) {
                  setProgreso(`${i + 1} de ${sin.length}…`);
                  try {
                    await pb().collection("suscripciones").create(payloadCuota(t.campo, t.id, datos));
                  } catch {
                    errores++;
                  }
                }
                setProgreso("");
                toast(errores ? "error" : "ok", `Cuota dada de alta a ${sin.length - errores}${errores ? `; ${errores} no se pudieron` : ""}.`);
                onChange();
              }}
            >
              {progreso || `Dar de alta a ${sin.length} ${TIPOS[tarifa.rol].toLowerCase()}${sin.length === 1 ? "" : "s"} sin cuota`}
            </button>
          ))}
        </div>
        {dialog}
      </div>
    </section>
  );
}

/* ---------- pantalla ---------- */

type Datos = {
  titulares: Titular[];
  suscripciones: Suscripcion[];
  cuotas: Cuota[];
  pagos: Pago[];
  tarifas: Tarifa[];
  cobro: { id: string; datos_transferencia: string } | null;
};

export function ContabilidadAdmin() {
  const toast = useToast();
  const [data, setData] = useState<Datos | null>(null);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | Tipo>("todos");
  const [filtro, setFiltro] = useState<"todos" | "deuda" | "mora" | "al-dia" | "sin-cuota">("todos");
  const [abierto, setAbierto] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = pb();
      // genera las cuotas del día y revisa la mora antes de leer
      await c.send("/api/caph/contabilidad/actualizar", { method: "POST" }).catch(() => {});
      type Ficha = { id: string; nombre: string; telefono: string; activo: boolean; oculto_mora: boolean; rol?: Tipo };
      const [proveedores, personas, suscripciones, cuotas, pagos, tarifas, cobro] = await Promise.all([
        c.collection("proveedores").getFullList<Ficha>({ sort: "nombre", fields: "id,nombre,telefono,activo,oculto_mora", filter: "estado = 'aprobado'" }),
        c.collection("profesionales").getFullList<Ficha>({ sort: "nombre", fields: "id,nombre,telefono,activo,oculto_mora,rol", filter: "estado = 'aprobado'" }),
        c.collection("suscripciones").getFullList<Suscripcion>(),
        c.collection("cuotas").getFullList<Cuota>(),
        c.collection("pagos").getFullList<Pago>({ sort: "-fecha" }),
        c.collection("tarifas").getFullList<Tarifa>(),
        c.collection("cobro").getFullList<{ id: string; datos_transferencia: string }>(),
      ]);
      const titulares: Titular[] = [
        ...proveedores.map((p) => ({ ...p, tipo: "proveedor" as const, campo: "proveedor" as const })),
        ...personas.map((p) => ({ ...p, tipo: (p.rol === "profesional" ? "profesional" : "asociado") as Tipo, campo: "profesional" as const })),
      ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      const orden: Tipo[] = ["asociado", "proveedor", "profesional"];
      setData({ titulares, suscripciones, cuotas, pagos, tarifas: tarifas.sort((a, b) => orden.indexOf(a.rol) - orden.indexOf(b.rol)), cobro: cobro[0] ?? null });
    } catch (err) {
      toast("error", errorMessage(err));
      setData((d) => d ?? { titulares: [], suscripciones: [], cuotas: [], pagos: [], tarifas: [], cobro: null });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cuentas = useMemo(() => {
    const m = new Map<string, Cuenta>();
    if (!data) return m;
    for (const t of data.titulares) {
      m.set(
        t.id,
        cuenta(
          data.suscripciones.find((s) => titularDe(s) === t.id),
          data.cuotas.filter((c) => titularDe(c) === t.id),
          data.pagos.filter((x) => titularDe(x) === t.id),
          t.oculto_mora
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
      cobrado: data.pagos.filter((p) => p.estado === "confirmado" && dia(p.fecha).slice(0, 7) === mes).reduce((s, p) => s + p.monto, 0),
      deuda,
      porCobrar,
      mora: data.titulares.filter((p) => p.oculto_mora).length,
    };
  }, [data]);

  const informados = useMemo(() => (data ? data.pagos.filter((p) => p.estado === "informado") : []), [data]);

  const list = useMemo(() => {
    if (!data) return [];
    return data.titulares.filter((t) => {
      const c = cuentas.get(t.id)!;
      if (tipo !== "todos" && t.tipo !== tipo) return false;
      if (!coincide(q, [t.nombre], [t.telefono])) return false;
      if (filtro === "deuda") return c.estado === "deuda" || c.estado === "mora";
      if (filtro === "al-dia") return c.estado === "al-dia" || c.estado === "pronto";
      if (filtro !== "todos") return c.estado === filtro;
      return true;
    });
  }, [data, cuentas, q, tipo, filtro]);

  const actual = abierto && data ? data.titulares.find((t) => t.id === abierto) : undefined;
  const nombreDe = (id: string) => data?.titulares.find((t) => t.id === id)?.nombre ?? "—";
  const mesActual = nombrePeriodo({ tipo: "mensual", periodo: hoy().slice(0, 7) });

  return (
    <>
      <PageHead
        title="Contabilidad"
        text="Cuotas de asociados, proveedores y profesionales. Las cuotas se generan solas cada mes; registrá acá los pagos y confirmá los que informan desde su portal. Quien deba una cuota más de 1 mes y 10 días se oculta de la web y su carnet deja de estar vigente."
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
            <span>Suspendidos por mora</span>
            <strong>{resumen.mora}</strong>
          </div>
        </div>
      )}

      {informados.length > 0 && (
        <section className="admin-section">
          <h2>Pagos informados para confirmar ({informados.length})</h2>
          <p className="section-hint">Los cargaron desde su portal con el comprobante. No cuentan para las cuotas hasta que los confirmás.</p>
          <ul className="ledger">
            {informados.map((p) => (
              <li key={p.id}>
                <span className="ledger__main">
                  <strong>
                    <button type="button" className="link-btn" onClick={() => setAbierto(titularDe(p))}>
                      {nombreDe(titularDe(p))}
                    </button>
                  </strong>
                  <small>
                    {fechaCorta(p.fecha)} · {MEDIOS[p.medio] ?? p.medio}
                    {p.nota && ` · ${p.nota}`}
                  </small>
                </span>
                <span className="ledger__amount">{dinero(p.monto)}</span>
                <ComprobanteLink pago={p} />
                <RevisarPago pago={p} onChange={load} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="admin-section">
        <h2>Cuentas</h2>
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cuenta" />
          </div>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Filtrar por tipo">
            <option value="todos">Todos los tipos</option>
            <option value="asociado">Asociados</option>
            <option value="proveedor">Proveedores</option>
            <option value="profesional">Profesionales</option>
          </select>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            <option value="deuda">Con deuda</option>
            <option value="mora">Suspendidos por mora</option>
            <option value="al-dia">Al día</option>
            <option value="sin-cuota">Sin cuota</option>
          </select>
          {data && (
            <span className="toolbar__count">
              {list.length} de {data.titulares.length}
            </span>
          )}
        </div>

        {!data ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty text="Ninguna cuenta coincide con el filtro." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Tipo</th>
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
                {list.map((t) => {
                  const c = cuentas.get(t.id)!;
                  return (
                    <tr key={t.id} data-muted={(!t.activo && c.estado !== "mora") || undefined}>
                      <th scope="row">
                        <button type="button" className="link-btn" onClick={() => setAbierto(t.id)}>
                          {t.nombre}
                        </button>
                      </th>
                      <td data-label="Tipo">{TIPOS[t.tipo]}</td>
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
                        {c.pagos.some((p) => p.estado === "informado") && (
                          <>
                            {" "}
                            <span className="pill" data-state="warn">
                              Pago a confirmar
                            </span>
                          </>
                        )}
                      </td>
                      <td className="actions-cell">
                        <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setAbierto(t.id)}>
                          {c.estado === "sin-cuota" && !c.pagos.length ? "Dar de alta cuota" : "Ver cuenta"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data && data.tarifas.length > 0 && (
        <section className="admin-section">
          <h2>Tarifas</h2>
          <Tarifas key={data.tarifas.map((t) => t.id + t.cuota_monto + t.cobrar).join() + (data.cobro?.datos_transferencia ?? "")} tarifas={data.tarifas} cobro={data.cobro} onChange={load} />
        </section>
      )}

      {data && <AltaMasiva tarifas={data.tarifas} titulares={data.titulares} conCuota={new Set(data.suscripciones.map(titularDe))} onChange={load} />}

      <Drawer open={!!actual} title={actual ? `Cuenta de ${actual.nombre}` : ""} onClose={() => setAbierto(null)}>
        {actual && (
          <CuentaTitular
            key={`${actual.id}-${cuentas.get(actual.id)?.suscripcion?.id ?? "nueva"}`}
            titular={actual}
            c={cuentas.get(actual.id)!}
            tarifa={data?.tarifas.find((t) => t.rol === actual.tipo)}
            onChange={load}
          />
        )}
      </Drawer>
    </>
  );
}
