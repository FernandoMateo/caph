/// <reference path="../pb_data/types.d.ts" />

// Mantiene al día las cuentas de proveedores, asociados y profesionales (ver contabilidad.js).

// Todos los días a las 03:10 del servidor: genera las cuotas nuevas y revisa la mora.
cronAdd("caph-contabilidad", "10 3 * * *", () => {
  const n = require(`${__hooks}/contabilidad.js`).actualizarTodo($app);
  console.log("contabilidad: " + n + " cuentas actualizadas");
});

// El panel lo llama al abrir Contabilidad, para no depender de la hora del cron.
routerAdd(
  "POST",
  "/api/caph/contabilidad/actualizar",
  (e) => {
    const n = require(`${__hooks}/contabilidad.js`).actualizarTodo(e.app);
    return e.json(200, { cuentas: n });
  },
  $apis.requireAuth("users")
);

// Alta o cambio de una suscripción: genera sus cuotas.
onRecordCreateRequest((e) => {
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarDe(e.app, e.record);
}, "suscripciones");

onRecordUpdateRequest((e) => {
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarDe(e.app, e.record);
}, "suscripciones");

// Pagos: desde el portal quedan "informados" (no cuentan hasta que el panel los confirma); se reimputan las cuotas.
onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/contabilidad.js`);
  lib.prepararPago(e);
  e.next();
  lib.actualizarDe(e.app, e.record);
}, "pagos");

// Cambio de un pago (confirmarlo, rechazarlo, corregirlo): se reimputa también el titular anterior si cambió.
onRecordUpdateRequest((e) => {
  const antes = e.record.original();
  e.next();
  const lib = require(`${__hooks}/contabilidad.js`);
  lib.actualizarDe(e.app, e.record);
  if (lib.titular(antes).join("|") !== lib.titular(e.record).join("|")) lib.actualizarDe(e.app, antes);
}, "pagos");

onRecordDeleteRequest((e) => {
  const pago = e.record;
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarDe(e.app, pago);
}, "pagos");

// Cambio manual de una cuota (monto, vencimiento o nota): se reimputa.
onRecordUpdateRequest((e) => {
  const original = e.record.original();
  e.record.set("ajustada", true);
  for (const campo of ["proveedor", "profesional", "tipo", "periodo"]) e.record.set(campo, original.getString(campo));
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarDe(e.app, e.record);
}, "cuotas");
