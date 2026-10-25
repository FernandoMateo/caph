"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { Empty, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Foto = {
  id: string;
  collectionId: string;
  imagen: string;
  titulo: string;
  descripcion: string;
  orden: number;
  publicado: boolean;
  _dirty?: boolean;
};

const TIPOS_OK = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX = 10 * 1024 * 1024;

export function GaleriaAdmin() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [fotos, setFotos] = useState<Foto[] | null>(null);
  const [subiendo, setSubiendo] = useState(0);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setFotos(await pb().collection("galeria").getFullList<Foto>({ sort: "orden,-created" }));
    } catch (err) {
      toast("error", errorMessage(err));
      setFotos([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const subir = async (files: FileList | File[]) => {
    const lista = Array.from(files);
    const validas = lista.filter((f) => TIPOS_OK.includes(f.type) && f.size <= MAX);
    if (validas.length < lista.length) toast("error", "Algunas imágenes no se subieron: usá JPG, PNG o WebP de hasta 10 MB.");
    if (!validas.length) return;
    setSubiendo(validas.length);
    let orden = (fotos ?? []).reduce((m, f) => Math.max(m, f.orden || 0), 0);
    const nuevas: Foto[] = [];
    for (const file of validas) {
      try {
        orden += 1;
        const rec = await pb()
          .collection("galeria")
          .create<Foto>({ imagen: file, titulo: "", descripcion: "", orden, publicado: true });
        nuevas.push(rec);
      } catch (err) {
        toast("error", `${file.name}: ${errorMessage(err)}`);
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
    if (nuevas.length) {
      setFotos((fs) => [...(fs ?? []), ...nuevas]);
      toast("ok", `${nuevas.length} foto${nuevas.length === 1 ? "" : "s"} publicada${nuevas.length === 1 ? "" : "s"}. Agregales nombre y rol.`);
    }
  };

  const set = (id: string, change: Partial<Foto>) => setFotos((fs) => fs!.map((f) => (f.id === id ? { ...f, ...change, _dirty: true } : f)));

  const guardar = async (f: Foto) => {
    setBusy(f.id);
    try {
      const saved = await pb()
        .collection("galeria")
        .update<Foto>(f.id, { titulo: f.titulo.trim(), descripcion: f.descripcion.trim(), orden: Number(f.orden) || 0, publicado: f.publicado });
      setFotos((fs) => fs!.map((x) => (x.id === f.id ? saved : x)));
      toast("ok", "Foto actualizada.");
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHead
        title="Galería de la comunidad"
        text="Fotos de administradores, representantes y encuentros. La web muestra la galería 3D cuando hay al menos una foto visible, ordenadas por “Orden”."
      />

      <label
        className="uploader"
        data-over={over || undefined}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          subir(e.dataTransfer.files);
        }}
      >
        <Icon name="download" size={24} />
        <span>
          <strong>Elegí fotos</strong> o arrastralas acá
        </span>
        <span className="field__hint">JPG, PNG o WebP, hasta 10 MB cada una. Se recomiendan fotos verticales.</span>
        <input type="file" accept={TIPOS_OK.join(",")} multiple className="sr-only" onChange={(e) => e.target.files && subir(e.target.files)} />
        {subiendo > 0 && (
          <span className="loading">
            <span className="spinner" aria-hidden="true" /> Subiendo {subiendo}…
          </span>
        )}
      </label>

      {!fotos ? (
        <Loading />
      ) : fotos.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <Empty text="Todavía no hay fotos. Mientras tanto, la sección no aparece en la web." />
        </div>
      ) : (
        <ul className="photo-grid">
          {fotos.map((f) => (
            <li key={f.id} className="photo" data-muted={!f.publicado || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pb().files.getURL(f, f.imagen, { thumb: "600x800" })} alt={f.titulo || "Foto de la galería"} loading="lazy" />
              <div className="photo__body">
                <label className="field">
                  <span className="field__label">Nombre o título</span>
                  <input value={f.titulo} onChange={(e) => set(f.id, { titulo: e.target.value })} placeholder="Ej.: Jornada de capacitación 2026" />
                </label>
                <label className="field">
                  <span className="field__label">Rol o descripción</span>
                  <input value={f.descripcion} onChange={(e) => set(f.id, { descripcion: e.target.value })} placeholder="Ej.: Comisión directiva" />
                </label>
                <div className="photo__foot">
                  <label className="field">
                    <span className="field__label">Orden</span>
                    <input
                      className="photo__order"
                      inputMode="numeric"
                      value={f.orden ?? ""}
                      onChange={(e) => set(f.id, { orden: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                    />
                  </label>
                  <Toggle checked={f.publicado} onChange={(v) => set(f.id, { publicado: v })} label="Visible" />
                </div>
                <div className="actions-cell">
                  <button type="button" className="btn btn--navy btn--sm" disabled={!f._dirty || busy === f.id} onClick={() => guardar(f)}>
                    {busy === f.id ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="Eliminar foto"
                    onClick={async () => {
                      if (!(await confirm("¿Eliminar esta foto? No se puede recuperar."))) return;
                      try {
                        await pb().collection("galeria").delete(f.id);
                        setFotos((fs) => fs!.filter((x) => x.id !== f.id));
                        toast("ok", "Foto eliminada.");
                      } catch (err) {
                        toast("error", errorMessage(err));
                      }
                    }}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </>
  );
}
