"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "../../lib/pb-client";
import { ROLES, errorAlta, portal, type Rol } from "../../lib/portal-client";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";
import { Campo, CamposFicha, FICHA, datosFicha, digitos, emailOk, validarFicha, type Ficha } from "./CamposFicha";
import { TURNSTILE_SITE_KEY, Turnstile } from "./Turnstile";

type Cuenta = { name: string; email: string; password: string; telefono: string; documento: string };

const CUENTA: Cuenta = { name: "", email: "", password: "", telefono: "", documento: "" };

function validarCuenta(c: Cuenta) {
  if (c.name.trim().length < 3) return "Completá tu nombre y apellido.";
  if (!emailOk(c.email)) return "Completá un email válido.";
  if (c.password.length < 8) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (digitos(c.telefono) < 8) return "Completá tu teléfono con código de área.";
  const doc = digitos(c.documento);
  if (doc < 7 || doc > 11) return "Completá tu DNI o CUIT (solo números).";
  return null;
}

export function Alta({ rolInicial }: { rolInicial: Rol | null }) {
  const [rol, setRol] = useState<Rol | null>(rolInicial);
  const [yaFiguro, setYaFiguro] = useState(false);
  const [referencia, setReferencia] = useState("");
  const [cuenta, setCuenta] = useState(CUENTA);
  const [ficha, setFicha] = useState(FICHA);
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // sesión que quedó abierta si la ficha falló después de crear la cuenta: se completa sin crear otra
  const [sesion, setSesion] = useState<{ name: string; rol: Rol; telefono: string; email: string } | null>(null);
  // anti-robots: campo trampa invisible y desafío de Turnstile (si está configurado)
  const [trampa, setTrampa] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    const c = portal();
    const r = c.authStore.record as unknown as { name: string; rol: Rol; telefono: string; email: string } | null;
    if (c.authStore.isValid && r) {
      setSesion(r);
      setRol(r.rol);
    }
  }, []);

  const setC = (k: keyof Cuenta, v: string) => setCuenta((x) => ({ ...x, [k]: v }));
  const setF = (k: keyof Ficha, v: string) => setFicha((x) => ({ ...x, [k]: v }));

  if (enviado) {
    return (
      <div className="login__card alta__card">
        <span className="alta__ok" aria-hidden="true">
          <Icon name="check" size={28} />
        </span>
        <h1>¡Recibimos tu solicitud!</h1>
        <p>
          La Cámara revisa tus datos y te avisa cuando tu cuenta esté aprobada.
          {!yaFiguro && " Tu ficha se publica en la web recién después de la aprobación."}
        </p>
        <a href="/portal" className="btn btn--navy btn--block">
          Ir a mi portal
        </a>
        <a href="/" className="login__back">
          Volver a la web
        </a>
      </div>
    );
  }

  if (!rol) {
    return (
      <div className="login__card alta__card">
        <Marca />
        <h1>Sumate a la Cámara</h1>
        <p>¿Cómo querés participar?</p>
        <div className="alta__roles">
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <button key={r} type="button" className="alta__rol" onClick={() => setRol(r)}>
              <strong>{ROLES[r].titulo}</strong>
              <span>{ROLES[r].texto}</span>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
        <p className="alta__ingresar">
          ¿Ya tenés cuenta? <a href="/portal">Ingresá a tu portal</a>
        </p>
        <a href="/" className="login__back">
          Volver a la web
        </a>
      </div>
    );
  }

  const persona = rol !== "proveedor";

  return (
    <form
      className="login__card alta__card"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const falta =
          (!sesion && validarCuenta(cuenta)) ||
          (yaFiguro ? (referencia.trim() ? null : "Contanos con qué nombre o N.º figurás en la web.") : validarFicha(rol, ficha, !!foto));
        if (falta) return setError(falta);
        if (!sesion && TURNSTILE_SITE_KEY && !captcha) return setError("Confirmá que no sos un robot.");
        setError("");
        setBusy(true);
        const c = portal();
        try {
          let s = sesion;
          if (!s) {
            await c.collection("cuentas").create({
              ...cuenta,
              email: cuenta.email.trim(),
              name: cuenta.name.trim(),
              passwordConfirm: cuenta.password,
              rol,
              referencia: yaFiguro ? referencia.trim() : "",
              sitio: trampa,
              turnstile: captcha,
            });
            const auth = await c.collection("cuentas").authWithPassword(cuenta.email.trim(), cuenta.password);
            s = auth.record as unknown as NonNullable<typeof sesion>;
            setSesion(s);
          }
          if (!yaFiguro) {
            // el nombre de una persona es el de su cuenta; el contacto público, si no se completa, también
            const completa = {
              ...ficha,
              nombre: persona ? s.name : ficha.nombre,
              telefono: ficha.telefono || s.telefono,
              email: ficha.email || s.email,
            };
            const datos = datosFicha(rol, completa, foto);
            datos.append("cuenta", c.authStore.record!.id);
            await c.collection(persona ? "profesionales" : "proveedores").create(datos);
          }
          setEnviado(true);
        } catch (err) {
          setError(errorAlta(err, errorMessage));
          setIntentos((n) => n + 1);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Marca />
      <div>
        <p className="alta__eyebrow">Alta · {ROLES[rol].titulo}</p>
        <h1>{sesion ? "Completá tu ficha" : "Creá tu cuenta"}</h1>
      </div>
      {sesion ? (
        <p>
          Ya tenés una cuenta iniciada como <strong>{sesion.name}</strong>. Falta tu ficha para que la Cámara la revise.
        </p>
      ) : (
        <p>
          Con esta cuenta vas a ver tu carnet, tus cuotas y tus datos.{" "}
          {!rolInicial && (
            <button type="button" className="alta__link" onClick={() => setRol(null)}>
              Cambiar tipo de alta
            </button>
          )}
        </p>
      )}

      {!sesion && (
        <fieldset className="form-grid alta__group">
          <legend className="form-subtitle">Tu cuenta</legend>
          <p className="field__hint" data-wide>
            Estos datos no se publican: solo los ve la Cámara.
          </p>
          <Campo label={persona ? "Nombre y apellido" : "Nombre y apellido del responsable"} req wide>
            {(p) => <input {...p} autoComplete="name" value={cuenta.name} onChange={(e) => setC("name", e.target.value)} />}
          </Campo>
          <Campo label="Email" req>
            {(p) => <input {...p} type="email" autoComplete="email" value={cuenta.email} onChange={(e) => setC("email", e.target.value)} />}
          </Campo>
          <Campo label="Contraseña" hint="Al menos 8 caracteres." req>
            {(p) => (
              <input {...p} type="password" autoComplete="new-password" minLength={8} value={cuenta.password} onChange={(e) => setC("password", e.target.value)} />
            )}
          </Campo>
          <Campo label="Teléfono" hint="Con código de área. Ej.: 342 453-1968" req>
            {(p) => <input {...p} type="tel" autoComplete="tel" value={cuenta.telefono} onChange={(e) => setC("telefono", e.target.value)} />}
          </Campo>
          <Campo label={persona ? "DNI o CUIT" : "CUIT"} hint="Solo números." req>
            {(p) => <input {...p} inputMode="numeric" value={cuenta.documento} onChange={(e) => setC("documento", e.target.value)} />}
          </Campo>
        </fieldset>
      )}

      {!sesion && (
        <label className="alta__check">
          <input type="checkbox" checked={yaFiguro} onChange={(e) => setYaFiguro(e.target.checked)} />
          <span>
            <strong>Ya figuro en la web de la Cámara</strong>
            <span>Pedí acceso a tu ficha actual en lugar de cargar una nueva.</span>
          </span>
        </label>
      )}

      {yaFiguro ? (
        <div className="form-grid alta__group">
          <Campo
            label={persona ? "Nombre con el que figurás o N.º de asociado" : "Nombre con el que figura tu empresa"}
            hint="La Cámara la busca y la vincula a tu cuenta."
            req
            wide
          >
            {(p) => <input {...p} value={referencia} onChange={(e) => setReferencia(e.target.value)} />}
          </Campo>
        </div>
      ) : (
        <fieldset className="form-grid alta__group">
          <legend className="form-subtitle">{persona ? "Tu ficha pública" : "Ficha de la empresa"}</legend>
          <p className="field__hint" data-wide>
            Se publica en la web cuando la Cámara la aprueba.
          </p>
          <CamposFicha rol={rol} ficha={ficha} onChange={setF} foto={foto} onFoto={setFoto} />
        </fieldset>
      )}

      {!sesion && (
        <>
          <div className="sr-only" aria-hidden="true">
            <label>
              No completar
              <input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
            </label>
          </div>
          <Turnstile onToken={setCaptcha} reiniciar={intentos} />
        </>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--navy btn--block" disabled={busy}>
        {busy ? "Enviando…" : "Enviar solicitud"}
      </button>
      <a href="/" className="login__back">
        Volver a la web
      </a>
    </form>
  );
}

export function Marca() {
  return (
    <svg viewBox="10 0 82 63" className="login__mark" aria-hidden="true">
      <LogoMark ground="#ffffff" />
    </svg>
  );
}
