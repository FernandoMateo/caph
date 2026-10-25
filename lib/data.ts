// Contenido real tomado de caphsf.ar (octubre 2026).

export const LINKS = {
  asociarse: "https://forms.gle/chZKbeG8PhVot8xK8",
  proveedor: "https://forms.gle/xbYahAh3qgD8gKq46",
  convocatoria: "https://forms.gle/tcqJTEWSaUrX8EiC9",
  whatsapp: "https://wa.me/5493426262759",
  whatsappLabel: "+54 9 342 626-2759",
  instagram: "https://www.instagram.com/camaradephdesantafe",
  honorariosPdf: "https://caphsf.ar/CAPHSF%20-%20Honorarios%202026-10%20y%202026-11.pdf",
  mediacionPdf: "https://caphsf.ar/Area_Gestion_Conciliacion_CAPHSF_FINAL.pdf",
  programaPdf:
    "https://caphsf.ar/CAPH%20SANTA%20FE%20Curso%20Cuatrimestral%20-%20Programa%20Sup%20Act.%20-%20Admin.%20Estrategica%20y%20Profesional%20de%20Consorcios.%20inicio%2028-04-2026.pdf",
  direccion: "Francia 2841, Santa Fe",
  mapa: "https://www.google.com/maps/search/?api=1&query=Francia+2841+Santa+Fe+Argentina",
};

export const NOMBRE_LEGAL =
  "Cámara de Administradores de Edificios en Propiedad Horizontal, Fideicomisos Constructivos, Conjuntos Inmobiliarios y Desarrollos Urbanos de la Provincia de Santa Fe, 1.ª Circunscripción";

/* ---------- Honorarios sugeridos ---------- */

export const HONORARIOS_PERIODO = "Octubre y noviembre 2026";

export type Categoria = {
  id: "A" | "B" | "C" | "D";
  nombre: string;
  descripcion: string;
  minimo20: number;
  porUfDesde21: number;
  cochera: number;
};

export const CATEGORIAS: Categoria[] = [
  {
    id: "A",
    nombre: "Súper confort",
    descripcion: "Súper confort o conjuntos inmobiliarios con 3 o más servicios centrales / amenities",
    minimo20: 553700,
    porUfDesde21: 23480,
    cochera: 8300,
  },
  {
    id: "B",
    nombre: "Confort",
    descripcion: "Confort con hasta 2 servicios centrales / amenities",
    minimo20: 450000,
    porUfDesde21: 18700,
    cochera: 6750,
  },
  {
    id: "C",
    nombre: "Servicios comunes",
    descripcion: "Solo servicios comunes",
    minimo20: 346000,
    porUfDesde21: 15800,
    cochera: 5190,
  },
  {
    id: "D",
    nombre: "Vivienda social",
    descripcion: "Viviendas sociales (FONAVI, BHN, institutos provinciales de vivienda)",
    minimo20: 277800,
    porUfDesde21: 12840,
    cochera: 4170,
  },
];

export const BONIFICACIONES = [
  { desde: 80, pct: 20 },
  { desde: 65, pct: 15 },
  { desde: 50, pct: 10 },
  { desde: 30, pct: 5 },
];

export const TAREAS = [
  { nombre: "Asambleas extraordinarias", detalle: "Solicitadas por el consorcio", valor: "$ 140.900" },
  { nombre: "Mediación", detalle: "Por audiencia, pública o privada", valor: "$ 134.700" },
  { nombre: "Rendición y traspaso", detalle: "", valor: "$ 280.260" },
  { nombre: "Libre deuda", detalle: "Certificado de libre deuda de expensas", valor: "$ 18.400" },
  { nombre: "Gestión administrativa", detalle: "Depósito de embargo de sueldos, sobre el monto (mínimo $ 28.000)", valor: "10 %" },
  { nombre: "Gestión de negocios", detalle: "Cobro a empresas que operan con consorcios", valor: "5 %" },
];

export const AMENITIES = [
  "Empresa de vigilancia",
  "Agua caliente, calefacción central y energía solar",
  "Jardín central (mayor de 10 m²), parque o áreas con vegetación",
  "SUM, parrillero, quincho, solárium o lavandería",
  "Salas de bombeo de napas, montacoches, grupo electrógeno",
  "Natatorio, gimnasio, saunas, canchas deportivas",
  "Inmuebles para ingresos económicos o casa de portería",
  "Desagote de cámara séptica",
  "Servicios centrales no tipificados",
];

export const NOTAS_HONORARIOS = [
  "Las unidades complementarias (cocheras, guardacoches, bauleras) se tarifan en un 30 % de una unidad funcional.",
  "Los honorarios no varían por zona dentro de una misma ciudad.",
  "No incluyen IVA, impuestos provinciales, servicios de computación ni comisiones por gestión de cobranzas de expensas.",
];

/* ---------- Capacitaciones ---------- */

export const PROGRAMA = {
  titulo: "Programa Superior en Administración Estratégica de Consorcios",
  bajada: "Formación de 4 meses para profesionalizar el rol.",
  inicio: "2026-04-28",
  datos: [
    ["Modalidad", "100 % virtual"],
    ["Duración", "4 meses"],
    ["Certificación", "Oficial CAPH Santa Fe"],
    ["Dirigido a", "Administradores en ejercicio, aspirantes, contadores y abogados"],
    ["Inversión", "Inscripción $ 150.000 y 4 cuotas de $ 70.000"],
  ] as [string, string][],
  beneficio: "Asociados: inscripción gratis y cuota mensual bonificada al 50 %.",
};

export const TALLERES = [
  {
    titulo: "Gestión de ascensores 2026",
    tipo: "Capacitación presencial",
    fecha: "2026-10-01",
    hora: "19 h",
    lugar: "UTN Santa Fe",
    temas: [
      "Funcionamiento y partes críticas",
      "Obligaciones del consorcio y de la empresa conservadora",
      "Criterios para evaluar y contratar proveedores",
      "Seguros e implicancias legales ante accidentes",
    ],
  },
  {
    titulo: "Especialización en gas natural en edificios",
    tipo: "Taller presencial",
    fecha: "2026-06-04",
    hora: "16 h",
    lugar: "Oficina Litoral Gas, Belgrano 3300",
    temas: ["Normativa y regulaciones", "Procedimientos de seguridad"],
  },
];

/* ---------- Proveedores ---------- */

export const RUBROS: Record<string, string> = {
  seguridad: "Seguridad y vigilancia",
  ascensores: "Ascensores",
  electricidad: "Electricidad e iluminación",
  climatizacion: "Climatización",
  mantenimiento: "Mantenimiento edilicio",
  pintura: "Pintura e impermeabilización",
  herreria: "Herrería y carpintería",
  limpieza: "Limpieza",
  equipos: "Equipos especializados",
  seguros: "Seguros y software",
  otros: "Otros servicios",
};

export type Proveedor = { n: string; r: keyof typeof RUBROS | string; v: boolean; tel?: string; web?: string };

export const PROVEEDORES: Proveedor[] = [
  { n: "SPS Seguridad", r: "seguridad", v: false, tel: "3424387043" },
  { n: "Pinte.x", r: "pintura", v: true, tel: "3424487865", web: "https://www.instagram.com/pinte.x/" },
  { n: "Martín Rodríguez Pintura", r: "pintura", v: true, tel: "3424429552", web: "https://www.instagram.com/rodriguezpintura/" },
  { n: "Electricidad Alloatti", r: "electricidad", v: true, tel: "03425170318", web: "https://www.instagram.com/electricidad.alloatti/" },
  { n: "Punto y Chispa Herrería", r: "herreria", v: true, tel: "3426267639", web: "https://www.instagram.com/puntochispa/" },
  { n: "FG Herrería y Muebles", r: "herreria", v: true, tel: "3425129922", web: "https://www.instagram.com/herreria_y_muebles_de_estilo/" },
  { n: "Lheal Group", r: "otros", v: true, tel: "3424751070", web: "https://www.instagram.com/lheal_group/" },
  { n: "Tico Rojas", r: "otros", v: true, tel: "3425451355", web: "https://www.instagram.com/ticorojas29172/" },
  { n: "VOLTO S.A.S", r: "otros", v: true, tel: "3425194298", web: "https://volto.dev" },
  { n: "José Manuel Dios · Libros de datos", r: "otros", v: true, tel: "3425194298", web: "https://www.librosdedatos.com.ar" },
  { n: "Casa Edel", r: "otros", v: true, tel: "3425527863", web: "https://www.instagram.com/casa.edel/" },
  { n: "Croissant Seguridad", r: "seguridad", v: true, tel: "3425158468", web: "https://www.instagram.com/croissantalarmas/" },
  { n: "DC Extintores", r: "seguridad", v: true },
  { n: "UNISEG", r: "seguros", v: true, tel: "3425044067", web: "https://www.instagram.com/uniseg_/" },
  { n: "Dodorico Energy", r: "equipos", v: true, tel: "3425464427", web: "https://www.instagram.com/dodoricoenergy/" },
  { n: "Alarmas Santa Fe", r: "seguridad", v: true, tel: "03424531968", web: "https://www.facebook.com/ALARMASSANTAFE/" },
  { n: "Todo Obras", r: "mantenimiento", v: true, web: "https://www.instagram.com/todo.obras.st/" },
  { n: "Bpines SF", r: "otros", v: true, tel: "3424084732", web: "https://www.instagram.com/bpines.sf/" },
  { n: "Alejandro González", r: "otros", v: true },
  { n: "PMP Servicios", r: "otros", v: true, tel: "13426156860", web: "https://www.instagram.com/pmp_servicios/" },
  { n: "REDCONAR", r: "otros", v: true, tel: "1132959058", web: "https://www.instagram.com/redconar/" },
  { n: "ONE DOR", r: "seguridad", v: true, tel: "3424097575" },
  { n: "Lucas Sisterna Mascotto", r: "electricidad", v: true, tel: "3425365879" },
  { n: "Electricidad Ceirano", r: "electricidad", v: true, tel: "3425760772" },
  { n: "Braco Pintura en Altura", r: "pintura", v: true, tel: "3424056075" },
  { n: "Génesis Limpieza y Mantenimiento", r: "limpieza", v: true, tel: "3412511358" },
  { n: "GM Climatización", r: "climatizacion", v: false, tel: "3424863308" },
  { n: "Edicer SF", r: "otros", v: true, tel: "3434152638", web: "https://www.instagram.com/edicer.sf/" },
  { n: "Martín Gamboa", r: "otros", v: false, tel: "3424471067" },
  { n: "SEGRUP Argentina SRL", r: "seguridad", v: true, tel: "3416213628", web: "https://www.segrup.com.ar" },
  { n: "Zea Ascensores", r: "ascensores", v: true, tel: "3425989171", web: "https://www.facebook.com/zeaascensores/" },
  { n: "Servas Elevators", r: "ascensores", v: true, tel: "5491136966897", web: "https://www.servas.com/" },
  { n: "M y L Empresa de Limpieza", r: "limpieza", v: true, tel: "36425151500", web: "https://www.instagram.com/myllimpiezaprofesional" },
  { n: "JG Seguridad", r: "seguridad", v: true, tel: "3424875783", web: "https://www.instagram.com/_jgseguridad_/" },
  { n: "Hidalgo Servicio Técnico", r: "ascensores", v: true, tel: "3424784467", web: "https://www.instagram.com/hidalgo.serviciotecnico/" },
  { n: "La Segunda Seguridad", r: "seguridad", v: true, tel: "3425482756", web: "https://lasegundaseguridad.com.ar" },
  { n: "Ascensores Belardinelli", r: "ascensores", v: true, tel: "3416024071", web: "https://www.instagram.com/ascensoresbelardinelli/" },
  { n: "RG Ascensores", r: "ascensores", v: true, tel: "3425379435", web: "https://www.instagram.com/rgascensores/" },
  { n: "Octavo Piso", r: "seguros", v: true, tel: "1123872905", web: "https://www.instagram.com/octavopiso.ar" },
  { n: "Ascensores Santa Fe", r: "ascensores", v: true, tel: "03426523600", web: "https://www.instagram.com/ascensoressantafe/" },
];

/* ---------- Validador: DATOS DE EJEMPLO ----------
   Reemplazar por el padrón real de asociados (API o planilla) antes de publicar. */

export type Asociado = { numero: string; nombre: string; dni: string; activo: boolean };

export const PADRON_DEMO: Asociado[] = [
  { numero: "0001", nombre: "Ejemplo, Lucía", dni: "00000001", activo: true },
  { numero: "0002", nombre: "Prueba, Martín", dni: "00000002", activo: true },
  { numero: "0003", nombre: "Demo, Carolina", dni: "00000003", activo: false },
  { numero: "0004", nombre: "Muestra, Julián", dni: "00000004", activo: true },
];
