"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, pb } from "../../lib/pb-client";
import { olvidarRubros } from "../../lib/rubros-client";
import { CAMPOS_TEXTOS, SECCIONES_TEXTOS, type CampoTexto } from "../../lib/textos";
import { Icon } from "../Icon";
import { Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Guardado = { id: string; clave: string; valor: string };
type Rubro = { id: string; clave: string; nombre: string; orden: number };

/* ---------- textos de la home ---------- */

function CampoEditor({ campo, valor, onChange }: { campo: CampoTexto; valor: string; onChange: (v: string) => void }) {
  if (campo.tipo === "si_no")
    return (
      <div className="field" data-wide>
        <Toggle checked={valor === "si"} onChange={(v) => onChange(v ? "si" : "no")} label={campo.label} />
      </div>
    );
  const distinto = valor.trim() !== campo.defecto;
  const hint = [campo.ayuda, distinto ? "Cambiado." : ""].filter(Boolean).join(" ");
  return (
    <Field label={campo.label} hint={hint || undefined} wide>
      {campo.tipo === "linea" ? (
        <input value={valor} onChange={(e) => onChange(e.target.value)} maxLength={300} />
      ) : (
        <textarea rows={campo.tipo === "lista" ? 6 : 3} value={valor} onChange={(e) => onChange(e.target.value)} maxLength={5000} />
      )}
    </Field>
  );
}

function Textos() {
  const toast = useToast();
  const [guardados, setGuardados] = useState<Record<string, Guardado> | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await pb().collection("contenidos").getFullList<Guardado>();
      const g = Object.fromEntries(items.map((i) => [i.clave, i]));
      setGuardados(g);
      setValores(Object.fromEntries(CAMPOS_TEXTOS.map((c) => [c.clave, g[c.clave]?.valor || c.defecto])));
    } catch (err) {
      toast("error", errorMessage(err));
      setGuardados({});
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!guardados) return <Loading />;

  const cambios = CAMPOS_TEXTOS.filter((c) => (valores[c.clave] ?? "").trim() !== (guardados[c.clave]?.valor || c.defecto));

  return (
    <form
      className="textos-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          for (const c of cambios) {
            const valor = (valores[c.clave] ?? "").trim();
            const g = guardados[c.clave];
            // vacío o igual al original: se borra y vuelve el texto por defecto
            if (!valor || valor === c.defecto) {
              if (g) await pb().collection("contenidos").delete(g.id);
            } else if (g) {
              await pb().collection("contenidos").update(g.id, { valor });
            } else {
              await pb().collection("contenidos").create({ clave: c.clave, valor });
            }
          }
          toast("ok", "Textos guardados. Ya se ven en la web.");
          await load();
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {SECCIONES_TEXTOS.map((s) => (
        <section key={s.titulo} className="admin-section">
          <h2>{s.titulo}</h2>
          <div className="card form-grid">
            {s.campos.map((c) => (
              <CampoEditor key={c.clave} campo={c} valor={valores[c.clave] ?? ""} onChange={(v) => setValores((x) => ({ ...x, [c.clave]: v }))} />
            ))}
          </div>
        </section>
      ))}
      <div className="sticky-save" data-visible={cambios.length > 0 || undefined}>
        <span>
          {cambios.length === 1 ? "1 texto cambiado" : `${cambios.length} textos cambiados`}. Si dejás un texto vacío, vuelve el original.
        </span>
        <button type="button" className="btn btn--ghost-dark btn--sm" onClick={load} disabled={busy}>
          Descartar
        </button>
        <button type="submit" className="btn btn--navy btn--sm" disabled={busy || cambios.length === 0}>
          {busy ? "Guardando…" : "Guardar textos"}
        </button>
      </div>
    </form>
  );
}

/* ---------- rubros del directorio ---------- */

function Rubros() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Rubro[] | null>(null);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [nuevo, setNuevo] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await pb().collection("rubros").getFullList<Rubro>({ sort: "orden,nombre" });
      setItems(r);
      setNombres(Object.fromEntries(r.map((x) => [x.id, x.nombre])));
      olvidarRubros();
    } catch (err) {
      toast("error", errorMessage(err));
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const correr = async (accion: () => Promise<unknown>, texto: string) => {
    try {
      await accion();
      toast("ok", texto);
      await load();
    } catch (err) {
      toast("error", errorMessage(err));
    }
  };

  if (!items) return <Loading />;

  // mover: se renumera todo para que el orden quede prolijo
  const mover = (i: number, d: -1 | 1) => {
    const lista = [...items];
    [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
    return correr(
      () => Promise.all(lista.map((r, j) => (r.orden !== j + 1 ? pb().collection("rubros").update(r.id, { orden: j + 1 }) : null))),
      "Orden actualizado."
    );
  };

  return (
    <div className="card">
      <ul className="rubros">
        {items.map((r, i) => {
          const sucio = (nombres[r.id] ?? "").trim() !== r.nombre;
          return (
            <li key={r.id}>
              <span className="rubros__orden">
                <button type="button" className="icon-btn" aria-label={`Subir ${r.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                  <Icon name="arrow" size={16} />
                </button>
                <button type="button" className="icon-btn" aria-label={`Bajar ${r.nombre}`} disabled={i === items.length - 1} onClick={() => mover(i, 1)}>
                  <Icon name="arrow" size={16} />
                </button>
              </span>
              <input value={nombres[r.id] ?? ""} onChange={(e) => setNombres((n) => ({ ...n, [r.id]: e.target.value }))} aria-label={`Nombre del rubro ${r.nombre}`} maxLength={80} />
              {sucio && (
                <button
                  type="button"
                  className="btn btn--navy btn--sm"
                  onClick={() => {
                    const nombre = (nombres[r.id] ?? "").trim();
                    if (!nombre) return toast("error", "El rubro necesita un nombre.");
                    correr(() => pb().collection("rubros").update(r.id, { nombre }), `Rubro renombrado a “${nombre}”.`);
                  }}
                >
                  Guardar
                </button>
              )}
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                aria-label={`Eliminar ${r.nombre}`}
                onClick={async () => {
                  if (!(await confirm(`¿Eliminar el rubro “${r.nombre}”? Solo se puede si ningún proveedor lo tiene.`))) return;
                  correr(() => pb().collection("rubros").delete(r.id), `Rubro “${r.nombre}” eliminado.`);
                }}
              >
                <Icon name="x" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className="rubros__nuevo"
        onSubmit={(e) => {
          e.preventDefault();
          const nombre = nuevo.trim();
          if (!nombre) return;
          correr(() => pb().collection("rubros").create({ nombre, orden: items.length + 1 }), `Rubro “${nombre}” agregado.`).then(() => setNuevo(""));
        }}
      >
        <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nuevo rubro, ej.: Control de plagas" aria-label="Nombre del rubro nuevo" maxLength={80} />
        <button type="submit" className="btn btn--navy btn--sm" disabled={!nuevo.trim()}>
          + Agregar rubro
        </button>
      </form>
      {dialog}
    </div>
  );
}

export function TextosAdmin() {
  return (
    <>
      <PageHead title="Textos y rubros" text="Los textos principales de la web y los rubros del directorio de proveedores. Los cambios se ven en la web apenas los guardás." />
      <section className="admin-section">
        <h2>Rubros del directorio</h2>
        <p className="section-hint">El orden es el de los filtros de la web. Renombrar un rubro no cambia a qué proveedores tiene.</p>
        <Rubros />
      </section>
      <Textos />
    </>
  );
}
