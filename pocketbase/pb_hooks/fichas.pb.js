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
}, "profesionales");

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
