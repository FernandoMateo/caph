"use client";

import { useEffect, useMemo, useState } from "react";
import { columnasDe, descargarExcel, leerPlanilla, normalizar, type Hoja, type Planilla } from "../../lib/excel";
import { errorMessage, pb } from "../../lib/pb-client";
import { useRubros } from "../../lib/rubros-client";
import { Icon } from "../Icon";
import { Field, PageHead, useToast } from "./ui";

type Registro = Record<string, unknown> & { id: string; collectionId: string };

/* ---------- exportar ---------- */

// colecciones que se pueden bajar, con sus campos de archivo (salen como link)
const COLECCIONES: { nombre: string; titulo: string; archivos?: string[]; titular?: boolean }[] = [
  { nombre: "profesionales", titulo: "Asociados y profesionales", archivos: ["foto"] },
  { nombre: "proveedores", titulo: "Proveedores", archivos: ["logo"] },
  { nombre: "cuentas", titulo: "Cuentas del portal" },
  { nombre: "suscripciones", titulo: "Suscripciones", titular: true },
  { nombre: "cuotas", titulo: "Cuotas", titular: true },
  { nombre: "pagos", titulo: "Pagos", archivos: ["comprobante"], titular: true },
  { nombre: "tarifas", titulo: "Tarifas" },
  { nombre: "medios_debito", titulo: "Medios de débito" },
  { nombre: "capacitaciones", titulo: "Capacitaciones", archivos: ["programa_pdf"] },
  { nombre: "galeria", titulo: "Galería", archivos: ["imagen"] },
  { nombre: "honorarios_ajustes", titulo: "Honorarios (ajustes)", archivos: ["pdf"] },
  { nombre: "honorarios_categorias", titulo: "Honorarios (categorías)" },
  { nombre: "honorarios_tareas", titulo: "Honorarios (tareas)" },
  { nombre: "contenidos", titulo: "Textos de la web" },
  { nombre: "rubros", titulo: "Rubros" },
];

const OCULTAS = new Set(["collectionId", "collectionName", "expand"]);

function Exportar() {
  const toast = useToast();
  const [elegidas, setElegidas] = useState<Set<string>>(() => new Set(COLECCIONES.map((c) => c.nombre)));
  const [busy, setBusy] = useState("");

  const alternar = (n: string) =>
    setElegidas((s) => {
      const x = new Set(s);
      if (x.has(n)) x.delete(n);
      else x.add(n);
      return x;
    });

  return (
    <div className="card">
      <div className="export-list">
        {COLECCIONES.map((c) => (
          <label key={c.nombre} className="check">
            <input type="checkbox" checked={elegidas.has(c.nombre)} onChange={() => alternar(c.nombre)} /> {c.titulo}
          </label>
        ))}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setElegidas(new Set(COLECCIONES.map((c) => c.nombre)))}>
          Todo
        </button>
        <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setElegidas(new Set())}>
          Nada
        </button>
        <button
          type="button"
          className="btn btn--navy"
          disabled={!elegidas.size || !!busy}
          onClick={async () => {
            setBusy("Leyendo datos…");
            try {
              const c = pb();
              const origen = window.location.origin;
              // nombres de los titulares para las hojas de cuotas, pagos y suscripciones
              const [personas, proveedores] = await Promise.all([
                c.collection("profesionales").getFullList<Registro>({ fields: "id,nombre" }),
                c.collection("proveedores").getFullList<Registro>({ fields: "id,nombre" }),
              ]);
              const nombres = new Map([...personas, ...proveedores].map((r) => [r.id, String(r.nombre)]));
              const hojas: Hoja[] = [];
              for (const col of COLECCIONES.filter((x) => elegidas.has(x.nombre))) {
                setBusy(`Leyendo ${col.titulo.toLowerCase()}…`);
                const items = await c.collection(col.nombre).getFullList<Registro>({ sort: "created" }).catch(() =>
                  // colecciones sin "created" (honorarios, rubros…)
                  c.collection(col.nombre).getFullList<Registro>()
                );
                const filas = items.map((r) => {
                  const f: Record<string, unknown> = {};
                  if (col.titular) f.titular = nombres.get(String(r.proveedor || r.profesional)) ?? "";
                  for (const [k, v] of Object.entries(r)) {
                    if (OCULTAS.has(k)) continue;
                    f[k] = col.archivos?.includes(k) && v ? `${origen}/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(String(v))}` : v;
                  }
                  return f;
                });
                hojas.push({ nombre: col.titulo, columnas: columnasDe(filas), filas });
              }
              setBusy("Armando el Excel…");
              await descargarExcel(`caph-datos-${new Date().toISOString().slice(0, 10)}`, hojas);
              toast("ok", `Excel descargado con ${hojas.length} ${hojas.length === 1 ? "hoja" : "hojas"}.`);
            } catch (err) {
              toast("error", errorMessage(err));
            } finally {
              setBusy("");
            }
          }}
        >
          <Icon name="download" size={18} />
          {busy || "Descargar Excel"}
        </button>
      </div>
    </div>
  );
}

/* ---------- importar ---------- */

type Def = { campo: string; titulo: string; alias: string[]; ejemplo: string };

const PERSONAS: Def[] = [
  { campo: "nombre", titulo: "Nombre y apellido", alias: ["nombre", "nombreyapellido", "apellidoynombre", "nombrecompleto", "apellidoynombres"], ejemplo: "María Pérez" },
  { campo: "numero", titulo: "N.º de asociado", alias: ["numero", "nro", "no", "n", "nasociado", "ndeasociado", "nodeasociado", "nrodeasociado", "numerodeasociado", "socio", "nsocio", "ndesocio", "nrodesocio", "numerodesocio"], ejemplo: "A-0123" },
  { campo: "rol", titulo: "Tipo", alias: ["tipo", "rol"], ejemplo: "asociado" },
  { campo: "titulo", titulo: "Profesión", alias: ["profesion", "titulo", "titulooprofesion"], ejemplo: "Administradora de consorcios" },
  { campo: "matricula", titulo: "Matrícula", alias: ["matricula", "mat"], ejemplo: "RPAC 0457" },
  { campo: "estudio", titulo: "Estudio", alias: ["estudio", "razonsocial", "empresa", "estudioorazonsocial"], ejemplo: "Pérez Administraciones" },
  { campo: "localidad", titulo: "Localidad", alias: ["localidad", "ciudad"], ejemplo: "Santa Fe" },
  { campo: "direccion", titulo: "Dirección de la oficina", alias: ["direccion", "direcciondelaoficina", "oficina"], ejemplo: "San Martín 2450" },
  { campo: "telefono", titulo: "Teléfono", alias: ["telefono", "tel", "celular", "whatsapp", "telefonowhatsapp"], ejemplo: "342 555-0101" },
  { campo: "email", titulo: "Email", alias: ["email", "mail", "correo", "correoelectronico", "email1"], ejemplo: "maria@ejemplo.com" },
  { campo: "web", titulo: "Web o red social", alias: ["web", "sitio", "sitioweb", "instagram", "redes", "weboredsocial"], ejemplo: "" },
  { campo: "descripcion", titulo: "Descripción", alias: ["descripcion", "especialidad"], ejemplo: "" },
  { campo: "desde", titulo: "Ejerce desde (año)", alias: ["desde", "ejercedesde", "ejercedesdeano", "anio", "ano"], ejemplo: "2015" },
];

const PROVEEDORES: Def[] = [
  { campo: "nombre", titulo: "Nombre de fantasía", alias: ["nombre", "nombredefantasia", "fantasia", "nombrecomercial"], ejemplo: "Limpiezas del Litoral" },
  { campo: "razon_social", titulo: "Razón social", alias: ["razonsocial"], ejemplo: "Limpiezas del Litoral SRL" },
  { campo: "rubro", titulo: "Rubro", alias: ["rubro", "categoria", "rubros"], ejemplo: "Limpieza" },
  { campo: "telefono", titulo: "Teléfono", alias: ["telefono", "tel", "celular", "whatsapp"], ejemplo: "342 555-0202" },
  { campo: "email", titulo: "Email", alias: ["email", "mail", "correo", "correoelectronico"], ejemplo: "contacto@ejemplo.com" },
  { campo: "direccion", titulo: "Dirección", alias: ["direccion", "domiciliocomercial"], ejemplo: "Rivadavia 100" },
  { campo: "web", titulo: "Web o red social", alias: ["web", "sitio", "sitioweb", "instagram", "redes", "weboredsocial"], ejemplo: "" },
  { campo: "descripcion", titulo: "Servicios", alias: ["servicios", "descripcion"], ejemplo: "Limpieza de edificios" },
];

type Tipo = "profesionales" | "proveedores";
type Fila = { n: number; datos: Record<string, string>; estado: "nuevo" | "actualiza" | "error"; id?: string; motivo?: string; avisos: string[] };

const emailOk = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);

function Importar() {
  const toast = useToast();
  const rubros = useRubros();
  const [tipo, setTipo] = useState<Tipo>("profesionales");
  const [rolDefecto, setRolDefecto] = useState<"asociado" | "profesional">("asociado");
  const [actualizar, setActualizar] = useState(true);
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [archivo, setArchivo] = useState("");
  const [existentes, setExistentes] = useState<{ id: string; nombre: string; numero?: string }[]>([]);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number; errores: string[] } | null>(null);
  const defs = tipo === "proveedores" ? PROVEEDORES : PERSONAS;

  useEffect(() => {
    pb()
      .collection(tipo)
      .getFullList<{ id: string; nombre: string; numero?: string }>({ fields: tipo === "proveedores" ? "id,nombre" : "id,nombre,numero" })
      .then(setExistentes)
      .catch(() => setExistentes([]));
  }, [tipo, resultado]);

  // qué columna de la planilla corresponde a cada campo
  const mapa = useMemo(() => {
    if (!planilla) return null;
    const m: Record<string, number> = {};
    planilla.encabezados.forEach((h, i) => {
      const n = normalizar(h);
      const def = defs.find((d) => d.alias.includes(n) || normalizar(d.titulo) === n);
      if (def && m[def.campo] === undefined) m[def.campo] = i;
    });
    return m;
  }, [planilla, defs]);

  const filas = useMemo<Fila[]>(() => {
    if (!planilla || !mapa) return [];
    const porNumero = new Map(existentes.filter((e) => e.numero).map((e) => [normalizar(e.numero!), e.id]));
    const porNombre = new Map(existentes.map((e) => [normalizar(e.nombre), e.id]));
    const claveRubro = new Map(Object.entries(rubros).flatMap(([k, v]) => [[normalizar(k), k] as const, [normalizar(v), k] as const]));
    const vistos = new Set<string>();
    return planilla.filas.map((celdas, i) => {
      const datos: Record<string, string> = {};
      for (const [campo, col] of Object.entries(mapa)) datos[campo] = (celdas[col] ?? "").trim();
      const fila: Fila = { n: i + 2, datos, estado: "nuevo", avisos: [] };
      if (!datos.nombre) return { ...fila, estado: "error", motivo: "Falta el nombre." };
      if (datos.email && !emailOk(datos.email)) fila.avisos.push("email inválido: no se carga");
      if (tipo === "proveedores") {
        const k = datos.rubro ? claveRubro.get(normalizar(datos.rubro)) : undefined;
        if (datos.rubro && !k) fila.avisos.push(`rubro “${datos.rubro}” no existe: va a “Otros”`);
        datos.rubro = k ?? "";
      } else {
        if (datos.rol) datos.rol = normalizar(datos.rol).startsWith("prof") ? "profesional" : "asociado";
        // un año que Excel guardó como fecha llega como "2015-01-01"
        if (/^\d{4}-\d{2}-\d{2}$/.test(datos.desde)) datos.desde = datos.desde.slice(0, 4);
        if (datos.desde && !/^\d{4}$/.test(datos.desde)) {
          fila.avisos.push("año inválido: no se carga");
          datos.desde = "";
        }
      }
      if (datos.web && !/^https?:\/\//i.test(datos.web)) datos.web = `https://${datos.web}`;
      const clave = datos.numero ? `n:${normalizar(datos.numero)}` : `t:${normalizar(datos.nombre)}`;
      if (vistos.has(clave)) return { ...fila, estado: "error", motivo: "Repetido en la planilla." };
      vistos.add(clave);
      const id = (datos.numero && porNumero.get(normalizar(datos.numero))) || porNombre.get(normalizar(datos.nombre));
      if (id) return actualizar ? { ...fila, estado: "actualiza", id } : { ...fila, estado: "error", motivo: "Ya existe (no se actualiza)." };
      return fila;
    });
  }, [planilla, mapa, existentes, rubros, tipo, actualizar]);

  const validas = filas.filter((f) => f.estado !== "error");
  const reconocidas = mapa ? defs.filter((d) => mapa[d.campo] !== undefined) : [];
  const ignoradas = planilla && mapa ? planilla.encabezados.filter((_, i) => !Object.values(mapa).includes(i) && planilla.encabezados[i]) : [];

  const importar = async () => {
    setResultado(null);
    setProgreso({ hechos: 0, total: validas.length });
    const res = { creados: 0, actualizados: 0, errores: [] as string[] };
    for (const [i, f] of validas.entries()) {
      // solo lo que vino con datos: una celda vacía no borra lo que ya está cargado
      const datos: Record<string, unknown> = Object.fromEntries(Object.entries(f.datos).filter(([k, v]) => v && !(k === "email" && !emailOk(v))));
      if (datos.desde) datos.desde = Number(datos.desde);
      try {
        if (f.estado === "actualiza") {
          await pb().collection(tipo).update(f.id!, datos);
          res.actualizados++;
        } else {
          // entran aprobadas pero ocultas: se publican cuando la ficha está completa (con foto)
          const nuevo: Record<string, unknown> = { ...datos, estado: "aprobado", activo: false, verificado: true };
          if (tipo === "proveedores") nuevo.rubro = (datos.rubro as string) || "otros";
          else nuevo.rol = (datos.rol as string) || rolDefecto;
          await pb().collection(tipo).create(nuevo);
          res.creados++;
        }
      } catch (err) {
        res.errores.push(`Fila ${f.n} (${f.datos.nombre}): ${errorMessage(err)}`);
      }
      setProgreso({ hechos: i + 1, total: validas.length });
    }
    setProgreso(null);
    setResultado(res);
    setPlanilla(null);
    setArchivo("");
    toast(res.errores.length ? "error" : "ok", `Importación terminada: ${res.creados} nuevos, ${res.actualizados} actualizados${res.errores.length ? `, ${res.errores.length} con error` : ""}.`);
  };

  return (
    <div className="card import">
      <div className="form-grid">
        <Field label="Qué vas a importar">
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as Tipo);
              setPlanilla(null);
              setArchivo("");
              setResultado(null);
            }}
          >
            <option value="profesionales">Asociados y profesionales</option>
            <option value="proveedores">Proveedores</option>
          </select>
        </Field>
        {tipo === "profesionales" && (
          <Field label="Si la planilla no dice el tipo" hint="Columna «Tipo»: asociado o profesional.">
            <select value={rolDefecto} onChange={(e) => setRolDefecto(e.target.value as typeof rolDefecto)}>
              <option value="asociado">Son asociados</option>
              <option value="profesional">Son profesionales</option>
            </select>
          </Field>
        )}
        <div className="field" data-wide>
          <span className="field__label">Planilla</span>
          <div className="import__archivo">
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              aria-label="Planilla a importar"
              key={archivo || "vacio"}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setResultado(null);
                try {
                  setPlanilla(await leerPlanilla(f));
                  setArchivo(f.name);
                } catch (err) {
                  toast("error", `No se pudo leer la planilla: ${errorMessage(err)}`);
                }
              }}
            />
            <button
              type="button"
              className="btn btn--ghost-dark btn--sm"
              onClick={() =>
                descargarExcel(`plantilla-${tipo === "proveedores" ? "proveedores" : "asociados"}`, [
                  {
                    nombre: "Planilla",
                    columnas: defs.map((d) => ({ clave: d.campo, titulo: d.titulo, ancho: Math.max(16, d.titulo.length + 4) })),
                    filas: [Object.fromEntries(defs.map((d) => [d.campo, d.ejemplo]))],
                  },
                ])
              }
            >
              <Icon name="download" size={16} /> Descargar plantilla
            </button>
          </div>
          <span className="field__hint">
            Excel (.xlsx) o CSV. La primera fila son los títulos de las columnas. DNI, CUIT y domicilios particulares no se importan: lo que se carga acá
            puede publicarse en la web.
          </span>
        </div>
        <label className="check" data-wide>
          <input type="checkbox" checked={actualizar} onChange={(e) => setActualizar(e.target.checked)} /> Actualizar los que ya existen (se reconocen por N.º o por nombre;
          las celdas vacías no borran datos)
        </label>
      </div>

      {planilla && mapa && (
        <div className="import__preview">
          <p className="section-hint">
            <strong>{archivo}</strong>: {filas.length} filas · {filas.filter((f) => f.estado === "nuevo").length} nuevas ·{" "}
            {filas.filter((f) => f.estado === "actualiza").length} para actualizar · {filas.filter((f) => f.estado === "error").length} con error.
            <br />
            Columnas reconocidas: {reconocidas.map((d) => d.titulo).join(", ") || "ninguna"}.
            {ignoradas.length > 0 && ` Se ignoran: ${ignoradas.join(", ")}.`}
          </p>
          {mapa.nombre === undefined ? (
            <p className="form-error">No encontré la columna del nombre. Revisá los títulos o usá la plantilla.</p>
          ) : (
            <>
              <div className="table-wrap import__tabla">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Fila</th>
                      <th scope="col">Nombre</th>
                      {tipo === "profesionales" ? <th scope="col">N.º</th> : <th scope="col">Rubro</th>}
                      <th scope="col">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 200).map((f) => (
                      <tr key={f.n} data-muted={f.estado === "error" || undefined}>
                        <td data-label="Fila" className="num-cell">
                          {f.n}
                        </td>
                        <th scope="row">{f.datos.nombre || "—"}</th>
                        <td data-label={tipo === "profesionales" ? "N.º" : "Rubro"}>
                          {tipo === "profesionales" ? f.datos.numero || "—" : rubros[f.datos.rubro] ?? "Otros"}
                        </td>
                        <td data-label="Resultado">
                          <span className="pill" data-state={f.estado === "error" ? "off" : f.estado === "nuevo" ? "next" : "warn"}>
                            {f.estado === "error" ? f.motivo : f.estado === "nuevo" ? "Nuevo" : "Actualiza"}
                          </span>
                          {f.avisos.length > 0 && <small className="import__aviso"> {f.avisos.join(" · ")}</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filas.length > 200 && <p className="section-hint">Se muestran las primeras 200 filas; se importan todas.</p>}
              <div className="form-actions">
                <button type="button" className="btn btn--ghost-dark" onClick={() => (setPlanilla(null), setArchivo(""))} disabled={!!progreso}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--navy" onClick={importar} disabled={!validas.length || !!progreso}>
                  {progreso ? `Importando ${progreso.hechos} de ${progreso.total}…` : `Importar ${validas.length} ${validas.length === 1 ? "fila" : "filas"}`}
                </button>
              </div>
              <p className="field__hint">Las fichas nuevas entran aprobadas pero ocultas en la web: se publican cuando tienen foto y datos completos.</p>
            </>
          )}
        </div>
      )}

      {resultado && (
        <div className="import__resultado" role="status">
          <p>
            <strong>Listo:</strong> {resultado.creados} nuevos y {resultado.actualizados} actualizados.
          </p>
          {resultado.errores.length > 0 && (
            <ul className="form-error">
              {resultado.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function DatosAdmin() {
  return (
    <>
      <PageHead
        title="Importar y exportar"
        text="Bajá los datos del sistema a Excel (sirve como copia de seguridad) y cargá asociados, profesionales o proveedores de a muchos desde una planilla."
      />
      <section className="admin-section">
        <h2>Exportar a Excel</h2>
        <p className="section-hint">Elegí qué bajar: cada uno sale en su propia hoja. Las fotos y comprobantes salen como link.</p>
        <Exportar />
      </section>
      <section className="admin-section">
        <h2>Importar desde una planilla</h2>
        <p className="section-hint">Antes de cargar nada te muestra fila por fila qué va a hacer.</p>
        <Importar />
      </section>
    </>
  );
}
