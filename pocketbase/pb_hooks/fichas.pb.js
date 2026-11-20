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

// Teléfono de ingreso de la cuenta (las que no tienen email entran con el teléfono), en todo guardado.
onRecordCreate((e) => {
  require(`${__hooks}/fichas.js`).prepararIngreso(e.app, e.record);
  e.next();
}, "cuentas");

onRecordUpdate((e) => {
  require(`${__hooks}/fichas.js`).prepararIngreso(e.app, e.record);
  e.next();
}, "cuentas");

// Ingreso al portal con el teléfono en lugar del email.
routerAdd("POST", "/api/caph/ingresar", (e) => {
  return require(`${__hooks}/fichas.js`).ingresarConTelefono(e);
});

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
  lib.sincronizarTelefonoCuenta(e.app, e.record);
}, "profesionales");

// Validador de la home: confirma si alguien es socio (también los asociados, que no se publican).
routerAdd("GET", "/api/caph/validar", (e) => {
  const resultados = require(`${__hooks}/fichas.js`).validar(e.app, e.request.url.query().get("q"));
  return e.json(200, { resultados });
});

// Sección "Asociados" de la web: solo los datos que se pueden mostrar (ver fichas.js).
routerAdd("GET", "/api/caph/asociados", (e) => {
  return e.json(200, { asociados: require(`${__hooks}/fichas.js`).asociadosPublicos(e.app) });
});

// Panel: acceso al portal para todos los asociados y proveedores, con una contraseña inicial que cambian al entrar.
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
  lib.sincronizarTelefonoCuenta(e.app, e.record);
}, "proveedores");
