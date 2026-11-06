// Contenido editable de la web: se lee de PocketBase en cada visita.
// Si PocketBase no responde, la web usa los datos de respaldo de lib/data.ts.

import "server-only";
import {
  AMENITIES,
  BONIFICACIONES,
  CATEGORIAS,
  HONORARIOS_PERIODO,
  LINKS,
  NOTAS_HONORARIOS,
  PROGRAMA,
  PROVEEDORES,
  RUBROS,
  TALLERES,
  TAREAS,
} from "./data";
import { CAMPOS_TEXTOS, textosPorDefecto, type Textos } from "./textos";

const PB_URL = (process.env.PB_URL || "http://127.0.0.1:8090").replace(/\/$/, "");

export type Categoria = {
  codigo: string;
  nombre: string;
  descripcion: string;
  minimo20: number;
  porUf: number;
  cochera: number;
};

export type Tarea = { nombre: string; detalle: string; valor: string };
export type Bonificacion = { desde: number; pct: number };

export type Honorarios = {
  periodo: string;
  pdfUrl: string;
  bonificaciones: Bonificacion[];
  notas: string[];
  amenities: string[];
  categorias: Categoria[];
  tareas: Tarea[];
};

export type Proveedor = { n: string; r: string; v: boolean; tel?: string; web?: string; logo?: string; d?: string };

export type Profesional = {
  id: string;
  rol: "asociado" | "profesional";
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
  desde: number;
  foto: string;
  /** La foto recortada vertical (4:5) para el carrusel. */
  retrato: string;
  verificado: boolean;
};

export type Foto = { id: string; src: string; thumb: string; titulo: string; descripcion: string };

export type Capacitacion = {
  id: string;
  titulo: string;
  tipo: "programa" | "curso" | "capacitacion" | "taller";
  fecha: string; // YYYY-MM-DD
  hora: string;
  lugar: string;
  modalidad: string;
  duracion: string;
  certificacion: string;
  dirigidoA: string;
  inversion: string;
  beneficio: string;
  descripcion: string;
  temas: string[];
  destacado: boolean;
  inscripcionUrl: string;
  programaUrl: string;
  /** Se cursa online desde el portal. */
  online?: boolean;
};

type PBRecord = Record<string, unknown> & { id: string; collectionId: string };

async function list(collection: string, query = ""): Promise<PBRecord[]> {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records?perPage=500${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`${collection}: ${res.status}`);
  const json = (await res.json()) as { items: PBRecord[] };
  return json.items;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
// "$ 70.000" y "50 %" no se cortan en dos líneas
const nb = (s: string) => s.replace(/\$ (?=\d)/g, "$\u00a0").replace(/(\d) %/g, "$1\u00a0%");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const arr = <T,>(v: unknown, fallback: T[] = []): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
const fileUrl = (r: PBRecord, field: string, thumb?: string) => {
  const f = str(r[field]);
  if (!f) return "";
  // relativa: el navegador la pide a la web, que la reenvía a PocketBase (next.config.mjs)
  const url = `/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(f)}`;
  return thumb ? `${url}?thumb=${thumb}` : url;
};

/* ---------- respaldo ---------- */

const fallbackHonorarios = (): Honorarios => ({
  periodo: HONORARIOS_PERIODO,
  pdfUrl: LINKS.honorariosPdf,
  bonificaciones: [...BONIFICACIONES].sort((a, b) => a.desde - b.desde),
  notas: NOTAS_HONORARIOS,
  amenities: AMENITIES,
  categorias: CATEGORIAS.map((c) => ({
    codigo: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    minimo20: c.minimo20,
    porUf: c.porUfDesde21,
    cochera: c.cochera,
  })),
  tareas: TAREAS,
});

const fallbackCapacitaciones = (): Capacitacion[] => {
  const dato = (k: string) => PROGRAMA.datos.find(([key]) => key === k)?.[1] ?? "";
  return [
    {
      id: "programa",
      titulo: PROGRAMA.titulo,
      tipo: "programa",
      fecha: PROGRAMA.inicio,
      hora: "",
      lugar: "",
      modalidad: dato("Modalidad"),
      duracion: dato("Duración"),
      certificacion: dato("Certificación"),
      dirigidoA: dato("Dirigido a"),
      inversion: nb(dato("Inversión")),
      beneficio: nb(PROGRAMA.beneficio),
      descripcion: PROGRAMA.bajada,
      temas: [],
      destacado: true,
      inscripcionUrl: "",
      programaUrl: LINKS.programaPdf,
    },
    ...TALLERES.map((t, i) => ({
      id: `taller-${i}`,
      titulo: t.titulo,
      tipo: (t.tipo.toLowerCase().startsWith("taller") ? "taller" : "capacitacion") as Capacitacion["tipo"],
      fecha: t.fecha,
      hora: t.hora,
      lugar: t.lugar,
      modalidad: "Presencial",
      duracion: "",
      certificacion: "",
      dirigidoA: "",
      inversion: "",
      beneficio: "",
      descripcion: "",
      temas: t.temas,
      destacado: false,
      inscripcionUrl: "",
      programaUrl: "",
    })),
  ];
};

/* ---------- lecturas ---------- */

export async function getHonorarios(): Promise<Honorarios> {
  try {
    const [ajustes, categorias, tareas] = await Promise.all([
      list("honorarios_ajustes", "&sort=-updated"),
      list("honorarios_categorias", "&sort=orden,codigo"),
      list("honorarios_tareas", "&sort=orden,nombre"),
    ]);
    const a = ajustes[0];
    const fb = fallbackHonorarios();
    return {
      periodo: str(a?.periodo) || fb.periodo,
      pdfUrl: (a && (fileUrl(a, "pdf") || str(a.pdf_url))) || fb.pdfUrl,
      bonificaciones: arr<Bonificacion>(a?.bonificaciones, fb.bonificaciones)
        .map((b) => ({ desde: num(b.desde), pct: num(b.pct) }))
        .sort((x, y) => x.desde - y.desde),
      notas: arr<string>(a?.notas, fb.notas),
      amenities: arr<string>(a?.amenities, fb.amenities),
      categorias: categorias.map((c) => ({
        codigo: str(c.codigo),
        nombre: str(c.nombre),
        descripcion: str(c.descripcion),
        minimo20: num(c.minimo20),
        porUf: num(c.por_uf),
        cochera: num(c.cochera),
      })),
      tareas: tareas.map((t) => ({ nombre: str(t.nombre), detalle: nb(str(t.detalle)), valor: nb(str(t.valor)) })),
    };
  } catch {
    return fallbackHonorarios();
  }
}

export async function getProveedores(): Promise<Proveedor[]> {
  try {
    const items = await list("proveedores", "&filter=" + encodeURIComponent("activo = true && oculto_mora = false && estado = 'aprobado'") + "&sort=nombre");
    return items.map((p) => ({
      n: str(p.nombre),
      r: str(p.rubro) || "otros",
      v: Boolean(p.verificado),
      tel: str(p.telefono) || undefined,
      web: str(p.web) || undefined,
      logo: fileUrl(p, "logo", "160x160f") || undefined,
      d: str(p.descripcion) || undefined,
    }));
  } catch {
    return PROVEEDORES;
  }
}

export async function getProfesionales(): Promise<Profesional[]> {
  try {
    const items = await list("profesionales", "&filter=" + encodeURIComponent("activo = true && estado = 'aprobado' && oculto_mora = false") + "&sort=nombre");
    return items.map((p) => ({
      id: p.id,
      rol: p.rol === "profesional" ? ("profesional" as const) : ("asociado" as const),
      nombre: str(p.nombre),
      estudio: str(p.estudio),
      numero: str(p.numero),
      titulo: str(p.titulo),
      localidad: str(p.localidad),
      direccion: str(p.direccion),
      telefono: str(p.telefono),
      email: str(p.email),
      web: str(p.web),
      descripcion: str(p.descripcion),
      desde: num(p.desde),
      foto: fileUrl(p, "foto", "400x400f"),
      retrato: fileUrl(p, "foto", "600x750"),
      verificado: Boolean(p.verificado),
    }));
  } catch {
    // sin base de profesionales la sección no se muestra
    return [];
  }
}

/** Textos de la home: los cargados en el panel, y para el resto los de lib/textos.ts. */
export async function getTextos(): Promise<Textos> {
  const textos = textosPorDefecto();
  try {
    const conocidas = new Set(CAMPOS_TEXTOS.map((c) => c.clave));
    for (const r of await list("contenidos")) {
      const clave = str(r.clave);
      // un texto borrado del todo vuelve al de por defecto
      if (conocidas.has(clave) && str(r.valor).trim()) textos[clave] = nb(str(r.valor));
    }
  } catch {
    // sin PocketBase, los textos originales
  }
  return textos;
}

/** Rubros del directorio, en orden: clave → nombre. */
export async function getRubros(): Promise<Record<string, string>> {
  try {
    const items = await list("rubros", "&sort=orden,nombre");
    return items.length ? Object.fromEntries(items.map((r) => [str(r.clave), str(r.nombre)])) : RUBROS;
  } catch {
    return RUBROS;
  }
}

export type Certificado = { codigo: string; nombre: string; curso: string; tipo: string; horas: number; certificacion: string; fecha: string };

/** Certificado de una capacitación por su código (pb_hooks/cursos.pb.js). null si no existe; lanza si PocketBase no responde. */
export async function getCertificado(codigo: string): Promise<Certificado | null> {
  if (!/^[A-Za-z0-9]{6,20}$/.test(codigo)) return null;
  const res = await fetch(`${PB_URL}/api/caph/certificado/${encodeURIComponent(codigo)}`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`certificado: ${res.status}`);
  return (await res.json()) as Certificado;
}

/** Lo que muestra la tarjeta pública para compartir (/carnet/<id>): el carnet y el contacto de su ficha. */
export type CarnetPublico = {
  id: string;
  nombre: string;
  rol: "Asociado" | "Profesional" | "Proveedor";
  subtitulo: string;
  numero: string;
  detalle: string;
  detalleLabel: string;
  foto: string;
  descripcion: string;
  localidad: string;
  telefono: string;
  email: string;
  web: string;
};

/**
 * Tarjeta pública de un socio. Como la verificación, solo encuentra fichas publicadas (aprobadas, visibles y
 * sin mora): todo lo que devuelve ya se muestra en la web. null si no existe o no está vigente.
 */
export async function getCarnetPublico(id: string): Promise<CarnetPublico | null> {
  if (!/^[a-z0-9]{15}$/.test(id)) return null;
  for (const collection of ["profesionales", "proveedores"]) {
    const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${id}`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`${collection}: ${res.status}`);
    const r = (await res.json()) as PBRecord;
    const persona = collection === "profesionales";
    const rubros = persona ? {} : await getRubros();
    return {
      id: r.id,
      nombre: str(r.nombre),
      rol: persona ? (r.rol === "profesional" ? "Profesional" : "Asociado") : "Proveedor",
      subtitulo: persona ? str(r.titulo) || str(r.estudio) : rubros[str(r.rubro)] ?? "",
      numero: persona ? str(r.numero) : "",
      detalle: persona ? str(r.matricula) : str(r.razon_social),
      detalleLabel: persona ? "Matrícula" : "",
      foto: persona ? fileUrl(r, "foto", "400x400f") : fileUrl(r, "logo"),
      descripcion: str(r.descripcion),
      localidad: str(r.localidad),
      telefono: str(r.telefono),
      email: str(r.email),
      web: str(r.web),
    };
  }
  return null;
}

export type Credencial = {
  nombre: string;
  rol: "Asociado" | "Profesional" | "Proveedor";
  detalle: string;
  numero: string;
  foto: string;
};

/**
 * Credencial que muestra el QR del carnet. Solo encuentra fichas publicadas (aprobadas, visibles y sin mora):
 * las reglas de PocketBase esconden las demás, y entonces el carnet no está vigente.
 * null si no existe o no está vigente; lanza si PocketBase no responde.
 */
export async function getCredencial(id: string): Promise<Credencial | null> {
  if (!/^[a-z0-9]{15}$/.test(id)) return null;
  for (const collection of ["profesionales", "proveedores"]) {
    const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${id}`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`${collection}: ${res.status}`);
    const r = (await res.json()) as PBRecord;
    const persona = collection === "profesionales";
    return {
      nombre: str(r.nombre),
      rol: persona ? (r.rol === "profesional" ? "Profesional" : "Asociado") : "Proveedor",
      detalle: persona ? [str(r.titulo), str(r.matricula) && `Mat. ${str(r.matricula)}`].filter(Boolean).join(" · ") : str(r.razon_social),
      numero: persona ? str(r.numero) : "",
      foto: persona ? fileUrl(r, "foto", "400x400f") : fileUrl(r, "logo", "160x160f"),
    };
  }
  return null;
}

export async function getGaleria(): Promise<Foto[]> {
  try {
    const items = await list("galeria", "&filter=" + encodeURIComponent("publicado = true") + "&sort=orden,-created");
    return items
      .filter((f) => str(f.imagen))
      .map((f) => ({
        id: f.id,
        src: fileUrl(f, "imagen", "1200x0"),
        thumb: fileUrl(f, "imagen", "600x800"),
        titulo: str(f.titulo),
        descripcion: str(f.descripcion),
      }));
  } catch {
    // sin fotos reales no hay galería: la sección no se muestra
    return [];
  }
}

export async function getCapacitaciones(): Promise<Capacitacion[]> {
  try {
    const items = await list("capacitaciones", "&filter=" + encodeURIComponent("publicado = true") + "&sort=-fecha");
    return items.map((c) => ({
      id: c.id,
      titulo: str(c.titulo),
      tipo: (str(c.tipo) || "curso") as Capacitacion["tipo"],
      fecha: str(c.fecha).slice(0, 10),
      hora: str(c.hora),
      lugar: str(c.lugar),
      modalidad: str(c.modalidad),
      duracion: str(c.duracion),
      certificacion: str(c.certificacion),
      dirigidoA: str(c.dirigido_a),
      inversion: nb(str(c.inversion)),
      beneficio: nb(str(c.beneficio)),
      descripcion: str(c.descripcion),
      temas: arr<string>(c.temas),
      destacado: Boolean(c.destacado),
      inscripcionUrl: str(c.inscripcion_url),
      programaUrl: fileUrl(c, "programa_pdf") || str(c.programa_url),
      online: Boolean(c.online),
    }));
  } catch {
    return fallbackCapacitaciones();
  }
}
