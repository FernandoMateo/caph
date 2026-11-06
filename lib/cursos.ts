// Capacitaciones online: tipos y utilidades compartidas entre el portal y el panel.

export type Modulo = { id: string; capacitacion: string; titulo: string; descripcion: string; orden: number };

export type Leccion = {
  id: string;
  collectionId: string;
  modulo: string;
  titulo: string;
  tipo: "video" | "pdf" | "texto";
  video_url: string;
  pdf: string;
  texto: string;
  duracion: number;
  orden: number;
};

export type Inscripcion = {
  id: string;
  cuenta: string;
  capacitacion: string;
  estado: "cursando" | "completada";
  completada_el: string;
  certificado: string;
  created: string;
};

export type Progreso = { id: string; inscripcion: string; leccion: string };

export const TIPOS_CAPACITACION: Record<string, string> = { programa: "Programa", curso: "Curso", capacitacion: "Capacitación", taller: "Taller" };

/**
 * Dirección para incrustar un video de YouTube o Vimeo (links comunes, cortos, shorts o ya incrustables).
 * null si no es de ninguno de los dos: entonces se muestra como link.
 */
export function videoEmbed(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}${vimeo[2] ? `?h=${vimeo[2]}` : ""}`;
  return null;
}

/** Lecciones ordenadas como en el temario: por módulo y dentro de cada uno. */
export function ordenar(modulos: Modulo[], lecciones: Leccion[]) {
  const orden = new Map([...modulos].sort((a, b) => a.orden - b.orden).map((m, i) => [m.id, i]));
  return [...lecciones].sort((a, b) => (orden.get(a.modulo) ?? 0) - (orden.get(b.modulo) ?? 0) || a.orden - b.orden);
}

/** Dirección de la verificación pública de un certificado. */
export const urlCertificado = (origen: string, codigo: string) => `${origen}/verificar/certificado/${codigo}`;
