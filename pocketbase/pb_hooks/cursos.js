// Capacitaciones online (ver pb_migrations/1761401000_caph_cursos.js). La usan los hooks de cursos.pb.js
// con require(`${__hooks}/cursos.js`) (cada hook corre aislado y no ve el código de afuera).
//
// - Una cuenta activa se inscribe sola a una capacitación publicada que tenga contenido online.
// - Cada lección vista se guarda en "progreso"; al completar todas, la inscripción queda "completada".
// - Si la capacitación emite certificado, al completarse se le asigna un código único: con ese código
//   se descarga el PDF desde el portal y se verifica en /verificar/certificado/<código>.
// - El panel también puede marcar una inscripción como completada (por ejemplo, un curso presencial).

function hoy() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function esCuenta(e) {
  return !!e.auth && e.auth.collection().name === "cuentas";
}

/** Marca completada la inscripción y emite el certificado (si corresponde y no lo tenía). */
function completar(app, ins) {
  if (ins.getString("estado") !== "completada") {
    ins.set("estado", "completada");
    ins.set("completada_el", hoy() + " 12:00:00.000Z");
  }
  if (!ins.getString("certificado")) {
    const cap = app.findRecordById("capacitaciones", ins.getString("capacitacion"));
    if (cap.getBool("certificado_auto")) ins.set("certificado", $security.randomStringWithAlphabet(10, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"));
  }
}

/** Después de cada lección vista: si ya vio todas, se completa. */
function revisar(app, inscripcionId) {
  const ins = app.findRecordById("inscripciones", inscripcionId);
  if (ins.getString("estado") === "completada") return;
  const total = app.findRecordsByFilter("lecciones", "modulo.capacitacion = {:c}", "", 0, 0, { c: ins.getString("capacitacion") }).length;
  const vistas = app.findRecordsByFilter("progreso", "inscripcion = {:i}", "", 0, 0, { i: inscripcionId }).length;
  if (total > 0 && vistas >= total) {
    completar(app, ins);
    app.save(ins);
  }
}

function crearInscripcion(e) {
  const r = e.record;
  if (esCuenta(e)) {
    if (e.auth.getString("estado") !== "activa") throw new ForbiddenError("Tu cuenta tiene que estar aprobada para inscribirte.");
    let cap = null;
    try {
      cap = e.app.findRecordById("capacitaciones", r.getString("capacitacion"));
    } catch (_) {}
    if (!cap || !cap.getBool("publicado") || !cap.getBool("online")) throw new BadRequestError("Esta capacitación no se cursa online.");
    r.set("cuenta", e.auth.id);
    r.set("estado", "cursando");
    r.set("completada_el", "");
    r.set("certificado", "");
    return;
  }
  if (!r.getString("estado")) r.set("estado", "cursando");
  if (r.getString("estado") === "completada") completar(e.app, r);
}

function actualizarInscripcion(e) {
  const r = e.record;
  // el código del certificado no se edita: lo emite el sistema
  r.set("certificado", r.original().getString("certificado"));
  if (r.getString("estado") === "completada") completar(e.app, r);
}

function crearProgreso(e) {
  if (!esCuenta(e)) return;
  let ins = null;
  let leccion = null;
  try {
    ins = e.app.findRecordById("inscripciones", e.record.getString("inscripcion"));
    leccion = e.app.findRecordById("lecciones", e.record.getString("leccion"));
  } catch (_) {}
  if (!ins || ins.getString("cuenta") !== e.auth.id) throw new ForbiddenError("Esa inscripción no es tuya.");
  const modulo = leccion && e.app.findRecordById("modulos", leccion.getString("modulo"));
  if (!modulo || modulo.getString("capacitacion") !== ins.getString("capacitacion")) throw new BadRequestError("La lección no es de este curso.");
}

/** Lo que muestra la verificación pública de un certificado; null si no existe. */
function datosCertificado(app, codigo) {
  let ins = null;
  try {
    ins = app.findFirstRecordByFilter("inscripciones", "certificado = {:c} && estado = 'completada'", { c: String(codigo).toUpperCase() });
  } catch (_) {
    return null;
  }
  const cuenta = app.findRecordById("cuentas", ins.getString("cuenta"));
  const cap = app.findRecordById("capacitaciones", ins.getString("capacitacion"));
  return {
    codigo: ins.getString("certificado"),
    nombre: cuenta.getString("name"),
    curso: cap.getString("titulo"),
    tipo: cap.getString("tipo"),
    horas: cap.getFloat("horas"),
    certificacion: cap.getString("certificacion"),
    fecha: ins.getString("completada_el").slice(0, 10),
  };
}

module.exports = { revisar, crearInscripcion, actualizarInscripcion, crearProgreso, datosCertificado };
