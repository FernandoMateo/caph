"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { LINKS } from "../../lib/data";
import { useRubros } from "../../lib/rubros-client";
import { errorMessage } from "../../lib/pb-client";
import { ROLES, portal, type Rol } from "../../lib/portal-client";
import { ToastProvider, useToast } from "../admin/ui";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";
import { Marca } from "./Alta";
import { CamposFicha, FICHA, datosFicha, validarFicha, type Ficha } from "./CamposFicha";
import { Carnet, type DatosCarnet } from "./Carnet";
import { compartir } from "./CarnetPublico";
import { MisCuotas } from "./MisCuotas";
import { MisCursos } from "./MisCursos";

type Cuenta = {
  id: string;
  email: string;
  name: string;
  rol: Rol;
  estado: "pendiente" | "activa" | "rechazada" | "suspendida" | "baja";
  referencia: string;
  motivo: string;
};

type FichaRec = Partial<Ficha> & {
  id: string;
  collectionId: string;
  collectionName: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  motivo: string;
  revisar: boolean;
  activo: boolean;
  oculto_mora?: boolean;
  numero?: string;
  foto?: string;
  logo?: string;
};

const coleccion = (rol: Rol) => (rol === "proveedor" ? "proveedores" : "profesionales");

function aFicha(r: FichaRec): Ficha {
  return Object.fromEntries(Object.keys(FICHA).map((k) => [k, String(r[k as keyof Ficha] ?? "")])) as Ficha;
}

function imagen(r: FichaRec, thumb?: string) {
  const f = r.foto || r.logo;
  return f ? portal().files.getURL(r, f, thumb ? { thumb } : undefined) : "";
}

function datosCarnet(rol: Rol, r: FichaRec, RUBROS: Record<string, string>): DatosCarnet {
  const persona = rol !== "proveedor";
  return {
    nombre: r.nombre ?? "",
    subtitulo: persona ? r.titulo || r.estudio || "" : RUBROS[r.rubro ?? ""] ?? "",
    rol: rol === "asociado" ? "Asociado" : rol === "profesional" ? "Profesional" : "Proveedor",
    numero: r.numero ?? "",
    detalle: persona ? r.matricula ?? "" : r.razon_social ?? "",
    detalleLabel: persona ? "Mat." : "",
    foto: imagen(r, persona ? "400x400f" : undefined),
    verificar: `${window.location.origin}/verificar/${r.id}`,
    vigente: r.activo && !r.oculto_mora,
  };
}

/* ---------- ingreso ---------- */

function Login() {
  const emailId = useId();
  const passId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="login">
      <form
        className="login__card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await portal().collection("cuentas").authWithPassword(email.trim(), password);
          } catch (err) {
            const msg = errorMessage(err);
            setError(msg.includes("authenticate") || msg.includes("identity") ? "Email o contraseña incorrectos." : msg);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Marca />
        <h1>Mi portal</h1>
        <p>Tu carnet digital, tu ficha en la web y tus datos en la Cámara.</p>
        <label className="field" htmlFor={emailId}>
          <span className="field__label">Email</span>
          <input id={emailId} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" htmlFor={passId}>
          <span className="field__label">Contraseña</span>
          <input id={passId} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--navy btn--block" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="alta__ingresar">
          ¿No tenés cuenta? <a href="/alta">Sumate a la Cámara</a>
        </p>
        <p className="alta__ingresar">
          ¿Olvidaste tu contraseña?{" "}
          <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
            Escribinos
          </a>
        </p>
        <a href="/" className="login__back">
          Volver a la web
        </a>
      </form>
    </main>
  );
}

/* ---------- carnet ---------- */

/** Link público de la tarjeta para compartir: copiar, WhatsApp o el menú del teléfono. */
function Compartir({ link, nombre, vigente }: { link: string; nombre: string; vigente: boolean }) {
  const toast = useToast();
  const texto = `Mi carnet de CAPH Santa Fe: ${link}`;
  return (
    <div className="compartir">
      <div>
        <strong>Tu tarjeta para compartir</strong>
        <span>
          {vigente
            ? "Un link público con tu carnet y tus datos de contacto. Se actualiza solo."
            : "Tu credencial no está vigente: quien abra el link va a ver que no está disponible."}
        </span>
      </div>
      <div className="compartir__link">
        <input readOnly value={link} aria-label="Link de tu tarjeta" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn btn--ghost-dark btn--sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast("ok", "Link copiado.");
            } catch {
              toast("error", "No se pudo copiar: seleccioná el link y copialo a mano.");
            }
          }}
        >
          Copiar
        </button>
      </div>
      <div className="portal__acciones">
        <a className="btn btn--navy btn--sm" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={16} /> Enviar por WhatsApp
        </a>
        <button
          type="button"
          className="btn btn--ghost-dark btn--sm"
          onClick={async () => {
            const r = await compartir(link, `${nombre} · CAPH Santa Fe`).catch(() => "cancelado" as const);
            if (r === "copiado") toast("ok", "Link copiado.");
          }}
        >
          Compartir…
        </button>
        <a className="btn btn--ghost-dark btn--sm" href={link} target="_blank" rel="noopener noreferrer">
          Ver mi tarjeta
        </a>
      </div>
    </div>
  );
}

function MiCarnet({ datos, link }: { datos: DatosCarnet; link: string }) {
  const toast = useToast();
  const [volteado, setVolteado] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="portal__card" aria-labelledby="carnet-titulo">
      <h2 id="carnet-titulo">Mi carnet</h2>
      <Carnet datos={datos} volteado={volteado} onVoltear={() => setVolteado((v) => !v)} />
      <p className="portal__pista">Tocá el carnet para darlo vuelta.</p>
      <div className="portal__acciones">
        <button
          type="button"
          className="btn btn--navy btn--sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const { descargarCarnetPdf } = await import("../../lib/carnet-pdf");
              await descargarCarnetPdf(datos);
            } catch (err) {
              toast("error", `No se pudo generar el PDF (${errorMessage(err)}).`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="download" size={16} />
          {busy ? "Generando…" : "Descargar PDF"}
        </button>
        <a className="btn btn--ghost-dark btn--sm" href={datos.verificar} target="_blank" rel="noopener noreferrer">
          Ver verificación
        </a>
      </div>
      <Compartir link={link} nombre={datos.nombre} vigente={datos.vigente} />
    </section>
  );
}

/* ---------- ficha ---------- */

function MiFicha({ rol, ficha, onGuardada }: { rol: Rol; ficha: FichaRec; onGuardada: (r: FichaRec) => void }) {
  const toast = useToast();
  const [datos, setDatos] = useState(() => aFicha(ficha));
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Ficha, v: string) => setDatos((d) => ({ ...d, [k]: v }));
  const estado = ficha.estado === "aprobado" ? (ficha.revisar ? "Publicada · cambios en revisión" : "Publicada") : ficha.estado === "pendiente" ? "En revisión" : "Rechazada";

  return (
    <section className="portal__card" aria-labelledby="ficha-titulo">
      <div className="solicitud__head">
        <h2 id="ficha-titulo">{rol === "proveedor" ? "Ficha de la empresa" : "Mi ficha"}</h2>
        <span className="pill" data-state={ficha.estado === "aprobado" ? "next" : ficha.estado === "pendiente" ? "warn" : "off"}>
          {estado}
        </span>
      </div>
      <p>
        {ficha.estado === "aprobado"
          ? "Así te ven en la web. Si cambiás algo, se publica enseguida y la Cámara lo revisa."
          : "La Cámara la publica cuando la aprueba."}
      </p>
      <form
        className="form-grid"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const falta = validarFicha(rol, datos, !!foto || !!(ficha.foto || ficha.logo), true);
          if (falta) return setError(falta);
          setError("");
          setBusy(true);
          try {
            const r = await portal().collection(coleccion(rol)).update<FichaRec>(ficha.id, datosFicha(rol, datos, foto));
            setFoto(null);
            onGuardada(r);
            toast("ok", r.estado === "aprobado" ? "Guardado. Ya se ve en la web." : "Guardado y enviado a revisión.");
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <CamposFicha
          rol={rol}
          ficha={datos}
          onChange={set}
          foto={foto}
          onFoto={setFoto}
          fotoActual={imagen(ficha, ficha.foto ? "400x400f" : undefined)}
          conNombre
          contactoObligatorio
        />
        {error && (
          <p className="form-error" role="alert" data-wide>
            {error}
          </p>
        )}
        <div className="form-actions" data-wide>
          <button type="submit" className="btn btn--navy" disabled={busy}>
            {busy ? "Guardando…" : ficha.estado === "rechazado" ? "Guardar y reenviar" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------- contraseña ---------- */

function Clave({ email }: { email: string }) {
  const toast = useToast();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="portal__card" aria-labelledby="clave-titulo">
      <h2 id="clave-titulo">Contraseña</h2>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          if (nueva.length < 8) return toast("error", "La contraseña nueva tiene que tener al menos 8 caracteres.");
          setBusy(true);
          const c = portal();
          try {
            await c.collection("cuentas").update(c.authStore.record!.id, { oldPassword: actual, password: nueva, passwordConfirm: nueva });
            // cambiar la contraseña cierra las sesiones: se vuelve a entrar con la nueva
            await c.collection("cuentas").authWithPassword(email, nueva);
            setActual("");
            setNueva("");
            toast("ok", "Contraseña cambiada.");
          } catch (err) {
            toast("error", /oldPassword/.test(errorMessage(err)) ? "La contraseña actual no es correcta." : errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span className="field__label">Contraseña actual</span>
          <input type="password" autoComplete="current-password" required value={actual} onChange={(e) => setActual(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Contraseña nueva</span>
          <input type="password" autoComplete="new-password" required minLength={8} value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </label>
        <div className="form-actions" data-wide>
          <button type="submit" className="btn btn--ghost-dark btn--sm" disabled={busy}>
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------- portal ---------- */

export function BarraPortal({ email, volver }: { email: string; volver?: boolean }) {
  return (
    <header className="portal__bar">
      <a href={volver ? "/portal" : "/"} className="portal__brand" title={volver ? "Volver a mi portal" : "Ver la web"}>
        <svg viewBox="10 0 82 63" aria-hidden="true">
          <LogoMark ground="#091135" />
        </svg>
        <span>
          CAPH <small>Mi portal</small>
        </span>
      </a>
      <div className="portal__user">
        {volver && <a href="/portal">Volver a mi portal</a>}
        <span>{email}</span>
        <button type="button" onClick={() => portal().authStore.clear()}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

function Aviso({ cuenta, ficha }: { cuenta: Cuenta; ficha: FichaRec | null }) {
  if (cuenta.estado === "suspendida")
    return (
      <div className="portal__aviso" data-tono="error" role="status">
        <strong>Tu cuenta está suspendida.</strong>
        <span>Comunicate con la Cámara para regularizarla.</span>
      </div>
    );
  if (cuenta.estado === "rechazada" || ficha?.estado === "rechazado")
    return (
      <div className="portal__aviso" data-tono="error" role="status">
        <strong>La Cámara no aprobó tu solicitud.</strong>
        {(ficha?.motivo || cuenta.motivo) && <span>Motivo: {ficha?.motivo || cuenta.motivo}</span>}
        {ficha && <span>Corregí tu ficha abajo y guardala para enviarla de nuevo.</span>}
      </div>
    );
  if (cuenta.estado === "pendiente" || ficha?.estado === "pendiente")
    return (
      <div className="portal__aviso" role="status">
        <strong>Tu solicitud está en revisión.</strong>
        <span>
          {ficha
            ? "Cuando la Cámara la apruebe, tu ficha se publica en la web y acá aparece tu carnet."
            : `La Cámara está buscando tu ficha (“${cuenta.referencia}”) para vincularla a tu cuenta.`}
        </span>
      </div>
    );
  return null;
}

function Panel({ cuenta }: { cuenta: Cuenta }) {
  const rubros = useRubros();
  const [ficha, setFicha] = useState<FichaRec | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setFicha(await portal().collection(coleccion(cuenta.rol)).getFirstListItem<FichaRec>(`cuenta = "${cuenta.id}"`));
    } catch {
      setFicha(null);
    }
  }, [cuenta.id, cuenta.rol]);

  useEffect(() => {
    load();
  }, [load]);

  const carnet = cuenta.estado === "activa" && ficha?.estado === "aprobado";

  return (
    <div className="portal">
      <BarraPortal email={cuenta.email} />

      <main className="portal__main">
        <div className="portal__hola">
          <h1>Hola, {cuenta.name.split(" ")[0]}</h1>
          <p>{ROLES[cuenta.rol].titulo}</p>
        </div>

        {ficha !== undefined && <Aviso cuenta={cuenta} ficha={ficha} />}

        {ficha === undefined ? (
          <div className="loading" aria-busy="true">
            <span className="spinner" aria-hidden="true" />
            Cargando…
          </div>
        ) : ficha === null ? (
          !cuenta.referencia && (
            <section className="portal__card">
              <h2>Todavía no cargaste tu ficha</h2>
              <p>Con tu ficha la Cámara revisa tu alta y te publica en la web.</p>
              <div className="portal__acciones">
                <a className="btn btn--navy btn--sm" href="/alta">
                  Cargar mi ficha
                </a>
              </div>
            </section>
          )
        ) : (
          <div className="portal__grid">
            <div className="portal__col">
              {carnet ? (
                <MiCarnet datos={datosCarnet(cuenta.rol, ficha, rubros)} link={`${window.location.origin}/carnet/${ficha.id}`} />
              ) : (
                <section className="portal__card">
                  <h2>Mi carnet</h2>
                  <p>Tu carnet digital aparece acá cuando la Cámara aprueba tu alta.</p>
                </section>
              )}
              {carnet && <MisCuotas rol={cuenta.rol} fichaId={ficha.id} ocultoMora={!!ficha.oculto_mora} />}
              <MisCursos cuentaId={cuenta.id} activa={cuenta.estado === "activa"} />
            </div>
            <div className="portal__col">
              <MiFicha key={ficha.id + ficha.estado} rol={cuenta.rol} ficha={ficha} onGuardada={setFicha} />
              <Clave email={cuenta.email} />
            </div>
          </div>
        )}

        {!ficha && (
          <div className="portal__grid portal__grid--abajo">
            <Clave email={cuenta.email} />
          </div>
        )}
      </main>
    </div>
  );
}

export function Portal() {
  const [ready, setReady] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  useEffect(() => {
    const c = portal();
    const sync = () => setCuenta(c.authStore.isValid && c.authStore.record ? (c.authStore.record as unknown as Cuenta) : null);
    sync();
    setReady(true);
    // trae el estado al día (aprobación, rechazo); si la sesión venció, la cierra
    if (c.authStore.isValid) c.collection("cuentas").authRefresh().catch(() => c.authStore.clear());
    return c.authStore.onChange(sync);
  }, []);

  if (!ready) return null;
  if (!cuenta) return <Login />;
  return (
    <ToastProvider>
      <Panel key={cuenta.id} cuenta={cuenta} />
    </ToastProvider>
  );
}
