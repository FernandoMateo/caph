/// <reference path="../pb_data/types.d.ts" />

// Cuotas para todos: la contabilidad que era solo de proveedores pasa a cubrir también a asociados y
// profesionales (colección profesionales), y cada usuario ve e informa sus pagos desde el portal.
// - suscripciones, cuotas y pagos: además de "proveedor", pueden ser de un "profesional" (uno de los dos).
// - profesionales.oculto_mora: como en proveedores, la mora oculta la ficha y deja el carnet no vigente.
// - pagos.estado: "informado" (lo cargó el usuario con su comprobante, falta que el panel lo confirme),
//   "confirmado" (cuenta para las cuotas) o "rechazado". Los pagos que ya estaban quedan confirmados.
// - tarifas: cuota e inscripción por tipo de alta; al aprobar un alta se le crea la cuota con esta tarifa.
// - cobro: datos para transferir que ve el usuario al informar un pago.
// - medios_debito: estructura para el débito automático (CBU, Mercado Pago, tarjeta); todavía sin integración.

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";
const TITULAR = "(@request.auth.collectionName = 'cuentas' && (proveedor.cuenta = @request.auth.id || profesional.cuenta = @request.auth.id))";
const LOGUEADO = "@request.auth.id != ''";

migrate(
  (app) => {
    const profesionales = app.findCollectionByNameOrId("profesionales");
    profesionales.fields.add(new BoolField({ name: "oculto_mora" }));
    profesionales.listRule =
      "(activo = true && estado = 'aprobado' && oculto_mora = false) || " +
      PANEL +
      " || (@request.auth.collectionName = 'cuentas' && cuenta = @request.auth.id)";
    profesionales.viewRule = profesionales.listRule;
    app.save(profesionales);

    const cuentas = app.findCollectionByNameOrId("cuentas");

    const medios = new Collection({
      type: "base",
      name: "medios_debito",
      listRule: PANEL + " || cuenta = @request.auth.id",
      viewRule: PANEL + " || cuenta = @request.auth.id",
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "cuenta", type: "relation", required: true, maxSelect: 1, collectionId: cuentas.id, cascadeDelete: true },
        { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["cbu", "mercadopago", "tarjeta"] },
        { name: "titular", type: "text", max: 120 },
        { name: "cuit", type: "text", max: 20 },
        { name: "cbu", type: "text", max: 22 },
        { name: "alias", type: "text", max: 40 },
        // id del mandato de débito o de la suscripción de Mercado Pago, cuando se integre
        { name: "referencia_externa", type: "text", max: 120 },
        { name: "estado", type: "select", required: true, maxSelect: 1, values: ["pendiente", "activo", "suspendido", "cancelado"] },
        { name: "nota", type: "text", max: 300 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(medios);

    for (const name of ["suscripciones", "cuotas", "pagos"]) {
      const col = app.findCollectionByNameOrId(name);
      col.fields.getByName("proveedor").required = false;
      // los pagos no se borran en cascada (como con proveedores): una ficha con pagos se oculta, no se elimina
      col.fields.add(new RelationField({ name: "profesional", maxSelect: 1, collectionId: profesionales.id, cascadeDelete: name !== "pagos" }));
      col.listRule = PANEL + " || " + TITULAR;
      col.viewRule = col.listRule;
      if (name === "suscripciones") {
        col.fields.add(new RelationField({ name: "debito", maxSelect: 1, collectionId: medios.id, cascadeDelete: false }));
        col.indexes = [
          "CREATE UNIQUE INDEX idx_suscripciones_proveedor ON suscripciones (proveedor) WHERE proveedor != ''",
          "CREATE UNIQUE INDEX idx_suscripciones_profesional ON suscripciones (profesional) WHERE profesional != ''",
        ];
      }
      if (name === "cuotas") {
        col.indexes = ["CREATE UNIQUE INDEX idx_cuotas_periodo ON cuotas (proveedor, profesional, tipo, periodo)"];
      }
      if (name === "pagos") {
        col.fields.getByName("medio").values = ["transferencia", "efectivo", "mercadopago", "cheque", "debito", "otro"];
        col.fields.add(new SelectField({ name: "estado", maxSelect: 1, values: ["informado", "confirmado", "rechazado"] }));
        col.fields.add(new RelationField({ name: "cuenta", maxSelect: 1, collectionId: cuentas.id, cascadeDelete: false }));
        col.fields.add(new TextField({ name: "motivo", max: 300 }));
        // el portal informa pagos; que la ficha sea suya lo controla pb_hooks/contabilidad.js
        col.createRule = PANEL + " || @request.auth.collectionName = 'cuentas'";
      }
      app.save(col);
    }
    for (const p of app.findAllRecords("pagos")) {
      p.set("estado", "confirmado");
      app.saveNoValidate(p);
    }

    const tarifas = new Collection({
      type: "base",
      name: "tarifas",
      listRule: LOGUEADO,
      viewRule: LOGUEADO,
      createRule: null,
      updateRule: PANEL,
      deleteRule: null,
      fields: [
        { name: "rol", type: "select", required: true, maxSelect: 1, values: ["asociado", "proveedor", "profesional"] },
        { name: "cuota_monto", type: "number", min: 0 },
        { name: "inscripcion_monto", type: "number", min: 0 },
        // día fijo de vencimiento; 0 = el día del alta
        { name: "dia_vencimiento", type: "number", min: 0, max: 31, onlyInt: true },
        // apagado: las altas de este tipo no generan cuotas (profesionales, por ahora)
        { name: "cobrar", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_tarifas_rol ON tarifas (rol)"],
    });
    app.save(tarifas);
    for (const [rol, monto, cobrar] of [
      ["asociado", 37500, true],
      ["proveedor", 18750, true],
      ["profesional", 0, false],
    ]) {
      const r = new Record(tarifas);
      r.set("rol", rol);
      r.set("cuota_monto", monto);
      r.set("inscripcion_monto", monto);
      r.set("dia_vencimiento", 0);
      r.set("cobrar", cobrar);
      app.save(r);
    }

    const cobro = new Collection({
      type: "base",
      name: "cobro",
      listRule: LOGUEADO,
      viewRule: LOGUEADO,
      createRule: null,
      updateRule: PANEL,
      deleteRule: null,
      fields: [
        { name: "datos_transferencia", type: "text", max: 1000 },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(cobro);
    app.save(new Record(cobro));
  },
  (app) => {
    for (const name of ["cobro", "tarifas"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    for (const name of ["suscripciones", "cuotas", "pagos"]) {
      const col = app.findCollectionByNameOrId(name);
      for (const r of app.findRecordsByFilter(name, "profesional != ''", "", 0, 0)) app.delete(r);
      for (const f of ["profesional", "debito", "estado", "cuenta", "motivo"]) col.fields.removeByName(f);
      col.fields.getByName("proveedor").required = true;
      col.listRule = PANEL;
      col.viewRule = PANEL;
      if (name === "suscripciones") col.indexes = ["CREATE UNIQUE INDEX idx_suscripciones_proveedor ON suscripciones (proveedor)"];
      if (name === "cuotas") col.indexes = ["CREATE UNIQUE INDEX idx_cuotas_periodo ON cuotas (proveedor, tipo, periodo)"];
      if (name === "pagos") {
        col.fields.getByName("medio").values = ["transferencia", "efectivo", "mercadopago", "cheque", "otro"];
        col.createRule = PANEL;
      }
      app.save(col);
    }
    try {
      app.delete(app.findCollectionByNameOrId("medios_debito"));
    } catch (_) {}
    const profesionales = app.findCollectionByNameOrId("profesionales");
    profesionales.fields.removeByName("oculto_mora");
    profesionales.listRule = "(activo = true && estado = 'aprobado') || " + PANEL + " || (@request.auth.collectionName = 'cuentas' && cuenta = @request.auth.id)";
    profesionales.viewRule = profesionales.listRule;
    app.save(profesionales);
  }
);
