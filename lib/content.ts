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
  TALLERES,
  TAREAS,
} from "./data";

const PB_URL = (process.env.PB_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const PB_PUBLIC_URL = (process.env.NEXT_PUBLIC_PB_URL || PB_URL).replace(/\/$/, "");

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

export type Proveedor = { n: string; r: string; v: boolean; tel?: string; web?: string; logo?: string };

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
  const url = `${PB_PUBLIC_URL}/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(f)}`;
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
    const items = await list("proveedores", "&filter=" + encodeURIComponent("activo = true") + "&sort=nombre");
    return items.map((p) => ({
      n: str(p.nombre),
      r: str(p.rubro) || "otros",
      v: Boolean(p.verificado),
      tel: str(p.telefono) || undefined,
      web: str(p.web) || undefined,
      logo: fileUrl(p, "logo", "160x160f") || undefined,
    }));
  } catch {
    return PROVEEDORES;
  }
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
    }));
  } catch {
    return fallbackCapacitaciones();
  }
}
