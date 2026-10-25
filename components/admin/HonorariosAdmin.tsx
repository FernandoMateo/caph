"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, fileUrl, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { Field, Loading, PageHead, useConfirm, useToast } from "./ui";

type Rec = { id: string; collectionId: string; [k: string]: unknown };
type Col = { key: string; label: string; kind: "text" | "money" | "int"; required?: boolean; width?: string };

const fmt = new Intl.NumberFormat("es-AR");
const digits = (s: string) => s.replace(/\D/g, "");

/* ---------- filas editables (categorías y tareas) ---------- */

function RowsEditor({
  collection,
  columns,
  sort,
  blank,
  addLabel,
  noun,
}: {
  collection: string;
  columns: Col[];
  sort: string;
  blank: Record<string, unknown>;
  addLabel: string;
  noun: (r: Record<string, unknown>) => string;
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState<(Rec & { _dirty?: boolean; _new?: boolean })[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await pb().collection(collection).getFullList<Rec>({ sort })) as Rec[]);
    } catch (err) {
      toast("error", errorMessage(err));
      setRows([]);
    }
  }, [collection, sort, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows) return <Loading />;

  const set = (id: string, key: string, value: unknown) =>
    setRows((rs) => rs!.map((r) => (r.id === id ? { ...r, [key]: value, _dirty: true } : r)));

  const save = async (row: Rec & { _new?: boolean }) => {
    const missing = columns.find((c) => c.required && (row[c.key] === "" || row[c.key] === undefined || row[c.key] === null));
    if (missing) return toast("error", `Completá “${missing.label}”.`);
    const data: Record<string, unknown> = {};
    columns.forEach((c) => (data[c.key] = c.kind === "text" ? String(row[c.key] ?? "").trim() : Number(row[c.key] ?? 0)));
    setBusy(row.id);
    try {
      const saved = row._new
        ? await pb().collection(collection).create<Rec>(data)
        : await pb().collection(collection).update<Rec>(row.id, data);
      setRows((rs) => rs!.map((r) => (r.id === row.id ? saved : r)));
      toast("ok", `Guardado: ${noun(saved)}. Ya se ve en la web.`);
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (row: Rec & { _new?: boolean }) => {
    if (row._new) return setRows((rs) => rs!.filter((r) => r.id !== row.id));
    if (!(await confirm(`¿Eliminar “${noun(row)}”? Deja de verse en la web.`))) return;
    setBusy(row.id);
    try {
      await pb().collection(collection).delete(row.id);
      setRows((rs) => rs!.filter((r) => r.id !== row.id));
      toast("ok", `Eliminado: ${noun(row)}.`);
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="rows">
        <div className="rows__head" style={{ gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" ") + " 9rem" }}>
          {columns.map((c) => (
            <span key={c.key}>{c.label}</span>
          ))}
          <span className="sr-only">Acciones</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className="rows__row"
            data-dirty={row._dirty || undefined}
            style={{ gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" ") + " 9rem" }}
          >
            {columns.map((c) => (
              <label key={c.key} className="rows__cell">
                <span className="rows__label">{c.label}</span>
                {c.kind === "text" ? (
                  <input value={String(row[c.key] ?? "")} onChange={(e) => set(row.id, c.key, e.target.value)} />
                ) : (
                  <span className={c.kind === "money" ? "money-input" : undefined}>
                    <input
                      inputMode="numeric"
                      value={row[c.key] === "" || row[c.key] === undefined ? "" : c.kind === "money" ? fmt.format(Number(row[c.key])) : String(row[c.key])}
                      onChange={(e) => set(row.id, c.key, digits(e.target.value) === "" ? "" : Number(digits(e.target.value)))}
                    />
                  </span>
                )}
              </label>
            ))}
            <div className="rows__actions">
              <button
                type="button"
                className="btn btn--navy btn--sm"
                disabled={busy === row.id || !row._dirty}
                onClick={() => save(row)}
              >
                {busy === row.id ? "Guardando…" : row._new ? "Crear" : "Guardar"}
              </button>
              <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(row)} aria-label={`Eliminar ${noun(row)}`}>
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn--ghost-dark btn--sm add-row"
        onClick={() =>
          setRows((rs) => [
            ...rs!,
            { id: `nuevo-${Date.now()}`, collectionId: "", ...blank, orden: rs!.length + 1, _new: true, _dirty: true },
          ])
        }
      >
        + {addLabel}
      </button>
      {dialog}
    </>
  );
}

/* ---------- período, PDF, bonificaciones, notas ---------- */

function Ajustes() {
  const toast = useToast();
  const [rec, setRec] = useState<Rec | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [quitarPdf, setQuitarPdf] = useState(false);
  const [bonif, setBonif] = useState<{ desde: number | ""; pct: number | "" }[]>([]);
  const [notas, setNotas] = useState("");
  const [amenities, setAmenities] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    pb()
      .collection("honorarios_ajustes")
      .getFirstListItem<Rec>("", { sort: "-updated" })
      .then((r) => {
        setRec(r);
        setPeriodo(String(r.periodo ?? ""));
        setPdfUrl(String(r.pdf_url ?? ""));
        setBonif(((r.bonificaciones as { desde: number; pct: number }[]) ?? []).slice().sort((a, b) => a.desde - b.desde));
        setNotas(((r.notas as string[]) ?? []).join("\n"));
        setAmenities(((r.amenities as string[]) ?? []).join("\n"));
      })
      .catch((err) => {
        setMissing(true);
        toast("error", errorMessage(err));
      });
  }, [toast]);

  if (missing) return <p className="form-error">No se encontró la configuración de honorarios en la base de datos.</p>;
  if (!rec) return <Loading />;

  const currentPdf = typeof rec.pdf === "string" ? rec.pdf : "";

  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!periodo.trim()) return toast("error", "Completá el período vigente.");
        const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
        const data: Record<string, unknown> = {
          periodo: periodo.trim(),
          pdf_url: pdfUrl.trim(),
          bonificaciones: bonif
            .filter((b) => b.desde !== "" && b.pct !== "")
            .map((b) => ({ desde: Number(b.desde), pct: Number(b.pct) }))
            .sort((a, b) => a.desde - b.desde),
          notas: lines(notas),
          amenities: lines(amenities),
        };
        if (file) data.pdf = file;
        else if (quitarPdf) data.pdf = null;
        setBusy(true);
        try {
          const saved = await pb().collection("honorarios_ajustes").update<Rec>(rec.id, data);
          setRec(saved);
          setFile(null);
          setQuitarPdf(false);
          toast("ok", "Honorarios actualizados. Ya se ven en la web.");
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <Field label="Período vigente" hint="Se muestra como título de la tabla. Ej.: Diciembre 2026 y enero 2027.">
          <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} required />
        </Field>

        <Field label="Tabla oficial en PDF" hint="Subí el PDF nuevo. Si no hay archivo se usa el enlace de abajo.">
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        {currentPdf && !file && (
          <div className="field" data-wide>
            <span className="field__label">PDF actual</span>
            <div className="file-row">
              <a href={fileUrl(rec, currentPdf)} target="_blank" rel="noopener noreferrer">
                {currentPdf}
              </a>
              <label className="check">
                <input type="checkbox" checked={quitarPdf} onChange={(e) => setQuitarPdf(e.target.checked)} /> Quitar archivo
              </label>
            </div>
          </div>
        )}
        <Field label="Enlace alternativo al PDF" hint="Opcional. Se usa solo si no hay un archivo subido." wide>
          <input type="url" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://" />
        </Field>

        <div className="field" data-wide>
          <span className="field__label">Bonificaciones sugeridas</span>
          <div className="bonif">
            {bonif.map((b, i) => (
              <div key={i} className="bonif__row">
                <span>Más de</span>
                <input
                  inputMode="numeric"
                  aria-label="Unidades funcionales desde"
                  value={b.desde}
                  onChange={(e) => setBonif((bs) => bs.map((x, j) => (j === i ? { ...x, desde: digits(e.target.value) === "" ? "" : Number(digits(e.target.value)) } : x)))}
                />
                <span>UF</span>
                <input
                  inputMode="numeric"
                  aria-label="Porcentaje de bonificación"
                  value={b.pct}
                  onChange={(e) => setBonif((bs) => bs.map((x, j) => (j === i ? { ...x, pct: digits(e.target.value) === "" ? "" : Number(digits(e.target.value)) } : x)))}
                />
                <span>%</span>
                <button type="button" className="icon-btn icon-btn--danger" aria-label="Quitar bonificación" onClick={() => setBonif((bs) => bs.filter((_, j) => j !== i))}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setBonif((bs) => [...bs, { desde: "", pct: "" }])}>
              + Agregar bonificación
            </button>
          </div>
        </div>

        <Field label="Notas al pie" hint="Una nota por línea." wide>
          <textarea rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <Field label="Servicios centrales / amenities" hint="Uno por línea. Aparecen en “Qué cuenta como servicio central”." wide>
          <textarea rows={6} value={amenities} onChange={(e) => setAmenities(e.target.value)} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : "Guardar período y ajustes"}
        </button>
      </div>
    </form>
  );
}

export function HonorariosAdmin() {
  return (
    <>
      <PageHead title="Honorarios sugeridos" text="Lo que guardes acá se publica en la web en el momento, en la calculadora y en la tabla." />

      <section className="admin-section">
        <h2>Período, PDF y bonificaciones</h2>
        <Ajustes />
      </section>

      <section className="admin-section">
        <h2>Categorías de edificio</h2>
        <p className="section-hint">Montos mensuales en pesos, sin IVA. Cada fila se guarda por separado.</p>
        <RowsEditor
          collection="honorarios_categorias"
          sort="orden,codigo"
          noun={(r) => `Categoría ${r.codigo ?? ""}`}
          addLabel="Agregar categoría"
          blank={{ codigo: "", nombre: "", descripcion: "", minimo20: "", por_uf: "", cochera: "" }}
          columns={[
            { key: "codigo", label: "Letra", kind: "text", required: true, width: "4.5rem" },
            { key: "nombre", label: "Nombre", kind: "text", required: true, width: "1fr" },
            { key: "descripcion", label: "Descripción", kind: "text", width: "1.6fr" },
            { key: "minimo20", label: "Mínimo hasta 20 UF", kind: "money", required: true, width: "9rem" },
            { key: "por_uf", label: "Por UF desde la 21", kind: "money", required: true, width: "8rem" },
            { key: "cochera", label: "Por cochera", kind: "money", required: true, width: "7rem" },
            { key: "orden", label: "Orden", kind: "int", width: "4.5rem" },
          ]}
        />
      </section>

      <section className="admin-section">
        <h2>Tareas independientes</h2>
        <p className="section-hint">El valor se muestra tal cual lo escribas: “$ 140.900” o “10 %”.</p>
        <RowsEditor
          collection="honorarios_tareas"
          sort="orden,nombre"
          noun={(r) => String(r.nombre || "tarea")}
          addLabel="Agregar tarea"
          blank={{ nombre: "", detalle: "", valor: "" }}
          columns={[
            { key: "nombre", label: "Tarea", kind: "text", required: true, width: "1.2fr" },
            { key: "detalle", label: "Detalle", kind: "text", width: "1.6fr" },
            { key: "valor", label: "Valor", kind: "text", required: true, width: "8rem" },
            { key: "orden", label: "Orden", kind: "int", width: "4.5rem" },
          ]}
        />
      </section>
    </>
  );
}
