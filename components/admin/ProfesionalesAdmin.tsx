"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coincide } from "../../lib/buscar";
import { errorMessage, fileUrl, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Profesional = {
  id: string;
  collectionId: string;
  nombre: string;
  estudio: string;
  numero: string;
  titulo: string;
  localidad: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  descripcion: string;
  desde: number | null;
  foto?: string;
  verificado: boolean;
  activo: boolean;
};

type Datos = Omit<Profesional, "id" | "collectionId" | "foto" | "desde"> & { desde: string };

const BLANK: Datos = {
  nombre: "",
  estudio: "",
  numero: "",
  titulo: "Administrador de consorcios",
  localidad: "Santa Fe",
  direccion: "",
  telefono: "",
  email: "",
  web: "",
  descripcion: "",
  desde: "",
  verificado: true,
  activo: true,
};

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "—";

function Form({ initial, onSaved, onCancel }: { initial: Partial<Profesional>; onSaved: (p: Profesional) => void; onCancel: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<Datos>(() => ({
    ...BLANK,
    ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in BLANK)),
    desde: initial.desde ? String(initial.desde) : "",
  }));
  const [busy, setBusy] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const preview = foto ? URL.createObjectURL(foto) : !quitarFoto && initial.foto ? fileUrl(initial as Profesional, initial.foto) : "";
  const set = <K extends keyof Datos>(k: K, v: Datos[K]) => setData((d) => ({ ...d, [k]: v }));

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!data.nombre.trim()) return toast("error", "Completá el nombre.");
        const desde = data.desde.trim() ? Number(data.desde) : null;
        if (desde !== null && (!Number.isInteger(desde) || desde < 1950 || desde > new Date().getFullYear()))
          return toast("error", "El año de inicio no es válido.");
        let web = data.web.trim();
        if (web && !/^https?:\/\//i.test(web)) web = `https://${web}`;
        const payload: Record<string, unknown> = {
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])),
          web,
          desde,
        };
        if (foto) payload.foto = foto;
        else if (quitarFoto) payload.foto = null;
        setBusy(true);
        try {
          const saved = initial.id
            ? await pb().collection("profesionales").update<Profesional>(initial.id, payload)
            : await pb().collection("profesionales").create<Profesional>(payload);
          toast("ok", `${saved.nombre} guardado.${saved.activo ? " Ya se ve en la web." : " Está oculto en la web."}`);
          onSaved(saved);
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Nombre y apellido" wide>
        <input value={data.nombre} onChange={(e) => set("nombre", e.target.value)} required autoFocus />
      </Field>
      <div className="field" data-wide>
        <span className="field__label">Foto</span>
        <div className="logo-field">
          <span className="logo-preview logo-preview--round">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="" /> : iniciales(data.nombre)}
          </span>
          <div className="logo-field__controls">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setFoto(e.target.files?.[0] ?? null);
                setQuitarFoto(false);
              }}
            />
            <span className="field__hint">Opcional. JPG, PNG o WebP, hasta 5 MB. Ideal: cuadrada, de frente.</span>
            {initial.foto && !foto && (
              <label className="check">
                <input type="checkbox" checked={quitarFoto} onChange={(e) => setQuitarFoto(e.target.checked)} /> Quitar foto
              </label>
            )}
          </div>
        </div>
      </div>
      <Field label="Estudio o razón social" hint="Opcional. Ej.: Estudio Pérez & Asociados">
        <input value={data.estudio} onChange={(e) => set("estudio", e.target.value)} />
      </Field>
      <Field label="N.º de asociado" hint="Ej.: A-001">
        <input value={data.numero} onChange={(e) => set("numero", e.target.value)} />
      </Field>
      <Field label="Título o profesión">
        <input value={data.titulo} onChange={(e) => set("titulo", e.target.value)} />
      </Field>
      <Field label="Ejerce desde (año)" hint="Opcional. Se muestra como años de trayectoria.">
        <input type="number" min={1950} max={new Date().getFullYear()} value={data.desde} onChange={(e) => set("desde", e.target.value)} />
      </Field>
      <Field label="Teléfono / WhatsApp" hint="Con código de área. Ej.: 342 612-3450">
        <input type="tel" value={data.telefono} onChange={(e) => set("telefono", e.target.value)} />
      </Field>
      <Field label="Email">
        <input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Localidad">
        <input value={data.localidad} onChange={(e) => set("localidad", e.target.value)} />
      </Field>
      <Field label="Dirección de la oficina" hint="Opcional. No cargues domicilios particulares.">
        <input value={data.direccion} onChange={(e) => set("direccion", e.target.value)} />
      </Field>
      <Field label="Web o red social" hint="Opcional." wide>
        <input value={data.web} onChange={(e) => set("web", e.target.value)} placeholder="https://…" />
      </Field>
      <Field label="Descripción" hint="Opcional, hasta 400 caracteres. Especialidad, servicios, zona de trabajo." wide>
        <textarea rows={3} maxLength={400} value={data.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      </Field>
      <div className="field" data-wide>
        <Toggle checked={data.verificado} onChange={(v) => set("verificado", v)} label="Asociado verificado por la Cámara" />
        <Toggle checked={data.activo} onChange={(v) => set("activo", v)} label="Visible en la web" />
      </div>
      <div className="form-actions" data-wide>
        <button type="button" className="btn btn--ghost-dark" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear profesional"}
        </button>
      </div>
    </form>
  );
}

export function ProfesionalesAdmin() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Profesional[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Profesional> | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await pb().collection("profesionales").getFullList<Profesional>({ sort: "nombre" }));
    } catch (err) {
      toast("error", errorMessage(err));
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(
    () =>
      (items ?? []).filter((p) =>
        coincide(q, [p.nombre, p.estudio, p.numero, p.titulo, p.localidad, p.direccion, p.email, p.web, p.descripcion], [p.telefono])
      ),
    [items, q]
  );

  const patch = async (p: Profesional, change: Partial<Profesional>) => {
    setItems((xs) => xs!.map((x) => (x.id === p.id ? { ...x, ...change } : x)));
    try {
      await pb().collection("profesionales").update(p.id, change);
    } catch (err) {
      setItems((xs) => xs!.map((x) => (x.id === p.id ? p : x)));
      toast("error", errorMessage(err));
    }
  };

  const upsert = (saved: Profesional) => {
    setItems((xs) => {
      const exists = xs!.some((x) => x.id === saved.id);
      const next = exists ? xs!.map((x) => (x.id === saved.id ? saved : x)) : [...xs!, saved];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    });
    setEditing(null);
  };

  return (
    <>
      <PageHead title="Profesionales" text="Directorio de profesionales asociados. Los visibles aparecen en la web con su tarjeta; la sección se muestra cuando hay al menos uno.">
        <button type="button" className="btn btn--navy" onClick={() => setEditing({})}>
          + Nuevo profesional
        </button>
      </PageHead>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar por nombre, estudio, teléfono, N.º…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar profesional" />
        </div>
        {items && (
          <span className="toolbar__count">
            {list.length} de {items.length}
          </span>
        )}
      </div>

      {!items ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty text={items.length ? "Ningún profesional coincide con la búsqueda." : "Todavía no hay profesionales cargados."}>
          <button type="button" className="btn btn--navy btn--sm" onClick={() => setEditing({})}>
            + Nuevo profesional
          </button>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Profesional</th>
                <th scope="col">N.º</th>
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
                    <span className="row-logo row-logo--round" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.foto ? <img src={pb().files.getURL(p, p.foto, { thumb: "400x400f" })} alt="" loading="lazy" /> : iniciales(p.nombre)}
                    </span>
                    <span className="row-text">
                      <button type="button" className="link-btn" onClick={() => setEditing(p)}>
                        {p.nombre}
                      </button>
                      {(p.estudio || p.titulo) && <small>{p.estudio || p.titulo}</small>}
                    </span>
                  </th>
                  <td data-label="N.º" className="num-cell">
                    {p.numero || "—"}
                  </td>
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
                        if (!(await confirm(`¿Eliminar a ${p.nombre}? Si solo querés que no se vea en la web, desactivá “Visible”.`))) return;
                        try {
                          await pb().collection("profesionales").delete(p.id);
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

      <Drawer open={!!editing} title={editing?.id ? `Editar ${editing.nombre}` : "Nuevo profesional"} onClose={() => setEditing(null)}>
        {editing && <Form key={editing.id ?? "nuevo"} initial={editing} onSaved={upsert} onCancel={() => setEditing(null)} />}
      </Drawer>
      {dialog}
    </>
  );
}
