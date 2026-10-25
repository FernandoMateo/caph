/// <reference path="../pb_data/types.d.ts" />

// Colecciones de contenido de la web CAPH Santa Fe + carga inicial con los datos de caphsf.ar (oct 2026).
// Lectura pública; escritura solo para usuarios del panel (colección "users").

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";

const RUBROS = [
  "seguridad",
  "ascensores",
  "electricidad",
  "climatizacion",
  "mantenimiento",
  "pintura",
  "herreria",
  "limpieza",
  "equipos",
  "seguros",
  "otros",
];

const timestamps = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

migrate(
  (app) => {
    // ---------- colecciones ----------
    const ajustes = new Collection({
      type: "base",
      name: "honorarios_ajustes",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: PANEL,
      deleteRule: null,
      fields: [
        { name: "periodo", type: "text", required: true, max: 120 },
        { name: "pdf", type: "file", maxSelect: 1, maxSize: 15728640, mimeTypes: ["application/pdf"] },
        { name: "pdf_url", type: "text", max: 500 },
        { name: "bonificaciones", type: "json", maxSize: 20000 },
        { name: "notas", type: "json", maxSize: 20000 },
        { name: "amenities", type: "json", maxSize: 20000 },
        ...timestamps,
      ],
    });
    app.save(ajustes);

    const categorias = new Collection({
      type: "base",
      name: "honorarios_categorias",
      listRule: "",
      viewRule: "",
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "codigo", type: "text", required: true, max: 4 },
        { name: "nombre", type: "text", required: true, max: 80 },
        { name: "descripcion", type: "text", max: 300 },
        { name: "minimo20", type: "number", required: true, min: 0, onlyInt: true },
        { name: "por_uf", type: "number", required: true, min: 0, onlyInt: true },
        { name: "cochera", type: "number", required: true, min: 0, onlyInt: true },
        { name: "orden", type: "number", onlyInt: true },
        ...timestamps,
      ],
    });
    app.save(categorias);

    const tareas = new Collection({
      type: "base",
      name: "honorarios_tareas",
      listRule: "",
      viewRule: "",
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "nombre", type: "text", required: true, max: 120 },
        { name: "detalle", type: "text", max: 300 },
        { name: "valor", type: "text", required: true, max: 40 },
        { name: "orden", type: "number", onlyInt: true },
        ...timestamps,
      ],
    });
    app.save(tareas);

    const proveedores = new Collection({
      type: "base",
      name: "proveedores",
      listRule: "activo = true || " + PANEL,
      viewRule: "activo = true || " + PANEL,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "nombre", type: "text", required: true, max: 120 },
        { name: "rubro", type: "select", required: true, maxSelect: 1, values: RUBROS },
        { name: "telefono", type: "text", max: 40 },
        { name: "web", type: "text", max: 300 },
        { name: "verificado", type: "bool" },
        { name: "activo", type: "bool" },
        ...timestamps,
      ],
    });
    app.save(proveedores);

    const capacitaciones = new Collection({
      type: "base",
      name: "capacitaciones",
      listRule: "publicado = true || " + PANEL,
      viewRule: "publicado = true || " + PANEL,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "titulo", type: "text", required: true, max: 200 },
        { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["programa", "curso", "capacitacion", "taller"] },
        { name: "fecha", type: "date", required: true },
        { name: "hora", type: "text", max: 40 },
        { name: "lugar", type: "text", max: 200 },
        { name: "modalidad", type: "text", max: 80 },
        { name: "duracion", type: "text", max: 80 },
        { name: "certificacion", type: "text", max: 120 },
        { name: "dirigido_a", type: "text", max: 300 },
        { name: "inversion", type: "text", max: 200 },
        { name: "beneficio", type: "text", max: 300 },
        { name: "descripcion", type: "text", max: 1000 },
        { name: "temas", type: "json", maxSize: 20000 },
        { name: "destacado", type: "bool" },
        { name: "publicado", type: "bool" },
        { name: "inscripcion_url", type: "text", max: 500 },
        { name: "programa_pdf", type: "file", maxSelect: 1, maxSize: 15728640, mimeTypes: ["application/pdf"] },
        { name: "programa_url", type: "text", max: 500 },
        ...timestamps,
      ],
    });
    app.save(capacitaciones);

    // ---------- carga inicial ----------
    const put = (col, data) => {
      const r = new Record(col);
      for (const k in data) r.set(k, data[k]);
      app.save(r);
    };

    put(ajustes, {
      periodo: "Octubre y noviembre 2026",
      pdf_url: "https://caphsf.ar/CAPHSF%20-%20Honorarios%202026-10%20y%202026-11.pdf",
      bonificaciones: [
        { desde: 30, pct: 5 },
        { desde: 50, pct: 10 },
        { desde: 65, pct: 15 },
        { desde: 80, pct: 20 },
      ],
      notas: [
        "Las unidades complementarias (cocheras, guardacoches, bauleras) se tarifan en un 30 % de una unidad funcional.",
        "Los honorarios no varían por zona dentro de una misma ciudad.",
        "No incluyen IVA, impuestos provinciales, servicios de computación ni comisiones por gestión de cobranzas de expensas.",
      ],
      amenities: [
        "Empresa de vigilancia",
        "Agua caliente, calefacción central y energía solar",
        "Jardín central (mayor de 10 m²), parque o áreas con vegetación",
        "SUM, parrillero, quincho, solárium o lavandería",
        "Salas de bombeo de napas, montacoches, grupo electrógeno",
        "Natatorio, gimnasio, saunas, canchas deportivas",
        "Inmuebles para ingresos económicos o casa de portería",
        "Desagote de cámara séptica",
        "Servicios centrales no tipificados",
      ],
    });

    [
      ["A", "Súper confort", "Súper confort o conjuntos inmobiliarios con 3 o más servicios centrales / amenities", 553700, 23480, 8300],
      ["B", "Confort", "Confort con hasta 2 servicios centrales / amenities", 450000, 18700, 6750],
      ["C", "Servicios comunes", "Solo servicios comunes", 346000, 15800, 5190],
      ["D", "Vivienda social", "Viviendas sociales (FONAVI, BHN, institutos provinciales de vivienda)", 277800, 12840, 4170],
    ].forEach(([codigo, nombre, descripcion, minimo20, por_uf, cochera], i) =>
      put(categorias, { codigo, nombre, descripcion, minimo20, por_uf, cochera, orden: i + 1 })
    );

    [
      ["Asambleas extraordinarias", "Solicitadas por el consorcio", "$ 140.900"],
      ["Mediación", "Por audiencia, pública o privada", "$ 134.700"],
      ["Rendición y traspaso", "", "$ 280.260"],
      ["Libre deuda", "Certificado de libre deuda de expensas", "$ 18.400"],
      ["Gestión administrativa", "Depósito de embargo de sueldos, sobre el monto (mínimo $ 28.000)", "10 %"],
      ["Gestión de negocios", "Cobro a empresas que operan con consorcios", "5 %"],
    ].forEach(([nombre, detalle, valor], i) => put(tareas, { nombre, detalle, valor, orden: i + 1 }));

    put(capacitaciones, {
      titulo: "Programa Superior en Administración Estratégica de Consorcios",
      tipo: "programa",
      fecha: "2026-04-28 12:00:00.000Z",
      modalidad: "100 % virtual",
      duracion: "4 meses",
      certificacion: "Oficial CAPH Santa Fe",
      dirigido_a: "Administradores en ejercicio, aspirantes, contadores y abogados",
      inversion: "Inscripción $ 150.000 y 4 cuotas de $ 70.000",
      beneficio: "Asociados: inscripción gratis y cuota mensual bonificada al 50 %.",
      descripcion: "Formación de 4 meses para profesionalizar el rol.",
      temas: [],
      destacado: true,
      publicado: true,
      programa_url:
        "https://caphsf.ar/CAPH%20SANTA%20FE%20Curso%20Cuatrimestral%20-%20Programa%20Sup%20Act.%20-%20Admin.%20Estrategica%20y%20Profesional%20de%20Consorcios.%20inicio%2028-04-2026.pdf",
    });
    put(capacitaciones, {
      titulo: "Gestión de ascensores 2026",
      tipo: "capacitacion",
      fecha: "2026-10-01 22:00:00.000Z",
      hora: "19 h",
      lugar: "UTN Santa Fe",
      modalidad: "Presencial",
      temas: [
        "Funcionamiento y partes críticas",
        "Obligaciones del consorcio y de la empresa conservadora",
        "Criterios para evaluar y contratar proveedores",
        "Seguros e implicancias legales ante accidentes",
      ],
      destacado: false,
      publicado: true,
    });
    put(capacitaciones, {
      titulo: "Especialización en gas natural en edificios",
      tipo: "taller",
      fecha: "2026-06-04 19:00:00.000Z",
      hora: "16 h",
      lugar: "Oficina Litoral Gas, Belgrano 3300",
      modalidad: "Presencial",
      temas: ["Normativa y regulaciones", "Procedimientos de seguridad"],
      destacado: false,
      publicado: true,
    });
  },
  (app) => {
    for (const name of ["capacitaciones", "proveedores", "honorarios_tareas", "honorarios_categorias", "honorarios_ajustes"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
  }
);
