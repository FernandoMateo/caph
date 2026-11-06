"use client";

// PDF del carnet (A4, frente y dorso a tamaño real para imprimir y recortar). Se genera en el navegador:
// el portal lo importa recién al tocar "Descargar PDF", así la librería no pesa en la carga de la página.
// Repite el diseño del carnet en pantalla (app/portal/portal.css): las medidas van en centésimos del ancho
// de la tarjeta, igual que los "cqw" del CSS.

import {
  Circle,
  Defs,
  Document,
  Font,
  G,
  Image,
  LinearGradient,
  Page,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { etiquetaDetalle, iniciales, type DatosCarnet } from "../components/portal/Carnet";
import { LINKS } from "./data";

// sin guiones de corte: un nombre largo termina en "…" en lugar de partirse
Font.registerHyphenationCallback((palabra) => [palabra]);

const MM = 72 / 25.4;
const ANCHO = 85.6 * MM;
const ALTO = 54 * MM;
/** n centésimos del ancho de la tarjeta, en puntos (equivale a "n cqw" del CSS). */
const c = (n: number) => (n * ANCHO) / 100;
const ALTO_C = (54 / 85.6) * 100;

const COLOR = {
  navy: "#091135",
  fondo: "#0f1b4f",
  yellow: "#fec73e",
  red: "#ff4f42",
  blue: "#3fb3e2",
  teal: "#5bb5c1",
  text2: "#4a5272",
  muted: "#6f7896",
  okBg: "#e3f4e8",
  ok: "#1d6b38",
  offBg: "#fdecea",
  off: "#8a1f1f",
};

const ROL: Record<string, { fondo: string; texto: string }> = {
  asociado: { fondo: COLOR.red, texto: "#ffffff" },
  proveedor: { fondo: COLOR.blue, texto: COLOR.navy },
  profesional: { fondo: COLOR.yellow, texto: COLOR.navy },
};

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", color: COLOR.navy },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  ayuda: { marginTop: 4, fontSize: 9, color: COLOR.text2 },
  caras: { marginTop: 28, flexDirection: "row", flexWrap: "wrap", gap: 24 },
  etiqueta: { marginBottom: 6, fontSize: 8, color: COLOR.muted, textTransform: "uppercase", letterSpacing: 1 },
  corte: { position: "relative", width: ANCHO, height: ALTO, borderRadius: c(4.2), border: "0.6pt dashed #9aa3bd", overflow: "hidden" },
  abs: { position: "absolute" },
  micro: { fontFamily: "Helvetica-Bold", fontSize: c(1.45), letterSpacing: c(1.45) * 0.16, textTransform: "uppercase" },
});

/** Las formas del logo (las mismas que components/Logo.tsx, viewBox 10 0 82 63). `ground` es el color del fondo. */
function piezas(ground: string, opacidad = 1) {
  const o = { fillOpacity: opacidad };
  return [
    <Rect key="1" x="51.3" y="1" width="38.5" height="36.5" fill="#FEC73E" {...o} />,
    <Circle key="2" cx="28.8" cy="19.4" r="18.1" fill="#FF4F42" {...o} />,
    <Polygon key="3" points="12.5,38.2 24.6,38.2 24.6,41.2 12.5,55.6" fill="#3FB3E2" {...o} />,
    <Polygon key="4" points="13,61.3 48.2,61.3 29.6,43.8" fill="#5BB5C1" {...o} />,
    <Polygon key="5" points="53.8,61.3 89.6,61.3 73.8,43.8" fill="#A1C0D4" {...o} />,
    <Polygon key="6" points="77.2,37.6 89.8,24 89.8,56.4" fill="#002F43" stroke={opacidad < 1 ? "none" : ground} strokeWidth={1.6} {...o} />,
    <Rect key="7" x="77.6" y="36.8" width="12.2" height="5" fill="#F9A63A" {...o} />,
    <Polygon
      key="8"
      points="37,15.8 65.4,15.8 71.4,21.8 71.4,48.8 65.4,55 37,55 31,48.8 31,21.8"
      fill="#002F43"
      stroke={opacidad < 1 ? "none" : ground}
      strokeWidth={2.2}
      {...o}
    />,
    <Rect key="9" x="40" y="23.6" width="11.2" height="3.2" rx="1" fill="#F9A63A" {...o} />,
  ];
}

/** Logo + "CAPH Santa Fe", arriba a la izquierda. */
function Marca({ oscura, top }: { oscura?: boolean; top: number }) {
  const logo = 9.5;
  const tinta = oscura ? "#ffffff" : COLOR.navy;
  return (
    <>
      <Svg viewBox="10 0 82 63" style={[s.abs, { left: c(5.5), top: c(top), width: c(logo), height: c((logo * 63) / 82) }]}>
        {piezas(oscura ? COLOR.fondo : "#ffffff")}
      </Svg>
      <View style={[s.abs, { left: c(5.5 + logo + 1.6), top: c(top + 0.6) }]}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(4.6), lineHeight: 0.95, color: tinta }}>CAPH</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(1.5), letterSpacing: c(1.5) * 0.32, color: tinta, opacity: 0.75 }}>SANTA FE</Text>
      </View>
    </>
  );
}

function Pildora({ texto, fondo, color, top }: { texto: string; fondo: string; color: string; top: number }) {
  return (
    <View style={[s.abs, { right: c(5.5), top: c(top), paddingVertical: c(0.9), paddingHorizontal: c(2.6), borderRadius: c(3), backgroundColor: fondo }]}>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(2.1), letterSpacing: c(2.1) * 0.14, color }}>{texto.toUpperCase()}</Text>
    </View>
  );
}

/** Franja de identidad con los colores del logo. */
function Franja({ y }: { y: number }) {
  const h = 1.6;
  return (
    <>
      <Rect x="0" y={String(y)} width="22" height={String(h)} fill={COLOR.yellow} />
      <Rect x="22" y={String(y)} width="34" height={String(h)} fill={COLOR.red} />
      <Rect x="56" y={String(y)} width="26" height={String(h)} fill={COLOR.blue} />
      <Rect x="82" y={String(y)} width="18" height={String(h)} fill={COLOR.teal} />
    </>
  );
}

function Frente({ d, foto, qr }: { d: DatosCarnet; foto: string; qr: string }) {
  const rol = ROL[d.rol.toLowerCase()] ?? ROL.asociado;
  const meta = [d.numero && ["N.º de socio", d.numero], d.detalle && [etiquetaDetalle(d), d.detalle]].filter(Boolean) as [string, string][];
  // las formas del logo grandes y tenues, cortadas por el borde (como en pantalla)
  const k = 74 / 82;
  return (
    <View style={s.corte}>
      <Svg viewBox={`0 0 100 ${ALTO_C}`} style={[s.abs, { left: 0, top: 0, width: ANCHO, height: ALTO }]}>
        <Defs>
          <LinearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#16246a" />
            <Stop offset="0.48" stopColor="#0b1541" />
            <Stop offset="1" stopColor="#060b26" />
          </LinearGradient>
          <RadialGradient id="rojo" cx="0" cy="0" r="0.6">
            <Stop offset="0" stopColor={COLOR.red} stopOpacity={0.42} />
            <Stop offset="1" stopColor={COLOR.red} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="amarillo" cx="1" cy="1" r="0.55">
            <Stop offset="0" stopColor={COLOR.yellow} stopOpacity={0.34} />
            <Stop offset="1" stopColor={COLOR.yellow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="celeste" cx="0.92" cy="0" r="0.45">
            <Stop offset="0" stopColor={COLOR.blue} stopOpacity={0.3} />
            <Stop offset="1" stopColor={COLOR.blue} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="aro" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={COLOR.red} />
            <Stop offset="0.35" stopColor={COLOR.yellow} />
            <Stop offset="0.7" stopColor={COLOR.teal} />
            <Stop offset="1" stopColor={COLOR.blue} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height={String(ALTO_C)} fill="url(#fondo)" />
        <Rect x="0" y="0" width="100" height={String(ALTO_C)} fill="url(#rojo)" />
        <Rect x="0" y="0" width="100" height={String(ALTO_C)} fill="url(#amarillo)" />
        <Rect x="0" y="0" width="100" height={String(ALTO_C)} fill="url(#celeste)" />
        <G transform={`translate(${42 - 10 * k} -10) scale(${k})`}>{piezas("none", 0.1)}</G>
        <Rect x="5.5" y="18.5" width="21" height="26" rx="3.4" fill="url(#aro)" />
        <Franja y={ALTO_C - 1.6} />
      </Svg>

      <Marca oscura top={5} />
      <Pildora texto={d.rol} fondo={rol.fondo} color={rol.texto} top={5.4} />

      <View style={[s.abs, { left: c(6.2), top: c(19.2), width: c(19.6), height: c(24.6), borderRadius: c(2.8), overflow: "hidden", backgroundColor: "#e7eff4" }]}>
        {foto ? (
          <Image src={foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(6.5), color: COLOR.navy }}>{iniciales(d.nombre)}</Text>
          </View>
        )}
      </View>

      <View style={[s.abs, { left: c(31), top: c(19), width: c(42) }]}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(4.3), lineHeight: 1.1, color: "#ffffff", maxLines: 2, textOverflow: "ellipsis" }}>{d.nombre}</Text>
        {d.subtitulo ? (
          <Text style={{ marginTop: c(1), fontFamily: "Helvetica-Bold", fontSize: c(2.5), color: COLOR.yellow, maxLines: 1, textOverflow: "ellipsis" }}>{d.subtitulo}</Text>
        ) : null}
        {meta.length > 0 && (
          <View style={{ marginTop: c(2.6), flexDirection: "row", gap: c(2.5) }}>
            {meta.map(([label, valor]) => (
              <View key={label} style={{ flex: 1 }}>
                <Text style={[s.micro, { color: "#ffffff", opacity: 0.6 }]}>{label}</Text>
                <Text style={{ marginTop: c(0.4), fontFamily: "Helvetica-Bold", fontSize: c(2.4), color: "#ffffff", maxLines: 1, textOverflow: "ellipsis" }}>
                  {valor}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[s.abs, { right: c(5.5), top: c(18.5), width: c(18), alignItems: "center" }]}>
        <View style={{ width: c(18), height: c(18), padding: c(1.5), borderRadius: c(2.6), backgroundColor: "#ffffff" }}>
          <Image src={qr} style={{ width: "100%", height: "100%" }} />
        </View>
        <Text style={{ marginTop: c(1), fontSize: c(1.5), color: "#ffffff", opacity: 0.7 }}>Escaneá para verificar</Text>
      </View>

      <View style={[s.abs, { left: c(5.5), right: c(5.5), bottom: c(5), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: c(1.2) }}>
          <View style={{ width: c(1.5), height: c(1.5), borderRadius: c(0.75), backgroundColor: d.vigente ? "#3ddc84" : COLOR.red }} />
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(1.9), color: "#ffffff", opacity: 0.78 }}>
            {d.vigente ? "Credencial vigente" : "Credencial no vigente"}
          </Text>
        </View>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(1.9), color: "#ffffff", opacity: 0.78 }}>caphsf.ar</Text>
      </View>
    </View>
  );
}

function Dorso({ d }: { d: DatosCarnet }) {
  const rol = d.rol.toLowerCase();
  const k = 70 / 82;
  return (
    <View style={s.corte}>
      <Svg viewBox={`0 0 100 ${ALTO_C}`} style={[s.abs, { left: 0, top: 0, width: ANCHO, height: ALTO }]}>
        <Defs>
          <LinearGradient id="claro" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="1" stopColor="#f4f8fb" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height={String(ALTO_C)} fill="url(#claro)" />
        <G transform={`translate(${50 - 10 * k} ${ALTO_C + 18 - 63 * k}) scale(${k})`}>{piezas("none", 0.07)}</G>
        <Franja y={0} />
      </Svg>

      <Marca top={6} />
      <Pildora texto={d.vigente ? "Vigente" : "No vigente"} fondo={d.vigente ? COLOR.okBg : COLOR.offBg} color={d.vigente ? COLOR.ok : COLOR.off} top={6.4} />

      <View style={[s.abs, { left: c(5.5), right: c(5.5), top: c(19.5) }]}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: c(3.6), color: COLOR.navy }}>Credencial de {rol}</Text>
        <Text style={{ marginTop: c(1.4), width: c(70), fontSize: c(2.3), lineHeight: 1.45, color: COLOR.text2 }}>
          Identifica a su titular como {rol} de la Cámara de la Propiedad Horizontal de Santa Fe, 1.ª Circunscripción.
        </Text>
        <Text style={[s.micro, { marginTop: c(2.4), color: COLOR.navy, opacity: 0.6 }]}>Titular</Text>
        <Text style={{ marginTop: c(0.4), fontFamily: "Helvetica-Bold", fontSize: c(2.4), color: COLOR.navy }}>{d.nombre}</Text>
      </View>

      <View
        style={[
          s.abs,
          { left: c(5.5), right: c(5.5), bottom: c(5.5), paddingTop: c(2.4), borderTop: "0.5pt solid #e1e6ef", flexDirection: "row", justifyContent: "space-between" },
        ]}
      >
        <View>
          <Text style={[s.micro, { color: COLOR.navy, opacity: 0.6 }]}>Verificación</Text>
          <Text style={{ marginTop: c(0.4), fontFamily: "Helvetica-Bold", fontSize: c(2.1), color: COLOR.navy }}>Escaneá el QR del frente</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.micro, { color: COLOR.navy, opacity: 0.6 }]}>Contacto</Text>
          <Text style={{ marginTop: c(0.4), fontFamily: "Helvetica-Bold", fontSize: c(2.1), color: COLOR.navy }}>WhatsApp {LINKS.whatsappLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function DocumentoCarnet({ d, foto, qr }: { d: DatosCarnet; foto: string; qr: string }) {
  return (
    <Document title={`Carnet CAPH Santa Fe · ${d.nombre}`} author="CAPH Santa Fe">
      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>Carnet digital · CAPH Santa Fe</Text>
        <Text style={s.ayuda}>
          Imprimí al 100 % (tamaño real, 85,6 × 54 mm) y recortá por la línea punteada. Su vigencia se confirma escaneando el QR.
        </Text>
        <View style={s.caras}>
          <View>
            <Text style={s.etiqueta}>Frente</Text>
            <Frente d={d} foto={foto} qr={qr} />
          </View>
          <View>
            <Text style={s.etiqueta}>Dorso</Text>
            <Dorso d={d} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** Foto recortada como en el carnet (21:26) y pasada a JPEG: el PDF no admite WebP. */
async function fotoJpeg(url: string) {
  if (!url) return "";
  const img = new window.Image();
  img.src = url;
  await img.decode();
  const w = 504;
  const h = 624;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const escala = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * escala;
  const dh = img.naturalHeight * escala;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** Genera el PDF y lo descarga. */
export async function descargarCarnetPdf(d: DatosCarnet) {
  const [foto, qr] = await Promise.all([
    fotoJpeg(d.foto).catch(() => ""),
    QRCode.toDataURL(d.verificar, { margin: 0, width: 600, errorCorrectionLevel: "M", color: { dark: COLOR.navy, light: "#ffffff" } }),
  ]);
  const blob = await pdf(<DocumentoCarnet d={d} foto={foto} qr={qr} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-caph-${d.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
