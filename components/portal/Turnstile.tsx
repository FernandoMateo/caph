"use client";

import { useEffect, useRef } from "react";

// Desafío anti-robots de Cloudflare Turnstile para el alta. Solo aparece si la web tiene
// NEXT_PUBLIC_TURNSTILE_SITE_KEY; el servidor lo exige si tiene TURNSTILE_SECRET (pb_hooks/fichas.js).

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type Api = {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Api;
  }
}

let cargando: Promise<Api> | null = null;

function cargarApi(): Promise<Api> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  cargando ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile no cargó")));
    s.onerror = () => {
      cargando = null;
      reject(new Error("Turnstile no cargó"));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

/** `reiniciar` cambia después de cada envío fallido: el token sirve una sola vez. */
export function Turnstile({ onToken, reiniciar }: { onToken: (token: string) => void; reiniciar: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let vivo = true;
    cargarApi()
      .then((api) => {
        if (!vivo || !ref.current) return;
        id.current = api.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "es",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, []);

  useEffect(() => {
    if (reiniciar && id.current) {
      cb.current("");
      window.turnstile?.reset(id.current);
    }
  }, [reiniciar]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="alta__turnstile" />;
}
