"use client";

import { useState } from "react";
import { descargarExcel } from "../../lib/excel";
import { errorMessage, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { Field, useToast } from "./ui";

// Acceso al portal para fichas que no se dieron de alta solas (cargadas desde el panel o importadas):
// el panel les crea la cuenta con el email de la ficha y una contraseña provisoria, y se la pasa por
// WhatsApp o email. Si el email ya tiene cuenta libre, la vincula. La persona la cambia desde su portal.

export type Coleccion = "profesionales" | "proveedores";

export type FichaAcceso = {
  id: string;
  nombre: string;
  numero?: string;
  email: string;
  telefono: string;
  rol?: string;
  cuenta?: string;
  expand?: { cuenta?: { id: string; email: string; estado: string } };
};

export type Credencial = { nombre: string; email: string; clave: string; telefono: string; vinculada: boolean };

type Cuenta = { id: string; email: string; rol: string; estado: string };

const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Contraseña provisoria: 10 caracteres sin los que se confunden (0/O, 1/l/I). */
export function claveProvisoria(largo = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

const rolDe = (coleccion: Coleccion, ficha: FichaAcceso) => (coleccion === "proveedores" ? "proveedor" : ficha.rol || "asociado");
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Quién usa ya esta cuenta como acceso (otra ficha), o null. */
async function fichaDeCuenta(cuentaId: string, salvo: string) {
  for (const col of ["profesionales", "proveedores"] as const) {
    const r = await pb().collection(col).getList<{ id: string; nombre: string }>(1, 1, { filter: pb().filter("cuenta = {:c}", { c: cuentaId }) });
    const otra = r.items.find((x) => x.id !== salvo);
    if (otra) return otra.nombre;
  }
  return null;
}

/** Crea (o vincula) la cuenta del portal de una ficha y le pone una contraseña provisoria. */
export async function crearAcceso(coleccion: Coleccion, ficha: FichaAcceso, emailElegido?: string): Promise<Credencial> {
  const email = (emailElegido ?? ficha.email).trim().toLowerCase();
  if (!emailOk(email)) throw new Error("La ficha no tiene un email válido.");
  if (ficha.cuenta) throw new Error("Esta ficha ya tiene acceso al portal.");
  const rol = rolDe(coleccion, ficha);
  const clave = claveProvisoria();

  // PocketBase no deja filtrar por un email oculto, pero el panel sí lo ve al listar: se busca en la lista
  const cuentas = await pb().collection("cuentas").getFullList<Cuenta>({ fields: "id,email,rol,estado" });
  let cuenta = cuentas.find((c) => c.email.toLowerCase() === email) ?? null;

  let vinculada = false;
  if (cuenta) {
    const otra = await fichaDeCuenta(cuenta.id, ficha.id);
    if (otra) throw new Error(`Ese email ya es el acceso de ${otra}.`);
    if ((cuenta.rol === "proveedor") !== (rol === "proveedor")) throw new Error("Ese email ya tiene una cuenta de otro tipo (proveedor / persona).");
    await pb().collection("cuentas").update(cuenta.id, { password: clave, passwordConfirm: clave, estado: "activa", verified: true });
    vinculada = true;
  } else {
    cuenta = await pb().collection("cuentas").create<Cuenta>({
      email,
      emailVisibility: false,
      password: clave,
      passwordConfirm: clave,
      name: ficha.nombre,
      rol,
      estado: "activa",
      telefono: ficha.telefono,
      verified: true,
    });
  }
  await pb().collection(coleccion).update(ficha.id, { cuenta: cuenta.id });
  return { nombre: ficha.nombre, email, clave, telefono: ficha.telefono, vinculada };
}

/** Nueva contraseña provisoria para una ficha que ya tiene acceso. */
export async function nuevaClave(ficha: FichaAcceso): Promise<Credencial> {
  if (!ficha.cuenta) throw new Error("Esta ficha todavía no tiene acceso al portal.");
  const clave = claveProvisoria();
  const c = await pb().collection("cuentas").update<Cuenta>(ficha.cuenta, { password: clave, passwordConfirm: clave });
  return { nombre: ficha.nombre, email: c.email, clave, telefono: ficha.telefono, vinculada: true };
}

function mensaje(c: Credencial) {
  const portal = `${window.location.origin}/portal`;
  return (
    `Hola ${c.nombre.split(/\s+/)[0]}! Ya tenés acceso al portal de la Cámara de la Propiedad Horizontal de Santa Fe: ` +
    `tu carnet digital, tu ficha en la web y tus cuotas.\n\n` +
    `Ingresá en ${portal}\nEmail: ${c.email}\nContraseña: ${c.clave}\n\n` +
    `Es una contraseña provisoria: cambiala desde tu portal, en "Contraseña".`
  );
}

function whatsapp(c: Credencial) {
  let d = c.telefono.replace(/\D/g, "").replace(/^0/, "");
  if (!d) return null;
  if (!d.startsWith("54")) d = `549${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensaje(c))}`;
}

/** Credenciales recién creadas: se muestran una sola vez, con atajos para enviarlas. */
export function Credenciales({ c }: { c: Credencial }) {
  const toast = useToast();
  const wa = whatsapp(c);
  return (
    <div className="acceso__credencial" role="status">
      <p className="acceso__ok">
        <Icon name="check" size={18} /> {c.vinculada ? "Acceso listo con la cuenta que ya existía." : "Acceso creado."} Pasale estos datos: la contraseña no se vuelve a mostrar.
      </p>
      <dl>
        <dt>Portal</dt>
        <dd>{`${window.location.origin}/portal`}</dd>
        <dt>Email</dt>
        <dd>{c.email}</dd>
        <dt>Contraseña</dt>
        <dd className="acceso__clave">{c.clave}</dd>
      </dl>
      <div className="acceso__acciones">
        {wa && (
          <a className="btn btn--navy btn--sm" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="chat" size={16} /> Enviar por WhatsApp
          </a>
        )}
        <a
          className="btn btn--ghost-dark btn--sm"
          href={`mailto:${c.email}?subject=${encodeURIComponent("Tu acceso al portal de la Cámara")}&body=${encodeURIComponent(mensaje(c))}`}
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

/** Sección "Acceso al portal" dentro de la edición de una ficha. */
export function AccesoPortal({ coleccion, ficha, onCambio }: { coleccion: Coleccion; ficha: FichaAcceso; onCambio: (cuenta: string) => void }) {
  const toast = useToast();
  const [email, setEmail] = useState(ficha.email || "");
  const [busy, setBusy] = useState(false);
  const [cred, setCred] = useState<Credencial | null>(null);
  const cuenta = ficha.expand?.cuenta;

  const correr = async (fn: () => Promise<Credencial>) => {
    setBusy(true);
    try {
      const c = await fn();
      setCred(c);
      toast("ok", `Acceso al portal listo para ${c.nombre}.`);
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="acceso" aria-labelledby={`acceso-${ficha.id}`}>
      <h3 id={`acceso-${ficha.id}`} className="form-subtitle">
        Acceso al portal
      </h3>
      {cred ? (
        <Credenciales c={cred} />
      ) : ficha.cuenta ? (
        <>
          <p className="section-hint">
            Entra con <strong>{cuenta?.email ?? "su cuenta"}</strong>
            {cuenta && cuenta.estado !== "activa" && ` (cuenta ${cuenta.estado})`}. Si se olvidó la contraseña, generale una provisoria.
          </p>
          <button type="button" className="btn btn--ghost-dark btn--sm" disabled={busy} onClick={() => correr(() => nuevaClave(ficha))}>
            {busy ? "Generando…" : "Generar contraseña nueva"}
          </button>
        </>
      ) : (
        <div className="form-grid">
          <Field label="Email para entrar" hint="Se crea la cuenta con una contraseña provisoria que le pasás por WhatsApp o email." wide>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="form-actions" data-wide>
            <button
              type="button"
              className="btn btn--navy btn--sm"
              disabled={busy}
              onClick={() =>
                correr(async () => {
                  const c = await crearAcceso(coleccion, ficha, email);
                  onCambio(c.email);
                  return c;
                })
              }
            >
              {busy ? "Creando…" : "Crear acceso al portal"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Botón "Crear accesos faltantes": crea los de todas las fichas sin acceso y baja un Excel con las contraseñas. */
export function AccesosMasivos({ coleccion, fichas, onListo }: { coleccion: Coleccion; fichas: FichaAcceso[]; onListo: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const faltan = fichas.filter((f) => !f.cuenta);
  if (!faltan.length) return null;

  return (
    <button
      type="button"
      className="btn btn--ghost-dark btn--sm"
      disabled={!!busy}
      title="Crea la cuenta del portal de cada ficha que no tiene, con su email, y baja un Excel con las contraseñas provisorias"
      onClick={async () => {
        if (!window.confirm(`Se van a crear ${faltan.length} accesos al portal con el email de cada ficha. Después se baja un Excel con las contraseñas provisorias para enviárselas. ¿Seguir?`)) return;
        const filas: Record<string, unknown>[] = [];
        let ok = 0;
        for (const [i, f] of faltan.entries()) {
          setBusy(`${i + 1}/${faltan.length}`);
          try {
            const c = await crearAcceso(coleccion, f);
            ok++;
            filas.push({ nombre: f.nombre, numero: f.numero ?? "", email: c.email, clave: c.clave, telefono: f.telefono, resultado: c.vinculada ? "Vinculada a cuenta existente" : "Creada" });
          } catch (err) {
            filas.push({ nombre: f.nombre, numero: f.numero ?? "", email: f.email, clave: "", telefono: f.telefono, resultado: `Sin crear: ${errorMessage(err)}` });
          }
        }
        setBusy(null);
        try {
          await descargarExcel(`accesos-portal-${coleccion}-${new Date().toISOString().slice(0, 10)}`, [
            {
              nombre: "Accesos al portal",
              columnas: [
                { clave: "nombre", titulo: "Nombre", ancho: 30 },
                { clave: "numero", titulo: "N.º", ancho: 10 },
                { clave: "email", titulo: "Email", ancho: 32 },
                { clave: "clave", titulo: "Contraseña provisoria", ancho: 22 },
                { clave: "telefono", titulo: "Teléfono", ancho: 16 },
                { clave: "resultado", titulo: "Resultado", ancho: 44 },
              ],
              filas,
            },
          ]);
        } catch (err) {
          toast("error", errorMessage(err));
        }
        toast(ok === faltan.length ? "ok" : "error", `${ok} de ${faltan.length} accesos creados. Revisá el Excel: las contraseñas no se vuelven a mostrar.`);
        onListo();
      }}
    >
      <Icon name="lock" size={16} /> {busy ? `Creando ${busy}…` : `Crear accesos faltantes (${faltan.length})`}
    </button>
  );
}
