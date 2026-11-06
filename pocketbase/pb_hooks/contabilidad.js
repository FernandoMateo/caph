// Lógica de la contabilidad de cuotas. La usan los hooks de contabilidad.pb.js y fichas.pb.js con
// require(`${__hooks}/contabilidad.js`) (cada hook corre aislado y no ve el código de afuera).
//
// El titular de una cuenta es un proveedor (campo "proveedor") o un asociado/profesional (campo "profesional").
// - Cada mes, desde el de alta, se genera una cuota mensual que vence el día de vencimiento
//   de la suscripción (si el mes es más corto, el último día). La primera vence el día del alta.
// - Si hay inscripción, se genera una cuota "inscripcion" que vence el día del alta.
// - Los pagos confirmados se suman y se imputan a las cuotas en orden de vencimiento (la más vieja primero).
//   Los que informa el usuario desde el portal no cuentan hasta que el panel los confirma.
// - Si una cuota sigue impaga 1 mes y 10 días después de su vencimiento, el titular se oculta
//   de la web y su carnet deja de estar vigente; al ponerse al día vuelve solo.

const FICHAS = { proveedor: "proveedores", profesional: "profesionales" };

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

/** Último día en que una cuota vencida todavía no oculta al titular: vencimiento + 1 mes + 10 días. */
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

/** [campo, id] del titular de una suscripción, cuota o pago. */
function titular(record) {
  const p = record.getString("proveedor");
  return p ? ["proveedor", p] : ["profesional", record.getString("profesional")];
}

/** Crea las cuotas que falten hasta el mes actual y ajusta las que todavía no vencieron. */
function generar(app, sus) {
  const t = titular(sus);
  const campo = t[0];
  const id = t[1];
  const alta = fecha(sus, "fecha_alta");
  if (!alta || !id) return;
  const dia = sus.getInt("dia_vencimiento") || +alta.slice(8, 10);
  const monto = sus.getFloat("cuota_monto");
  const hoyStr = hoy();
  const col = app.findCollectionByNameOrId("cuotas");

  const existentes = {};
  for (const c of app.findRecordsByFilter("cuotas", campo + " = {:id}", "", 0, 0, { id: id })) {
    existentes[c.getString("tipo") + "|" + c.getString("periodo")] = c;
  }

  const nueva = (tipo, periodo, vencimiento, importe) => {
    const c = new Record(col);
    c.set(campo, id);
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

/** Reparte los pagos confirmados entre las cuotas y actualiza si el titular queda oculto por mora. */
function recalcular(app, campo, id) {
  let disponible = 0;
  for (const p of app.findRecordsByFilter("pagos", campo + " = {:id} && estado = 'confirmado'", "", 0, 0, { id: id })) {
    disponible += p.getFloat("monto");
  }
  disponible = Math.round(disponible * 100) / 100;

  const cuotas = app.findRecordsByFilter("cuotas", campo + " = {:id}", "vencimiento,tipo", 0, 0, { id: id });
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

  const ficha = app.findRecordById(FICHAS[campo], id);
  if (ficha.getBool("oculto_mora") !== moroso) {
    ficha.set("oculto_mora", moroso);
    app.save(ficha);
  }
}

/** Genera y recalcula la cuenta de un titular. */
function actualizarTitular(app, campo, id) {
  if (!id) return;
  let sus = null;
  try {
    sus = app.findFirstRecordByFilter("suscripciones", campo + " = {:id}", { id: id });
  } catch (_) {}
  if (sus) generar(app, sus);
  recalcular(app, campo, id);
}

/** Actualiza la cuenta del titular de una suscripción, cuota o pago. */
function actualizarDe(app, record) {
  const t = titular(record);
  actualizarTitular(app, t[0], t[1]);
}

/** Recorre todas las cuentas (lo corre el cron diario y el panel al abrir Contabilidad). */
function actualizarTodo(app) {
  const pendientes = {};
  for (const s of app.findRecordsByFilter("suscripciones", "id != ''", "", 0, 0)) pendientes[titular(s).join("|")] = true;
  for (const campo of Object.keys(FICHAS)) {
    for (const f of app.findRecordsByFilter(FICHAS[campo], "oculto_mora = true", "", 0, 0)) pendientes[campo + "|" + f.id] = true;
  }
  const claves = Object.keys(pendientes);
  for (const k of claves) {
    const partes = k.split("|");
    try {
      actualizarTitular(app, partes[0], partes[1]);
    } catch (err) {
      console.log("contabilidad: no se pudo actualizar " + k + ": " + err);
    }
  }
  return claves.length;
}

/**
 * Al aprobarse un alta: si su tipo paga cuota y todavía no tiene suscripción, se la crea con la tarifa vigente.
 * `rol` es "asociado", "profesional" o "proveedor".
 */
function suscripcionPorTarifa(app, rol, fichaId) {
  const campo = rol === "proveedor" ? "proveedor" : "profesional";
  try {
    app.findFirstRecordByFilter("suscripciones", campo + " = {:id}", { id: fichaId });
    return; // ya tiene
  } catch (_) {}
  let tarifa;
  try {
    tarifa = app.findFirstRecordByFilter("tarifas", "rol = {:rol}", { rol: rol });
  } catch (_) {
    return;
  }
  if (!tarifa.getBool("cobrar") || tarifa.getFloat("cuota_monto") <= 0) return;
  const alta = hoy();
  const sus = new Record(app.findCollectionByNameOrId("suscripciones"));
  sus.set(campo, fichaId);
  sus.set("cuota_monto", tarifa.getFloat("cuota_monto"));
  sus.set("inscripcion_monto", tarifa.getFloat("inscripcion_monto"));
  sus.set("fecha_alta", alta + " 12:00:00.000Z");
  sus.set("dia_vencimiento", tarifa.getInt("dia_vencimiento") || +alta.slice(8, 10));
  sus.set("activa", true);
  app.save(sus);
  actualizarTitular(app, campo, fichaId);
}

/**
 * Pago nuevo. Desde el portal: tiene que ser de la ficha del usuario, con comprobante, y queda "informado"
 * hasta que el panel lo confirma. Desde el panel: confirmado, salvo que diga otra cosa.
 */
function prepararPago(e) {
  const r = e.record;
  if (e.auth && e.auth.collection().name === "cuentas") {
    const t = titular(r);
    let ficha = null;
    try {
      ficha = e.app.findRecordById(FICHAS[t[0]], t[1]);
    } catch (_) {}
    if (!ficha || ficha.getString("cuenta") !== e.auth.id) throw new ForbiddenError("Solo podés informar pagos de tu propia cuenta.");
    if (r.getString("comprobante") === "" && r.getUnsavedFiles("comprobante").length === 0)
      throw new BadRequestError("Adjuntá el comprobante del pago.");
    if (fecha(r, "fecha") > hoy()) throw new BadRequestError("La fecha del pago no puede ser futura.");
    r.set("estado", "informado");
    r.set("cuenta", e.auth.id);
    r.set("motivo", "");
    r.set("cargado_por", e.auth.getString("name") || e.auth.getString("email"));
    return;
  }
  if (!r.getString("estado")) r.set("estado", "confirmado");
  if (e.auth) r.set("cargado_por", e.auth.getString("name") || e.auth.getString("email"));
}

module.exports = { hoy, limiteMora, fechaDelMes, titular, actualizarTitular, actualizarDe, actualizarTodo, suscripcionPorTarifa, prepararPago };
