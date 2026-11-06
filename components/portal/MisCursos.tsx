"use client";

import { useCallback, useEffect, useState } from "react";
import { TIPOS_CAPACITACION, type Inscripcion, type Leccion, type Modulo, type Progreso } from "../../lib/cursos";
import { errorMessage } from "../../lib/pb-client";
import { portal } from "../../lib/portal-client";
import { useToast } from "../admin/ui";
import { Icon } from "../Icon";

type Cap = { id: string; titulo: string; tipo: string; descripcion: string; modalidad: string; duracion: string; horas: number; online: boolean; certificado_auto: boolean };

type Datos = { online: Cap[]; otras: Map<string, Cap>; inscripciones: Inscripcion[]; total: Map<string, number>; vistas: Map<string, number> };

/** Pide el certificado a la verificación pública (los mismos datos que se validan) y descarga el PDF. */
export async function bajarCertificado(codigo: string) {
  const res = await fetch(`/api/caph/certificado/${codigo}`);
  if (!res.ok) throw new Error("No se encontró el certificado.");
  const { descargarCertificado } = await import("../../lib/certificado-pdf");
  await descargarCertificado(await res.json());
}

function BotonCertificado({ codigo }: { codigo: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--navy btn--sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await bajarCertificado(codigo);
        } catch (err) {
          toast("error", errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name="download" size={16} /> {busy ? "Generando…" : "Certificado"}
    </button>
  );
}

/** Capacitaciones online para cursar desde el portal, y los certificados obtenidos. */
export function MisCursos({ cuentaId, activa }: { cuentaId: string; activa: boolean }) {
  const toast = useToast();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [inscribiendo, setInscribiendo] = useState("");

  const load = useCallback(async () => {
    const c = portal();
    try {
      const [online, inscripciones, modulos, lecciones, progreso] = await Promise.all([
        c.collection("capacitaciones").getFullList<Cap>({ filter: "online = true", sort: "-fecha" }),
        c.collection("inscripciones").getFullList<Inscripcion>({ sort: "-created" }),
        c.collection("modulos").getFullList<Modulo>({ fields: "id,capacitacion" }),
        // solo devuelve las lecciones de los cursos en los que está inscripto
        c.collection("lecciones").getFullList<Leccion>({ fields: "id,modulo" }),
        c.collection("progreso").getFullList<Progreso>({ fields: "id,inscripcion" }),
      ]);
      const capDeModulo = new Map(modulos.map((m) => [m.id, m.capacitacion]));
      const total = new Map<string, number>();
      for (const l of lecciones) {
        const cap = capDeModulo.get(l.modulo);
        if (cap) total.set(cap, (total.get(cap) ?? 0) + 1);
      }
      const vistas = new Map<string, number>();
      for (const p of progreso) vistas.set(p.inscripcion, (vistas.get(p.inscripcion) ?? 0) + 1);
      // certificados de capacitaciones que no son online (presenciales cargadas por la Cámara)
      const faltan = inscripciones.map((i) => i.capacitacion).filter((id) => !online.some((o) => o.id === id));
      const otras = faltan.length
        ? await c.collection("capacitaciones").getFullList<Cap>({ filter: faltan.map((id) => `id = "${id}"`).join(" || ") })
        : [];
      setDatos({ online, otras: new Map(otras.map((o) => [o.id, o])), inscripciones, total, vistas });
    } catch (err) {
      toast("error", errorMessage(err));
      setDatos({ online: [], otras: new Map(), inscripciones: [], total: new Map(), vistas: new Map() });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!datos || (!datos.online.length && !datos.inscripciones.length)) return null;

  const deCap = (id: string) => datos.inscripciones.find((i) => i.capacitacion === id);
  const presenciales = datos.inscripciones.filter((i) => i.certificado && datos.otras.has(i.capacitacion));

  return (
    <section className="portal__card" aria-labelledby="cursos-titulo">
      <h2 id="cursos-titulo">Capacitaciones</h2>
      <ul className="cursos">
        {datos.online.map((cap) => {
          const ins = deCap(cap.id);
          const total = datos.total.get(cap.id) ?? 0;
          const vistas = ins ? datos.vistas.get(ins.id) ?? 0 : 0;
          const pct = total ? Math.round((vistas / total) * 100) : 0;
          return (
            <li key={cap.id} className="curso" data-estado={ins?.estado ?? "libre"}>
              <div className="curso__info">
                <span className="curso__tipo">
                  {TIPOS_CAPACITACION[cap.tipo] ?? "Curso"} online
                  {cap.horas > 0 && ` · ${cap.horas} h`}
                  {cap.certificado_auto && " · con certificado"}
                </span>
                <strong>{cap.titulo}</strong>
                {ins?.estado === "cursando" && (
                  <span className="curso__avance">
                    <span className="curso__barra" aria-hidden="true">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    {vistas} de {total} lecciones
                  </span>
                )}
                {ins?.estado === "completada" && <span className="curso__ok">Completado</span>}
              </div>
              <div className="curso__acciones">
                {ins?.certificado && <BotonCertificado codigo={ins.certificado} />}
                {ins ? (
                  <a className="btn btn--ghost-dark btn--sm" href={`/portal/curso/${cap.id}`}>
                    {ins.estado === "completada" ? "Repasar" : vistas ? "Continuar" : "Empezar"}
                  </a>
                ) : activa ? (
                  <button
                    type="button"
                    className="btn btn--navy btn--sm"
                    disabled={!!inscribiendo}
                    onClick={async () => {
                      setInscribiendo(cap.id);
                      try {
                        await portal().collection("inscripciones").create({ cuenta: cuentaId, capacitacion: cap.id });
                        window.location.href = `/portal/curso/${cap.id}`;
                      } catch (err) {
                        toast("error", errorMessage(err));
                        setInscribiendo("");
                      }
                    }}
                  >
                    {inscribiendo === cap.id ? "Inscribiendo…" : "Inscribirme"}
                  </button>
                ) : (
                  <a className="btn btn--ghost-dark btn--sm" href={`/portal/curso/${cap.id}`}>
                    Ver temario
                  </a>
                )}
              </div>
            </li>
          );
        })}
        {presenciales.map((ins) => {
          const cap = datos.otras.get(ins.capacitacion)!;
          return (
            <li key={ins.id} className="curso" data-estado="completada">
              <div className="curso__info">
                <span className="curso__tipo">{TIPOS_CAPACITACION[cap.tipo] ?? "Curso"}</span>
                <strong>{cap.titulo}</strong>
                <span className="curso__ok">Completado</span>
              </div>
              <div className="curso__acciones">
                <BotonCertificado codigo={ins.certificado} />
              </div>
            </li>
          );
        })}
      </ul>
      {!activa && <p className="section-hint">Vas a poder inscribirte cuando la Cámara apruebe tu cuenta.</p>}
    </section>
  );
}
