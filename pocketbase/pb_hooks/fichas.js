// Reglas de las cuentas del portal y de sus fichas (profesionales y proveedores). La usan los hooks
// de fichas.pb.js con require(`${__hooks}/fichas.js`) (cada hook corre aislado y no ve el código de afuera).
//
// - Una cuenta nueva queda "pendiente" hasta que el panel la aprueba.
// - El dueño de una ficha no puede tocar lo que decide la Cámara (estado, visible, verificado, N.º…).
// - Una ficha que carga el dueño queda pendiente y tiene que estar completa (foto, contacto, dirección…).
// - Si el dueño cambia una ficha ya publicada, sigue publicada y queda marcada para que el panel la revise.
// - Para que una ficha se vea en la web (aprobada y visible), también desde el panel, tiene que estar completa.
//   Aprobada pero oculta puede estar incompleta: así entran las que se importan de una planilla (sin foto).

const PROTEGIDOS = {
  profesionales: ["estado", "activo", "verificado", "oculto_mora", "numero", "rol", "cuenta", "motivo", "revisar"],
  proveedores: ["estado", "activo", "verificado", "oculto_mora", "cuenta", "motivo", "revisar"],
  cuentas: ["rol", "estado", "motivo"],
};

function esCuenta(e) {
  return !!e.auth && e.auth.collection().name === "cuentas";
}

function esPanel(e) {
  return !!e.auth && (e.auth.isSuperuser() || e.auth.collection().name === "users");
}

function digitos(texto) {
  return String(texto || "").replace(/\D/g, "").length;
}

function emailValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(texto || "").trim());
}

/** Nombre del archivo de un campo, también si se está subiendo en esta misma petición. */
function tieneArchivo(record, campo) {
  return record.getString(campo) !== "" || record.getUnsavedFiles(campo).length > 0;
}

/** Datos obligatorios que le faltan a una ficha para publicarse. */
function faltantes(record, coleccion) {
  const falta = [];
  const vacio = (campo) => record.getString(campo).trim() === "";
  if (coleccion === "proveedores") {
    if (vacio("nombre")) falta.push("nombre de fantasía");
    if (vacio("razon_social")) falta.push("razón social");
    if (!tieneArchivo(record, "logo")) falta.push("logo o foto");
    if (vacio("rubro")) falta.push("rubro");
  } else {
    if (vacio("nombre")) falta.push("nombre y apellido");
    if (!tieneArchivo(record, "foto")) falta.push("foto de perfil");
    if (vacio("titulo")) falta.push("profesión o título");
    if (record.getString("rol") === "profesional" && vacio("matricula")) falta.push("matrícula");
    if (vacio("localidad")) falta.push("localidad");
  }
  if (digitos(record.getString("telefono")) < 8) falta.push("teléfono con código de área");
  if (!emailValido(record.getString("email"))) falta.push("email válido");
  if (vacio("direccion")) falta.push("dirección");
  return falta;
}

function exigirCompleta(record, coleccion) {
  const falta = faltantes(record, coleccion);
  if (falta.length) throw new BadRequestError("Faltan datos obligatorios: " + falta.join(", ") + ".");
}

/** Aprobada y visible: se muestra en la web. */
function publicada(record) {
  return record.getString("estado") === "aprobado" && record.getBool("activo");
}

/** Copia del registro original los campos que el dueño no puede cambiar. */
function restaurar(record, coleccion) {
  const original = record.original();
  for (const campo of PROTEGIDOS[coleccion]) record.set(campo, original.get(campo));
}

/* ---------- cuentas ---------- */

function crearCuenta(e) {
  if (esPanel(e)) {
    if (!e.record.getString("estado")) e.record.set("estado", "activa");
    return;
  }
  e.record.set("estado", "pendiente");
  e.record.set("motivo", "");
  if (e.record.getString("name").trim().length < 3) throw new BadRequestError("Completá tu nombre y apellido.");
  if (digitos(e.record.getString("telefono")) < 8) throw new BadRequestError("Completá un teléfono con código de área.");
  const doc = digitos(e.record.getString("documento"));
  if (doc < 7 || doc > 11) throw new BadRequestError("Completá tu DNI o CUIT (solo números).");
}

function actualizarCuenta(e) {
  if (esCuenta(e)) restaurar(e.record, "cuentas");
}

/* ---------- fichas ---------- */

function crearFicha(e, coleccion) {
  const r = e.record;
  if (esCuenta(e)) {
    const estadoCuenta = e.auth.getString("estado");
    if (estadoCuenta === "suspendida" || estadoCuenta === "baja") throw new ForbiddenError("Tu cuenta no está habilitada.");
    const rol = e.auth.getString("rol");
    if ((coleccion === "proveedores") !== (rol === "proveedor")) throw new ForbiddenError("Tu cuenta no puede cargar este tipo de ficha.");
    r.set("cuenta", e.auth.id);
    r.set("estado", "pendiente");
    r.set("activo", true);
    r.set("verificado", false);
    r.set("motivo", "");
    r.set("revisar", false);
    r.set("oculto_mora", false);
    if (coleccion === "profesionales") {
      r.set("rol", rol);
      r.set("numero", "");
    }
    exigirCompleta(r, coleccion);
    return;
  }
  // desde el panel: si no dice otra cosa, la ficha queda aprobada; si además es visible, tiene que estar completa
  if (!r.getString("estado")) r.set("estado", "aprobado");
  if (coleccion === "profesionales" && !r.getString("rol")) r.set("rol", "asociado");
  if (publicada(r)) exigirCompleta(r, coleccion);
}

/** Devuelve true si este cambio aprueba la ficha (para crearle la cuota después de guardar). */
function actualizarFicha(e, coleccion) {
  const r = e.record;
  const antes = r.original().getString("estado");
  if (esCuenta(e)) {
    restaurar(r, coleccion);
    if (antes === "aprobado") {
      r.set("revisar", true);
    } else {
      // una ficha rechazada que se corrige vuelve a la bandeja como pendiente, y su cuenta también
      r.set("estado", "pendiente");
      r.set("motivo", "");
    }
    exigirCompleta(r, coleccion);
    if (antes === "rechazado") {
      const cuenta = e.app.findRecordById("cuentas", e.auth.id);
      if (cuenta.getString("estado") === "rechazada") {
        cuenta.set("estado", "pendiente");
        cuenta.set("motivo", "");
        e.app.save(cuenta);
      }
    }
    return false;
  }
  // pasar a verse en la web (aprobarla visible, o hacer visible una aprobada) exige la ficha completa
  if (publicada(r) && !publicada(r.original())) exigirCompleta(r, coleccion);
  return r.getString("estado") === "aprobado" && antes !== "aprobado";
}

/** Después de aprobar: la cuota con la tarifa de su tipo (si ese tipo paga y no tenía). */
function alAprobar(app, record, coleccion) {
  const rol = coleccion === "proveedores" ? "proveedor" : record.getString("rol") || "asociado";
  require(`${__hooks}/contabilidad.js`).suscripcionPorTarifa(app, rol, record.id);
}

module.exports = { faltantes, crearCuenta, actualizarCuenta, crearFicha, actualizarFicha, alAprobar };
