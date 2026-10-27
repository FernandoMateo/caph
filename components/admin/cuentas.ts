// Tipos y cálculos de la contabilidad de cuotas (la lógica que genera e imputa vive en pocketbase/pb_hooks).

export type Suscripcion = {
  id: string;
  proveedor: string;
  cuota_monto: number;
  inscripcion_monto: number;
  fecha_alta: string;
  dia_vencimiento: number;
  activa: boolean;
  nota: string;
};

export type Cuota = {
  id: string;
  proveedor: string;
  tipo: "mensual" | "inscripcion";
  periodo: string;
  vencimiento: string;
  monto: number;
  pagado: number;
  nota: string;
};

export type Pago = {
  id: string;
  collectionId: string;
  proveedor: string;
  fecha: string;
  monto: number;
  medio: string;
  comprobante?: string;
  nota: string;
  cargado_por: string;
};

export const MEDIOS: Record<string, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  mercadopago: "Mercado Pago",
  cheque: "Cheque",
  otro: "Otro",
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Hoy en Argentina como "AAAA-MM-DD" (igual que el servidor). */
export function hoy() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Valor para guardar un campo fecha de PocketBase (mediodía UTC: no se corre de día en ningún huso). */
export const aFechaPb = (ymd: string) => `${ymd} 12:00:00.000Z`;
export const dia = (fechaPb: string) => fechaPb.slice(0, 10);

export function fechaCorta(ymd: string) {
  const [a, m, d] = dia(ymd).split("-");
  return `${d}/${m}/${a}`;
}

export function nombrePeriodo(c: Pick<Cuota, "tipo" | "periodo">) {
  if (c.tipo === "inscripcion") return "Inscripción";
  const [a, m] = c.periodo.split("-");
  const mes = MESES[+m - 1] ?? m;
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${a}`;
}

/** Lee un monto escrito a la argentina: "37.500", "37500", "18.523,12" o "18523,12". NaN si no es válido. */
export function leerPesos(texto: string) {
  let t = texto.trim().replace(/\s|\$/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  return t === "" ? NaN : Number(t);
}

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
export const dinero = (n: number) => pesos.format(n || 0);

export const saldo = (c: Cuota) => Math.max(0, Math.round((c.monto - c.pagado) * 100) / 100);

/** Mismo plazo que el servidor: vencimiento + 1 mes + 10 días. */
export function limiteMora(vencimiento: string) {
  const [a, m, d] = dia(vencimiento).split("-").map(Number);
  const sigA = m === 12 ? a + 1 : a;
  const sigM = m === 12 ? 1 : m + 1;
  const ultimo = new Date(Date.UTC(sigA, sigM, 0)).getUTCDate();
  const base = Date.UTC(sigA, sigM - 1, Math.min(d, ultimo));
  return new Date(base + 10 * 86400000).toISOString().slice(0, 10);
}

export type Estado = "sin-cuota" | "sin-cobro" | "mora" | "deuda" | "pronto" | "al-dia";

export type Cuenta = {
  suscripcion?: Suscripcion;
  cuotas: Cuota[];
  pagos: Pago[];
  deudaVencida: number;
  cuotasVencidas: number;
  deudaTotal: number;
  proxima?: Cuota;
  /** Próximo vencimiento: el de la cuota impaga que viene, o el de la cuota del mes que todavía no se generó. */
  proximaFecha?: string;
  seOculta?: string;
  estado: Estado;
};

export function cuenta(suscripcion: Suscripcion | undefined, cuotas: Cuota[], pagos: Pago[], ocultoMora: boolean): Cuenta {
  const h = hoy();
  const ordenadas = [...cuotas].sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || a.tipo.localeCompare(b.tipo));
  const impagas = ordenadas.filter((c) => saldo(c) > 0);
  const vencidas = impagas.filter((c) => dia(c.vencimiento) < h);
  const deudaVencida = vencidas.reduce((s, c) => s + saldo(c), 0);
  const deudaTotal = impagas.reduce((s, c) => s + saldo(c), 0);
  const proxima = impagas.find((c) => dia(c.vencimiento) >= h);
  const seOculta = vencidas[0] ? limiteMora(vencidas[0].vencimiento) : undefined;

  let estado: Estado;
  if (ocultoMora) estado = "mora";
  else if (vencidas.length) estado = "deuda";
  else if (!suscripcion) estado = "sin-cuota";
  else if (!suscripcion.activa) estado = "sin-cobro";
  else if (proxima && dias(h, dia(proxima.vencimiento)) <= 5) estado = "pronto";
  else estado = "al-dia";

  return {
    suscripcion,
    cuotas: ordenadas,
    pagos: [...pagos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    deudaVencida,
    cuotasVencidas: vencidas.length,
    deudaTotal,
    proxima,
    proximaFecha: proxima ? dia(proxima.vencimiento) : suscripcion?.activa ? siguienteVencimiento(suscripcion, ordenadas) : undefined,
    seOculta,
    estado,
  };
}

function siguienteVencimiento(s: Suscripcion, cuotas: Cuota[]) {
  const mensuales = cuotas.filter((c) => c.tipo === "mensual");
  const ultimo = mensuales.length ? mensuales[mensuales.length - 1].periodo : dia(s.fecha_alta).slice(0, 7);
  let [a, m] = ultimo.split("-").map(Number);
  if (mensuales.length) [a, m] = m === 12 ? [a + 1, 1] : [a, m + 1];
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${a}-${String(m).padStart(2, "0")}-${String(Math.min(s.dia_vencimiento, ultimoDia)).padStart(2, "0")}`;
}

function dias(desde: string, hasta: string) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);
}

export function textoEstado(c: Cuenta) {
  switch (c.estado) {
    case "mora":
      return "Oculto por mora";
    case "deuda":
      return c.cuotasVencidas === 1 ? "Debe 1 cuota" : `Debe ${c.cuotasVencidas} cuotas`;
    case "sin-cuota":
      return "Sin cuota";
    case "sin-cobro":
      return "Sin cobro";
    case "pronto":
      return `Vence el ${fechaCorta(c.proxima!.vencimiento).slice(0, 5)}`;
    default:
      return "Al día";
  }
}

/** Link de WhatsApp con el recordatorio de la deuda, o null si no hay teléfono. */
export function linkRecordatorio(nombre: string, telefono: string, c: Cuenta) {
  let num = telefono.replace(/\D/g, "");
  if (!num) return null;
  if (num.startsWith("0")) num = num.slice(1);
  if (!num.startsWith("54")) num = `549${num}`;
  const pendientes = c.cuotas.filter((x) => saldo(x) > 0 && dia(x.vencimiento) <= hoy());
  const detalle = pendientes.map((x) => `${nombrePeriodo(x)} (${dinero(saldo(x))})`).join(", ");
  const total = pendientes.reduce((s, x) => s + saldo(x), 0);
  const texto = pendientes.length
    ? `Hola ${nombre}, te escribimos de la Cámara de Administradores CAPH Santa Fe. Te recordamos que tenés pendiente: ${detalle}. Total: ${dinero(total)}. ¡Muchas gracias!`
    : `Hola ${nombre}, te escribimos de la Cámara de Administradores CAPH Santa Fe.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
