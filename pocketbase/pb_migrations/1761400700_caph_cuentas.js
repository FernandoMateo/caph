/// <reference path="../pb_data/types.d.ts" />

// Portal de usuarios: cuentas propias para asociados, proveedores y profesionales, y aprobación manual de sus fichas.
// - cuentas: el login de cada usuario del portal. Sus datos (DNI/CUIT, teléfono personal) solo los ven el dueño y el panel.
// - profesionales: guarda a los asociados (administradores de consorcios) y a los profesionales; "rol" los distingue.
//   Las fichas que ya estaban son de asociados.
// - profesionales y proveedores: "estado" (pendiente → aprobado o rechazado) y "cuenta" (el dueño de la ficha).
//   La web muestra solo las aprobadas; las que ya estaban quedan aprobadas.
// Qué puede tocar cada uno y qué datos son obligatorios lo deciden pb_hooks/fichas.pb.js.

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";
const DUENO = "(@request.auth.collectionName = 'cuentas' && cuenta = @request.auth.id)";
const CREA_DUENO = "(@request.auth.collectionName = 'cuentas' && @request.body.cuenta = @request.auth.id)";
const NO_CAMBIA_DUENO = "(@request.body.cuenta:isset = false || @request.body.cuenta = @request.auth.id)";

const ESTADOS_FICHA = ["pendiente", "aprobado", "rechazado"];

function camposFicha(col, cuentas) {
  col.fields.add(new SelectField({ name: "estado", maxSelect: 1, values: ESTADOS_FICHA }));
  col.fields.add(new RelationField({ name: "cuenta", maxSelect: 1, collectionId: cuentas.id, cascadeDelete: false }));
  // por qué se rechazó: lo lee el usuario en su portal
  col.fields.add(new TextField({ name: "motivo", max: 500 }));
  // el dueño cambió una ficha ya publicada: el panel la revisa
  col.fields.add(new BoolField({ name: "revisar" }));
}

migrate(
  (app) => {
    const cuentas = new Collection({
      type: "auth",
      name: "cuentas",
      listRule: "id = @request.auth.id || " + PANEL,
      viewRule: "id = @request.auth.id || " + PANEL,
      createRule: "",
      updateRule: "id = @request.auth.id || " + PANEL,
      deleteRule: PANEL,
      manageRule: PANEL,
      authRule: "estado != 'baja'",
    });
    cuentas.fields.add(new TextField({ name: "name", required: true, max: 120 }));
    cuentas.fields.add(new SelectField({ name: "rol", required: true, maxSelect: 1, values: ["asociado", "proveedor", "profesional"] }));
    cuentas.fields.add(
      new SelectField({ name: "estado", required: true, maxSelect: 1, values: ["pendiente", "activa", "rechazada", "suspendida", "baja"] })
    );
    cuentas.fields.add(new TextField({ name: "telefono", max: 40 }));
    cuentas.fields.add(new TextField({ name: "documento", max: 20 }));
    // "ya figuro en la web": nombre o N.º con el que el panel encuentra su ficha
    cuentas.fields.add(new TextField({ name: "referencia", max: 200 }));
    cuentas.fields.add(new TextField({ name: "motivo", max: 500 }));
    cuentas.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }));
    cuentas.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
    app.save(cuentas);

    const profesionales = app.findCollectionByNameOrId("profesionales");
    profesionales.fields.add(new SelectField({ name: "rol", maxSelect: 1, values: ["asociado", "profesional"] }));
    profesionales.fields.add(new TextField({ name: "matricula", max: 40 }));
    camposFicha(profesionales, cuentas);
    profesionales.listRule = "(activo = true && estado = 'aprobado') || " + PANEL + " || " + DUENO;
    profesionales.viewRule = profesionales.listRule;
    profesionales.createRule = PANEL + " || " + CREA_DUENO;
    profesionales.updateRule = PANEL + " || (" + DUENO + " && " + NO_CAMBIA_DUENO + ")";
    profesionales.indexes = ["CREATE UNIQUE INDEX idx_profesionales_cuenta ON profesionales (cuenta) WHERE cuenta != ''"];
    app.save(profesionales);

    const proveedores = app.findCollectionByNameOrId("proveedores");
    // "nombre" pasa a ser el nombre de fantasía (el que se muestra); la razón social es el nombre legal
    proveedores.fields.add(new TextField({ name: "razon_social", max: 160 }));
    proveedores.fields.add(new TextField({ name: "email", max: 160 }));
    proveedores.fields.add(new TextField({ name: "direccion", max: 160 }));
    camposFicha(proveedores, cuentas);
    proveedores.listRule = "(activo = true && oculto_mora = false && estado = 'aprobado') || " + PANEL + " || " + DUENO;
    proveedores.viewRule = proveedores.listRule;
    proveedores.createRule = PANEL + " || " + CREA_DUENO;
    proveedores.updateRule = PANEL + " || (" + DUENO + " && " + NO_CAMBIA_DUENO + ")";
    proveedores.indexes = ["CREATE UNIQUE INDEX idx_proveedores_cuenta ON proveedores (cuenta) WHERE cuenta != ''"];
    app.save(proveedores);

    // lo que ya estaba publicado sigue publicado
    for (const r of app.findAllRecords(profesionales)) {
      r.set("rol", "asociado");
      r.set("estado", "aprobado");
      app.saveNoValidate(r);
    }
    for (const r of app.findAllRecords(proveedores)) {
      r.set("estado", "aprobado");
      app.saveNoValidate(r);
    }
  },
  (app) => {
    const profesionales = app.findCollectionByNameOrId("profesionales");
    for (const f of ["rol", "matricula", "estado", "cuenta", "motivo", "revisar"]) profesionales.fields.removeByName(f);
    profesionales.listRule = "activo = true || " + PANEL;
    profesionales.viewRule = profesionales.listRule;
    profesionales.createRule = PANEL;
    profesionales.updateRule = PANEL;
    profesionales.indexes = [];
    app.save(profesionales);

    const proveedores = app.findCollectionByNameOrId("proveedores");
    for (const f of ["razon_social", "email", "direccion", "estado", "cuenta", "motivo", "revisar"]) proveedores.fields.removeByName(f);
    proveedores.listRule = "(activo = true && oculto_mora = false) || " + PANEL;
    proveedores.viewRule = proveedores.listRule;
    proveedores.createRule = PANEL;
    proveedores.updateRule = PANEL;
    proveedores.indexes = [];
    app.save(proveedores);

    try {
      app.delete(app.findCollectionByNameOrId("cuentas"));
    } catch (_) {}
  }
);
