// Permisos del equipo del panel. El servidor los aplica en las reglas de cada colección
// (pb_migrations/1761401320_caph_equipo.js); acá solo deciden qué secciones se muestran.

export type Seccion =
  | "altas"
  | "profesionales"
  | "proveedores"
  | "contabilidad"
  | "capacitaciones"
  | "cursos"
  | "honorarios"
  | "galeria"
  | "textos";

export type UsuarioPanel = { id: string; email: string; name?: string; admin?: boolean; permisos?: Seccion[] };

/** Secciones con permiso propio, con lo que habilitan (para el formulario de Equipo). */
export const SECCIONES: { id: Seccion; nombre: string; detalle: string }[] = [
  { id: "altas", nombre: "Altas", detalle: "Aprobar o rechazar las solicitudes del portal." },
  { id: "profesionales", nombre: "Asociados y profesionales", detalle: "Fichas y accesos al portal." },
  { id: "proveedores", nombre: "Proveedores", detalle: "Fichas, logos y accesos al portal." },
  { id: "contabilidad", nombre: "Contabilidad", detalle: "Cuotas, pagos, tarifas y deuda." },
  { id: "capacitaciones", nombre: "Capacitaciones", detalle: "Agenda de capacitaciones." },
  { id: "cursos", nombre: "Cursos online", detalle: "Módulos, lecciones e inscriptos." },
  { id: "honorarios", nombre: "Honorarios", detalle: "Tabla de honorarios sugeridos." },
  { id: "galeria", nombre: "Galería", detalle: "Fotos de la comunidad." },
  { id: "textos", nombre: "Textos y rubros", detalle: "Textos de la web y rubros de proveedores." },
];

/** Sección que pide cada ruta del panel; "admin" = solo administradores. */
const RUTAS: [string, Seccion | "admin"][] = [
  ["/admin/altas", "altas"],
  ["/admin/profesionales", "profesionales"],
  ["/admin/proveedores", "proveedores"],
  ["/admin/contabilidad", "contabilidad"],
  ["/admin/capacitaciones", "capacitaciones"],
  ["/admin/cursos", "cursos"],
  ["/admin/honorarios", "honorarios"],
  ["/admin/galeria", "galeria"],
  ["/admin/textos", "textos"],
  ["/admin/datos", "admin"],
  ["/admin/equipo", "admin"],
];

export function puede(u: UsuarioPanel | null, ruta: string) {
  if (!u) return false;
  if (u.admin) return true;
  const r = RUTAS.find(([href]) => ruta.startsWith(href));
  if (!r) return true;
  return r[1] !== "admin" && !!u.permisos?.includes(r[1]);
}

/** Sección donde arranca al entrar a /admin: Honorarios si puede, si no la primera que tenga. */
export function inicio(u: UsuarioPanel | null) {
  if (puede(u, "/admin/honorarios")) return "/admin/honorarios";
  return RUTAS.find(([href]) => puede(u, href))?.[0] ?? null;
}
