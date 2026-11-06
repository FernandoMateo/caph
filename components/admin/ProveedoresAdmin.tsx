"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coincide } from "../../lib/buscar";
import { useRubros } from "../../lib/rubros-client";
import { errorMessage, fileUrl, pb } from "../../lib/pb-client";
import { descargarExcel } from "../../lib/excel";
import { Icon } from "../Icon";
import { CamposCuota, cuotaVacia, payloadCuota, validarCuota } from "./ContabilidadAdmin";
import type { Tarifa } from "./cuentas";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Proveedor = {
  id: string;
  collectionId: string;
  nombre: string;
  razon_social: string;
  rubro: string;
  telefono: string;
  email: string;
  direccion: string;
  web: string;
  descripcion: string;
  verificado: boolean;
  activo: boolean;
  oculto_mora?: boolean;
  logo?: string;
  estado?: "pendiente" | "aprobado" | "rechazado";
};

const BLANK: Omit<Proveedor, "id" | "collectionId"> = {
  nombre: "",
  razon_social: "",
  rubro: "otros",
  telefono: "",
  email: "",
  direccion: "",
  web: "",
  descripcion: "",
  verificado: true,
  activo: true,
};

function Form({ initial, onSaved, onCancel }: { initial: Partial<Proveedor>; onSaved: (p: Proveedor) => void; onCancel: () => void }) {
  const toast = useToast();
  const RUBROS = useRubros();
  const [data, setData] = useState({ ...BLANK, ...initial });
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [quitarLogo, setQuitarLogo] = useState(false);
  const [cuota, setCuota] = useState(() => cuotaVacia());
  // un proveedor nuevo arranca con la tarifa vigente
  useEffect(() => {
    if (initial.id) return;
    pb()
      .collection("tarifas")
      .getFirstListItem<Tarifa>("rol = 'proveedor'")
      .then((t) => setCuota(cuotaVacia(t)))
      .catch(() => {});
  }, [initial.id]);
  const preview = logo ? URL.createObjectURL(logo) : !quitarLogo && initial.logo ? fileUrl(initial as Proveedor, initial.logo) : "";
  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!data.nombre.trim()) return toast("error", "Completá el nombre de fantasía.");
        const errCuota = initial.id ? null : validarCuota(cuota);
        if (errCuota) return toast("error", errCuota);
        let web = data.web.trim();
        if (web && !/^https?:\/\//i.test(web)) web = `https://${web}`;
        const payload: Record<string, unknown> = {
          nombre: data.nombre.trim(),
          razon_social: data.razon_social.trim(),
          rubro: data.rubro,
          telefono: data.telefono.trim(),
          email: data.email.trim(),
          direccion: data.direccion.trim(),
          web,
          descripcion: data.descripcion.trim(),
          verificado: data.verificado,
          activo: data.activo,
        };
        if (logo) payload.logo = logo;
        else if (quitarLogo) payload.logo = null;
        setBusy(true);
        try {
          const saved = initial.id
            ? await pb().collection("proveedores").update<Proveedor>(initial.id, payload)
            : await pb().collection("proveedores").create<Proveedor>(payload);
          if (!initial.id) {
            try {
              await pb().collection("suscripciones").create(payloadCuota("proveedor", saved.id, cuota));
            } catch (err) {
              toast("error", `${saved.nombre} se creó, pero no se pudo dar de alta la cuota (${errorMessage(err)}). Hacelo desde Contabilidad.`);
              onSaved(saved);
              return;
            }
          }
          toast("ok", `${saved.nombre} guardado.${saved.activo ? " Ya se ve en la web." : " Está oculto en la web."}`);
          onSaved(saved);
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Nombre de fantasía" hint="El que se muestra en la web.">
        <input value={data.nombre} onChange={(e) => set("nombre", e.target.value)} required autoFocus />
      </Field>
      <Field label="Razón social" hint="Nombre legal de la empresa.">
        <input value={data.razon_social} onChange={(e) => set("razon_social", e.target.value)} />
      </Field>
      <div className="field" data-wide>
        <span className="field__label">Logo</span>
        <div className="logo-field">
          <span className="logo-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="" /> : data.nombre.slice(0, 2).toUpperCase() || "—"}
          </span>
          <div className="logo-field__controls">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                setLogo(e.target.files?.[0] ?? null);
                setQuitarLogo(false);
              }}
            />
            <span className="field__hint">Obligatorio para publicar. PNG, JPG, WebP o SVG, hasta 3 MB. Ideal: cuadrado con fondo claro.</span>
            {initial.logo && !logo && (
              <label className="check">
                <input type="checkbox" checked={quitarLogo} onChange={(e) => setQuitarLogo(e.target.checked)} /> Quitar logo
              </label>
            )}
          </div>
        </div>
      </div>
      <Field label="Rubro">
        <select value={data.rubro} onChange={(e) => set("rubro", e.target.value)}>
          {Object.entries(RUBROS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Teléfono" hint="Con código de área. Ej.: 342 453-1968">
        <input type="tel" value={data.telefono} onChange={(e) => set("telefono", e.target.value)} />
      </Field>
      <Field label="Email">
        <input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Dirección" wide>
        <input value={data.direccion} onChange={(e) => set("direccion", e.target.value)} />
      </Field>
      <Field label="Web o red social" hint="Opcional." wide>
        <input value={data.web} onChange={(e) => set("web", e.target.value)} placeholder="https://instagram.com/…" />
      </Field>
      <Field label="Servicios" hint="Se muestra en el directorio y el buscador de la web la usa. Ej.: cámaras, control de acceso, alarmas." wide>
        <textarea rows={2} maxLength={400} value={data.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      </Field>
      <div className="field" data-wide>
        <Toggle checked={data.verificado} onChange={(v) => set("verificado", v)} label="Asociado verificado por la Cámara" />
        <Toggle checked={data.activo} onChange={(v) => set("activo", v)} label="Visible en la web" />
        {initial.estado && initial.estado !== "aprobado" && (
          <span className="field__hint">
            Su alta está {initial.estado === "pendiente" ? "pendiente" : "rechazada"}: se aprueba desde <a href="/admin/altas">Altas</a>.
          </span>
        )}
        {initial.oculto_mora && <span className="field__hint">Ahora está oculto por mora: vuelve a aparecer cuando se registre su pago en Contabilidad.</span>}
      </div>
      <p className="field__hint" data-wide>
        Para publicar un proveedor nuevo hacen falta logo, razón social, teléfono, email y dirección.
      </p>
      {initial.id ? (
        <p className="section-hint" data-wide>
          La cuota mensual, los pagos y la deuda se manejan en <a href="/admin/contabilidad">Contabilidad</a>.
        </p>
      ) : (
        <>
          <h3 className="form-subtitle" data-wide>
            Cuota mensual
          </h3>
          <CamposCuota value={cuota} onChange={setCuota} />
        </>
      )}
      <div className="form-actions" data-wide>
        <button type="button" className="btn btn--ghost-dark" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear proveedor"}
        </button>
      </div>
    </form>
  );
}

export function ProveedoresAdmin() {
  const toast = useToast();
  const RUBROS = useRubros();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Proveedor[] | null>(null);
  const [q, setQ] = useState("");
  const [rubro, setRubro] = useState("todos");
  const [editing, setEditing] = useState<Partial<Proveedor> | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await pb().collection("proveedores").getFullList<Proveedor>({ sort: "nombre" }));
    } catch (err) {
      toast("error", errorMessage(err));
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    return (items ?? []).filter(
      (p) => (rubro === "todos" || p.rubro === rubro) && coincide(q, [p.nombre, p.razon_social, RUBROS[p.rubro], p.descripcion, p.web, p.email, p.direccion], [p.telefono])
    );
  }, [items, q, rubro]);

  const patch = async (p: Proveedor, change: Partial<Proveedor>) => {
    setItems((xs) => xs!.map((x) => (x.id === p.id ? { ...x, ...change } : x)));
    try {
      await pb().collection("proveedores").update(p.id, change);
    } catch (err) {
      setItems((xs) => xs!.map((x) => (x.id === p.id ? p : x)));
      toast("error", errorMessage(err));
    }
  };

  const upsert = (saved: Proveedor) => {
    setItems((xs) => {
      const exists = xs!.some((x) => x.id === saved.id);
      const next = exists ? xs!.map((x) => (x.id === saved.id ? saved : x)) : [...xs!, saved];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    });
    setEditing(null);
  };

  return (
    <>
      <PageHead title="Proveedores" text="El directorio “Empresas en las que confiamos”. Los ocultos no se muestran en la web.">
        <button type="button" className="btn btn--navy" onClick={() => setEditing({})}>
          + Nuevo proveedor
        </button>
      </PageHead>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar por nombre, servicio o teléfono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar proveedor" />
        </div>
        <select value={rubro} onChange={(e) => setRubro(e.target.value)} aria-label="Filtrar por rubro">
          <option value="todos">Todos los rubros</option>
          {Object.entries(RUBROS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {items && (
          <span className="toolbar__count">
            {list.length} de {items.length}
          </span>
        )}
        {list.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost-dark btn--sm"
            title="Baja a Excel los proveedores que se ven con el filtro actual"
            onClick={() =>
              descargarExcel(`proveedores-${new Date().toISOString().slice(0, 10)}`, [
                {
                  nombre: "Proveedores",
                  columnas: [
                    { clave: "nombre", titulo: "Nombre de fantasía", ancho: 32 },
                    { clave: "razon_social", titulo: "Razón social", ancho: 28 },
                    { clave: "rubro", titulo: "Rubro", ancho: 24 },
                    { clave: "telefono", titulo: "Teléfono", ancho: 16 },
                    { clave: "email", titulo: "Email", ancho: 28 },
                    { clave: "direccion", titulo: "Dirección", ancho: 28 },
                    { clave: "web", titulo: "Web o red social", ancho: 36 },
                    { clave: "descripcion", titulo: "Servicios", ancho: 48 },
                    { clave: "verificado", titulo: "Verificado" },
                    { clave: "activo", titulo: "Visible" },
                    { clave: "estado", titulo: "Estado" },
                  ],
                  filas: list.map((p) => ({ ...p, rubro: RUBROS[p.rubro] ?? p.rubro, verificado: p.verificado ? "Sí" : "No", activo: p.activo ? "Sí" : "No" })),
                },
              ]).catch((err) => toast("error", errorMessage(err)))
            }
          >
            <Icon name="download" size={16} /> Exportar
          </button>
        )}
      </div>

      {!items ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty text={items.length ? "Ningún proveedor coincide con la búsqueda." : "Todavía no hay proveedores cargados."}>
          <button type="button" className="btn btn--navy btn--sm" onClick={() => setEditing({})}>
            + Nuevo proveedor
          </button>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">Rubro</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Verificado</th>
                <th scope="col">Visible</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} data-muted={!p.activo || undefined}>
                  <th scope="row">
                    <span className="row-logo" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.logo ? <img src={pb().files.getURL(p, p.logo, { thumb: "160x160f" })} alt="" loading="lazy" /> : p.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <button type="button" className="link-btn" onClick={() => setEditing(p)}>
                      {p.nombre}
                    </button>
                    {/^https?:\/\//i.test(p.web) && (
                      <a href={p.web} target="_blank" rel="noopener noreferrer" className="row-link" aria-label={`Sitio de ${p.nombre}`}>
                        <Icon name="link" size={14} />
                      </a>
                    )}
                  </th>
                  <td data-label="Rubro">{RUBROS[p.rubro] ?? p.rubro}</td>
                  <td data-label="Teléfono" className="num-cell">
                    {p.telefono || "—"}
                  </td>
                  <td data-label="Verificado">
                    <input
                      type="checkbox"
                      role="switch"
                      className="mini-switch"
                      checked={p.verificado}
                      onChange={(e) => patch(p, { verificado: e.target.checked })}
                      aria-label={`${p.nombre} verificado`}
                    />
                  </td>
                  <td data-label="Visible">
                    {p.estado && p.estado !== "aprobado" && (
                      <span className="pill" data-state={p.estado === "pendiente" ? "warn" : "off"} title="Se aprueba desde Altas">
                        {p.estado === "pendiente" ? "Pendiente" : "Rechazado"}
                      </span>
                    )}{" "}
                    {p.oculto_mora && (
                      <span className="pill" data-state="off" title="Oculto por mora: ver Contabilidad">
                        Mora
                      </span>
                    )}{" "}
                    <input
                      type="checkbox"
                      role="switch"
                      className="mini-switch"
                      checked={p.activo}
                      onChange={(e) => patch(p, { activo: e.target.checked })}
                      aria-label={`${p.nombre} visible en la web`}
                    />
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setEditing(p)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label={`Eliminar ${p.nombre}`}
                      onClick={async () => {
                        if (!(await confirm(`¿Eliminar a ${p.nombre} del directorio? Si solo querés ocultarlo, desactivá “Visible”.`))) return;
                        try {
                          await pb().collection("proveedores").delete(p.id);
                          setItems((xs) => xs!.filter((x) => x.id !== p.id));
                          toast("ok", `${p.nombre} eliminado.`);
                        } catch (err) {
                          toast("error", errorMessage(err));
                        }
                      }}
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!editing} title={editing?.id ? `Editar ${editing.nombre}` : "Nuevo proveedor"} onClose={() => setEditing(null)}>
        {editing && <Form key={editing.id ?? "nuevo"} initial={editing} onSaved={upsert} onCancel={() => setEditing(null)} />}
      </Drawer>
      {dialog}
    </>
  );
}
