"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, pb } from "../../lib/pb-client";
import { SECCIONES, type Seccion, type UsuarioPanel } from "../../lib/permisos";
import { Icon } from "../Icon";
import { claveProvisoria } from "./AccesoPortal";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

// Equipo del panel: un administrador da de alta a quienes ayudan y elige qué secciones pueden tocar.
// El servidor hace cumplir los permisos (pb_migrations/1761401320_caph_equipo.js): esto solo los edita.

type Usuario = UsuarioPanel & { created?: string };
type Clave = { nombre: string; email: string; clave: string };

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function resumen(u: Usuario) {
  if (u.admin) return "Todo el panel";
  const n = u.permisos?.length ?? 0;
  if (!n) return "Sin secciones";
  return SECCIONES.filter((s) => u.permisos!.includes(s.id))
    .map((s) => s.nombre)
    .join(", ");
}

function mensaje(c: Clave) {
  const panel = `${window.location.origin}/admin`;
  return (
    `Hola ${c.nombre.split(/\s+/)[0]}! Ya tenés acceso al panel de la Cámara de la Propiedad Horizontal de Santa Fe.\n\n` +
    `Ingresá en ${panel}\nEmail: ${c.email}\nContraseña: ${c.clave}\n\n` +
    `Es una contraseña provisoria: pedí que te la cambien o cambiala vos apenas entres.`
  );
}

function ClaveNueva({ c }: { c: Clave }) {
  const toast = useToast();
  return (
    <div className="acceso__credencial" role="status">
      <p className="acceso__ok">
        <Icon name="check" size={18} /> Pasale estos datos: la contraseña no se vuelve a mostrar.
      </p>
      <dl>
        <dt>Panel</dt>
        <dd>{`${window.location.origin}/admin`}</dd>
        <dt>Email</dt>
        <dd>{c.email}</dd>
        <dt>Contraseña</dt>
        <dd className="acceso__clave">{c.clave}</dd>
      </dl>
      <div className="acceso__acciones">
        <a
          className="btn btn--ghost-dark btn--sm"
          href={`mailto:${c.email}?subject=${encodeURIComponent("Tu acceso al panel de la Cámara")}&body=${encodeURIComponent(mensaje(c))}`}
        >
          <Icon name="mail" size={16} /> Enviar por email
        </a>
        <button
          type="button"
          className="btn btn--ghost-dark btn--sm"
          onClick={() =>
            navigator.clipboard
              .writeText(mensaje(c))
              .then(() => toast("ok", "Mensaje copiado."))
              .catch(() => toast("error", "No se pudo copiar."))
          }
        >
          Copiar mensaje
        </button>
      </div>
    </div>
  );
}

function Form({ initial, yo, onSaved }: { initial: Partial<Usuario>; yo: boolean; onSaved: (u: Usuario, clave?: Clave) => void }) {
  const toast = useToast();
  const [name, setName] = useState(initial.name ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [admin, setAdmin] = useState(!!initial.admin);
  const [permisos, setPermisos] = useState<Seccion[]>(initial.permisos ?? []);
  const [busy, setBusy] = useState(false);
  const alternar = (s: Seccion) => setPermisos((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const mail = email.trim().toLowerCase();
        if (!name.trim()) return toast("error", "Completá el nombre.");
        if (!emailOk(mail)) return toast("error", "El email no es válido.");
        if (!yo && !admin && !permisos.length) return toast("error", "Elegí al menos una sección, o hacelo administrador.");
        const payload: Record<string, unknown> = { name: name.trim(), email: mail };
        // nadie se cambia sus propios permisos (el servidor tampoco lo deja)
        if (!yo) Object.assign(payload, { admin, permisos: admin ? [] : permisos });
        setBusy(true);
        try {
          if (initial.id) {
            onSaved(await pb().collection("users").update<Usuario>(initial.id, payload));
          } else {
            const clave = claveProvisoria(12);
            const u = await pb()
              .collection("users")
              .create<Usuario>({ ...payload, emailVisibility: true, verified: true, password: clave, passwordConfirm: clave });
            onSaved(u, { nombre: u.name || u.email, email: u.email, clave });
          }
        } catch (err) {
          const msg = errorMessage(err);
          toast("error", /unique|already|existe/i.test(msg) ? "Ya hay un usuario del panel con ese email." : msg);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Nombre y apellido">
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
      <Field label="Email" hint="Con este email entra al panel.">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <h3 className="form-subtitle" data-wide>
        Permisos
      </h3>
      {yo ? (
        <p className="section-hint" data-wide>
          Tus propios permisos los cambia otro administrador.
        </p>
      ) : (
        <>
          <div data-wide>
            <Toggle checked={admin} onChange={setAdmin} label="Administrador: todo el panel, incluidos el equipo y la importación de datos" />
          </div>
          <fieldset className="permisos" data-wide disabled={admin}>
            <legend className="sr-only">Secciones que puede usar</legend>
            {SECCIONES.map((s) => (
              <label key={s.id} className="permisos__item" data-on={admin || permisos.includes(s.id) || undefined}>
                <input type="checkbox" checked={admin || permisos.includes(s.id)} onChange={() => alternar(s.id)} />
                <span>
                  <strong>{s.nombre}</strong>
                  <small>{s.detalle}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      <div className="form-actions" data-wide>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}

export function EquipoAdmin() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Usuario[] | null>(null);
  const [editing, setEditing] = useState<Partial<Usuario> | null>(null);
  const [clave, setClave] = useState<Clave | null>(null);
  const [busy, setBusy] = useState(false);
  const yo = pb().authStore.record?.id;

  const load = useCallback(async () => {
    try {
      setItems(await pb().collection("users").getFullList<Usuario>({ sort: "-admin,name" }));
    } catch (err) {
      toast("error", errorMessage(err));
      setItems([]);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const abrir = (u: Partial<Usuario>) => {
    setClave(null);
    setEditing(u);
  };

  return (
    <>
      <PageHead
        title="Equipo y permisos"
        text="Las personas que ayudan con el panel. Cada una entra con su email y solo ve las secciones que le habilitás; los administradores ven todo."
      >
        <button type="button" className="btn btn--navy" onClick={() => abrir({})}>
          + Nuevo usuario
        </button>
      </PageHead>

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="Todavía no hay usuarios del panel." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Acceso</th>
                <th scope="col">Puede usar</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <th scope="row">
                    <span className="row-logo row-logo--round" aria-hidden="true">
                      {(u.name || u.email).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="row-text">
                      <button type="button" className="link-btn" onClick={() => abrir(u)} title={u.name || u.email}>
                        {u.name || u.email}
                        {u.id === yo && " (vos)"}
                      </button>
                      <small title={u.email}>{u.email}</small>
                    </span>
                  </th>
                  <td data-label="Acceso">
                    <span className="pill" data-state={u.admin ? "next" : u.permisos?.length ? "warn" : "off"}>
                      {u.admin ? "Administrador" : u.permisos?.length ? `${u.permisos.length} ${u.permisos.length === 1 ? "sección" : "secciones"}` : "Sin acceso"}
                    </span>
                  </td>
                  <td data-label="Puede usar" className="ellipsis-cell" title={resumen(u)}>
                    {resumen(u)}
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="icon-btn" onClick={() => abrir(u)} aria-label={`Editar ${u.name || u.email}`} title="Editar">
                      <Icon name="pencil" size={18} />
                    </button>
                    {u.id !== yo && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        aria-label={`Quitar a ${u.name || u.email}`}
                        title="Quitar del equipo"
                        onClick={async () => {
                          if (!(await confirm(`¿Quitar a ${u.name || u.email} del equipo? No va a poder entrar más al panel.`, "Quitar"))) return;
                          try {
                            await pb().collection("users").delete(u.id);
                            setItems((xs) => xs!.filter((x) => x.id !== u.id));
                            toast("ok", `${u.name || u.email} ya no tiene acceso al panel.`);
                          } catch (err) {
                            toast("error", errorMessage(err));
                          }
                        }}
                      >
                        <Icon name="x" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!editing} title={editing?.id ? `Editar ${editing.name || editing.email}` : "Nuevo usuario del panel"} onClose={() => setEditing(null)}>
        {clave ? (
          <ClaveNueva c={clave} />
        ) : (
          editing && (
            <Form
              key={editing.id ?? "nuevo"}
              initial={editing}
              yo={editing.id === yo}
              onSaved={(u, c) => {
                setItems((xs) => (xs ? (xs.some((x) => x.id === u.id) ? xs.map((x) => (x.id === u.id ? u : x)) : [...xs, u]) : [u]));
                toast("ok", `${u.name || u.email} guardado.`);
                if (c) {
                  setEditing(u);
                  setClave(c);
                } else setEditing(null);
              }}
            />
          )
        )}
        {editing?.id && !clave && editing.id !== yo && (
          <section className="acceso">
            <h3 className="form-subtitle">Contraseña</h3>
            <p className="section-hint">Si se la olvidó, generale una provisoria y pasásela.</p>
            <button
              type="button"
              className="btn btn--ghost-dark btn--sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const nueva = claveProvisoria(12);
                  const u = await pb().collection("users").update<Usuario>(editing.id!, { password: nueva, passwordConfirm: nueva });
                  setClave({ nombre: u.name || u.email, email: u.email, clave: nueva });
                } catch (err) {
                  toast("error", errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Generando…" : "Generar contraseña nueva"}
            </button>
          </section>
        )}
      </Drawer>
      {dialog}
    </>
  );
}
