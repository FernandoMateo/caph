/// <reference path="../pb_data/types.d.ts" />

// Seguridad:
// - pagos.comprobante pasa a ser protegido: el archivo solo se descarga con un token de sesión (panel o dueño),
//   no con el enlace suelto.
// - Las contraseñas nuevas del panel (users) tienen que tener al menos 10 caracteres. Las que ya existen siguen valiendo.
// Los límites de intentos y los backups automáticos los activa pb_hooks/seguridad.pb.js en el servidor.

migrate(
  (app) => {
    const pagos = app.findCollectionByNameOrId("pagos");
    pagos.fields.getByName("comprobante").protected = true;
    app.save(pagos);

    const users = app.findCollectionByNameOrId("users");
    users.fields.getByName("password").min = 10;
    app.save(users);
  },
  (app) => {
    const pagos = app.findCollectionByNameOrId("pagos");
    pagos.fields.getByName("comprobante").protected = false;
    app.save(pagos);

    const users = app.findCollectionByNameOrId("users");
    users.fields.getByName("password").min = 8;
    app.save(users);
  }
);
