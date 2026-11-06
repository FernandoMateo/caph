/// <reference path="../pb_data/types.d.ts" />

// Contenido editable desde el panel:
// - contenidos: textos de la home (clave → valor). Lo que no está cargado usa el texto por defecto del código (lib/textos.ts).
// - rubros: los rubros del directorio de proveedores. pb_hooks/rubros.pb.js mantiene sincronizadas las opciones
//   del campo proveedores.rubro, así que agregar o renombrar un rubro no necesita tocar la base a mano.
// - profesionales.foto: miniatura vertical 600x750 para el carrusel de la web.

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";

const RUBROS = [
  ["seguridad", "Seguridad y vigilancia"],
  ["ascensores", "Ascensores"],
  ["electricidad", "Electricidad e iluminación"],
  ["climatizacion", "Climatización"],
  ["mantenimiento", "Mantenimiento edilicio"],
  ["pintura", "Pintura e impermeabilización"],
  ["herreria", "Herrería y carpintería"],
  ["limpieza", "Limpieza"],
  ["equipos", "Equipos especializados"],
  ["seguros", "Seguros y software"],
  ["otros", "Otros servicios"],
];

migrate(
  (app) => {
    const contenidos = new Collection({
      type: "base",
      name: "contenidos",
      listRule: "",
      viewRule: "",
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "clave", type: "text", required: true, max: 80, pattern: "^[a-z0-9_]+$" },
        { name: "valor", type: "text", max: 5000 },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_contenidos_clave ON contenidos (clave)"],
    });
    app.save(contenidos);

    const rubros = new Collection({
      type: "base",
      name: "rubros",
      listRule: "",
      viewRule: "",
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        // la clave se arma sola con el nombre al crearlo y no cambia: es lo que guarda cada proveedor
        { name: "clave", type: "text", max: 40, pattern: "^[a-z0-9_]*$" },
        { name: "nombre", type: "text", required: true, max: 80 },
        { name: "orden", type: "number", onlyInt: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_rubros_clave ON rubros (clave)"],
    });
    app.save(rubros);
    RUBROS.forEach(([clave, nombre], i) => {
      const r = new Record(rubros);
      r.set("clave", clave);
      r.set("nombre", nombre);
      r.set("orden", i + 1);
      app.save(r);
    });

    const profesionales = app.findCollectionByNameOrId("profesionales");
    profesionales.fields.getByName("foto").thumbs = ["400x400f", "600x750"];
    app.save(profesionales);
  },
  (app) => {
    for (const name of ["contenidos", "rubros"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const profesionales = app.findCollectionByNameOrId("profesionales");
    profesionales.fields.getByName("foto").thumbs = ["400x400f"];
    app.save(profesionales);
  }
);
