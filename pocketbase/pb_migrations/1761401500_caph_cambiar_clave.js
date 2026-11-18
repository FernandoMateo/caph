/// <reference path="../pb_data/types.d.ts" />

// cuentas.cambiar_clave: la cuenta entra con una contraseña que le dio la Cámara (la inicial o una
// provisoria) y el portal le pide que la cambie antes de seguir. Lo maneja pb_hooks/fichas.js:
// se marca cuando el panel pone la contraseña y se desmarca cuando la persona elige la suya.

migrate(
  (app) => {
    const cuentas = app.findCollectionByNameOrId("cuentas");
    if (!cuentas.fields.getByName("cambiar_clave")) cuentas.fields.add(new BoolField({ name: "cambiar_clave" }));
    app.save(cuentas);
  },
  (app) => {
    const cuentas = app.findCollectionByNameOrId("cuentas");
    cuentas.fields.removeByName("cambiar_clave");
    app.save(cuentas);
  }
);
