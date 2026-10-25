/// <reference path="../pb_data/types.d.ts" />

// Carga inicial del directorio de proveedores (caphsf.ar, oct 2026).
// [nombre, rubro, verificado, telefono, web]
const PROVEEDORES = [
  ["SPS Seguridad", "seguridad", false, "3424387043", ""],
  ["Pinte.x", "pintura", true, "3424487865", "https://www.instagram.com/pinte.x/"],
  ["Martín Rodríguez Pintura", "pintura", true, "3424429552", "https://www.instagram.com/rodriguezpintura/"],
  ["Electricidad Alloatti", "electricidad", true, "03425170318", "https://www.instagram.com/electricidad.alloatti/"],
  ["Punto y Chispa Herrería", "herreria", true, "3426267639", "https://www.instagram.com/puntochispa/"],
  ["FG Herrería y Muebles", "herreria", true, "3425129922", "https://www.instagram.com/herreria_y_muebles_de_estilo/"],
  ["Lheal Group", "otros", true, "3424751070", "https://www.instagram.com/lheal_group/"],
  ["Tico Rojas", "otros", true, "3425451355", "https://www.instagram.com/ticorojas29172/"],
  ["VOLTO S.A.S", "otros", true, "3425194298", "https://volto.dev"],
  ["José Manuel Dios · Libros de datos", "otros", true, "3425194298", "https://www.librosdedatos.com.ar"],
  ["Casa Edel", "otros", true, "3425527863", "https://www.instagram.com/casa.edel/"],
  ["Croissant Seguridad", "seguridad", true, "3425158468", "https://www.instagram.com/croissantalarmas/"],
  ["DC Extintores", "seguridad", true, "", ""],
  ["UNISEG", "seguros", true, "3425044067", "https://www.instagram.com/uniseg_/"],
  ["Dodorico Energy", "equipos", true, "3425464427", "https://www.instagram.com/dodoricoenergy/"],
  ["Alarmas Santa Fe", "seguridad", true, "03424531968", "https://www.facebook.com/ALARMASSANTAFE/"],
  ["Todo Obras", "mantenimiento", true, "", "https://www.instagram.com/todo.obras.st/"],
  ["Bpines SF", "otros", true, "3424084732", "https://www.instagram.com/bpines.sf/"],
  ["Alejandro González", "otros", true, "", ""],
  ["PMP Servicios", "otros", true, "13426156860", "https://www.instagram.com/pmp_servicios/"],
  ["REDCONAR", "otros", true, "1132959058", "https://www.instagram.com/redconar/"],
  ["ONE DOR", "seguridad", true, "3424097575", ""],
  ["Lucas Sisterna Mascotto", "electricidad", true, "3425365879", ""],
  ["Electricidad Ceirano", "electricidad", true, "3425760772", ""],
  ["Braco Pintura en Altura", "pintura", true, "3424056075", ""],
  ["Génesis Limpieza y Mantenimiento", "limpieza", true, "3412511358", ""],
  ["GM Climatización", "climatizacion", false, "3424863308", ""],
  ["Edicer SF", "otros", true, "3434152638", "https://www.instagram.com/edicer.sf/"],
  ["Martín Gamboa", "otros", false, "3424471067", ""],
  ["SEGRUP Argentina SRL", "seguridad", true, "3416213628", "https://www.segrup.com.ar"],
  ["Zea Ascensores", "ascensores", true, "3425989171", "https://www.facebook.com/zeaascensores/"],
  ["Servas Elevators", "ascensores", true, "5491136966897", "https://www.servas.com/"],
  ["M y L Empresa de Limpieza", "limpieza", true, "36425151500", "https://www.instagram.com/myllimpiezaprofesional"],
  ["JG Seguridad", "seguridad", true, "3424875783", "https://www.instagram.com/_jgseguridad_/"],
  ["Hidalgo Servicio Técnico", "ascensores", true, "3424784467", "https://www.instagram.com/hidalgo.serviciotecnico/"],
  ["La Segunda Seguridad", "seguridad", true, "3425482756", "https://lasegundaseguridad.com.ar"],
  ["Ascensores Belardinelli", "ascensores", true, "3416024071", "https://www.instagram.com/ascensoresbelardinelli/"],
  ["RG Ascensores", "ascensores", true, "3425379435", "https://www.instagram.com/rgascensores/"],
  ["Octavo Piso", "seguros", true, "1123872905", "https://www.instagram.com/octavopiso.ar"],
  ["Ascensores Santa Fe", "ascensores", true, "03426523600", "https://www.instagram.com/ascensoressantafe/"],
];

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("proveedores");
    for (const [nombre, rubro, verificado, telefono, web] of PROVEEDORES) {
      const r = new Record(col);
      r.set("nombre", nombre);
      r.set("rubro", rubro);
      r.set("verificado", verificado);
      r.set("telefono", telefono);
      r.set("web", web);
      r.set("activo", true);
      app.save(r);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("proveedores");
    for (const r of app.findAllRecords(col)) app.delete(r);
  }
);
