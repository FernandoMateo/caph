/// <reference path="../pb_data/types.d.ts" />

// Capacitaciones online: inscripción, avance y certificados (ver cursos.js).

onRecordCreateRequest((e) => {
  require(`${__hooks}/cursos.js`).crearInscripcion(e);
  e.next();
}, "inscripciones");

onRecordUpdateRequest((e) => {
  require(`${__hooks}/cursos.js`).actualizarInscripcion(e);
  e.next();
}, "inscripciones");

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/cursos.js`);
  lib.crearProgreso(e);
  e.next();
  lib.revisar(e.app, e.record.getString("inscripcion"));
}, "progreso");

// Verificación pública de un certificado (la usa /verificar/certificado/<código>).
routerAdd("GET", "/api/caph/certificado/{codigo}", (e) => {
  const datos = require(`${__hooks}/cursos.js`).datosCertificado(e.app, e.request.pathValue("codigo"));
  if (!datos) return e.json(404, { message: "Certificado inexistente." });
  return e.json(200, datos);
});
