/// <reference path="../pb_data/types.d.ts" />

// Los asociados (administradores de consorcio) no se publican en la web: el listado público de
// profesionales solo devuelve rol = 'profesional'. La ficha de un asociado se sigue pudiendo abrir por
// su id (el QR del carnet y /verificar/<id>), y el validador de la home lo busca con /api/caph/validar,
// que devuelve solo N.º, nombre y vigencia.

const PUBLICO = "(activo = true && estado = 'aprobado' && oculto_mora = false)";
const SOLO_PROFESIONALES = "(activo = true && estado = 'aprobado' && oculto_mora = false && rol = 'profesional')";

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("profesionales");
    const regla = String(JSON.parse(JSON.stringify(col)).listRule || "");
    // si alguien la cambió a mano, no se toca (la web igual filtra por rol) y el servidor arranca igual
    if (!regla.includes(PUBLICO)) return console.log("socios_ocultos: regla de profesionales distinta, sin cambios: " + regla);
    col.listRule = regla.split(PUBLICO).join(SOLO_PROFESIONALES);
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("profesionales");
    const regla = String(JSON.parse(JSON.stringify(col)).listRule || "");
    col.listRule = regla.split(SOLO_PROFESIONALES).join(PUBLICO);
    app.save(col);
  }
);
