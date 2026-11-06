// Textos de la home que se editan desde el panel (/admin/textos). Se guardan en la colección "contenidos"
// (clave → valor); lo que no está cargado usa el valor por defecto de acá, que es el texto original de la web.

export type CampoTexto = {
  clave: string;
  label: string;
  /** linea: una línea; parrafo: varias; lista: un ítem por renglón ("Título: descripción" si tiene dos partes); si_no. */
  tipo: "linea" | "parrafo" | "lista" | "si_no";
  ayuda?: string;
  defecto: string;
};

export const SECCIONES_TEXTOS: { titulo: string; campos: CampoTexto[] }[] = [
  {
    titulo: "Inicio",
    campos: [
      { clave: "hero_titulo", label: "Título", tipo: "linea", defecto: "La fuerza de una profesión," },
      { clave: "hero_destacado", label: "Título, segunda parte", tipo: "linea", ayuda: "Se muestra en otro color.", defecto: "la fuerza de sus protagonistas." },
      { clave: "hero_bajada", label: "Bajada", tipo: "parrafo", defecto: "La Cámara que representa a los administradores de consorcios de Santa Fe, 1.ª Circunscripción." },
    ],
  },
  {
    titulo: "La Cámara",
    campos: [
      { clave: "camara_titulo", label: "Título", tipo: "linea", defecto: "Uniendo a la comunidad" },
      { clave: "camara_destacado", label: "Título, segunda parte", tipo: "linea", ayuda: "Se muestra más suave.", defecto: "de administradores." },
      {
        clave: "camara_texto",
        label: "Texto",
        tipo: "parrafo",
        defecto:
          "CAPH Santa Fe existe para que los administradores no trabajen solos. Defendemos los intereses del sector ante organismos públicos y privados, fomentamos la colaboración entre colegas y elevamos los estándares de la profesión, para que propietarios e inquilinos tengan administraciones más seguras y transparentes.",
      },
    ],
  },
  {
    titulo: "Asociate",
    campos: [
      { clave: "asociarse_titulo", label: "Título", tipo: "linea", defecto: "Sumá tu voz a la Cámara" },
      {
        clave: "asociarse_texto",
        label: "Texto",
        tipo: "parrafo",
        defecto: "Ser parte te da el respaldo y las herramientas para crecer profesionalmente y fortalecer tu red en el sector.",
      },
      {
        clave: "beneficios",
        label: "Beneficios",
        tipo: "lista",
        ayuda: "Uno por renglón, con el formato «Título: descripción».",
        defecto: [
          "Defensa de intereses: Representación del sector ante organismos públicos y privados.",
          "Capacitaciones exclusivas: Talleres, cursos y seminarios, con bonificaciones para asociados.",
          "Asesoramiento integral: Soporte legal, contable y técnico para tu práctica diaria.",
          "Documentación y alertas: Documentación modelo, normativas y novedades de la propiedad horizontal.",
          "Networking: Conexión con colegas y nuevas oportunidades de trabajo.",
          "Voz institucional: Tu opinión cuenta en las decisiones que afectan a la profesión.",
        ].join("\n"),
      },
    ],
  },
  {
    titulo: "Convocatoria",
    campos: [
      { clave: "conv_visible", label: "Mostrar la convocatoria en la web", tipo: "si_no", defecto: "si" },
      { clave: "conv_titulo", label: "Título", tipo: "linea", defecto: "Convocatoria abierta a arquitectos matriculados" },
      {
        clave: "conv_texto",
        label: "Texto",
        tipo: "parrafo",
        defecto:
          "Sumate a la red de asistencia técnica. En convenio con el Colegio de Arquitectura y Urbanismo de la Provincia de Santa Fe, Distrito 1, armamos una nómina de profesionales para asesorar a los administradores asociados.",
      },
      { clave: "conv_url", label: "Link de inscripción", tipo: "linea", ayuda: "Formulario o página donde se inscriben.", defecto: "https://forms.gle/tcqJTEWSaUrX8EiC9" },
      {
        clave: "conv_letra_chica",
        label: "Letra chica",
        tipo: "parrafo",
        defecto:
          "Los datos se cotejan con el Colegio para verificar la matrícula. Integrar la nómina no implica contratación automática. CPN Natalia Cerquetti, Presidenta CAPH Santa Fe.",
      },
      {
        clave: "conv_areas",
        label: "Áreas de intervención",
        tipo: "lista",
        ayuda: "Una por renglón.",
        defecto: [
          "Evaluación edilicia y mantenimiento",
          "Diagnóstico de patologías, filtraciones, humedades y deterioros estructurales",
          "Inspección y seguimiento de obras",
          "Informes técnicos, relevamientos y presupuestos",
          "Seguridad edilicia y normativa",
        ].join("\n"),
      },
    ],
  },
];

export type Textos = Record<string, string>;

export const CAMPOS_TEXTOS = SECCIONES_TEXTOS.flatMap((s) => s.campos);

export const textosPorDefecto = (): Textos => Object.fromEntries(CAMPOS_TEXTOS.map((c) => [c.clave, c.defecto]));

/** Los renglones no vacíos de un texto tipo lista. */
export const renglones = (valor: string) =>
  valor
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** "Título: descripción" → [título, descripción]. */
export function parTitulo(linea: string): [string, string] {
  const i = linea.indexOf(":");
  return i > 0 ? [linea.slice(0, i).trim(), linea.slice(i + 1).trim()] : [linea, ""];
}
