/// <reference path="../pb_data/types.d.ts" />

// Ingreso al portal con el teléfono: los proveedores (y cualquier socio sin email) entran con su teléfono.
// - cuentas.email deja de ser obligatorio (una cuenta sin email entra con el teléfono).
// - cuentas.tel_ingreso: el teléfono normalizado con el que se busca la cuenta al entrar (oculto; lo
//   completa el hook en cada guardado, ver telefonosIngreso en pb_hooks/fichas.js).

function telefonosIngreso(texto) {
  const salida = [];
  for (const parte of String(texto || "").split(/[\/,;|]|\s+y\s+|\s+o\s+/i)) {
    let d = parte.replace(/\D/g, "");
    if (d.startsWith("54") && d.length >= 12) d = d.slice(2);
    if (d.startsWith("9") && d.length >= 11) d = d.slice(1);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.length === 12) {
      for (const i of [2, 3, 4]) {
        if (d.slice(i, i + 2) === "15") {
          d = d.slice(0, i) + d.slice(i + 2);
          break;
        }
      }
    }
    if (d.length >= 8 && salida.indexOf(d) < 0) salida.push(d);
  }
  return salida.join(" ");
}

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("cuentas");
    col.fields.getByName("email").required = false;
    col.fields.add(new TextField({ name: "tel_ingreso", max: 200, hidden: true }));
    app.save(col);
    for (const r of app.findAllRecords("cuentas")) {
      r.set("tel_ingreso", telefonosIngreso(r.getString("telefono")));
      app.saveNoValidate(r);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("cuentas");
    col.fields.removeByName("tel_ingreso");
    col.fields.getByName("email").required = true;
    app.save(col);
  }
);
