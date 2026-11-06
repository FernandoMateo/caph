"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TIPOS_CAPACITACION, ordenar, videoEmbed, type Inscripcion, type Leccion, type Modulo, type Progreso } from "../../lib/cursos";
import { errorMessage } from "../../lib/pb-client";
import { portal } from "../../lib/portal-client";
import { ToastProvider, useToast } from "../admin/ui";
import { Icon } from "../Icon";
import { bajarCertificado } from "./MisCursos";
import { BarraPortal } from "./Portal";

type Cap = { id: string; titulo: string; tipo: string; descripcion: string; horas: number; online: boolean; certificado_auto: boolean };
type Cuenta = { id: string; email: string; estado: string };
type Datos = { cap: Cap; modulos: Modulo[]; lecciones: Leccion[]; ins: Inscripcion | null; vistas: Map<string, string> };

/** El contenido de una lección: video incrustado, PDF o texto. */
function Visor({ l, tokenArchivo }: { l: Leccion; tokenArchivo: string }) {
  if (l.tipo === "video") {
    const embed = videoEmbed(l.video_url);
    return embed ? (
      <div className="visor__video">
        <iframe
          src={embed}
          title={l.titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    ) : l.video_url ? (
      <a className="btn btn--navy" href={l.video_url} target="_blank" rel="noopener noreferrer">
        Ver el video <Icon name="link" size={16} />
      </a>
    ) : (
      <p className="section-hint">Esta lección todavía no tiene video.</p>
    );
  }
  if (l.tipo === "pdf") {
    if (!l.pdf) return <p className="section-hint">Esta lección todavía no tiene el PDF cargado.</p>;
    // el PDF está protegido: se abre con un permiso que vence a los pocos minutos
    const url = portal().files.getURL(l, l.pdf, { token: tokenArchivo });
    return (
      <div className="visor__pdf">
        {tokenArchivo ? <iframe src={url} title={l.titulo} /> : <p className="section-hint">Cargando el PDF…</p>}
        <a className="btn btn--ghost-dark btn--sm" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="download" size={16} /> Abrir o descargar el PDF
        </a>
      </div>
    );
  }
  return (
    <div className="visor__texto">
      {l.texto
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}

function Contenido({ capId, cuenta }: { capId: string; cuenta: Cuenta }) {
  const toast = useToast();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [actual, setActual] = useState<string>("");
  const [tokenArchivo, setTokenArchivo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const c = portal();
    try {
      const [cap, modulos, inscripciones] = await Promise.all([
        c.collection("capacitaciones").getOne<Cap>(capId),
        c.collection("modulos").getFullList<Modulo>({ filter: `capacitacion = "${capId}"`, sort: "orden,created" }),
        c.collection("inscripciones").getFullList<Inscripcion>({ filter: `capacitacion = "${capId}"` }),
      ]);
      const ins = inscripciones[0] ?? null;
      let lecciones: Leccion[] = [];
      const vistas = new Map<string, string>();
      if (ins) {
        const [ls, prog] = await Promise.all([
          c.collection("lecciones").getFullList<Leccion>({ filter: `modulo.capacitacion = "${capId}"` }),
          c.collection("progreso").getFullList<Progreso>({ filter: `inscripcion = "${ins.id}"` }),
        ]);
        lecciones = ordenar(modulos, ls);
        for (const p of prog) vistas.set(p.leccion, p.id);
      }
      setDatos({ cap, modulos, lecciones, ins, vistas });
      setActual((a) => a || lecciones.find((l) => !vistas.has(l.id))?.id || lecciones[0]?.id || "");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [capId]);

  useEffect(() => {
    load();
  }, [load]);

  // permiso para los PDF protegidos (vence a los pocos minutos: se renueva al cambiar de lección)
  useEffect(() => {
    const l = datos?.lecciones.find((x) => x.id === actual);
    if (l?.tipo !== "pdf") return;
    portal()
      .files.getToken()
      .then(setTokenArchivo)
      .catch(() => setTokenArchivo(""));
  }, [actual, datos]);

  const porModulo = useMemo(() => {
    if (!datos) return [];
    return [...datos.modulos].sort((a, b) => a.orden - b.orden).map((m) => ({ m, ls: datos.lecciones.filter((l) => l.modulo === m.id) }));
  }, [datos]);

  if (error) return <div className="portal__aviso" data-tono="error">{error}</div>;
  if (!datos)
    return (
      <div className="loading" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        Cargando…
      </div>
    );

  const { cap, ins, lecciones, vistas } = datos;
  const i = lecciones.findIndex((l) => l.id === actual);
  const leccion = lecciones[i];
  const total = lecciones.length;
  const hechas = lecciones.filter((l) => vistas.has(l.id)).length;

  return (
    <>
      <div className="portal__hola">
        <p className="curso__tipo">
          {TIPOS_CAPACITACION[cap.tipo] ?? "Curso"} online{cap.horas > 0 && ` · ${cap.horas} horas`}
        </p>
        <h1>{cap.titulo}</h1>
        {cap.descripcion && <p>{cap.descripcion}</p>}
      </div>

      {!ins ? (
        <section className="portal__card">
          <h2>Temario</h2>
          <ol className="temario">
            {porModulo.map(({ m }) => (
              <li key={m.id}>
                <strong>{m.titulo}</strong>
                {m.descripcion && <span>{m.descripcion}</span>}
              </li>
            ))}
          </ol>
          {cuenta.estado === "activa" ? (
            <div className="portal__acciones">
              <button
                type="button"
                className="btn btn--navy"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await portal().collection("inscripciones").create({ cuenta: cuenta.id, capacitacion: cap.id });
                    await load();
                  } catch (err) {
                    toast("error", errorMessage(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Inscribiendo…" : "Inscribirme"}
              </button>
            </div>
          ) : (
            <p className="section-hint">Vas a poder inscribirte cuando la Cámara apruebe tu cuenta.</p>
          )}
        </section>
      ) : (
        <>
          {ins.estado === "completada" && (
            <div className="curso__fin">
              <span className="alta__ok" aria-hidden="true">
                <Icon name="check" size={24} />
              </span>
              <div>
                <strong>¡Completaste el curso!</strong>
                <span>{ins.certificado ? "Ya podés descargar tu certificado." : "Podés repasar las lecciones cuando quieras."}</span>
              </div>
              {ins.certificado && (
                <button
                  type="button"
                  className="btn btn--navy btn--sm"
                  onClick={() => bajarCertificado(ins.certificado).catch((err) => toast("error", errorMessage(err)))}
                >
                  <Icon name="download" size={16} /> Descargar certificado
                </button>
              )}
            </div>
          )}

          <div className="aula">
            <aside className="portal__card aula__temario" aria-label="Temario">
              <div className="curso__avance">
                <span className="curso__barra" aria-hidden="true">
                  <span style={{ width: `${total ? (hechas / total) * 100 : 0}%` }} />
                </span>
                {hechas} de {total}
              </div>
              {porModulo.map(({ m, ls }) => (
                <div key={m.id} className="aula__modulo">
                  <h2>{m.titulo}</h2>
                  <ol>
                    {ls.map((l) => (
                      <li key={l.id}>
                        <button type="button" aria-current={l.id === actual ? "step" : undefined} onClick={() => setActual(l.id)}>
                          <span className="aula__check" data-hecha={vistas.has(l.id) || undefined} aria-hidden="true">
                            {vistas.has(l.id) && <Icon name="check" size={12} />}
                          </span>
                          <span>
                            {l.titulo}
                            <small>
                              {l.tipo === "video" ? "Video" : l.tipo === "pdf" ? "PDF" : "Lectura"}
                              {l.duracion > 0 && ` · ${l.duracion} min`}
                              {vistas.has(l.id) && <span className="sr-only"> (vista)</span>}
                            </small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </aside>

            <article className="portal__card aula__leccion">
              {leccion ? (
                <>
                  <h2>{leccion.titulo}</h2>
                  <Visor l={leccion} tokenArchivo={tokenArchivo} />
                  <div className="aula__nav">
                    <button type="button" className="btn btn--ghost-dark btn--sm" disabled={i <= 0} onClick={() => setActual(lecciones[i - 1].id)}>
                      Anterior
                    </button>
                    {vistas.has(leccion.id) ? (
                      <button type="button" className="btn btn--navy btn--sm" disabled={i >= total - 1} onClick={() => setActual(lecciones[i + 1].id)}>
                        Siguiente
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--navy btn--sm"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await portal().collection("progreso").create({ inscripcion: ins.id, leccion: leccion.id });
                            if (i < total - 1) setActual(lecciones[i + 1].id);
                            await load();
                          } catch (err) {
                            toast("error", errorMessage(err));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <Icon name="check" size={16} /> {busy ? "Guardando…" : i < total - 1 ? "Listo, siguiente" : "Listo, terminar"}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="section-hint">Este curso todavía no tiene lecciones cargadas.</p>
              )}
            </article>
          </div>
        </>
      )}
    </>
  );
}

export function Curso({ capId }: { capId: string }) {
  const [cuenta, setCuenta] = useState<Cuenta | null | undefined>(undefined);
  useEffect(() => {
    const c = portal();
    setCuenta(c.authStore.isValid && c.authStore.record ? (c.authStore.record as unknown as Cuenta) : null);
    return c.authStore.onChange(() => setCuenta(c.authStore.isValid && c.authStore.record ? (c.authStore.record as unknown as Cuenta) : null));
  }, []);

  if (cuenta === undefined) return null;
  if (!cuenta) {
    if (typeof window !== "undefined") window.location.replace("/portal");
    return null;
  }
  return (
    <ToastProvider>
      <div className="portal">
        <BarraPortal email={cuenta.email} volver />
        <main className="portal__main">
          <Contenido capId={capId} cuenta={cuenta} />
        </main>
      </div>
    </ToastProvider>
  );
}
