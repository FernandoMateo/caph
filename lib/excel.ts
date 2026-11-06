"use client";

// Planillas del panel: exportar a Excel (una hoja por colección) e importar desde Excel o CSV.
// exceljs pesa: se carga recién cuando se exporta o se importa.

export type Columna = { clave: string; titulo: string; ancho?: number };
export type Hoja = { nombre: string; columnas: Columna[]; filas: Record<string, unknown>[] };

function valorCelda(v: unknown): string | number | boolean | Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  // fechas de PocketBase ("2026-11-05 12:00:00.000Z") como fecha de Excel
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) return new Date(s.replace(" ", "T"));
  return s;
}

/** Descarga un .xlsx con una hoja por cada elemento de `hojas`. */
export async function descargarExcel(archivo: string, hojas: Hoja[]) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "CAPH Santa Fe";
  wb.created = new Date();
  for (const h of hojas) {
    // Excel no admite estos caracteres ni más de 31 letras en el nombre de una hoja
    const ws = wb.addWorksheet(h.nombre.replace(/[\\/?*[\]:]/g, " ").slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = h.columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho ?? Math.min(48, Math.max(12, c.titulo.length + 4)) }));
    for (const f of h.filas) ws.addRow(Object.fromEntries(h.columnas.map((c) => [c.clave, valorCelda(f[c.clave])])));
    const cabecera = ws.getRow(1);
    cabecera.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF091135" } };
    ws.eachRow((row, n) => {
      if (n === 1) return;
      row.eachCell((cell) => {
        if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy";
      });
    });
    if (h.filas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } };
  }
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.endsWith(".xlsx") ? archivo : `${archivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Columnas a partir de los datos: todas las claves que aparecen, en el orden en que aparecen. */
export function columnasDe(filas: Record<string, unknown>[], titulos: Record<string, string> = {}): Columna[] {
  const claves: string[] = [];
  for (const f of filas) for (const k of Object.keys(f)) if (!claves.includes(k)) claves.push(k);
  return claves.map((k) => ({ clave: k, titulo: titulos[k] ?? k }));
}

/* ---------- lectura ---------- */

export type Planilla = { encabezados: string[]; filas: string[][] };

/** CSV con comas o punto y coma (lo que use la primera línea), con comillas dobles. */
function leerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primera = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') (celda += '"'), i++;
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) fila.push(celda), (celda = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda || fila.length) fila.push(celda), filas.push(fila);
  return filas;
}

function textoCelda(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return textoCelda(o.result);
    if (o.hyperlink) return o.hyperlink;
    return "";
  }
  return String(v);
}

/** Lee la primera hoja de un .xlsx o un .csv: la primera fila no vacía son los encabezados. */
export async function leerPlanilla(archivo: File): Promise<Planilla> {
  let filas: string[][];
  if (/\.csv$/i.test(archivo.name) || archivo.type === "text/csv") {
    filas = leerCsv(await archivo.text());
  } else {
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    await wb.xlsx.load(await archivo.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("La planilla no tiene hojas.");
    filas = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const valores = row.values as unknown[];
      // exceljs numera desde 1: la posición 0 viene vacía
      filas.push(valores.slice(1).map(textoCelda));
    });
  }
  const limpias = filas.map((f) => f.map((c) => c.trim())).filter((f) => f.some(Boolean));
  if (!limpias.length) throw new Error("La planilla está vacía.");
  const [encabezados, ...resto] = limpias;
  return { encabezados, filas: resto };
}

/** Encabezado comparable: sin acentos, mayúsculas, espacios ni signos ("N.º de asociado" → "nodeasociado"). */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
