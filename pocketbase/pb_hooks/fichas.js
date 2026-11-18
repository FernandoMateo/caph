// Reglas de las cuentas del portal y de sus fichas (profesionales y proveedores). La usan los hooks
// de fichas.pb.js con require(`${__hooks}/fichas.js`) (cada hook corre aislado y no ve el código de afuera).
//
// - Una cuenta nueva queda "pendiente" hasta que el panel la aprueba.
// - El dueño de una ficha no puede tocar lo que decide la Cámara (estado, visible, verificado, N.º…).
// - Una ficha que carga el dueño queda pendiente y tiene que estar completa (foto, contacto, dirección…).
// - Si el dueño cambia una ficha ya publicada, sigue publicada y queda marcada para que el panel la revise.
// - Para que una ficha se vea en la web (aprobada y visible), también desde el panel, tiene que estar completa.
//   Los asociados (administradores de consorcio) nunca se publican: solo los encuentra el validador.
//   Aprobada pero oculta puede estar incompleta: así entran las que se importan de una planilla (sin foto).

const PROTEGIDOS = {
  profesionales: ["estado", "activo", "verificado", "oculto_mora", "numero", "rol", "cuenta", "motivo", "revisar"],
  proveedores: ["estado", "activo", "verificado", "oculto_mora", "cuenta", "motivo", "revisar"],
  cuentas: ["rol", "estado", "motivo", "cambiar_clave"],
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

/** La web tiene que ser un enlace http(s): sin esquema se le agrega https://, cualquier otro ("javascript:") se rechaza. */
function normalizarWeb(record) {
  let web = record.getString("web").trim();
  if (web && !/^[a-z][a-z0-9+.-]*:/i.test(web)) web = "https://" + web;
  if (web && !/^https?:\/\/[^\s]+$/i.test(web)) throw new BadRequestError("La web tiene que ser un enlace que empiece con https://.");
  record.set("web", web);
}

/** Un SVG puede llevar código: desde el portal el logo va en PNG, JPG o WEBP (el panel sí puede subir SVG). */
function sinSvg(record, coleccion) {
  if (coleccion !== "proveedores") return;
  for (const f of record.getUnsavedFiles("logo")) {
    if (/\.svg$/i.test(String(f.originalName || f.name || ""))) throw new BadRequestError("Subí el logo en PNG, JPG o WEBP.");
  }
}

function exigirCompleta(record, coleccion) {
  const falta = faltantes(record, coleccion);
  if (falta.length) throw new BadRequestError("Faltan datos obligatorios: " + falta.join(", ") + ".");
}

/** Aprobada y visible: se muestra en la web. */
function publicada(record) {
  return record.getString("estado") === "aprobado" && record.getBool("activo");
}

/** Publicada y además de un tipo que se muestra en la web (los asociados no se publican: no se les exige ficha completa). */
function seMuestra(record, coleccion) {
  return publicada(record) && (coleccion === "proveedores" || record.getString("rol") === "profesional");
}

/**
 * N.º de socio (asociados y profesionales, cada tipo con su numeración):
 * - Si la ficha aprobada no tiene N.º, se le asigna el siguiente: el mayor N.º numérico de su tipo + 1,
 *   con el mismo ancho que los existentes ("0045" → "0046"). Los N.º con letras ("A-001") no cuentan.
 * - Si el panel escribe uno a mano, no puede repetir el de otra ficha del mismo tipo.
 */
function asignarNumero(app, record) {
  const rol = record.getString("rol") || "asociado";
  const numero = record.getString("numero").trim();
  record.set("numero", numero);
  if (numero) {
    const iguales = app.findRecordsByFilter(
      "profesionales",
      "rol = {:rol} && numero = {:numero} && id != {:id}",
      "",
      1,
      0,
      { rol: rol, numero: numero, id: record.id }
    );
    if (iguales.length) throw new BadRequestError(`El N.º ${numero} ya es de ${iguales[0].getString("nombre")}.`);
    return;
  }
  if (record.getString("estado") !== "aprobado") return;
  let mayor = 0;
  let ancho = 1;
  for (const r of app.findRecordsByFilter("profesionales", "rol = {:rol} && numero != ''", "", 0, 0, { rol: rol })) {
    const n = r.getString("numero").trim();
    if (!/^\d{1,8}$/.test(n)) continue;
    mayor = Math.max(mayor, parseInt(n, 10));
    ancho = Math.max(ancho, n.length);
  }
  let siguiente = String(mayor + 1);
  while (siguiente.length < ancho) siguiente = "0" + siguiente;
  record.set("numero", siguiente);
}

/** Copia del registro original los campos que el dueño no puede cambiar. */
function restaurar(record, coleccion) {
  const original = record.original();
  for (const campo of PROTEGIDOS[coleccion]) record.set(campo, original.get(campo));
}

/* ---------- cuentas ---------- */

/**
 * Altas desde la web: "sitio" es un campo trampa que la persona no ve (si viene completo, lo llenó un robot).
 * Si el servidor tiene TURNSTILE_SECRET, además exige el desafío de Cloudflare Turnstile resuelto.
 */
function antiRobots(e) {
  const body = e.requestInfo().body || {};
  if (String(body.sitio || "") !== "") throw new BadRequestError("No pudimos procesar la solicitud.");
  const secreto = $os.getenv("TURNSTILE_SECRET");
  if (!secreto) return;
  let ok = false;
  try {
    const res = $http.send({
      url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body:
        "secret=" + encodeURIComponent(secreto) +
        "&response=" + encodeURIComponent(String(body.turnstile || "")) +
        "&remoteip=" + encodeURIComponent(e.realIP()),
      timeout: 10,
    });
    ok = res.statusCode === 200 && !!res.json && res.json.success === true;
  } catch (_) {}
  if (!ok) throw new BadRequestError("Confirmá que no sos un robot y volvé a enviar.");
}

function crearCuenta(e) {
  if (esPanel(e)) {
    if (!e.record.getString("estado")) e.record.set("estado", "activa");
    // la contraseña la eligió el panel: la persona la cambia al entrar por primera vez
    e.record.set("cambiar_clave", true);
    return;
  }
  e.record.set("estado", "pendiente");
  e.record.set("motivo", "");
  e.record.set("cambiar_clave", false);
  antiRobots(e);
  if (e.record.getString("name").trim().length < 3) throw new BadRequestError("Completá tu nombre y apellido.");
  if (digitos(e.record.getString("telefono")) < 8) throw new BadRequestError("Completá un teléfono con código de área.");
  const doc = digitos(e.record.getString("documento"));
  if (doc < 7 || doc > 11) throw new BadRequestError("Completá tu DNI o CUIT (solo números).");
}

/**
 * - El panel le pone una contraseña (provisoria): la persona la tiene que cambiar al entrar.
 * - La persona cambia la suya: deja de pedírsela, y no puede quedarse con la misma que le dio la Cámara.
 */
function actualizarCuenta(e) {
  const nueva = String((e.requestInfo().body || {}).password || "");
  if (!esCuenta(e)) {
    if (nueva) e.record.set("cambiar_clave", true);
    return;
  }
  restaurar(e.record, "cuentas");
  if (!nueva) return;
  if (e.record.original().validatePassword(nueva)) throw new BadRequestError("Elegí una contraseña distinta a la que tenías.");
  e.record.set("cambiar_clave", false);
}

/* ---------- portal para todos ---------- */

/** Del panel con permiso sobre asociados o proveedores (o administrador). */
function puedeHabilitar(e) {
  if (!e.auth) return false;
  if (e.auth.isSuperuser()) return true;
  if (e.auth.collection().name !== "users") return false;
  if (e.auth.getBool("admin")) return true;
  const permisos = e.auth.get("permisos") || [];
  for (let i = 0; i < permisos.length; i++) if (["profesionales", "proveedores", "altas"].indexOf(permisos[i]) >= 0) return true;
  return false;
}

// a quién le da acceso el botón del panel: asociados y proveedores aprobados
const GRUPOS_PORTAL = [
  { coleccion: "profesionales", filtro: "rol = 'asociado' && estado = 'aprobado'", rol: "asociado", tipo: "Asociado" },
  { coleccion: "proveedores", filtro: "estado = 'aprobado'", rol: "proveedor", tipo: "Proveedor" },
];

/**
 * Le da acceso al portal a todos los asociados y proveedores aprobados, con el email de su ficha y una misma
 * contraseña inicial que tienen que cambiar al entrar. Si el email ya tiene una cuenta libre del mismo tipo
 * (persona / proveedor), la vincula. Los que ya tenían acceso no se tocan, salvo que se pida reiniciarlos.
 */
function habilitarPortal(app, clave, reiniciar) {
  clave = String(clave || "");
  if (clave.length < 8) throw new BadRequestError("La contraseña inicial tiene que tener al menos 8 caracteres.");
  const res = { creadas: 0, vinculadas: 0, reiniciadas: 0, yaTenian: 0, omitidas: [], porTipo: {} };
  const col = app.findCollectionByNameOrId("cuentas");

  const ponerClave = (cuenta) => {
    cuenta.setPassword(clave);
    cuenta.set("cambiar_clave", true);
    cuenta.set("verified", true);
  };

  for (const g of GRUPOS_PORTAL) {
    const fichas = app.findRecordsByFilter(g.coleccion, g.filtro, "nombre", 0, 0);
    res.porTipo[g.tipo] = fichas.length;
    for (const f of fichas) habilitarFicha(app, col, g, f, reiniciar, ponerClave, res);
  }
  return res;
}

function habilitarFicha(app, col, g, f, reiniciar, ponerClave, res) {
    const nombre = g.tipo + " · " + f.getString("nombre");
    const esProveedor = g.rol === "proveedor";
    try {
      const actual = f.getString("cuenta");
      if (actual) {
        if (!reiniciar) {
          res.yaTenian++;
          return;
        }
        const cuenta = app.findRecordById("cuentas", actual);
        ponerClave(cuenta);
        app.save(cuenta);
        res.reiniciadas++;
        return;
      }

      const email = f.getString("email").trim().toLowerCase();
      if (!emailValido(email)) {
        res.omitidas.push({ nombre: nombre, motivo: "No tiene un email válido en la ficha." });
        return;
      }

      let cuenta = null;
      try {
        cuenta = app.findAuthRecordByEmail("cuentas", email);
      } catch (_) {}

      if (cuenta) {
        const params = { c: cuenta.id, id: f.id };
        const pers = app.findRecordsByFilter("profesionales", "cuenta = {:c} && id != {:id}", "", 1, 0, params);
        const prov = app.findRecordsByFilter("proveedores", "cuenta = {:c} && id != {:id}", "", 1, 0, params);
        if (pers.length || prov.length) {
          res.omitidas.push({ nombre: nombre, motivo: `El email ${email} ya es el acceso de ${(pers[0] || prov[0]).getString("nombre")}.` });
          return;
        }
        if ((cuenta.getString("rol") === "proveedor") !== esProveedor) {
          res.omitidas.push({ nombre: nombre, motivo: `El email ${email} ya tiene una cuenta de ${esProveedor ? "persona" : "proveedor"}.` });
          return;
        }
        cuenta.set("rol", g.rol);
        cuenta.set("estado", "activa");
        ponerClave(cuenta);
        app.save(cuenta);
        res.vinculadas++;
      } else {
        cuenta = new Record(col);
        cuenta.set("email", email);
        cuenta.set("emailVisibility", false);
        cuenta.set("name", f.getString("nombre").slice(0, 120) || email);
        cuenta.set("rol", g.rol);
        cuenta.set("estado", "activa");
        cuenta.set("telefono", f.getString("telefono").slice(0, 40));
        ponerClave(cuenta);
        app.save(cuenta);
        res.creadas++;
      }
      f.set("cuenta", cuenta.id);
      app.saveNoValidate(f);
    } catch (err) {
      res.omitidas.push({ nombre: nombre, motivo: String((err && err.message) || err) });
    }
}

/* ---------- fichas ---------- */

function crearFicha(e, coleccion) {
  const r = e.record;
  normalizarWeb(r);
  if (esCuenta(e)) {
    sinSvg(r, coleccion);
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
  if (coleccion === "profesionales") asignarNumero(e.app, r);
  if (seMuestra(r, coleccion)) exigirCompleta(r, coleccion);
}

/** Devuelve true si este cambio aprueba la ficha (para crearle la cuota después de guardar). */
function actualizarFicha(e, coleccion) {
  const r = e.record;
  const antes = r.original().getString("estado");
  normalizarWeb(r);
  if (esCuenta(e)) {
    sinSvg(r, coleccion);
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
  if (seMuestra(r, coleccion) && !seMuestra(r.original(), coleccion)) exigirCompleta(r, coleccion);
  // al aprobar (o si se le borró), el N.º se genera solo; si cambió el tipo, no puede chocar con otro
  const o = r.original();
  if (coleccion === "profesionales" && (r.getString("numero") !== o.getString("numero") || r.getString("rol") !== o.getString("rol") || r.getString("estado") !== o.getString("estado")))
    asignarNumero(e.app, r);
  return r.getString("estado") === "aprobado" && antes !== "aprobado";
}

/** Después de aprobar: la cuota con la tarifa de su tipo (si ese tipo paga y no tenía). */
function alAprobar(app, record, coleccion) {
  const rol = coleccion === "proveedores" ? "proveedor" : record.getString("rol") || "asociado";
  require(`${__hooks}/contabilidad.js`).suscripcionPorTarifa(app, rol, record.id);
}

/**
 * La cuenta del portal tiene que ser del mismo tipo que su ficha (asociado / profesional): el portal usa ese
 * tipo para el carnet y el formulario. Si el panel le cambia el tipo a la ficha, se lo cambia a la cuenta.
 */
function sincronizarRolCuenta(app, record) {
  const cuentaId = record.getString("cuenta");
  const rol = record.getString("rol");
  if (!cuentaId || (rol !== "asociado" && rol !== "profesional")) return;
  let cuenta;
  try {
    cuenta = app.findRecordById("cuentas", cuentaId);
  } catch (_) {
    return;
  }
  if (cuenta.getString("rol") === rol) return;
  cuenta.set("rol", rol);
  app.save(cuenta);
}

/* ---------- validador público ---------- */

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** N.º de socio comparable: sin espacios, guiones ni ceros adelante ("A-001" = "a1", "0045" = "45"). */
function numeroComparable(texto) {
  return normalizar(texto).replace(/[^a-z0-9]/g, "").replace(/^([a-z]*)0+(?=\d)/, "$1");
}

/**
 * Busca socios aprobados (asociados y profesionales) por nombre o apellido, N.º de socio o email exacto.
 * Devuelve solo lo que hace falta para confirmar que existen: N.º, nombre, tipo y si están al día.
 * No devuelve contacto: los asociados no se publican en la web.
 */
function validar(app, consulta) {
  const q = String(consulta || "").trim().slice(0, 80);
  const qn = normalizar(q);
  if (qn.replace(/[^a-z0-9@]/g, "").length < 2) return [];
  const fichas = app.findRecordsByFilter("profesionales", "estado = 'aprobado'", "nombre", 0, 0);

  let coincide;
  if (q.includes("@")) {
    coincide = (r) => normalizar(r.getString("email")).trim() === qn;
  } else if (/\d/.test(q)) {
    const n = numeroComparable(q);
    coincide = (r) => r.getString("numero") !== "" && numeroComparable(r.getString("numero")) === n;
  } else {
    const palabras = qn.split(/[^a-z]+/).filter((p) => p.length >= 2);
    if (!palabras.length || palabras.join("").length < 3) return [];
    coincide = (r) => {
      const nombre = normalizar(r.getString("nombre"));
      return palabras.every((p) => nombre.includes(p));
    };
  }

  return fichas
    .filter(coincide)
    .slice(0, 10)
    .map((r) => ({
      numero: r.getString("numero"),
      nombre: r.getString("nombre"),
      tipo: r.getString("rol") === "profesional" ? "profesional" : "asociado",
      vigente: r.getBool("activo") && !r.getBool("oculto_mora"),
    }));
}

module.exports = {
  faltantes,
  crearCuenta,
  actualizarCuenta,
  crearFicha,
  actualizarFicha,
  alAprobar,
  sincronizarRolCuenta,
  validar,
  puedeHabilitar,
  habilitarPortal,
};
