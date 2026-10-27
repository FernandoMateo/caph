/// <reference path="../pb_data/types.d.ts" />

// - profesionales: directorio público de profesionales asociados (administradores, contadores, abogados…).
//   Solo datos de contacto profesional; DNI, CUIT y domicilio particular no se cargan.
// - proveedores.descripcion: servicios de cada proveedor (de la planilla de socios adherentes), para
//   mostrarlos y para que el buscador de la web encuentre por servicio ("cámaras", "matafuegos"…).

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";
const IMAGENES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const DESCRIPCIONES = {
  "Croissant Seguridad": "Seguridad electrónica: instalación y monitoreo, control de accesos, cámaras, detección de incendios e intrusión, video portería. Distribuidor Hikvision y Garnet.",
  "Lheal Group": "Seguridad privada: vigilancia, seguridad e informaciones particulares.",
  "SPS Seguridad": "Seguridad privada física complementada con seguridad electrónica.",
  "Hidalgo Servicio Técnico": "Refrigeración, electricidad, plomería y reparación de electrodomésticos.",
  "Alejandro González · Paisajismo": "Paisajismo y jardinería.",
  "Todo Obras": "Gasista y electricista matriculado, sanitarista y refrigeración: instalación, reparación y mantenimiento.",
  "Tico Rojas": "Contratista de pintura, impermeabilizaciones, durlock y albañilería.",
  "Martín Rodríguez Pintura": "Pintura e impermeabilización.",
  "Punto y Chispa Herrería": "Herrería de obra.",
  "Bpines SF": "Llaveros y prendedores personalizados.",
  "Alarmas Santa Fe": "Instalación de alarmas y porteros eléctricos.",
  "FG Herrería y Muebles": "Herrería, carpintería y mantenimiento en general.",
  "Electricidad Alloatti": "Instalaciones eléctricas, mantenimiento y reparaciones en consorcios, comercios, industrias y domicilios.",
  "Pinte.x": "Pintura e impermeabilización de edificios, trabajos en altura.",
  "Servas Elevators": "Fabricación, instalación, modernización y mantenimiento de ascensores, rampas y escaleras mecánicas.",
  "Ascensores Santa Fe": "Fabricación, instalación, montaje y servicio de ascensores.",
  "Ascensores Belardinelli": "Transporte vertical: fabricación, montaje y mantenimiento de ascensores.",
  "Francisco Acevedo · Gas y plomería": "Gasista matriculado y plomero: instalaciones, reparaciones y control de fugas.",
  "Martín Gamboa": "Mantenimiento general: instalaciones eléctricas, sanitarias, de gas y especiales.",
  "UNISEG": "Broker de seguros.",
  "Octavo Piso": "Software para administradores de consorcios y barrios privados.",
  "RG Ascensores": "Mantenimiento y reparación de ascensores.",
  "Zea Ascensores": "Mantenimiento de ascensores.",
  "Casa Edel": "Venta de materiales eléctricos e iluminación.",
  "Edicer SF": "Ingeniería civil: patologías edilicias, reparaciones y obra nueva.",
  "Dodorico Energy": "Venta, mantenimiento y reparación de grupos electrógenos y bombas contra incendio.",
  "GM Climatización": "Venta, instalación y mantenimiento de calefacción, aire acondicionado y ventilación.",
  "Sagitario Comunicaciones": "Porteros, cámaras, alarmas, monitoreo y control de acceso.",
  "Kplac MC": "Placas antihumedad, pisos flotantes, revestimiento texturado, impermeabilización y pintura.",
  "SEGRUP Argentina SRL": "Seguridad electrónica y física.",
  "JG Seguridad": "Recarga y venta de matafuegos, seguridad contra incendios.",
  "DC Extintores": "Recarga y venta de extintores, seguridad contra incendios.",
  "La Segunda Seguridad": "Seguridad, vigilancia y monitoreo.",
  "M&L Seguridad y Servicios": "Seguridad y limpieza.",
  "GA Mantenimiento Edilicio": "Mantenimiento edilicio: plomería, electricidad, pintura, durlock, impermeabilización, herrería, zinguería y espacios verdes.",
  "M y L Empresa de Limpieza": "Servicio de limpieza de edificios y empresas.",
  "Braco Pintura en Altura": "Pintura en altura y de obra, revestimiento de frentes e hidrolavado.",
  "Génesis Limpieza y Mantenimiento": "Limpieza y mantenimiento de edificios y consorcios, electricista y plomero matriculados, piletas y césped.",
  "Lucas Sisterna Mascotto": "Electricidad, refrigeración y automatización de portones.",
  "Electricidad Ceirano": "Electricidad y sistemas de bombas.",
  "ONE DOR": "Control de acceso, portería inteligente, cámaras y alarmas.",
  "Argentina Limpia": "Limpieza de oficinas, edificios, centros comerciales y finales de obra.",
  "REDCONAR": "Software de gestión para administradores.",
  "PMP Servicios": "Limpieza de tanques y control de plagas.",
  "VOLTO S.A.S": "Agentes de inteligencia artificial para atención y reclamos por WhatsApp, Instagram, web y voz.",
  "José Manuel Dios · Libros de datos": "Libros de actas y registros para administración de consorcios.",
};

migrate(
  (app) => {
    const profesionales = new Collection({
      type: "base",
      name: "profesionales",
      listRule: "activo = true || " + PANEL,
      viewRule: "activo = true || " + PANEL,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "nombre", type: "text", required: true, max: 120 },
        { name: "estudio", type: "text", max: 120 },
        { name: "numero", type: "text", max: 20 },
        { name: "titulo", type: "text", max: 120 },
        { name: "localidad", type: "text", max: 80 },
        { name: "direccion", type: "text", max: 160 },
        { name: "telefono", type: "text", max: 40 },
        { name: "email", type: "text", max: 160 },
        { name: "web", type: "text", max: 300 },
        { name: "descripcion", type: "text", max: 400 },
        { name: "desde", type: "number", onlyInt: true, min: 1950, max: 2100 },
        { name: "foto", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: IMAGENES, thumbs: ["400x400f"] },
        { name: "verificado", type: "bool" },
        { name: "activo", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(profesionales);

    const proveedores = app.findCollectionByNameOrId("proveedores");
    proveedores.fields.add(new TextField({ name: "descripcion", max: 400 }));
    app.save(proveedores);
    for (const [nombre, descripcion] of Object.entries(DESCRIPCIONES)) {
      try {
        const r = app.findFirstRecordByData("proveedores", "nombre", nombre);
        if (!r.getString("descripcion")) {
          r.set("descripcion", descripcion);
          app.save(r);
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("profesionales"));
    } catch (_) {}
    const proveedores = app.findCollectionByNameOrId("proveedores");
    proveedores.fields.removeByName("descripcion");
    app.save(proveedores);
  }
);
