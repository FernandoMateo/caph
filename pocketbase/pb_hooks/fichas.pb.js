/// <reference path="../pb_data/types.d.ts" />

// Cuentas del portal y aprobación de sus fichas (ver fichas.js).

onRecordCreateRequest((e) => {
  require(`${__hooks}/fichas.js`).crearCuenta(e);
  e.next();
}, "cuentas");

onRecordUpdateRequest((e) => {
  require(`${__hooks}/fichas.js`).actualizarCuenta(e);
  e.next();
}, "cuentas");

onRecordCreateRequest((e) => {
  require(`${__hooks}/fichas.js`).crearFicha(e, "profesionales");
  e.next();
}, "profesionales");

onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/fichas.js`);
  const seAprueba = lib.actualizarFicha(e, "profesionales");
  e.next();
  if (seAprueba) lib.alAprobar(e.app, e.record, "profesionales");
  lib.sincronizarRolCuenta(e.app, e.record);
}, "profesionales");

// Validador de la home: confirma si alguien es socio (también los asociados, que no se publican).
routerAdd("GET", "/api/caph/validar", (e) => {
  const resultados = require(`${__hooks}/fichas.js`).validar(e.app, e.request.url.query().get("q"));
  return e.json(200, { resultados });
});

// Panel: acceso al portal para todos los asociados, con una contraseña inicial que cambian al entrar.
routerAdd("POST", "/api/caph/habilitar-portal", (e) => {
  const lib = require(`${__hooks}/fichas.js`);
  if (!lib.puedeHabilitar(e)) throw new ForbiddenError("No tenés permiso para esto.");
  const body = e.requestInfo().body || {};
  return e.json(200, lib.habilitarPortal(e.app, body.clave, body.reiniciar === true));
});

onRecordCreateRequest((e) => {
  require(`${__hooks}/fichas.js`).crearFicha(e, "proveedores");
  e.next();
}, "proveedores");

onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/fichas.js`);
  const seAprueba = lib.actualizarFicha(e, "proveedores");
  e.next();
  if (seAprueba) lib.alAprobar(e.app, e.record, "proveedores");
}, "proveedores");
