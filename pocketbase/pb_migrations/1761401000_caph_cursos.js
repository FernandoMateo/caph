/// <reference path="../pb_data/types.d.ts" />

// Capacitaciones online: una capacitación puede tener módulos con lecciones (video, PDF o texto) que se cursan
// desde el portal. Al completar todas las lecciones se emite el certificado (pb_hooks/cursos.pb.js).
// - capacitaciones.online: tiene contenido para cursar en el portal; .certificado: emite certificado; .horas: carga horaria.
// - modulos / lecciones: el temario. Los títulos de los módulos los ve cualquier cuenta; las lecciones, solo los inscriptos.
// - inscripciones: cuenta + capacitación, con su estado y el código del certificado.
// - progreso: lección completada por una inscripción.

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";
const CUENTA = "@request.auth.collectionName = 'cuentas'";

migrate(
  (app) => {
    const capacitaciones = app.findCollectionByNameOrId("capacitaciones");
    capacitaciones.fields.add(new BoolField({ name: "online" }));
    capacitaciones.fields.add(new BoolField({ name: "certificado_auto" }));
    capacitaciones.fields.add(new NumberField({ name: "horas", min: 0, max: 1000 }));
    app.save(capacitaciones);

    const cuentas = app.findCollectionByNameOrId("cuentas");

    const modulos = new Collection({
      type: "base",
      name: "modulos",
      listRule: PANEL + " || " + CUENTA,
      viewRule: PANEL + " || " + CUENTA,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "capacitacion", type: "relation", required: true, maxSelect: 1, collectionId: capacitaciones.id, cascadeDelete: true },
        { name: "titulo", type: "text", required: true, max: 200 },
        { name: "descripcion", type: "text", max: 1000 },
        { name: "orden", type: "number", onlyInt: true },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(modulos);

    const inscripciones = new Collection({
      type: "base",
      name: "inscripciones",
      listRule: PANEL + " || cuenta = @request.auth.id",
      viewRule: PANEL + " || cuenta = @request.auth.id",
      // la cuenta se inscribe sola; qué puede inscribirse lo controla pb_hooks/cursos.pb.js
      createRule: PANEL + " || (" + CUENTA + " && @request.body.cuenta = @request.auth.id)",
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "cuenta", type: "relation", required: true, maxSelect: 1, collectionId: cuentas.id, cascadeDelete: true },
        { name: "capacitacion", type: "relation", required: true, maxSelect: 1, collectionId: capacitaciones.id, cascadeDelete: true },
        { name: "estado", type: "select", maxSelect: 1, values: ["cursando", "completada"] },
        { name: "completada_el", type: "date" },
        { name: "certificado", type: "text", max: 20 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_inscripciones_cuenta ON inscripciones (cuenta, capacitacion)",
        "CREATE UNIQUE INDEX idx_inscripciones_certificado ON inscripciones (certificado) WHERE certificado != ''",
      ],
    });
    app.save(inscripciones);

    // el contenido de una lección: solo para inscriptos en su capacitación (alias "i": la misma inscripción cumple las dos condiciones)
    const INSCRIPTO =
      "(" +
      CUENTA +
      " && @collection.inscripciones:i.cuenta ?= @request.auth.id && @collection.inscripciones:i.capacitacion ?= modulo.capacitacion)";
    const lecciones = new Collection({
      type: "base",
      name: "lecciones",
      listRule: PANEL + " || " + INSCRIPTO,
      viewRule: PANEL + " || " + INSCRIPTO,
      createRule: PANEL,
      updateRule: PANEL,
      deleteRule: PANEL,
      fields: [
        { name: "modulo", type: "relation", required: true, maxSelect: 1, collectionId: modulos.id, cascadeDelete: true },
        { name: "titulo", type: "text", required: true, max: 200 },
        { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["video", "pdf", "texto"] },
        // YouTube o Vimeo (sin listar): no carga el servidor de la web
        { name: "video_url", type: "text", max: 500 },
        { name: "pdf", type: "file", maxSelect: 1, maxSize: 31457280, mimeTypes: ["application/pdf"], protected: true },
        { name: "texto", type: "text", max: 20000 },
        { name: "duracion", type: "number", min: 0, max: 1000, onlyInt: true },
        { name: "orden", type: "number", onlyInt: true },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(lecciones);

    const progreso = new Collection({
      type: "base",
      name: "progreso",
      listRule: PANEL + " || inscripcion.cuenta = @request.auth.id",
      viewRule: PANEL + " || inscripcion.cuenta = @request.auth.id",
      // que la inscripción sea suya y la lección de ese curso lo controla pb_hooks/cursos.pb.js
      createRule: PANEL + " || " + CUENTA,
      updateRule: null,
      deleteRule: PANEL + " || inscripcion.cuenta = @request.auth.id",
      fields: [
        { name: "inscripcion", type: "relation", required: true, maxSelect: 1, collectionId: inscripciones.id, cascadeDelete: true },
        { name: "leccion", type: "relation", required: true, maxSelect: 1, collectionId: lecciones.id, cascadeDelete: true },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_progreso_leccion ON progreso (inscripcion, leccion)"],
    });
    app.save(progreso);
  },
  (app) => {
    for (const name of ["progreso", "lecciones", "inscripciones", "modulos"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const capacitaciones = app.findCollectionByNameOrId("capacitaciones");
    for (const f of ["online", "certificado_auto", "horas"]) capacitaciones.fields.removeByName(f);
    app.save(capacitaciones);
  }
);
