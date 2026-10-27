/// <reference path="../pb_data/types.d.ts" />

// Contabilidad de las cuotas de los proveedores (solo para usuarios del panel, nada es público).
// - suscripciones: la cuenta de cada proveedor (cuota mensual, inscripción, alta y día de vencimiento).
// - cuotas: lo que se debe; las genera pb_hooks/contabilidad.pb.js cada mes.
// - pagos: lo que se cobró; se imputa solo a las cuotas más viejas.
// Un proveedor con una cuota impaga 1 mes y 10 días después de su vencimiento se oculta de la web (oculto_mora).

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";

migrate(
  (app) => {
    const proveedores = app.findCollectionByNameOrId("proveedores");
    proveedores.fields.add(new BoolField({ name: "oculto_mora" }));
    proveedores.listRule = "(activo = true && oculto_mora = false) || " + PANEL;
    proveedores.viewRule = "(activo = true && oculto_mora = false) || " + PANEL;
    app.save(proveedores);

    const suscripciones = new Collection({
      type: "base",
      name: "suscripciones",
      listRule: PANEL,
      viewRule: PANEL,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "proveedor", type: "relation", required: true, maxSelect: 1, collectionId: proveedores.id, cascadeDelete: true },
        { name: "cuota_monto", type: "number", required: true, min: 1 },
        { name: "inscripcion_monto", type: "number", min: 0 },
        { name: "fecha_alta", type: "date", required: true },
        { name: "dia_vencimiento", type: "number", required: true, min: 1, max: 31, onlyInt: true },
        { name: "activa", type: "bool" },
        { name: "nota", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_suscripciones_proveedor ON suscripciones (proveedor)"],
    });
    app.save(suscripciones);

    const cuotas = new Collection({
      type: "base",
      name: "cuotas",
      listRule: PANEL,
      viewRule: PANEL,
      createRule: null,
      updateRule: PANEL,
      deleteRule: null,
      fields: [
        { name: "proveedor", type: "relation", required: true, maxSelect: 1, collectionId: proveedores.id, cascadeDelete: true },
        { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["mensual", "inscripcion"] },
        { name: "periodo", type: "text", required: true, max: 7 },
        { name: "vencimiento", type: "date", required: true },
        { name: "monto", type: "number", min: 0 },
        { name: "pagado", type: "number", min: 0 },
        { name: "nota", type: "text", max: 300 },
        // editada a mano en el panel: ya no la toca el cambio de monto o de día de la suscripción
        { name: "ajustada", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_cuotas_periodo ON cuotas (proveedor, tipo, periodo)"],
    });
    app.save(cuotas);

    const pagos = new Collection({
      type: "base",
      name: "pagos",
      listRule: PANEL,
      viewRule: PANEL,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        // sin borrado en cascada: un proveedor con pagos no se puede eliminar (se oculta)
        { name: "proveedor", type: "relation", required: true, maxSelect: 1, collectionId: proveedores.id, cascadeDelete: false },
        { name: "fecha", type: "date", required: true },
        { name: "monto", type: "number", required: true, min: 0.01 },
        { name: "medio", type: "select", required: true, maxSelect: 1, values: ["transferencia", "efectivo", "mercadopago", "cheque", "otro"] },
        {
          name: "comprobante",
          type: "file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        },
        { name: "nota", type: "text", max: 300 },
        { name: "cargado_por", type: "text", max: 120 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(pagos);
  },
  (app) => {
    for (const name of ["pagos", "cuotas", "suscripciones"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const proveedores = app.findCollectionByNameOrId("proveedores");
    proveedores.fields.removeByName("oculto_mora");
    proveedores.listRule = "activo = true || " + PANEL;
    proveedores.viewRule = "activo = true || " + PANEL;
    app.save(proveedores);
  }
);
