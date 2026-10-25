/// <reference path="../pb_data/types.d.ts" />

// Galería de la comunidad (fotos de administradores y representantes) y logo de cada proveedor.

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";
const IMAGENES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

migrate(
  (app) => {
    const galeria = new Collection({
      type: "base",
      name: "galeria",
      listRule: "publicado = true || " + PANEL,
      viewRule: "publicado = true || " + PANEL,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "imagen", type: "file", required: true, maxSelect: 1, maxSize: 10485760, mimeTypes: IMAGENES, thumbs: ["600x800", "1200x0"] },
        { name: "titulo", type: "text", max: 120 },
        { name: "descripcion", type: "text", max: 240 },
        { name: "orden", type: "number", onlyInt: true },
        { name: "publicado", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(galeria);

    const proveedores = app.findCollectionByNameOrId("proveedores");
    proveedores.fields.add(
      new FileField({ name: "logo", maxSelect: 1, maxSize: 3145728, mimeTypes: [...IMAGENES, "image/svg+xml"], thumbs: ["160x160f"] })
    );
    app.save(proveedores);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("galeria"));
    } catch (_) {}
    const proveedores = app.findCollectionByNameOrId("proveedores");
    proveedores.fields.removeByName("logo");
    app.save(proveedores);
  }
);
