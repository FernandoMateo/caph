"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, fileUrl, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Cap = {
  id: string;
  collectionId: string;
  titulo: string;
  tipo: "programa" | "curso" | "capacitacion" | "taller";
  fecha: string;
  hora: string;
  lugar: string;
  modalidad: string;
  duracion: string;
  certificacion: string;
  dirigido_a: string;
  inversion: string;
  beneficio: string;
  descripcion: string;
  temas: string[] | null;
  destacado: boolean;
  publicado: boolean;
  inscripcion_url: string;
  programa_pdf: string;
  programa_url: string;
};

const TIPOS: Record<Cap["tipo"], string> = {
  programa: "Programa",
  curso: "Curso",
  capacitacion: "Capacitación",
  taller: "Taller",
};

const hoy = () => new Date().toISOString().slice(0, 10);
const fechaLarga = (d: string) =>
  new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

type Draft = Omit<Cap, "id" | "collectionId" | "temas" | "programa_pdf" | "fecha"> & { fecha: string; temas: string };

const BLANK: Draft = {
  titulo: "",
  tipo: "curso",
  fecha: "",
  hora: "",
  lugar: "",
  modalidad: "",
  duracion: "",
  certificacion: "",
  dirigido_a: "",
  inversion: "",
  beneficio: "",
  descripcion: "",
  temas: "",
  destacado: false,
  publicado: true,
  inscripcion_url: "",
  programa_url: "",
};

function Form({ initial, onSaved, onCancel }: { initial: Partial<Cap>; onSaved: (c: Cap) => void; onCancel: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Draft>({
    ...BLANK,
    ...(initial as Partial<Draft>),
    fecha: initial.fecha ? initial.fecha.slice(0, 10) : "",
    temas: (initial.temas ?? []).join("\n"),
  });
  const [file, setFile] = useState<File | null>(null);
  const [quitarPdf, setQuitarPdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const esPrograma = d.tipo === "programa" || d.destacado;

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!d.titulo.trim()) return toast("error", "Completá el título.");
        if (!d.fecha) return toast("error", "Elegí la fecha (o la fecha de inicio).");
        const payload: Record<string, unknown> = {
          ...d,
          titulo: d.titulo.trim(),
          fecha: `${d.fecha} 12:00:00.000Z`,
          temas: d.temas
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean),
        };
        if (file) payload.programa_pdf = file;
        else if (quitarPdf) payload.programa_pdf = null;
        setBusy(true);
        try {
          const saved = initial.id
            ? await pb().collection("capacitaciones").update<Cap>(initial.id, payload)
            : await pb().collection("capacitaciones").create<Cap>(payload);
          toast("ok", `“${saved.titulo}” guardado.${saved.publicado ? " Ya se ve en la web." : " Está oculto en la web."}`);
          onSaved(saved);
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Título" wide>
        <input value={d.titulo} onChange={(e) => set("titulo", e.target.value)} required autoFocus />
      </Field>
      <Field label="Tipo">
        <select value={d.tipo} onChange={(e) => set("tipo", e.target.value as Cap["tipo"])}>
          {Object.entries(TIPOS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label={esPrograma ? "Fecha de inicio" : "Fecha"}>
        <input type="date" value={d.fecha} onChange={(e) => set("fecha", e.target.value)} required />
      </Field>
      <Field label="Hora" hint="Ej.: 19 h">
        <input value={d.hora} onChange={(e) => set("hora", e.target.value)} />
      </Field>
      <Field label="Modalidad" hint="Ej.: Presencial, 100 % virtual">
        <input value={d.modalidad} onChange={(e) => set("modalidad", e.target.value)} />
      </Field>
      <Field label="Lugar" wide>
        <input value={d.lugar} onChange={(e) => set("lugar", e.target.value)} placeholder="Ej.: UTN Santa Fe" />
      </Field>
      <Field label="Descripción breve" wide>
        <textarea rows={2} value={d.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
      </Field>
      <Field label="Temas" hint="Uno por línea." wide>
        <textarea rows={4} value={d.temas} onChange={(e) => set("temas", e.target.value)} />
      </Field>

      {esPrograma && (
        <>
          <Field label="Duración">
            <input value={d.duracion} onChange={(e) => set("duracion", e.target.value)} placeholder="Ej.: 4 meses" />
          </Field>
          <Field label="Certificación">
            <input value={d.certificacion} onChange={(e) => set("certificacion", e.target.value)} />
          </Field>
          <Field label="Dirigido a" wide>
            <input value={d.dirigido_a} onChange={(e) => set("dirigido_a", e.target.value)} />
          </Field>
          <Field label="Inversión" wide>
            <input value={d.inversion} onChange={(e) => set("inversion", e.target.value)} placeholder="Ej.: Inscripción $ 150.000 y 4 cuotas de $ 70.000" />
          </Field>
          <Field label="Beneficio para asociados" wide>
            <input value={d.beneficio} onChange={(e) => set("beneficio", e.target.value)} />
          </Field>
        </>
      )}

      <Field label="Enlace de inscripción" hint="Formulario de Google u otro. El botón aparece mientras la fecha no pasó." wide>
        <input type="url" value={d.inscripcion_url} onChange={(e) => set("inscripcion_url", e.target.value)} placeholder="https://forms.gle/…" />
      </Field>
      <Field label="Programa en PDF" hint="Opcional.">
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <Field label="…o enlace al programa">
        <input type="url" value={d.programa_url} onChange={(e) => set("programa_url", e.target.value)} placeholder="https://" />
      </Field>
      {initial.programa_pdf && !file && (
        <div className="field" data-wide>
          <span className="field__label">PDF actual</span>
          <div className="file-row">
            <a href={fileUrl(initial as Cap, initial.programa_pdf)} target="_blank" rel="noopener noreferrer">
              {initial.programa_pdf}
            </a>
            <label className="check">
              <input type="checkbox" checked={quitarPdf} onChange={(e) => setQuitarPdf(e.target.checked)} /> Quitar archivo
            </label>
          </div>
        </div>
      )}

      <div className="field" data-wide>
        <Toggle checked={d.destacado} onChange={(v) => set("destacado", v)} label="Destacado (bloque grande de la sección)" />
        <Toggle checked={d.publicado} onChange={(v) => set("publicado", v)} label="Visible en la web" />
      </div>

      <div className="form-actions" data-wide>
        <button type="button" className="btn btn--ghost-dark" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear"}
        </button>
      </div>
    </form>
  );
}

export function CapacitacionesAdmin() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Cap[] | null>(null);
  const [editing, setEditing] = useState<Partial<Cap> | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await pb().collection("capacitaciones").getFullList<Cap>({ sort: "-fecha" }));
    } catch (err) {
      toast("error", errorMessage(err));
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = (saved: Cap) => {
    setItems((xs) => {
      const exists = xs!.some((x) => x.id === saved.id);
      const next = exists ? xs!.map((x) => (x.id === saved.id ? saved : x)) : [...xs!, saved];
      return next.sort((a, b) => b.fecha.localeCompare(a.fecha));
    });
    setEditing(null);
  };

  return (
    <>
      <PageHead
        title="Cursos y capacitaciones"
        text="La web muestra el destacado más próximo en grande y hasta cuatro actividades más: primero las próximas, después las realizadas."
      >
        <button type="button" className="btn btn--navy" onClick={() => setEditing({})}>
          + Nueva actividad
        </button>
      </PageHead>

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="Todavía no hay capacitaciones cargadas.">
          <button type="button" className="btn btn--navy btn--sm" onClick={() => setEditing({})}>
            + Nueva actividad
          </button>
        </Empty>
      ) : (
        <ul className="cap-list">
          {items.map((c) => {
            const pasada = c.fecha.slice(0, 10) < hoy();
            return (
              <li key={c.id} className="cap-item" data-muted={!c.publicado || undefined}>
                <div className="cap-item__main">
                  <div className="cap-item__tags">
                    <span className="pill">{TIPOS[c.tipo]}</span>
                    {c.destacado && <span className="pill pill--accent">Destacado</span>}
                    <span className="pill" data-state={!c.publicado ? "off" : pasada ? "past" : "next"}>
                      {!c.publicado ? "Oculto" : pasada ? "Realizado" : "Próximo"}
                    </span>
                  </div>
                  <button type="button" className="link-btn cap-item__title" onClick={() => setEditing(c)}>
                    {c.titulo}
                  </button>
                  <p className="cap-item__meta">{[fechaLarga(c.fecha), c.hora, c.lugar || c.modalidad].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="actions-cell">
                  <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setEditing(c)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost-dark btn--sm"
                    onClick={() => setEditing({ ...c, id: undefined, programa_pdf: "", titulo: `${c.titulo} (copia)`, fecha: "" })}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`Eliminar ${c.titulo}`}
                    onClick={async () => {
                      if (!(await confirm(`¿Eliminar “${c.titulo}”? Si solo querés sacarla de la web, desactivá “Visible”.`))) return;
                      try {
                        await pb().collection("capacitaciones").delete(c.id);
                        setItems((xs) => xs!.filter((x) => x.id !== c.id));
                        toast("ok", "Actividad eliminada.");
                      } catch (err) {
                        toast("error", errorMessage(err));
                      }
                    }}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={!!editing} title={editing?.id ? "Editar actividad" : "Nueva actividad"} onClose={() => setEditing(null)}>
        {editing && <Form key={editing.id ?? `nuevo-${editing.titulo ?? ""}`} initial={editing} onSaved={upsert} onCancel={() => setEditing(null)} />}
      </Drawer>
      {dialog}
    </>
  );
}
