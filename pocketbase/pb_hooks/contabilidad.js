// Lógica de la contabilidad de cuotas. La usan los hooks de contabilidad.pb.js con
// require(`${__hooks}/contabilidad.js`) (cada hook corre aislado y no ve el código de afuera).
//
// - Cada mes, desde el de alta, se genera una cuota mensual que vence el día de vencimiento
//   de la suscripción (si el mes es más corto, el último día). La primera vence el día del alta.
// - Si hay inscripción, se genera una cuota "inscripcion" que vence el día del alta.
// - Los pagos se suman y se imputan a las cuotas en orden de vencimiento (la más vieja primero).
// - Si una cuota sigue impaga 1 mes y 10 días después de su vencimiento, el proveedor se oculta
//   de la web; al ponerse al día vuelve a aparecer solo.

/** Fecha de hoy en Argentina (UTC-3) como "AAAA-MM-DD". */
function hoy() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

function ultimoDia(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** "AAAA-MM-DD" del día `dia` del mes (1-12); si el mes es más corto, el último día. */
function fechaDelMes(anio, mes, dia) {
  return anio + "-" + pad(mes) + "-" + pad(Math.min(dia, ultimoDia(anio, mes)));
}

/** Último día en que una cuota vencida todavía no oculta al proveedor: vencimiento + 1 mes + 10 días. */
function limiteMora(vencimiento) {
  const a = +vencimiento.slice(0, 4);
  const m = +vencimiento.slice(5, 7);
  const d = +vencimiento.slice(8, 10);
  const sig = m === 12 ? [a + 1, 1] : [a, m + 1];
  const base = new Date(fechaDelMes(sig[0], sig[1], d) + "T00:00:00Z");
  return new Date(base.getTime() + 10 * 86400000).toISOString().slice(0, 10);
}

function fecha(record, campo) {
  return record.getString(campo).slice(0, 10);
}

/** Crea las cuotas que falten hasta el mes actual y ajusta las que todavía no vencieron. */
function generar(app, sus) {
  const proveedorId = sus.getString("proveedor");
  const alta = fecha(sus, "fecha_alta");
  if (!alta) return;
  const dia = sus.getInt("dia_vencimiento") || +alta.slice(8, 10);
  const monto = sus.getFloat("cuota_monto");
  const hoyStr = hoy();
  const col = app.findCollectionByNameOrId("cuotas");

  const existentes = {};
  for (const c of app.findRecordsByFilter("cuotas", "proveedor = {:p}", "", 0, 0, { p: proveedorId })) {
    existentes[c.getString("tipo") + "|" + c.getString("periodo")] = c;
  }

  const nueva = (tipo, periodo, vencimiento, importe) => {
    const c = new Record(col);
    c.set("proveedor", proveedorId);
    c.set("tipo", tipo);
    c.set("periodo", periodo);
    c.set("vencimiento", vencimiento + " 12:00:00.000Z");
    c.set("monto", importe);
    c.set("pagado", 0);
    app.save(c);
  };

  const inscripcion = sus.getFloat("inscripcion_monto");
  if (inscripcion > 0 && !existentes["inscripcion|alta"]) nueva("inscripcion", "alta", alta, inscripcion);

  if (!sus.getBool("activa") || monto <= 0) return;

  let anio = +alta.slice(0, 4);
  let mes = +alta.slice(5, 7);
  const mesActual = hoyStr.slice(0, 7);
  while (anio + "-" + pad(mes) <= mesActual) {
    const periodo = anio + "-" + pad(mes);
    let vencimiento = fechaDelMes(anio, mes, dia);
    if (vencimiento < alta) vencimiento = alta; // el mes del alta nunca vence antes del alta
    const c = existentes["mensual|" + periodo];
    if (!c) {
      nueva("mensual", periodo, vencimiento, monto);
    } else if (!c.getBool("ajustada") && c.getFloat("pagado") === 0 && fecha(c, "vencimiento") >= hoyStr && vencimiento >= hoyStr) {
      // cuota que todavía no venció ni tiene pagos: toma el día y el monto actuales
      if (fecha(c, "vencimiento") !== vencimiento || c.getFloat("monto") !== monto) {
        c.set("vencimiento", vencimiento + " 12:00:00.000Z");
        c.set("monto", monto);
        app.save(c);
      }
    }
    mes++;
    if (mes > 12) {
      mes = 1;
      anio++;
    }
  }
}

/** Reparte los pagos entre las cuotas y actualiza si el proveedor queda oculto por mora. */
function recalcular(app, proveedorId) {
  let disponible = 0;
  for (const p of app.findRecordsByFilter("pagos", "proveedor = {:p}", "", 0, 0, { p: proveedorId })) {
    disponible += p.getFloat("monto");
  }
  disponible = Math.round(disponible * 100) / 100;

  const cuotas = app.findRecordsByFilter("cuotas", "proveedor = {:p}", "vencimiento,tipo", 0, 0, { p: proveedorId });
  const hoyStr = hoy();
  let moroso = false;
  for (const c of cuotas) {
    const monto = c.getFloat("monto");
    const pagado = Math.min(monto, disponible);
    disponible = Math.round((disponible - pagado) * 100) / 100;
    if (c.getFloat("pagado") !== pagado) {
      c.set("pagado", pagado);
      app.save(c);
    }
    if (pagado < monto && hoyStr > limiteMora(fecha(c, "vencimiento"))) moroso = true;
  }

  const proveedor = app.findRecordById("proveedores", proveedorId);
  if (proveedor.getBool("oculto_mora") !== moroso) {
    proveedor.set("oculto_mora", moroso);
    app.save(proveedor);
  }
}

/** Genera y recalcula la cuenta de un proveedor. */
function actualizarProveedor(app, proveedorId) {
  let sus = null;
  try {
    sus = app.findFirstRecordByFilter("suscripciones", "proveedor = {:p}", { p: proveedorId });
  } catch (_) {}
  if (sus) generar(app, sus);
  recalcular(app, proveedorId);
}

/** Recorre todas las cuentas (lo corre el cron diario y el panel al abrir Contabilidad). */
function actualizarTodo(app) {
  const ids = {};
  for (const s of app.findRecordsByFilter("suscripciones", "id != ''", "", 0, 0)) ids[s.getString("proveedor")] = true;
  for (const p of app.findRecordsByFilter("proveedores", "oculto_mora = true", "", 0, 0)) ids[p.id] = true;
  for (const id of Object.keys(ids)) {
    try {
      actualizarProveedor(app, id);
    } catch (err) {
      console.log("contabilidad: no se pudo actualizar " + id + ": " + err);
    }
  }
  return Object.keys(ids).length;
}

module.exports = { hoy, limiteMora, fechaDelMes, actualizarProveedor, actualizarTodo };
