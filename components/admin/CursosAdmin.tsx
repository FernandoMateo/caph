"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coincide } from "../../lib/buscar";
import { TIPOS_CAPACITACION, videoEmbed, type Inscripcion, type Leccion, type Modulo } from "../../lib/cursos";
import { descargarExcel } from "../../lib/excel";
import { errorMessage, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { fechaCorta } from "./cuentas";
import { Drawer, Empty, Field, Loading, PageHead, Toggle, useConfirm, useToast } from "./ui";

type Cap = { id: string; titulo: string; tipo: string; fecha: string; publicado: boolean; online: boolean; certificado_auto: boolean; horas: number };
type CuentaMin = { id: string; name: string; email: string; rol: string; estado: string };
type Ins = Inscripcion & { expand?: { cuenta?: CuentaMin } };

/* ---------- lección: alta y edición ---------- */

function FormLeccion({ inicial, moduloId, orden, onListo }: { inicial: Partial<Leccion>; moduloId: string; orden: number; onListo: () => void }) {
  const toast = useToast();
  const [d, setD] = useState({
    titulo: inicial.titulo ?? "",
    tipo: inicial.tipo ?? "video",
    video_url: inicial.video_url ?? "",
    texto: inicial.texto ?? "",
    duracion: inicial.duracion ? String(inicial.duracion) : "",
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));
  const embed = d.tipo === "video" && d.video_url ? videoEmbed(d.video_url) : null;

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!d.titulo.trim()) return toast("error", "Completá el título de la lección.");
        if (d.tipo === "video" && !d.video_url.trim()) return toast("error", "Pegá el link del video.");
        if (d.tipo === "pdf" && !pdf && !inicial.pdf) return toast("error", "Subí el PDF.");
        if (d.tipo === "texto" && !d.texto.trim()) return toast("error", "Escribí el texto de la lección.");
        const datos: Record<string, unknown> = {
          titulo: d.titulo.trim(),
          tipo: d.tipo,
          video_url: d.tipo === "video" ? d.video_url.trim() : "",
          texto: d.tipo === "texto" ? d.texto.trim() : "",
          duracion: Number(d.duracion) || 0,
        };
        if (pdf) datos.pdf = pdf;
        setBusy(true);
        try {
          if (inicial.id) await pb().collection("lecciones").update(inicial.id, datos);
          else await pb().collection("lecciones").create({ ...datos, modulo: moduloId, orden });
          toast("ok", "Lección guardada.");
          onListo();
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Título" wide>
        <input value={d.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={200} autoFocus />
      </Field>
      <Field label="Tipo">
        <select value={d.tipo} onChange={(e) => set("tipo", e.target.value)}>
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
          <option value="texto">Texto</option>
        </select>
      </Field>
      <Field label="Duración (minutos)" hint="Opcional.">
        <input type="number" min={0} max={1000} value={d.duracion} onChange={(e) => set("duracion", e.target.value)} />
      </Field>
      {d.tipo === "video" && (
        <Field
          label="Link del video"
          hint={embed ? "Se va a ver dentro del portal." : "YouTube o Vimeo (pueden estar «sin listar»). Otro link se muestra como botón."}
          wide
        >
          <input value={d.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://youtu.be/…" />
        </Field>
      )}
      {d.tipo === "pdf" && (
        <Field label="PDF" hint={inicial.pdf ? `Ahora: ${inicial.pdf}. Elegí otro solo si querés reemplazarlo.` : "Hasta 30 MB. Solo lo pueden abrir los inscriptos."} wide>
          <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
        </Field>
      )}
      {d.tipo === "texto" && (
        <Field label="Texto" hint="Separá los párrafos con un renglón en blanco." wide>
          <textarea rows={10} maxLength={20000} value={d.texto} onChange={(e) => set("texto", e.target.value)} />
        </Field>
      )}
      <div className="form-actions" data-wide>
        <button type="submit" className="btn btn--navy" disabled={busy}>
          {busy ? "Guardando…" : inicial.id ? "Guardar cambios" : "Agregar lección"}
        </button>
      </div>
    </form>
  );
}

/* ---------- temario ---------- */

function Temario({ cap }: { cap: Cap }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [modulos, setModulos] = useState<Modulo[] | null>(null);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [editando, setEditando] = useState<{ modulo: string; leccion: Partial<Leccion> } | null>(null);

  const load = useCallback(async () => {
    try {
      const [ms, ls] = await Promise.all([
        pb().collection("modulos").getFullList<Modulo>({ filter: `capacitacion = "${cap.id}"`, sort: "orden,created" }),
        pb().collection("lecciones").getFullList<Leccion>({ filter: `modulo.capacitacion = "${cap.id}"`, sort: "orden,created" }),
      ]);
      setModulos(ms);
      setLecciones(ls);
    } catch (err) {
      toast("error", errorMessage(err));
      setModulos([]);
    }
  }, [cap.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const correr = async (accion: () => Promise<unknown>, texto?: string) => {
    try {
      await accion();
      if (texto) toast("ok", texto);
      await load();
    } catch (err) {
      toast("error", errorMessage(err));
    }
  };

  // mover: se renumera la lista entera para que el orden quede prolijo
  const mover = <T extends { id: string; orden: number }>(col: string, lista: T[], i: number, d: -1 | 1) => {
    const l = [...lista];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    return correr(() => Promise.all(l.map((x, j) => (x.orden !== j + 1 ? pb().collection(col).update(x.id, { orden: j + 1 }) : null))));
  };

  if (!modulos) return <Loading />;

  return (
    <div className="temario-admin">
      {modulos.length === 0 && <p className="section-hint">Todavía no hay módulos. Empezá por el primero.</p>}
      {modulos.map((m, i) => {
        const ls = lecciones.filter((l) => l.modulo === m.id);
        return (
          <div key={m.id} className="card temario-admin__modulo">
            <header className="temario-admin__head">
              <span className="rubros__orden">
                <button type="button" className="icon-btn" aria-label={`Subir ${m.titulo}`} disabled={i === 0} onClick={() => mover("modulos", modulos, i, -1)}>
                  <Icon name="arrow" size={16} />
                </button>
                <button type="button" className="icon-btn" aria-label={`Bajar ${m.titulo}`} disabled={i === modulos.length - 1} onClick={() => mover("modulos", modulos, i, 1)}>
                  <Icon name="arrow" size={16} />
                </button>
              </span>
              <h3>
                Módulo {i + 1}: {m.titulo}
              </h3>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Renombrar ${m.titulo}`}
                onClick={async () => {
                  const titulo = window.prompt("Nuevo nombre del módulo", m.titulo)?.trim();
                  if (titulo && titulo !== m.titulo) correr(() => pb().collection("modulos").update(m.id, { titulo }), "Módulo renombrado.");
                }}
              >
                <Icon name="pencil" size={16} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                aria-label={`Eliminar ${m.titulo}`}
                onClick={async () => {
                  if (!(await confirm(`¿Eliminar el módulo “${m.titulo}” con sus ${ls.length} lecciones? El avance de los inscriptos en esas lecciones se pierde.`))) return;
                  correr(() => pb().collection("modulos").delete(m.id), "Módulo eliminado.");
                }}
              >
                <Icon name="x" size={18} />
              </button>
            </header>
            <ul className="rubros">
              {ls.map((l, j) => (
                <li key={l.id}>
                  <span className="rubros__orden">
                    <button type="button" className="icon-btn" aria-label={`Subir ${l.titulo}`} disabled={j === 0} onClick={() => mover("lecciones", ls, j, -1)}>
                      <Icon name="arrow" size={16} />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Bajar ${l.titulo}`} disabled={j === ls.length - 1} onClick={() => mover("lecciones", ls, j, 1)}>
                      <Icon name="arrow" size={16} />
                    </button>
                  </span>
                  <span className="pill">{l.tipo === "video" ? "Video" : l.tipo === "pdf" ? "PDF" : "Texto"}</span>
                  <button type="button" className="link-btn temario-admin__leccion" onClick={() => setEditando({ modulo: m.id, leccion: l })}>
                    {l.titulo}
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`Eliminar ${l.titulo}`}
                    onClick={async () => {
                      if (!(await confirm(`¿Eliminar la lección “${l.titulo}”?`))) return;
                      correr(() => pb().collection("lecciones").delete(l.id), "Lección eliminada.");
                    }}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn--ghost-dark btn--sm" onClick={() => setEditando({ modulo: m.id, leccion: {} })}>
              + Lección
            </button>
          </div>
        );
      })}
      <form
        className="rubros__nuevo"
        onSubmit={(e) => {
          e.preventDefault();
          const titulo = nuevoModulo.trim();
          if (!titulo) return;
          correr(() => pb().collection("modulos").create({ capacitacion: cap.id, titulo, orden: modulos.length + 1 }), "Módulo agregado.").then(() => setNuevoModulo(""));
        }}
      >
        <input value={nuevoModulo} onChange={(e) => setNuevoModulo(e.target.value)} placeholder="Nuevo módulo, ej.: Introducción" aria-label="Nombre del módulo nuevo" maxLength={200} />
        <button type="submit" className="btn btn--navy btn--sm" disabled={!nuevoModulo.trim()}>
          + Agregar módulo
        </button>
      </form>
      <Drawer open={!!editando} title={editando?.leccion.id ? `Editar ${editando.leccion.titulo}` : "Nueva lección"} onClose={() => setEditando(null)}>
        {editando && (
          <FormLeccion
            key={editando.leccion.id ?? "nueva"}
            inicial={editando.leccion}
            moduloId={editando.modulo}
            orden={lecciones.filter((l) => l.modulo === editando.modulo).length + 1}
            onListo={() => {
              setEditando(null);
              load();
            }}
          />
        )}
      </Drawer>
      {dialog}
    </div>
  );
}

/* ---------- inscriptos ---------- */

function Inscriptos({ cap }: { cap: Cap }) {
  const toast = useToast();
  const [items, setItems] = useState<Ins[] | null>(null);
  const [vistas, setVistas] = useState<Map<string, number>>(new Map());
  const [total, setTotal] = useState(0);
  const [cuentas, setCuentas] = useState<CuentaMin[]>([]);
  const [buscar, setBuscar] = useState("");
  const [agregar, setAgregar] = useState("");
  const [completado, setCompletado] = useState(!cap.online);

  const load = useCallback(async () => {
    try {
      const [ins, prog, ls, cs] = await Promise.all([
        pb().collection("inscripciones").getFullList<Ins>({ filter: `capacitacion = "${cap.id}"`, expand: "cuenta", sort: "-created" }),
        pb().collection("progreso").getFullList<{ inscripcion: string }>({ filter: `inscripcion.capacitacion = "${cap.id}"`, fields: "inscripcion" }),
        pb().collection("lecciones").getFullList({ filter: `modulo.capacitacion = "${cap.id}"`, fields: "id" }),
        pb().collection("cuentas").getFullList<CuentaMin>({ filter: "estado = 'activa'", sort: "name", fields: "id,name,email,rol,estado" }),
      ]);
      const v = new Map<string, number>();
      for (const p of prog) v.set(p.inscripcion, (v.get(p.inscripcion) ?? 0) + 1);
      setItems(ins);
      setVistas(v);
      setTotal(ls.length);
      setCuentas(cs);
    } catch (err) {
      toast("error", errorMessage(err));
      setItems([]);
    }
  }, [cap.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const libres = useMemo(() => {
    const ya = new Set((items ?? []).map((i) => i.cuenta));
    return cuentas.filter((c) => !ya.has(c.id) && coincide(buscar, [c.name, c.email], [])).slice(0, 50);
  }, [cuentas, items, buscar]);

  if (!items) return <Loading />;

  return (
    <div className="card">
      <form
        className="inscribir"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!agregar) return toast("error", "Elegí la cuenta a inscribir.");
          try {
            await pb()
              .collection("inscripciones")
              .create({ cuenta: agregar, capacitacion: cap.id, estado: completado ? "completada" : "cursando" });
            toast("ok", completado ? "Inscripto como completado." : "Inscripto.");
            setAgregar("");
            load();
          } catch (err) {
            toast("error", errorMessage(err));
          }
        }}
      >
        <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar cuenta por nombre o email" aria-label="Buscar cuenta" />
        <select value={agregar} onChange={(e) => setAgregar(e.target.value)} aria-label="Cuenta a inscribir">
          <option value="">{libres.length ? "Elegí una cuenta" : "Ninguna cuenta activa coincide"}</option>
          {libres.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.email}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={completado} onChange={(e) => setCompletado(e.target.checked)} /> Ya lo completó (asistió)
        </label>
        <button type="submit" className="btn btn--navy btn--sm">
          + Inscribir
        </button>
      </form>
      <p className="field__hint">
        Solo cuentas del portal aprobadas. Marcado como completado, recibe el certificado al instante{cap.certificado_auto ? "" : " (si la capacitación emite certificado)"}.
      </p>

      {items.length === 0 ? (
        <Empty text="Todavía no hay inscriptos." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Inscripto</th>
                  <th scope="col">Desde</th>
                  <th scope="col">Avance</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const c = i.expand?.cuenta;
                  return (
                    <tr key={i.id}>
                      <th scope="row">
                        <span className="row-text">
                          {c?.name ?? "—"}
                          <small>{c?.email}</small>
                        </span>
                      </th>
                      <td data-label="Desde" className="num-cell">
                        {fechaCorta(i.created)}
                      </td>
                      <td data-label="Avance" className="num-cell">
                        {total ? `${vistas.get(i.id) ?? 0} de ${total}` : "—"}
                      </td>
                      <td data-label="Estado">
                        <span className="pill" data-state={i.estado === "completada" ? "next" : undefined}>
                          {i.estado === "completada" ? `Completó el ${fechaCorta(i.completada_el)}` : "Cursando"}
                        </span>
                        {i.certificado && <small className="cert-codigo"> {i.certificado}</small>}
                      </td>
                      <td className="actions-cell">
                        {i.estado !== "completada" && (
                          <button
                            type="button"
                            className="btn btn--ghost-dark btn--sm"
                            onClick={async () => {
                              try {
                                await pb().collection("inscripciones").update(i.id, { estado: "completada" });
                                toast("ok", "Marcado como completado.");
                                load();
                              } catch (err) {
                                toast("error", errorMessage(err));
                              }
                            }}
                          >
                            Marcar completado
                          </button>
                        )}
                        {i.certificado && (
                          <a className="btn btn--ghost-dark btn--sm" href={`/verificar/certificado/${i.certificado}`} target="_blank" rel="noopener noreferrer">
                            Ver certificado
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--ghost-dark btn--sm"
              onClick={() =>
                descargarExcel(`inscriptos-${cap.titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").toLowerCase().slice(0, 40)}`, [
                  {
                    nombre: "Inscriptos",
                    columnas: [
                      { clave: "nombre", titulo: "Nombre", ancho: 30 },
                      { clave: "email", titulo: "Email", ancho: 30 },
                      { clave: "rol", titulo: "Tipo", ancho: 12 },
                      { clave: "desde", titulo: "Inscripto el", ancho: 14 },
                      { clave: "avance", titulo: "Lecciones vistas", ancho: 16 },
                      { clave: "estado", titulo: "Estado", ancho: 14 },
                      { clave: "completada_el", titulo: "Completó el", ancho: 14 },
                      { clave: "certificado", titulo: "Certificado", ancho: 14 },
                    ],
                    filas: items.map((i) => ({
                      nombre: i.expand?.cuenta?.name,
                      email: i.expand?.cuenta?.email,
                      rol: i.expand?.cuenta?.rol,
                      desde: i.created,
                      avance: total ? `${vistas.get(i.id) ?? 0} de ${total}` : "",
                      estado: i.estado === "completada" ? "Completado" : "Cursando",
                      completada_el: i.completada_el,
                      certificado: i.certificado,
                    })),
                  },
                ]).catch((err) => toast("error", errorMessage(err)))
              }
            >
              <Icon name="download" size={16} /> Exportar inscriptos
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- pantalla ---------- */

export function CursosAdmin() {
  const toast = useToast();
  const [caps, setCaps] = useState<Cap[] | null>(null);
  const [elegida, setElegida] = useState("");
  const [ajustes, setAjustes] = useState<{ online: boolean; certificado_auto: boolean; horas: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const cs = await pb().collection("capacitaciones").getFullList<Cap>({ sort: "-fecha" });
      setCaps(cs);
      setElegida((e) => e || cs.find((c) => c.online)?.id || cs[0]?.id || "");
    } catch (err) {
      toast("error", errorMessage(err));
      setCaps([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cap = caps?.find((c) => c.id === elegida);
  useEffect(() => {
    if (cap) setAjustes({ online: cap.online, certificado_auto: cap.certificado_auto, horas: cap.horas ? String(cap.horas) : "" });
  }, [cap]);

  return (
    <>
      <PageHead
        title="Cursos online"
        text="Armá el temario de cada capacitación (módulos con videos, PDFs o textos) para cursarla desde el portal. Al terminar todas las lecciones, el certificado se emite solo."
      />
      {!caps ? (
        <Loading />
      ) : !caps.length ? (
        <Empty text="Primero cargá la capacitación en Capacitaciones." />
      ) : (
        <>
          <div className="toolbar">
            <select className="cursos-select" value={elegida} onChange={(e) => setElegida(e.target.value)} aria-label="Capacitación">
              {caps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.online ? "● " : ""}
                  {c.titulo} · {TIPOS_CAPACITACION[c.tipo] ?? c.tipo} · {fechaCorta(c.fecha)}
                </option>
              ))}
            </select>
          </div>

          {cap && ajustes && (
            <>
              <section className="admin-section">
                <h2>Configuración</h2>
                <form
                  className="card form-grid"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await pb().collection("capacitaciones").update(cap.id, { online: ajustes.online, certificado_auto: ajustes.certificado_auto, horas: Number(ajustes.horas) || 0 });
                      toast("ok", "Configuración guardada.");
                      load();
                    } catch (err) {
                      toast("error", errorMessage(err));
                    }
                  }}
                >
                  <div className="field">
                    <Toggle checked={ajustes.online} onChange={(v) => setAjustes({ ...ajustes, online: v })} label="Se cursa online desde el portal" />
                    <Toggle checked={ajustes.certificado_auto} onChange={(v) => setAjustes({ ...ajustes, certificado_auto: v })} label="Emite certificado" />
                    {!cap.publicado && <span className="field__hint">Está oculta en Capacitaciones: publicala para que aparezca en el portal.</span>}
                  </div>
                  <Field label="Carga horaria (horas)" hint="Se imprime en el certificado.">
                    <input type="number" min={0} max={1000} value={ajustes.horas} onChange={(e) => setAjustes({ ...ajustes, horas: e.target.value })} />
                  </Field>
                  <div className="form-actions" data-wide>
                    <button type="submit" className="btn btn--navy btn--sm">
                      Guardar
                    </button>
                  </div>
                </form>
              </section>
              <section className="admin-section">
                <h2>Temario</h2>
                <Temario key={cap.id} cap={cap} />
              </section>
              <section className="admin-section">
                <h2>Inscriptos</h2>
                <Inscriptos key={cap.id + cap.online + cap.certificado_auto} cap={cap} />
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
