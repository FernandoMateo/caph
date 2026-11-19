/// <reference path="../pb_data/types.d.ts" />

// tour_visto: el recorrido guiado del primer ingreso ya se mostró (o se salteó).
// - cuentas: el portal de asociados, proveedores y profesionales.
// - users: el panel de la Cámara.
// Cada uno lo marca sobre su propio registro (las reglas ya lo permiten); "Ver el recorrido" lo repite sin desmarcarlo.

migrate(
  (app) => {
    for (const nombre of ["cuentas", "users"]) {
      const col = app.findCollectionByNameOrId(nombre);
      if (!col.fields.getByName("tour_visto")) col.fields.add(new BoolField({ name: "tour_visto" }));
      app.save(col);
    }
  },
  (app) => {
    for (const nombre of ["cuentas", "users"]) {
      const col = app.findCollectionByNameOrId(nombre);
      col.fields.removeByName("tour_visto");
      app.save(col);
    }
  }
);
