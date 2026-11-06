"use client";

import { useEffect, useId, useState } from "react";
import { useRubros } from "../../lib/rubros-client";
import type { Rol } from "../../lib/portal-client";

// Campos de la ficha pública: los usan el alta (/alta) y "Mi ficha" del portal.

export type Ficha = {
  nombre: string;
  razon_social: string;
  rubro: string;
  titulo: string;
  matricula: string;
  estudio: string;
  localidad: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  descripcion: string;
};

export const FICHA: Ficha = {
  nombre: "",
  razon_social: "",
  rubro: "",
  titulo: "",
  matricula: "",
  estudio: "",
  localidad: "Santa Fe",
  direccion: "",
  telefono: "",
  email: "",
  web: "",
  descripcion: "",
};

export const digitos = (t: string) => t.replace(/\D/g, "").length;
export const emailOk = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim());

/** Campo con etiqueta asociada; `req` marca los obligatorios. */
export function Campo({
  label,
  hint,
  req,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  req?: boolean;
  wide?: boolean;
  children: (props: { id: string; "aria-describedby"?: string; required?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="field" data-wide={wide || undefined}>
      <label className="field__label" htmlFor={id}>
        {label}
        {req && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, "aria-describedby": hint ? `${id}-ayuda` : undefined, required: req })}
      {hint && (
        <span id={`${id}-ayuda`} className="field__hint">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Qué le falta a la ficha (las mismas reglas que aplica el servidor). `tieneFoto` cuenta la foto ya guardada.
 * Teléfono y email vacíos se aceptan: el alta usa los de la cuenta.
 */
export function validarFicha(rol: Rol, f: Ficha, tieneFoto: boolean, contactoObligatorio = false) {
  if (!tieneFoto) return rol === "proveedor" ? "Subí el logo o una foto de tu empresa." : "Subí una foto de perfil.";
  if (rol === "proveedor") {
    if (!f.nombre.trim()) return "Completá el nombre de fantasía.";
    if (!f.razon_social.trim()) return "Completá la razón social.";
    if (!f.rubro) return "Elegí el rubro.";
  } else {
    if (contactoObligatorio && f.nombre.trim().length < 3) return "Completá tu nombre y apellido.";
    if (!f.titulo.trim()) return "Completá tu profesión o título.";
    if (rol === "profesional" && !f.matricula.trim()) return "Completá tu matrícula.";
    if (!f.localidad.trim()) return "Completá la localidad.";
  }
  if (!f.direccion.trim()) return "Completá la dirección.";
  if ((contactoObligatorio || f.telefono) && digitos(f.telefono) < 8) return "El teléfono de contacto tiene que tener código de área.";
  if ((contactoObligatorio || f.email) && !emailOk(f.email)) return "El email de contacto no es válido.";
  return null;
}

/** Arma los datos a guardar (FormData, por la foto). */
export function datosFicha(rol: Rol, f: Ficha, foto: File | null) {
  const persona = rol !== "proveedor";
  const datos = new FormData();
  const campos: (keyof Ficha)[] = persona
    ? ["nombre", "titulo", "matricula", "estudio", "localidad", "direccion", "telefono", "email", "descripcion"]
    : ["nombre", "razon_social", "rubro", "direccion", "telefono", "email", "descripcion"];
  for (const k of campos) datos.append(k, f[k].trim());
  let web = f.web.trim();
  if (web && !/^https?:\/\//i.test(web)) web = `https://${web}`;
  datos.append("web", web);
  if (foto) datos.append(persona ? "foto" : "logo", foto);
  return datos;
}

export function CamposFicha({
  rol,
  ficha,
  onChange,
  foto,
  onFoto,
  fotoActual,
  conNombre,
  contactoObligatorio,
}: {
  rol: Rol;
  ficha: Ficha;
  onChange: (k: keyof Ficha, v: string) => void;
  foto: File | null;
  onFoto: (f: File | null) => void;
  /** URL de la foto ya guardada, si hay. */
  fotoActual?: string;
  /** Muestra el nombre de la persona (en el alta sale de la cuenta). */
  conNombre?: boolean;
  contactoObligatorio?: boolean;
}) {
  const persona = rol !== "proveedor";
  const RUBROS = useRubros();
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!foto) return setPreview("");
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const img = preview || fotoActual;
  const contactoHint = contactoObligatorio ? "Se publica en la web." : "Se publica. Si lo dejás vacío, usamos el de tu cuenta.";

  return (
    <>
      <div className="field" data-wide>
        <span className="field__label">
          {persona ? "Foto de perfil" : "Logo o foto"}
          <span aria-hidden="true"> *</span>
        </span>
        <div className="logo-field">
          <span className={`logo-preview${persona ? " logo-preview--round" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img ? <img src={img} alt="" /> : persona ? "Foto" : "Logo"}
          </span>
          <div className="logo-field__controls">
            <input
              type="file"
              accept={persona ? "image/png,image/jpeg,image/webp" : "image/png,image/jpeg,image/webp,image/svg+xml"}
              aria-label={persona ? "Foto de perfil" : "Logo o foto"}
              onChange={(e) => onFoto(e.target.files?.[0] ?? null)}
            />
            <span className="field__hint">
              {fotoActual && !foto ? "Elegí un archivo solo si querés cambiarla. " : ""}
              {persona ? "JPG, PNG o WebP, hasta 5 MB. Cuadrada, de frente y con buena luz." : "PNG, JPG, WebP o SVG, hasta 3 MB."}
            </span>
          </div>
        </div>
      </div>

      {persona ? (
        <>
          {conNombre && (
            <Campo label="Nombre y apellido" req wide>
              {(p) => <input {...p} autoComplete="name" value={ficha.nombre} onChange={(e) => onChange("nombre", e.target.value)} />}
            </Campo>
          )}
          <Campo label="Profesión o título" hint={rol === "asociado" ? "Ej.: Administrador de consorcios" : "Ej.: Abogada, Contador público"} req>
            {(p) => <input {...p} value={ficha.titulo} onChange={(e) => onChange("titulo", e.target.value)} />}
          </Campo>
          <Campo label="Matrícula" hint={rol === "asociado" ? "Si tenés." : "Colegio y número. Ej.: CPCE 12345"} req={rol === "profesional"}>
            {(p) => <input {...p} value={ficha.matricula} onChange={(e) => onChange("matricula", e.target.value)} />}
          </Campo>
          <Campo label="Estudio o razón social" hint="Opcional.">
            {(p) => <input {...p} value={ficha.estudio} onChange={(e) => onChange("estudio", e.target.value)} />}
          </Campo>
          <Campo label="Localidad" req>
            {(p) => <input {...p} value={ficha.localidad} onChange={(e) => onChange("localidad", e.target.value)} />}
          </Campo>
        </>
      ) : (
        <>
          <Campo label="Nombre de fantasía" hint="El que se muestra en la web." req>
            {(p) => <input {...p} value={ficha.nombre} onChange={(e) => onChange("nombre", e.target.value)} />}
          </Campo>
          <Campo label="Razón social" hint="Nombre legal de la empresa." req>
            {(p) => <input {...p} value={ficha.razon_social} onChange={(e) => onChange("razon_social", e.target.value)} />}
          </Campo>
          <Campo label="Rubro" req>
            {(p) => (
              <select {...p} value={ficha.rubro} onChange={(e) => onChange("rubro", e.target.value)}>
                <option value="">Elegí un rubro</option>
                {Object.entries(RUBROS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </>
      )}
      <Campo label={persona ? "Dirección de la oficina" : "Dirección"} hint={persona ? "No cargues tu domicilio particular." : undefined} req>
        {(p) => <input {...p} autoComplete="street-address" value={ficha.direccion} onChange={(e) => onChange("direccion", e.target.value)} />}
      </Campo>
      <Campo label="Teléfono de contacto" hint={contactoHint} req={contactoObligatorio}>
        {(p) => <input {...p} type="tel" value={ficha.telefono} onChange={(e) => onChange("telefono", e.target.value)} />}
      </Campo>
      <Campo label="Email de contacto" hint={contactoHint} req={contactoObligatorio}>
        {(p) => <input {...p} type="email" value={ficha.email} onChange={(e) => onChange("email", e.target.value)} />}
      </Campo>
      <Campo label="Web o red social" hint="Opcional." wide>
        {(p) => <input {...p} value={ficha.web} onChange={(e) => onChange("web", e.target.value)} placeholder="https://instagram.com/…" />}
      </Campo>
      <Campo label={persona ? "Descripción" : "Servicios"} hint={persona ? "Opcional. Especialidad y zona de trabajo." : "Ej.: cámaras, control de acceso, alarmas."} wide>
        {(p) => <textarea {...p} rows={3} maxLength={400} value={ficha.descripcion} onChange={(e) => onChange("descripcion", e.target.value)} />}
      </Campo>
    </>
  );
}
