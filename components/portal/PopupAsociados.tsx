"use client";

import { useEffect, useRef, useState } from "react";
import { LINKS } from "../../lib/data";
import { errorMessage } from "../../lib/pb-client";
import { ROLES, portal } from "../../lib/portal-client";
import { useRubros } from "../../lib/rubros-client";
import { Icon } from "../Icon";
import { Carnet } from "./Carnet";
import { CambiarClave, FormIngreso, datosCarnet, fichaDe, type Cuenta, type FichaRec } from "./Portal";
import "../../app/portal/portal.css";
import "./socios.css";

// Popup "Asociados" del menú de la web: el socio entra con su email y ve su estado, su correo y su
// credencial, sin salir de la página. Usa la misma sesión que /portal (entrar acá también lo deja adentro allá).

type Tono = "ok" | "warn" | "off";

function estado(cuenta: Cuenta, ficha: FichaRec | null): { texto: string; detalle: string; tono: Tono } {
  if (cuenta.estado === "suspendida") return { texto: "Cuenta suspendida", detalle: "Comunicate con la Cámara para regularizarla.", tono: "off" };
  if (cuenta.estado === "rechazada" || ficha?.estado === "rechazado")
    return { texto: "Solicitud no aprobada", detalle: ficha?.motivo || cuenta.motivo || "Entrá a tu portal para corregirla.", tono: "off" };
  if (!ficha || cuenta.estado === "pendiente" || ficha.estado === "pendiente")
    return { texto: "En revisión", detalle: "La Cámara está revisando tu alta.", tono: "warn" };
  if (!ficha.activo) return { texto: "No vigente", detalle: "Tu credencial está dada de baja. Consultá a la Cámara.", tono: "off" };
  if (ficha.oculto_mora) return { texto: "Con cuotas pendientes", detalle: "Tu credencial vuelve a estar vigente cuando te pongas al día.", tono: "warn" };
  return { texto: "Socio activo", detalle: "Credencial vigente.", tono: "ok" };
}

function Resumen({ cuenta }: { cuenta: Cuenta }) {
  const rubros = useRubros();
  const [ficha, setFicha] = useState<FichaRec | null | undefined>(undefined);
  const [volteado, setVolteado] = useState(false);
  const [pdf, setPdf] = useState("");

  useEffect(() => {
    let vivo = true;
    fichaDe(cuenta).then((f) => vivo && setFicha(f));
    return () => {
      vivo = false;
    };
  }, [cuenta]);

  if (ficha === undefined)
    return (
      <div className="loading" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        Cargando…
      </div>
    );

  const e = estado(cuenta, ficha);
  const conCarnet = cuenta.estado === "activa" && ficha?.estado === "aprobado";
  const datos = conCarnet && ficha ? datosCarnet(cuenta.rol, ficha, rubros) : null;

  return (
    <div className="socios__resumen">
      <div className="socios__hola">
        <strong>{ficha?.nombre || cuenta.name}</strong>
        <span>{ROLES[cuenta.rol].titulo}</span>
      </div>

      <dl className="socios__datos">
        <div>
          <dt>Estado</dt>
          <dd>
            <span className="socios__estado" data-tono={e.tono}>
              {e.texto}
            </span>
            <small>{e.detalle}</small>
          </dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{cuenta.email}</dd>
        </div>
        {ficha?.numero && (
          <div>
            <dt>N.º de socio</dt>
            <dd>{ficha.numero}</dd>
          </div>
        )}
      </dl>

      <section className="socios__credencial" aria-label="Credencial">
        <h3>Credencial</h3>
        {datos ? (
          <>
            <Carnet datos={datos} volteado={volteado} onVoltear={() => setVolteado((v) => !v)} />
            <p className="portal__pista">Tocá el carnet para darlo vuelta.</p>
            <div className="socios__acciones">
              <button
                type="button"
                className="btn btn--navy btn--sm"
                disabled={pdf === "generando"}
                onClick={async () => {
                  setPdf("generando");
                  try {
                    const { descargarCarnetPdf } = await import("../../lib/carnet-pdf");
                    await descargarCarnetPdf(datos);
                    setPdf("");
                  } catch (err) {
                    setPdf(`No se pudo generar el PDF (${errorMessage(err)}).`);
                  }
                }}
              >
                <Icon name="download" size={16} /> {pdf === "generando" ? "Generando…" : "Descargar PDF"}
              </button>
              <a className="btn btn--outline btn--sm" href={datos.verificar} target="_blank" rel="noopener noreferrer">
                Ver verificación
              </a>
            </div>
            {pdf && pdf !== "generando" && (
              <p className="form-error" role="alert">
                {pdf}
              </p>
            )}
          </>
        ) : (
          <p className="socios__nota">Tu credencial aparece acá cuando la Cámara aprueba tu alta.</p>
        )}
      </section>

      <div className="socios__pie">
        <a className="btn btn--outline btn--sm" href="/portal">
          Ir a mi portal
        </a>
        <button type="button" className="socios__link" onClick={() => portal().authStore.clear()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function PopupAsociados({ onCerrar }: { onCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [ready, setReady] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const c = portal();
    const sync = () => setCuenta(c.authStore.isValid && c.authStore.record ? (c.authStore.record as unknown as Cuenta) : null);
    sync();
    setReady(true);
    // estado al día (aprobación, baja, contraseña ya cambiada); si la sesión venció, se cierra
    if (c.authStore.isValid) c.collection("cuentas").authRefresh().catch(() => c.authStore.clear());
    return c.authStore.onChange(sync);
  }, []);

  return (
    <dialog
      ref={ref}
      className="socios"
      aria-labelledby="socios-titulo"
      onClose={onCerrar}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="socios__caja">
        <header className="socios__cabecera">
          <h2 id="socios-titulo">Asociados</h2>
          <button type="button" className="socios__cerrar" onClick={() => ref.current?.close()} aria-label="Cerrar">
            <Icon name="x" size={20} />
          </button>
        </header>

        {!ready ? null : !cuenta ? (
          <FormIngreso
            className="socios__form"
            cabecera={<p className="socios__intro">Entrá con tu email para ver tu estado, tu correo y tu credencial.</p>}
            pie={
              <div className="socios__links">
                <span>
                  ¿No tenés cuenta? <a href="/alta">Sumate a la Cámara</a>
                </span>
                <span>
                  ¿Olvidaste tu contraseña?{" "}
                  <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
                    Escribinos
                  </a>
                </span>
              </div>
            }
          />
        ) : cuenta.cambiar_clave ? (
          <CambiarClave key={cuenta.id} cuenta={cuenta} className="socios__form socios__form--clave" />
        ) : (
          <Resumen key={cuenta.id} cuenta={cuenta} />
        )}
      </div>
    </dialog>
  );
}
