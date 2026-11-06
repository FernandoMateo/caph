/// <reference path="../pb_data/types.d.ts" />

// Rubros del directorio (colección rubros): las opciones del campo proveedores.rubro siguen a la colección.
// - Al crear un rubro, su clave se arma con el nombre ("Control de plagas" → "control_de_plagas").
// - La clave no cambia al renombrar: es lo que tiene guardado cada proveedor.
// - No se puede borrar un rubro que tiene proveedores.
// Cada hook corre aislado (no ve funciones de afuera), por eso la sincronización está repetida.

onRecordCreateRequest((e) => {
  let k = e.record.getString("clave");
  if (!k) {
    k = String(e.record.getString("nombre"))
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    e.record.set("clave", k);
  }
  if (!k) throw new BadRequestError("El nombre del rubro no es válido.");
  e.next();
}, "rubros");

onRecordUpdateRequest((e) => {
  e.record.set("clave", e.record.original().getString("clave"));
  e.next();
}, "rubros");

onRecordDeleteRequest((e) => {
  const usados = e.app.countRecords("proveedores", $dbx.hashExp({ rubro: e.record.getString("clave") }));
  if (usados > 0) throw new BadRequestError("No se puede borrar: " + usados + " proveedor(es) tienen este rubro. Cambiales el rubro primero.");
  e.next();
}, "rubros");

// después de crear o borrar: las opciones de proveedores.rubro = las claves de la colección
onRecordAfterCreateSuccess((e) => {
  e.next();
  const claves = e.app.findRecordsByFilter("rubros", "clave != ''", "orden,nombre", 0, 0).map((r) => r.getString("clave"));
  const col = e.app.findCollectionByNameOrId("proveedores");
  col.fields.getByName("rubro").values = claves;
  e.app.save(col);
}, "rubros");

onRecordAfterDeleteSuccess((e) => {
  e.next();
  const claves = e.app.findRecordsByFilter("rubros", "clave != ''", "orden,nombre", 0, 0).map((r) => r.getString("clave"));
  const col = e.app.findCollectionByNameOrId("proveedores");
  col.fields.getByName("rubro").values = claves;
  e.app.save(col);
}, "rubros");
