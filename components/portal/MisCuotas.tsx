"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { errorMessage } from "../../lib/pb-client";
import { portal, type Rol } from "../../lib/portal-client";
import { useToast } from "../admin/ui";
import {
  MEDIOS,
  aFechaPb,
  cuenta,
  dia,
  dinero,
  fechaCorta,
  hoy,
  leerPesos,
  nombrePeriodo,
  saldo,
  type Cuota,
  type Pago,
  type Suscripcion,
  type Tarifa,
} from "../admin/cuentas";

type Datos = { suscripcion?: Suscripcion; cuotas: Cuota[]; pagos: Pago[]; tarifa?: Tarifa; transferencia: string };

const MEDIOS_PORTAL = ["transferencia", "mercadopago", "otro"] as const;
const pesosTexto = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100).replace(".", ",") : "");

function InformarPago({ campo, fichaId, sugerido, transferencia, onListo }: { campo: string; fichaId: string; sugerido: number; transferencia: string; onListo: () => void }) {
  const toast = useToast();
  const ids = { monto: useId(), fecha: useId(), medio: useId(), comprobante: useId(), nota: useId() };
  const [monto, setMonto] = useState(pesosTexto(sugerido));
  const [fecha, setFecha] = useState(hoy);
  const [medio, setMedio] = useState<string>("transferencia");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="form-grid"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const importe = leerPesos(monto);
        if (!(importe > 0)) return setError("Completá el monto que pagaste.");
        if (!fecha || fecha > hoy()) return setError("La fecha del pago no puede ser futura.");
        if (!comprobante) return setError("Adjuntá el comprobante (foto o PDF).");
        setError("");
        setBusy(true);
        try {
          await portal().collection("pagos").create({ [campo]: fichaId, monto: importe, fecha: aFechaPb(fecha), medio, comprobante, nota: nota.trim() });
          toast("ok", "Pago informado. La Cámara lo confirma cuando verifique el comprobante.");
          onListo();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {transferencia && (
        <div className="cuotas__transferencia" data-wide>
          <span className="field__label">Datos para transferir</span>
          <p>{transferencia}</p>
        </div>
      )}
      <div className="field">
        <label className="field__label" htmlFor={ids.monto}>
          Monto pagado
        </label>
        <span className="money-input">
          <input id={ids.monto} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </span>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={ids.fecha}>
          Fecha del pago
        </label>
        <input id={ids.fecha} type="date" max={hoy()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={ids.medio}>
          Medio de pago
        </label>
        <select id={ids.medio} value={medio} onChange={(e) => setMedio(e.target.value)}>
          {MEDIOS_PORTAL.map((k) => (
            <option key={k} value={k}>
              {MEDIOS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={ids.comprobante}>
          Comprobante <span aria-hidden="true">*</span>
        </label>
        <input
          id={ids.comprobante}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          aria-describedby={`${ids.comprobante}-ayuda`}
          onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
        />
        <span id={`${ids.comprobante}-ayuda`} className="field__hint">
          Foto o PDF, hasta 10 MB.
        </span>
      </div>
      <div className="field" data-wide>
        <label className="field__label" htmlFor={ids.nota}>
          Nota
        </label>
        <input id={ids.nota} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Opcional. Ej.: cuotas de octubre y noviembre" />
      </div>
      {error && (
        <p className="form-error" role="alert" data-wide>
          {error}
        </p>
      )}
      <div className="form-actions" data-wide>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Enviando…" : "Informar pago"}
        </button>
      </div>
    </form>
  );
}

export function MisCuotas({ rol, fichaId, ocultoMora }: { rol: Rol; fichaId: string; ocultoMora: boolean }) {
  const toast = useToast();
  const campo = rol === "proveedor" ? "proveedor" : "profesional";
  const [datos, setDatos] = useState<Datos | null>(null);
  const [informar, setInformar] = useState(false);

  const load = useCallback(async () => {
    const c = portal();
    const filtro = `${campo} = "${fichaId}"`;
    try {
      const [suscripciones, cuotas, pagos, tarifas, cobro] = await Promise.all([
        c.collection("suscripciones").getFullList<Suscripcion>({ filter: filtro }),
        c.collection("cuotas").getFullList<Cuota>({ filter: filtro }),
        c.collection("pagos").getFullList<Pago>({ filter: filtro, sort: "-fecha" }),
        c.collection("tarifas").getFullList<Tarifa>({ filter: `rol = "${rol}"` }),
        c.collection("cobro").getFullList<{ datos_transferencia: string }>(),
      ]);
      setDatos({ suscripcion: suscripciones[0], cuotas, pagos, tarifa: tarifas[0], transferencia: cobro[0]?.datos_transferencia ?? "" });
    } catch (err) {
      toast("error", errorMessage(err));
      setDatos({ cuotas: [], pagos: [], transferencia: "" });
    }
  }, [campo, fichaId, rol, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!datos)
    return (
      <section className="portal__card">
        <h2>Mis cuotas</h2>
        <div className="loading" aria-busy="true">
          <span className="spinner" aria-hidden="true" />
          Cargando…
        </div>
      </section>
    );

  if (!datos.suscripcion && !datos.cuotas.length)
    return (
      <section className="portal__card" aria-labelledby="cuotas-titulo">
        <h2 id="cuotas-titulo">Mis cuotas</h2>
        <p>{datos.tarifa && !datos.tarifa.cobrar ? "Tu membresía no tiene costo por ahora." : "La Cámara todavía no configuró tu cuota. Cuando lo haga, la vas a ver acá."}</p>
      </section>
    );

  const c = cuenta(datos.suscripcion, datos.cuotas, datos.pagos, ocultoMora);
  const exigible = c.cuotas.filter((q) => dia(q.vencimiento) <= hoy()).reduce((t, q) => t + saldo(q), 0);
  const sugerido = exigible || (c.proxima ? saldo(c.proxima) : 0);
  const enRevision = datos.pagos.filter((p) => p.estado === "informado");
  const estado =
    c.estado === "mora"
      ? { texto: "Suspendido por falta de pago", tono: "off" }
      : c.estado === "deuda"
        ? { texto: c.cuotasVencidas === 1 ? "Debés 1 cuota" : `Debés ${c.cuotasVencidas} cuotas`, tono: "warn" }
        : c.estado === "pronto"
          ? { texto: "Vence pronto", tono: "warn" }
          : { texto: "Al día", tono: "next" };

  return (
    <section className="portal__card" aria-labelledby="cuotas-titulo">
      <div className="solicitud__head">
        <h2 id="cuotas-titulo">Mis cuotas</h2>
        <span className="pill" data-state={estado.tono}>
          {estado.texto}
        </span>
      </div>

      <div className="cuenta__resumen">
        <div>
          <span className="cuenta__label">Deuda vencida</span>
          <strong className="cuenta__num">{dinero(c.deudaVencida)}</strong>
        </div>
        <div>
          <span className="cuenta__label">Próximo vencimiento</span>
          <span>
            {c.proxima
              ? `${fechaCorta(c.proxima.vencimiento)} · ${dinero(saldo(c.proxima))}`
              : c.proximaFecha
                ? `${fechaCorta(c.proximaFecha)} · ${dinero(datos.suscripcion?.cuota_monto ?? 0)}`
                : "—"}
          </span>
        </div>
      </div>

      {c.estado === "mora" && (
        <p className="cuenta__aviso">Tu ficha no se muestra en la web y tu carnet no está vigente. Se reactivan solos cuando la Cámara confirma tu pago.</p>
      )}
      {c.estado === "deuda" && c.seOculta && (
        <p className="cuenta__aviso">Si el pago no se registra antes del {fechaCorta(c.seOculta)}, tu ficha se oculta de la web y tu carnet deja de estar vigente.</p>
      )}
      {enRevision.length > 0 && (
        <p className="section-hint">
          Tenés {enRevision.length === 1 ? "un pago informado" : `${enRevision.length} pagos informados`} por {dinero(enRevision.reduce((s, p) => s + p.monto, 0))} esperando
          que la Cámara lo confirme.
        </p>
      )}

      {informar ? (
        <div className="cuenta__bloque">
          <h3>Informar un pago</h3>
          <InformarPago
            campo={campo}
            fichaId={fichaId}
            sugerido={sugerido}
            transferencia={datos.transferencia}
            onListo={() => {
              setInformar(false);
              load();
            }}
          />
        </div>
      ) : (
        <div className="portal__acciones">
          <button type="button" className="btn btn--navy btn--sm" onClick={() => setInformar(true)}>
            Informar un pago
          </button>
        </div>
      )}

      <div className="cuenta__bloque">
        <h3>Cuotas</h3>
        <ul className="ledger">
          {[...c.cuotas]
            .reverse()
            .slice(0, 12)
            .map((q) => {
              const pendiente = saldo(q);
              const vencida = pendiente > 0 && dia(q.vencimiento) < hoy();
              return (
                <li key={q.id}>
                  <span className="ledger__main">
                    <strong>{nombrePeriodo(q)}</strong>
                    <small>Vence {fechaCorta(q.vencimiento)}</small>
                  </span>
                  <span className="ledger__amount">
                    {dinero(q.monto)}
                    {pendiente > 0 && q.pagado > 0 && <small>Pagaste {dinero(q.pagado)}</small>}
                  </span>
                  <span className="pill" data-state={pendiente === 0 ? "next" : vencida ? "off" : undefined}>
                    {pendiente === 0 ? "Pagada" : vencida ? "Vencida" : q.pagado > 0 ? "Parcial" : "Pendiente"}
                  </span>
                </li>
              );
            })}
        </ul>
      </div>

      {datos.pagos.length > 0 && (
        <div className="cuenta__bloque">
          <h3>Mis pagos</h3>
          <ul className="ledger">
            {datos.pagos.slice(0, 12).map((p) => (
              <li key={p.id}>
                <span className="ledger__main">
                  <strong>{fechaCorta(p.fecha)}</strong>
                  <small>
                    {MEDIOS[p.medio] ?? p.medio}
                    {p.estado === "rechazado" && p.motivo && ` · ${p.motivo}`}
                  </small>
                </span>
                <span className="ledger__amount">{dinero(p.monto)}</span>
                <span className="pill" data-state={p.estado === "confirmado" ? "next" : p.estado === "informado" ? "warn" : "off"}>
                  {p.estado === "confirmado" ? "Confirmado" : p.estado === "informado" ? "En revisión" : "Rechazado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
