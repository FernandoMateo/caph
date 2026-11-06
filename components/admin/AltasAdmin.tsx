"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coincide } from "../../lib/buscar";
import { useRubros } from "../../lib/rubros-client";
import { errorMessage, pb } from "../../lib/pb-client";
import { fechaCorta } from "./cuentas";
import { Empty, Loading, PageHead, useToast } from "./ui";

type Rol = "asociado" | "proveedor" | "profesional";

type Cuenta = {
  id: string;
  name: string;
  email: string;
  rol: Rol;
  estado: string;
  telefono: string;
  documento: string;
  referencia: string;
  created: string;
};

type Ficha = {
  id: string;
  collectionId: string;
  collectionName: "profesionales" | "proveedores";
  nombre: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  cuenta: string;
  revisar: boolean;
  motivo: string;
  telefono: string;
  email: string;
  direccion: string;
  web: string;
  descripcion: string;
  // profesionales
  rol?: "asociado" | "profesional";
  titulo?: string;
  matricula?: string;
  estudio?: string;
  localidad?: string;
  numero?: string;
  foto?: string;
  // proveedores
  razon_social?: string;
  rubro?: string;
  logo?: string;
  updated: string;
};

type Opcion = { id: string; nombre: string; numero?: string };

const ROL: Record<Rol, string> = { asociado: "Asociado", proveedor: "Proveedor", profesional: "Profesional" };
const coleccion = (rol: Rol) => (rol === "proveedor" ? "proveedores" : "profesionales");

function Datos({ filas }: { filas: [string, string | undefined][] }) {
  const visibles = filas.filter(([, v]) => v);
  if (!visibles.length) return null;
  return (
    <dl className="solicitud__datos">
      {visibles.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function FichaVista({ f }: { f: Ficha }) {
  const RUBROS = useRubros();
  const img = f.foto || f.logo;
  return (
    <div className="solicitud__ficha">
      <span className={`logo-preview${f.foto !== undefined ? " logo-preview--round" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={pb().files.getURL(f, img, { thumb: f.foto ? "400x400f" : "160x160f" })} alt="" /> : "—"}
      </span>
      <Datos
        filas={[
          ["Nombre", f.nombre],
          ["Razón social", f.razon_social],
          ["Rubro", f.rubro ? RUBROS[f.rubro] ?? f.rubro : undefined],
          ["Profesión", f.titulo],
          ["Matrícula", f.matricula],
          ["Estudio", f.estudio],
          ["Localidad", f.localidad],
          ["Dirección", f.direccion],
          ["Teléfono", f.telefono],
          ["Email", f.email],
          ["Web", f.web],
          [f.collectionName === "proveedores" ? "Servicios" : "Descripción", f.descripcion],
        ]}
      />
    </div>
  );
}

function Solicitud({
  cuenta,
  ficha,
  libres,
  onListo,
}: {
  cuenta?: Cuenta;
  ficha?: Ficha;
  libres: Opcion[];
  onListo: (texto: string) => void;
}) {
  const toast = useToast();
  const rol: Rol = cuenta?.rol ?? (ficha?.collectionName === "proveedores" ? "proveedor" : ficha?.rol ?? "asociado");
  const [numero, setNumero] = useState(ficha?.numero ?? "");
  const [buscar, setBuscar] = useState(cuenta?.referencia ?? "");
  const [vincular, setVincular] = useState("");
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nombre = ficha?.nombre || cuenta?.name || "Sin nombre";
  const persona = rol !== "proveedor";

  const opciones = useMemo(
    () => libres.filter((o) => coincide(buscar, [o.nombre, o.numero ?? ""], [])).slice(0, 50),
    [libres, buscar]
  );

  const correr = async (accion: () => Promise<void>, texto: string) => {
    setBusy(true);
    try {
      await accion();
      onListo(texto);
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const aprobar = () =>
    correr(async () => {
      if (ficha) {
        const cambios: Record<string, unknown> = { estado: "aprobado", activo: true, revisar: false, motivo: "" };
        if (persona) cambios.numero = numero.trim();
        await pb().collection(ficha.collectionName).update(ficha.id, cambios);
      } else if (cuenta) {
        if (!vincular) throw new Error("Elegí la ficha que corresponde a esta cuenta.");
        await pb().collection(coleccion(rol)).update(vincular, { cuenta: cuenta.id });
      }
      // la cuenta puede venir sola (pendiente) o solo como dueña de la ficha (si ya estaba activa no se toca)
      if (cuenta && cuenta.estado !== "activa") await pb().collection("cuentas").update(cuenta.id, { estado: "activa", motivo: "" });
      else if (!cuenta && ficha?.cuenta) await pb().collection("cuentas").update(ficha.cuenta, { estado: "activa", motivo: "" });
    }, `${nombre} aprobado.${ficha ? " Ya se ve en la web." : ""}`);

  const rechazar = (motivo: string) =>
    correr(async () => {
      if (ficha) await pb().collection(ficha.collectionName).update(ficha.id, { estado: "rechazado", motivo });
      const cuentaId = cuenta?.id ?? ficha?.cuenta;
      if (cuentaId) await pb().collection("cuentas").update(cuentaId, { estado: "rechazada", motivo });
    }, `${nombre} rechazado.`);

  return (
    <article className="solicitud">
      <header className="solicitud__head">
        <span className="pill pill--accent">{ROL[rol]}</span>
        <h2>{nombre}</h2>
        {ficha?.estado === "rechazado" && <span className="pill" data-state="off">Rechazada</span>}
        {cuenta && <span className="solicitud__fecha">Pedida el {fechaCorta(cuenta.created)}</span>}
        {!cuenta && ficha && !ficha.cuenta && <span className="solicitud__fecha">Borrador del panel</span>}
      </header>

      {cuenta && (
        <div className="solicitud__bloque">
          <h3>Cuenta (privado)</h3>
          <Datos
            filas={[
              ["Responsable", cuenta.name],
              ["Email", cuenta.email],
              ["Teléfono", cuenta.telefono],
              [persona ? "DNI o CUIT" : "CUIT", cuenta.documento],
            ]}
          />
        </div>
      )}

      {ficha ? (
        <div className="solicitud__bloque">
          <h3>Ficha pública</h3>
          <FichaVista f={ficha} />
          {ficha.motivo && <p className="section-hint">Motivo del rechazo anterior: {ficha.motivo}</p>}
        </div>
      ) : (
        cuenta && (
          <div className="solicitud__bloque">
            <h3>Dice que ya figura en la web</h3>
            <p className="section-hint">“{cuenta.referencia || "sin referencia"}”. Elegí su ficha para vincularla a esta cuenta.</p>
            <div className="solicitud__vincular">
              <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o N.º" aria-label="Buscar ficha" />
              <select value={vincular} onChange={(e) => setVincular(e.target.value)} aria-label="Ficha a vincular">
                <option value="">{opciones.length ? "Elegí una ficha" : "Ninguna ficha libre coincide"}</option>
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                    {o.numero ? ` · N.º ${o.numero}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )
      )}

      {rechazo !== null ? (
        <form
          className="solicitud__rechazo"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rechazo.trim()) return toast("error", "Escribí el motivo: lo ve la persona en su portal.");
            rechazar(rechazo.trim());
          }}
        >
          <label className="field">
            <span className="field__label">Motivo del rechazo</span>
            <textarea rows={2} maxLength={500} value={rechazo} onChange={(e) => setRechazo(e.target.value)} autoFocus />
            <span className="field__hint">Lo ve la persona en su portal; puede corregir y volver a enviar.</span>
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setRechazo(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--danger btn--sm" disabled={busy}>
              Rechazar
            </button>
          </div>
        </form>
      ) : (
        <footer className="solicitud__acciones">
          {ficha && persona && (
            <label className="solicitud__numero">
              <span>N.º de {rol === "asociado" ? "asociado" : "registro"}</span>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Opcional" />
            </label>
          )}
          <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setRechazo("")} disabled={busy}>
            Rechazar
          </button>
          <button type="button" className="btn btn--navy btn--sm" onClick={aprobar} disabled={busy}>
            {busy ? "Guardando…" : ficha ? "Aprobar y publicar" : "Aprobar y vincular"}
          </button>
        </footer>
      )}
    </article>
  );
}

function Revision({ ficha, onListo }: { ficha: Ficha; onListo: (texto: string) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const cambiar = async (cambios: Record<string, unknown>, texto: string) => {
    setBusy(true);
    try {
      await pb().collection(ficha.collectionName).update(ficha.id, cambios);
      onListo(texto);
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="solicitud">
      <header className="solicitud__head">
        <span className="pill pill--accent">{ficha.collectionName === "proveedores" ? "Proveedor" : ROL[ficha.rol ?? "asociado"]}</span>
        <h2>{ficha.nombre}</h2>
        <span className="solicitud__fecha">Cambiada el {fechaCorta(ficha.updated)}</span>
      </header>
      <FichaVista f={ficha} />
      <footer className="solicitud__acciones">
        <a className="btn btn--ghost-dark btn--sm" href={`/admin/${ficha.collectionName}`}>
          Editar
        </a>
        <button type="button" className="btn btn--ghost-dark btn--sm" disabled={busy} onClick={() => cambiar({ activo: false, revisar: false }, `${ficha.nombre} quedó oculto en la web.`)}>
          Ocultar
        </button>
        <button type="button" className="btn btn--navy btn--sm" disabled={busy} onClick={() => cambiar({ revisar: false }, `Cambios de ${ficha.nombre} revisados.`)}>
          Está bien
        </button>
      </footer>
    </article>
  );
}

export function AltasAdmin() {
  const toast = useToast();
  const [datos, setDatos] = useState<{ cuentas: Cuenta[]; fichas: Ficha[]; libres: Record<string, Opcion[]> } | null>(null);

  const load = useCallback(async () => {
    try {
      const filtro = "estado != 'aprobado' || revisar = true";
      const [cuentas, profesionales, proveedores, profLibres, provLibres] = await Promise.all([
        pb().collection("cuentas").getFullList<Cuenta>({ filter: "estado = 'pendiente'", sort: "created" }),
        pb().collection("profesionales").getFullList<Ficha>({ filter: filtro, sort: "updated" }),
        pb().collection("proveedores").getFullList<Ficha>({ filter: filtro, sort: "updated" }),
        pb().collection("profesionales").getFullList<Opcion>({ filter: "cuenta = ''", sort: "nombre", fields: "id,nombre,numero" }),
        pb().collection("proveedores").getFullList<Opcion>({ filter: "cuenta = ''", sort: "nombre", fields: "id,nombre" }),
      ]);
      setDatos({ cuentas, fichas: [...profesionales, ...proveedores], libres: { profesionales: profLibres, proveedores: provLibres } });
    } catch (err) {
      toast("error", errorMessage(err));
      setDatos({ cuentas: [], fichas: [], libres: {} });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const listo = (texto: string) => {
    toast("ok", texto);
    load();
  };

  if (!datos) return <Loading />;

  // cada cuenta pendiente con su ficha; después, las fichas pendientes o rechazadas de cuentas ya activas y los borradores del panel
  const porCuenta = new Map(datos.fichas.filter((f) => f.cuenta).map((f) => [f.cuenta, f]));
  const usadas = new Set<string>();
  const solicitudes: { cuenta?: Cuenta; ficha?: Ficha }[] = datos.cuentas.map((c) => {
    const ficha = porCuenta.get(c.id);
    if (ficha) usadas.add(ficha.id);
    return { cuenta: c, ficha: ficha && ficha.estado !== "aprobado" ? ficha : undefined };
  });
  for (const f of datos.fichas) if (!usadas.has(f.id) && f.estado !== "aprobado") solicitudes.push({ ficha: f });
  const revisar = datos.fichas.filter((f) => f.estado === "aprobado" && f.revisar);

  return (
    <>
      <PageHead
        title="Altas"
        text="Solicitudes de asociados, proveedores y profesionales. Nada se publica en la web hasta que lo aprobás acá."
      />

      <section className="admin-section">
        <h2>Solicitudes pendientes ({solicitudes.length})</h2>
        {solicitudes.length === 0 ? (
          <Empty text="No hay solicitudes pendientes." />
        ) : (
          <div className="solicitudes">
            {solicitudes.map((s) => (
              <Solicitud
                key={s.cuenta?.id ?? s.ficha!.id}
                cuenta={s.cuenta}
                ficha={s.ficha}
                libres={datos.libres[coleccion(s.cuenta?.rol ?? "asociado")] ?? []}
                onListo={listo}
              />
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Cambios para revisar ({revisar.length})</h2>
        <p className="section-hint">Fichas ya publicadas que su dueño modificó. Siguen visibles; revisá que esté todo bien.</p>
        {revisar.length === 0 ? (
          <Empty text="No hay cambios para revisar." />
        ) : (
          <div className="solicitudes">
            {revisar.map((f) => (
              <Revision key={f.id} ficha={f} onListo={listo} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
