/// <reference path="../pb_data/types.d.ts" />

// Actualiza el directorio con la planilla de socios adherentes (proveedores.xlsx, oct 2026).
// Solo datos públicos: nombre comercial, rubro, teléfono y web/redes. DNI, CUIT, emails,
// domicilios y referencias de la planilla no se cargan en la web.
// Se busca cada proveedor por su nombre actual (así conserva logo, verificado y activo);
// los que no existen se crean. Los que no están en la planilla no se tocan.
// [nombre actual o null si es nuevo, nombre, rubro, telefono, web]
const PLANILLA = [
  ["Croissant Seguridad", "Croissant Seguridad", "seguridad", "3425158468", "https://www.instagram.com/croissantalarmas/"],
  ["Lheal Group", "Lheal Group", "seguridad", "3424751070", "https://www.instagram.com/lhealgroup/"],
  ["SPS Seguridad", "SPS Seguridad", "seguridad", "3424387043", "https://www.instagram.com/spsseguridad/"],
  ["Hidalgo Servicio Técnico", "Hidalgo Servicio Técnico", "mantenimiento", "3424784467", "https://www.instagram.com/hidalgo.serviciotecnico/"],
  ["Alejandro González", "Alejandro González · Paisajismo", "mantenimiento", "3424863308", "https://www.instagram.com/alejandrogonzalez9326/"],
  ["Todo Obras", "Todo Obras", "mantenimiento", "3425092512", "https://www.instagram.com/todo.obras.st/"],
  ["Tico Rojas", "Tico Rojas", "pintura", "3425451355", "https://www.instagram.com/ticorojas29172/"],
  ["Martín Rodríguez Pintura", "Martín Rodríguez Pintura", "pintura", "3424429552", "https://www.instagram.com/martinrodriguezpintura/"],
  ["Punto y Chispa Herrería", "Punto y Chispa Herrería", "herreria", "3426267639", "https://www.instagram.com/puntochispa/"],
  ["Bpines SF", "Bpines SF", "otros", "3424084732", "https://www.instagram.com/bpines.sf/"],
  ["Alarmas Santa Fe", "Alarmas Santa Fe", "seguridad", "03424531968", "https://www.facebook.com/ALARMASSANTAFE/"],
  ["FG Herrería y Muebles", "FG Herrería y Muebles", "herreria", "3425129922", "https://www.instagram.com/herreria_y_muebles_de_estilo/"],
  ["Electricidad Alloatti", "Electricidad Alloatti", "electricidad", "03425170318", "https://www.instagram.com/electricidad.alloatti/"],
  ["Pinte.x", "Pinte.x", "pintura", "3424487865", "https://www.instagram.com/pinte.x/"],
  ["Servas Elevators", "Servas Elevators", "ascensores", "5491136966897", "https://www.servas.com/"],
  ["Ascensores Santa Fe", "Ascensores Santa Fe", "ascensores", "03426523600", "https://www.instagram.com/ascensoressantafe/"],
  ["Ascensores Belardinelli", "Ascensores Belardinelli", "ascensores", "3416024071", "https://www.instagram.com/ascensoresbelardinelli/"],
  [null, "Francisco Acevedo · Gas y plomería", "mantenimiento", "3425208296", "https://www.instagram.com/fredyacevedo/"],
  ["Martín Gamboa", "Martín Gamboa", "mantenimiento", "3424471067", "https://www.instagram.com/martingamboa/"],
  ["UNISEG", "UNISEG", "seguros", "3425044067", "https://www.instagram.com/uniseg_/"],
  ["Octavo Piso", "Octavo Piso", "otros", "1123872905", "https://www.instagram.com/octavopiso.ar/"],
  ["RG Ascensores", "RG Ascensores", "ascensores", "3425379435", "https://www.instagram.com/rgascensores/"],
  ["Zea Ascensores", "Zea Ascensores", "ascensores", "3425989171", "https://www.facebook.com/zeaascensores/"],
  ["Casa Edel", "Casa Edel", "electricidad", "3425527863", "https://www.instagram.com/casa.edel/"],
  ["Edicer SF", "Edicer SF", "mantenimiento", "3425083382", "https://www.instagram.com/edicer.sf/"],
  ["Dodorico Energy", "Dodorico Energy", "equipos", "3425464427", "https://www.instagram.com/dodoricoenergy/"],
  ["GM Climatización", "GM Climatización", "climatizacion", "3434152638", "https://www.instagram.com/gm.climatizacion/"],
  [null, "Sagitario Comunicaciones", "seguridad", "3426154232", "https://www.instagram.com/sagitario_comunicaciones/"],
  [null, "Kplac MC", "mantenimiento", "3425331412", "https://www.instagram.com/kplacmc/"],
  ["SEGRUP Argentina SRL", "SEGRUP Argentina SRL", "seguridad", "3416213628", "https://www.segrup.com.ar/"],
  ["JG Seguridad", "JG Seguridad", "seguridad", "3424875783", "https://www.instagram.com/_jgseguridad_/"],
  ["DC Extintores", "DC Extintores", "seguridad", "3424451193", "https://www.instagram.com/dcmatafuegos/"],
  ["La Segunda Seguridad", "La Segunda Seguridad", "seguridad", "3425482756", "https://lasegundaseguridad.com.ar/"],
  [null, "M&L Seguridad y Servicios", "seguridad", "3425151500", ""],
  [null, "GA Mantenimiento Edilicio", "mantenimiento", "3425055322", "https://ga-me.tiiny.site"],
  ["M y L Empresa de Limpieza", "M y L Empresa de Limpieza", "limpieza", "3425151500", "https://www.instagram.com/myllimpiezaprofesional/"],
  ["Braco Pintura en Altura", "Braco Pintura en Altura", "pintura", "3426498284", "https://www.bracopintura.com.ar/"],
  ["Génesis Limpieza y Mantenimiento", "Génesis Limpieza y Mantenimiento", "limpieza", "3412511358", "https://www.instagram.com/geenesiscleanning/"],
  ["Lucas Sisterna Mascotto", "Lucas Sisterna Mascotto", "electricidad", "3425365879", ""],
  ["Electricidad Ceirano", "Electricidad Ceirano", "electricidad", "3425760772", "https://www.instagram.com/electricidad.ceirano/"],
  ["ONE DOR", "ONE DOR", "seguridad", "3424097575", "https://www.onedor.ar"],
  [null, "Argentina Limpia", "limpieza", "3424067542", "https://www.instagram.com/argentinalimpiaok/"],
  ["REDCONAR", "REDCONAR", "otros", "1132959058", "https://redconar.net"],
  ["PMP Servicios", "PMP Servicios", "mantenimiento", "3426156860", "https://www.instagram.com/pmp_servicios/"],
  ["VOLTO S.A.S", "VOLTO S.A.S", "otros", "3425194298", "https://volto.dev"],
  ["José Manuel Dios · Libros de datos", "José Manuel Dios · Libros de datos", "otros", "1144981490", "https://www.librosdedatos.com.ar"],
];

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("proveedores");
    for (const [actual, nombre, rubro, telefono, web] of PLANILLA) {
      let r = null;
      if (actual) {
        try {
          r = app.findFirstRecordByData("proveedores", "nombre", actual);
        } catch (_) {}
      }
      if (!r) {
        r = new Record(col);
        r.set("verificado", true);
        r.set("activo", true);
      }
      r.set("nombre", nombre);
      r.set("rubro", rubro);
      r.set("telefono", telefono);
      r.set("web", web);
      app.save(r);
    }
  },
  (app) => {}
);
