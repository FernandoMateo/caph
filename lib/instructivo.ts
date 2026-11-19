// Instructivo paso a paso. "socios" se ve en /ayuda (público); "panel", en el panel (/admin/ayuda).
// Las imágenes están en public/ayuda/ y se sacaron con datos de prueba (ningún socio real).

export type Paso = { texto: string; imagen?: string; alt?: string };
export type Guia = { id: string; titulo: string; resumen: string; pasos: Paso[]; nota?: string };

export const GUIAS_SOCIOS: Guia[] = [
  {
    id: "registrarme",
    titulo: "Sumarme a la Cámara",
    resumen: "Cómo pedir el alta como asociado, profesional o proveedor.",
    pasos: [
      { texto: "Entrá a caphsf.ar y tocá “Quiero asociarme”, arriba a la derecha." },
      {
        texto:
          "Elegí cómo te sumás: Asociado (administrador de consorcios), Profesional (solo arquitectos matriculados) o Proveedor (empresa o servicio). Podés cambiarlo arriba del formulario sin perder lo que cargaste.",
        imagen: "/ayuda/alta-tipo.jpg",
        alt: "Formulario de alta con los tres tipos: Asociado, Profesional y Proveedor",
      },
      { texto: "Completá tu cuenta: nombre, email, una contraseña de al menos 8 caracteres, teléfono y DNI o CUIT. Estos datos no se publican." },
      {
        texto:
          "Completá tu ficha: foto (o logo, si sos proveedor), datos de la oficina y contacto. Si ya figurás en la web de la Cámara, marcá “Ya figuro en la web” y escribí con qué nombre o N.º figurás.",
      },
      { texto: "Tocá “Enviar solicitud”. La Cámara la revisa y te avisa cuando quede aprobada." },
    ],
  },
  {
    id: "primer-ingreso",
    titulo: "Entrar por primera vez",
    resumen: "El primer ingreso con la contraseña que te dio la Cámara.",
    pasos: [
      { texto: "Entrá a caphsf.ar/portal (o tocá “Mi portal” en el menú de la web)." },
      { texto: "Escribí tu email y la contraseña inicial que te pasó la Cámara, y tocá “Ingresar”." },
      {
        texto: "La primera vez el portal te pide que elijas tu propia contraseña. Escribila dos veces y tocá “Guardar y seguir”.",
        imagen: "/ayuda/elegir-clave.jpg",
        alt: "Pantalla “Elegí tu contraseña” con los campos Contraseña nueva y Repetila",
      },
      { texto: "Listo: ya estás adentro. La primera vez te mostramos un recorrido corto por el portal; lo podés repetir desde “Recorrido”, arriba." },
    ],
    nota: "La contraseña nueva tiene que ser distinta a la que te dio la Cámara.",
  },
  {
    id: "credencial",
    titulo: "Ver y descargar mi credencial",
    resumen: "Tu carnet digital: darlo vuelta, bajarlo en PDF y verificarlo.",
    pasos: [
      {
        texto: "En tu portal, la credencial está en “Mi carnet”. Tocala para darla vuelta y ver el dorso.",
        imagen: "/ayuda/credencial.jpg",
        alt: "Sección Mi carnet del portal con la credencial digital",
      },
      { texto: "Tocá “Descargar PDF” para guardarla en el teléfono o imprimirla." },
      { texto: "El QR de la credencial abre la página de verificación, que confirma si está vigente. También la ves con “Ver verificación”." },
    ],
    nota: "Si tenés una cuota vencida, la credencial figura como “No vigente” hasta que te pongas al día.",
  },
  {
    id: "compartir",
    titulo: "Compartir mi tarjeta",
    resumen: "Un link con tu carnet y tus datos de contacto, para mandar por WhatsApp.",
    pasos: [
      {
        texto: "Debajo de tu credencial está “Tu tarjeta para compartir”.",
        imagen: "/ayuda/compartir.jpg",
        alt: "Bloque Tu tarjeta para compartir con el link y los botones",
      },
      { texto: "Tocá “Enviar por WhatsApp”, “Copiar” o “Compartir…”. Quien abra el link ve tu carnet y puede guardarte como contacto." },
    ],
  },
  {
    id: "ficha",
    titulo: "Cambiar mis datos",
    resumen: "Foto, teléfono, email y dirección de tu ficha.",
    pasos: [
      {
        texto: "En tu portal, bajá hasta “Mi ficha” (o “Ficha de la empresa”). Cambiá lo que necesites y tocá “Guardar cambios”.",
        imagen: "/ayuda/ficha.jpg",
        alt: "Formulario Mi ficha del portal",
      },
      { texto: "Si tu ficha ya estaba aprobada, el cambio se guarda enseguida y la Cámara lo revisa." },
    ],
  },
  {
    id: "clave",
    titulo: "Cambiar u olvidé mi contraseña",
    resumen: "Cambiarla desde el portal, o recuperarla si te la olvidaste.",
    pasos: [
      { texto: "Para cambiarla: en tu portal, en “Contraseña”, escribí la actual y la nueva, y tocá “Cambiar contraseña”." },
      { texto: "Si te la olvidaste: escribile a la Cámara por WhatsApp. Te generan una provisoria y, al entrar, el portal te pide que elijas una nueva." },
    ],
  },
  {
    id: "verificar",
    titulo: "Buscar o verificar a un asociado",
    resumen: "Para consorcios: confirmar que su administrador es asociado activo.",
    pasos: [
      {
        texto: "En caphsf.ar tocá “Asociados” en el menú. Buscá por nombre, estudio, localidad o N.º de asociado.",
        imagen: "/ayuda/asociados.jpg",
        alt: "Sección Asociados de la web con el buscador",
      },
      { texto: "Tocá “Verificar” en la fila del asociado para ver si su credencial está vigente hoy." },
      { texto: "También podés usar “¿Sos asociado? Verificá tu estado”, en Herramientas, con el email del asociado." },
    ],
  },
];

export const GUIAS_PANEL: Guia[] = [
  {
    id: "altas",
    titulo: "Aprobar o rechazar altas",
    resumen: "Las solicitudes que llegan desde “Quiero asociarme”.",
    pasos: [
      {
        texto: "Entrá a Altas. Arriba podés filtrar por tipo: Asociado, Profesional o Proveedor.",
        imagen: "/ayuda/panel-altas.jpg",
        alt: "Sección Altas del panel con el filtro por tipo",
      },
      { texto: "Revisá los datos de cada solicitud. El N.º de asociado se genera solo al aprobar; si querés, lo podés escribir a mano." },
      {
        texto:
          "Tocá “Aprobar y publicar”. Los profesionales y proveedores aparecen en la web; los asociados aparecen en la sección Asociados (sin teléfono ni email).",
      },
      { texto: "Si algo está mal, tocá “Rechazar” y escribí el motivo: la persona lo ve en su portal, corrige y vuelve a enviar." },
      { texto: "Si la persona dijo que “ya figura en la web”, elegí su ficha y tocá “Aprobar y vincular”." },
    ],
  },
  {
    id: "nueva-ficha",
    titulo: "Dar de alta un asociado o profesional",
    resumen: "Cargar una ficha desde el panel, sin que la persona se registre.",
    pasos: [
      {
        texto: "Entrá a Asociados y profesionales y tocá “Nueva ficha”. Elegí el tipo (Asociado o Profesional) y completá los datos.",
        imagen: "/ayuda/panel-ficha.jpg",
        alt: "Formulario de nueva ficha en el panel",
      },
      { texto: "Dejá el N.º vacío: se asigna solo. Tocá “Guardar cambios”." },
      { texto: "Para darle acceso al portal, abrí la ficha y, en “Acceso al portal”, tocá “Crear acceso al portal”. Pasale el email y la contraseña provisoria por WhatsApp." },
    ],
    nota: "Para proveedores es igual, desde Proveedores → “Nuevo proveedor”.",
  },
  {
    id: "portal-todos",
    titulo: "Dar el portal a todos los socios",
    resumen: "Cuentas para todos los asociados y proveedores, con una contraseña inicial.",
    pasos: [
      {
        texto: "En Asociados y profesionales (o en Proveedores), tocá “Portal para asociados y proveedores”.",
        imagen: "/ayuda/panel-portal-todos.jpg",
        alt: "Formulario Portal para asociados y proveedores con la contraseña inicial",
      },
      { texto: "Escribí la contraseña inicial (la misma para todos) y tocá “Habilitar portal”." },
      { texto: "Al terminar, te muestra cuántas cuentas creó y quiénes quedaron afuera (casi siempre por no tener email en la ficha). Completá esos emails y volvé a correrlo: solo crea las que faltan." },
      { texto: "Avisales a los socios: entran a caphsf.ar/portal con su email y esa contraseña, y el portal les pide que elijan una propia." },
    ],
    nota: "Mientras alguien no cambie la contraseña inicial, cualquiera que sepa su email podría entrar a su cuenta: conviene avisarles enseguida.",
  },
  {
    id: "clave-socio",
    titulo: "Un socio se olvidó la contraseña",
    resumen: "Generarle una contraseña provisoria.",
    pasos: [
      { texto: "Buscá su ficha en Asociados y profesionales (o en Proveedores) y abrila." },
      { texto: "En “Acceso al portal”, tocá “Generar contraseña nueva” y mandásela con “Enviar por WhatsApp”." },
      { texto: "Al entrar, el portal le pide que elija una contraseña propia." },
    ],
  },
  {
    id: "pagos",
    titulo: "Registrar un pago",
    resumen: "Cargar lo que pagó un socio para mantener sus cuotas al día.",
    pasos: [
      { texto: "Entrá a Contabilidad y buscá al socio." },
      { texto: "Tocá “Registrar pago”, completá monto, fecha y medio de pago (y el comprobante, si lo tenés), y guardá." },
      { texto: "Si el socio informó un pago desde su portal, aparece para confirmarlo o rechazarlo." },
    ],
  },
  {
    id: "web",
    titulo: "Cambiar la web",
    resumen: "Honorarios, capacitaciones, galería y textos.",
    pasos: [
      { texto: "Honorarios: cambiá los valores y tocá “Guardar período y ajustes”." },
      { texto: "Capacitaciones: tocá “Nueva actividad” para sumar una a la agenda." },
      { texto: "Textos y rubros: cambiá los textos de la página y tocá “Guardar textos”. Los rubros de proveedores se suman con “Agregar rubro”." },
      { texto: "Todo se ve enseguida en caphsf.ar." },
    ],
  },
  {
    id: "equipo",
    titulo: "Sumar a alguien al panel",
    resumen: "Otra persona que ayuda con algunas secciones.",
    pasos: [
      { texto: "Entrá a Equipo y permisos (solo administradores) y tocá “Nuevo usuario”." },
      { texto: "Completá su email y una contraseña, y marcá las secciones que puede tocar. Si es administrador, puede todo." },
      { texto: "La primera vez que entre, el panel le muestra un recorrido; lo puede repetir desde “Recorrido”, junto a su nombre." },
    ],
  },
];
