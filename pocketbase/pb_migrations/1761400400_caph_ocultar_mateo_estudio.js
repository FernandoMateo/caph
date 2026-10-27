/// <reference path="../pb_data/types.d.ts" />

// "Mateo Estudio" no está en la planilla de socios adherentes: se oculta del directorio sin borrarlo.
// Para volver a mostrarlo, marcar "activo" en el panel.
migrate(
  (app) => {
    let r;
    try {
      r = app.findFirstRecordByData("proveedores", "nombre", "Mateo Estudio");
    } catch (_) {
      return;
    }
    r.set("activo", false);
    app.save(r);
  },
  (app) => {}
);
