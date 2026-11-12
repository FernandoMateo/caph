/// <reference path="../pb_data/types.d.ts" />

// Equipo del panel: además de los administradores, usuarios que ayudan con algunas secciones.
// - users.admin: acceso a todo, incluidos Equipo e Importar y exportar.
// - users.permisos: las secciones que puede tocar (altas, profesionales, contabilidad…).
// - Solo un administrador crea, edita o borra usuarios del panel (antes el alta de "users" era pública).
//   Nadie puede cambiarse sus propios permisos ni borrarse, así siempre queda al menos un administrador.
// Las reglas de cada colección pasan de "cualquier usuario del panel" a "administrador o con ese permiso".
// Las fichas, capacitaciones y textos los puede leer todo el equipo (los listados se cruzan entre secciones);
// la plata, las cuentas del portal y los cursos solo los ve quien tiene el permiso.
// Los usuarios que ya existían quedan como administradores.

const PANEL = "@request.auth.id != '' && @request.auth.collectionName = 'users'";
const ADMIN = "@request.auth.collectionName = 'users' && @request.auth.admin = true";
const con = (secciones) =>
  "(@request.auth.collectionName = 'users' && (@request.auth.admin = true" +
  secciones.map((s) => ` || @request.auth.permisos:each ?= '${s}'`).join("") +
  "))";

const SECCIONES = ["altas", "profesionales", "proveedores", "contabilidad", "capacitaciones", "cursos", "honorarios", "galeria", "textos"];

const PLATA = { leer: ["contabilidad"], escribir: ["contabilidad"] };
const CURSOS = { leer: ["cursos"], escribir: ["cursos"] };
// leer: list y view; escribir: create, update, delete y manage (crear: si el alta lleva otros permisos)
const MAPA = {
  honorarios_ajustes: { escribir: ["honorarios"] },
  honorarios_categorias: { escribir: ["honorarios"] },
  honorarios_tareas: { escribir: ["honorarios"] },
  proveedores: { escribir: ["proveedores", "altas"] },
  profesionales: { escribir: ["profesionales", "altas"] },
  capacitaciones: { escribir: ["capacitaciones", "cursos"] },
  galeria: { escribir: ["galeria"] },
  contenidos: { escribir: ["textos"] },
  rubros: { escribir: ["textos"] },
  // un proveedor nuevo se da de alta con su cuota desde Proveedores
  suscripciones: { leer: ["contabilidad", "proveedores"], escribir: ["contabilidad"], crear: ["contabilidad", "proveedores"] },
  cuotas: PLATA,
  pagos: PLATA,
  medios_debito: PLATA,
  tarifas: PLATA,
  cobro: PLATA,
  cuentas: { leer: ["altas", "profesionales", "proveedores", "contabilidad", "cursos"], escribir: ["altas", "profesionales", "proveedores"] },
  modulos: CURSOS,
  lecciones: CURSOS,
  inscripciones: CURSOS,
  progreso: CURSOS,
};

const REGLAS = { listRule: "leer", viewRule: "leer", createRule: "crear", updateRule: "escribir", deleteRule: "escribir", manageRule: "escribir" };

function permisosDe(m, tipo) {
  if (tipo === "crear") return m.crear || m.escribir;
  return m[tipo];
}

/** Cambia en las reglas `desde` por `hacia` (hacia recibe los permisos de esa regla). */
function recorrer(app, cambiar) {
  for (const nombre of Object.keys(MAPA)) {
    const col = app.findCollectionByNameOrId(nombre);
    // las reglas llegan como punteros de Go: pasadas por JSON quedan como texto o null
    const json = JSON.parse(JSON.stringify(col));
    for (const [regla, tipo] of Object.entries(REGLAS)) {
      if (regla === "manageRule" && col.type !== "auth") continue;
      const actual = json[regla];
      const secciones = permisosDe(MAPA[nombre], tipo);
      if (typeof actual !== "string" || !secciones) continue;
      col[regla] = cambiar(actual, secciones);
    }
    app.save(col);
  }
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("admin")) users.fields.add(new BoolField({ name: "admin" }));
    if (!users.fields.getByName("permisos")) users.fields.add(new SelectField({ name: "permisos", maxSelect: SECCIONES.length, values: SECCIONES }));
    users.listRule = `id = @request.auth.id || (${ADMIN})`;
    users.viewRule = `id = @request.auth.id || (${ADMIN})`;
    users.createRule = ADMIN;
    // cada uno puede cambiar su nombre o contraseña, pero no sus permisos
    users.updateRule = `(${ADMIN} && id != @request.auth.id) || (id = @request.auth.id && @request.body.admin:isset = false && @request.body.permisos:isset = false)`;
    users.deleteRule = `${ADMIN} && id != @request.auth.id`;
    users.manageRule = ADMIN;
    app.save(users);

    for (const u of app.findAllRecords("users")) {
      u.set("admin", true);
      app.saveNoValidate(u);
    }

    recorrer(app, (regla, secciones) => regla.split(PANEL).join(con(secciones)));
  },
  (app) => {
    recorrer(app, (regla, secciones) => regla.split(con(secciones)).join(PANEL));

    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("admin");
    users.fields.removeByName("permisos");
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.createRule = null;
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    users.manageRule = null;
    app.save(users);
  }
);
