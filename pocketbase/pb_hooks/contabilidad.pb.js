/// <reference path="../pb_data/types.d.ts" />

// Mantiene al día las cuentas de los proveedores (ver contabilidad.js).

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
  require(`${__hooks}/contabilidad.js`).actualizarProveedor(e.app, e.record.getString("proveedor"));
}, "suscripciones");

onRecordUpdateRequest((e) => {
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarProveedor(e.app, e.record.getString("proveedor"));
}, "suscripciones");

// Pagos: se registra quién lo cargó y se reimputan las cuotas.
onRecordCreateRequest((e) => {
  if (e.auth) e.record.set("cargado_por", e.auth.getString("name") || e.auth.getString("email"));
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarProveedor(e.app, e.record.getString("proveedor"));
}, "pagos");

onRecordUpdateRequest((e) => {
  const antes = e.record.original().getString("proveedor");
  e.next();
  const lib = require(`${__hooks}/contabilidad.js`);
  lib.actualizarProveedor(e.app, e.record.getString("proveedor"));
  if (antes !== e.record.getString("proveedor")) lib.actualizarProveedor(e.app, antes);
}, "pagos");

onRecordDeleteRequest((e) => {
  const proveedorId = e.record.getString("proveedor");
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarProveedor(e.app, proveedorId);
}, "pagos");

// Cambio manual de una cuota (monto, vencimiento o nota): se reimputa.
onRecordUpdateRequest((e) => {
  e.record.set("ajustada", true);
  e.record.set("proveedor", e.record.original().getString("proveedor"));
  e.record.set("tipo", e.record.original().getString("tipo"));
  e.record.set("periodo", e.record.original().getString("periodo"));
  e.next();
  require(`${__hooks}/contabilidad.js`).actualizarProveedor(e.app, e.record.getString("proveedor"));
}, "cuotas");
