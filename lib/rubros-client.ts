"use client";

import { useEffect, useState } from "react";
import { RUBROS } from "./data";

// Rubros del directorio (colección "rubros", editable en el panel) para los componentes del navegador.
// Se piden una vez por página; mientras tanto, o si falla, se usan los de lib/data.ts.

let cache: Record<string, string> | null = null;

export function olvidarRubros() {
  cache = null;
}

export function useRubros(): Record<string, string> {
  const [rubros, setRubros] = useState(cache ?? RUBROS);
  useEffect(() => {
    if (cache) return setRubros(cache);
    let vivo = true;
    fetch("/api/collections/rubros/records?perPage=200&sort=orden,nombre")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { items: { clave: string; nombre: string }[] }) => {
        if (!j.items.length) return;
        cache = Object.fromEntries(j.items.map((x) => [x.clave, x.nombre]));
        if (vivo) setRubros(cache);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return rubros;
}
