"use client";

// PDF del certificado de una capacitación (A4 apaisado). Se genera en el navegador, como el carnet:
// el portal lo importa recién al tocar "Descargar certificado".

import { Circle, Document, Font, Image, Page, Polygon, Rect, StyleSheet, Svg, Text, View, pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { TIPOS_CAPACITACION, urlCertificado } from "./cursos";

Font.registerHyphenationCallback((palabra) => [palabra]);

export type DatosCertificado = {
  codigo: string;
  nombre: string;
  curso: string;
  tipo: string;
  horas: number;
  certificacion: string;
  /** "AAAA-MM-DD" */
  fecha: string;
};

const C = { navy: "#091135", petrol: "#002f43", text2: "#4a5272", muted: "#6f7896", yellow: "#fec73e", red: "#ff4f42", blue: "#3fb3e2", line: "#d6dde8" };

const s = StyleSheet.create({
  page: { padding: 0, fontFamily: "Helvetica", color: C.navy },
  marco: { position: "absolute", top: 22, left: 22, right: 22, bottom: 22, border: `1pt solid ${C.line}`, borderRadius: 18 },
  cuerpo: { flex: 1, paddingTop: 64, paddingHorizontal: 90, alignItems: "center" },
  marca: { flexDirection: "row", alignItems: "center", gap: 10 },
  caph: { fontFamily: "Helvetica-Bold", fontSize: 26, lineHeight: 0.95 },
  santaFe: { fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 2.4 },
  eyebrow: { marginTop: 34, fontFamily: "Helvetica-Bold", fontSize: 11, letterSpacing: 4, color: C.blue },
  titulo: { marginTop: 6, fontFamily: "Helvetica-Bold", fontSize: 40, letterSpacing: -0.5 },
  texto: { marginTop: 22, fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 1.5 },
  nombre: { marginTop: 10, fontFamily: "Helvetica-Bold", fontSize: 30, color: C.petrol, textAlign: "center" },
  linea: { marginTop: 8, width: 360, height: 2, backgroundColor: C.yellow },
  curso: { fontFamily: "Helvetica-Bold", color: C.navy },
  pie: { position: "absolute", left: 90, right: 90, bottom: 58, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  firma: { width: 220, alignItems: "center" },
  firmaLinea: { width: 220, height: 1, backgroundColor: C.navy, marginBottom: 6 },
  firmaTexto: { fontSize: 9, color: C.text2, textAlign: "center" },
  qr: { alignItems: "center", gap: 4 },
  codigo: { fontSize: 8, color: C.muted },
});

function Logo() {
  return (
    <Svg viewBox="10 0 82 63" style={{ width: 56, height: 43 }}>
      <Rect x="51.3" y="1" width="38.5" height="36.5" fill="#FEC73E" />
      <Circle cx="28.8" cy="19.4" r="18.1" fill="#FF4F42" />
      <Polygon points="12.5,38.2 24.6,38.2 24.6,41.2 12.5,55.6" fill="#3FB3E2" />
      <Polygon points="13,61.3 48.2,61.3 29.6,43.8" fill="#5BB5C1" />
      <Polygon points="53.8,61.3 89.6,61.3 73.8,43.8" fill="#A1C0D4" />
      <Polygon points="77.2,37.6 89.8,24 89.8,56.4" fill="#002F43" stroke="#ffffff" strokeWidth={1.6} />
      <Rect x="77.6" y="36.8" width="12.2" height="5" fill="#F9A63A" />
      <Polygon points="37,15.8 65.4,15.8 71.4,21.8 71.4,48.8 65.4,55 37,55 31,48.8 31,21.8" fill="#002F43" stroke="#ffffff" strokeWidth={2.2} />
      <Rect x="40" y="23.6" width="11.2" height="3.2" rx="1" fill="#F9A63A" />
    </Svg>
  );
}

const fechaLarga = (ymd: string) =>
  new Date(`${ymd}T12:00:00-03:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

export function DocumentoCertificado({ d, qr }: { d: DatosCertificado; qr: string }) {
  const tipo = (TIPOS_CAPACITACION[d.tipo] ?? "Curso").toLowerCase();
  return (
    <Document title={`Certificado · ${d.curso} · ${d.nombre}`} author="CAPH Santa Fe">
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* bandas de color, como el carnet */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, flexDirection: "row" }}>
          <View style={{ flex: 1, backgroundColor: C.yellow }} />
          <View style={{ flex: 3, backgroundColor: C.red }} />
        </View>
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, backgroundColor: C.navy }} />
        <View style={s.marco} />
        <View style={s.cuerpo}>
          <View style={s.marca}>
            <Logo />
            <View>
              <Text style={s.caph}>CAPH</Text>
              <Text style={s.santaFe}>SANTA FE</Text>
            </View>
          </View>
          <Text style={s.eyebrow}>CÁMARA DE LA PROPIEDAD HORIZONTAL DE SANTA FE</Text>
          <Text style={s.titulo}>Certificado</Text>
          <Text style={s.texto}>Se certifica que</Text>
          <Text style={s.nombre}>{d.nombre}</Text>
          <View style={s.linea} />
          <Text style={s.texto}>
            completó el {tipo} <Text style={s.curso}>«{d.curso}»</Text>
            {d.horas > 0 ? `, con una carga horaria de ${d.horas} ${d.horas === 1 ? "hora" : "horas"}` : ""}, el {fechaLarga(d.fecha)}.
            {d.certificacion ? `\n${d.certificacion}.` : ""}
          </Text>
        </View>
        <View style={s.pie}>
          <View style={s.firma}>
            <View style={s.firmaLinea} />
            <Text style={s.firmaTexto}>Cámara de la Propiedad Horizontal de Santa Fe{"\n"}1.ª Circunscripción</Text>
          </View>
          <View style={s.qr}>
            <Image src={qr} style={{ width: 74, height: 74 }} />
            <Text style={s.codigo}>Código {d.codigo}</Text>
            <Text style={s.codigo}>Verificalo escaneando el QR</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function descargarCertificado(d: DatosCertificado) {
  const qr = await QRCode.toDataURL(urlCertificado(window.location.origin, d.codigo), { margin: 0, width: 400, color: { dark: C.navy, light: "#ffffff" } });
  const blob = await pdf(<DocumentoCertificado d={d} qr={qr} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificado-${d.curso.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").toLowerCase().slice(0, 50)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
