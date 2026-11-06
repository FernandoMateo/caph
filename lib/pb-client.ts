"use client";

import PocketBase, { ClientResponseError } from "pocketbase";

// Cliente del panel: corre en el navegador y habla con PocketBase a través de la propia web
// (next.config.mjs reenvía /api), así funciona con cualquier dominio o túnel sin configurar nada.
let client: PocketBase | null = null;

export function pb() {
  if (!client) {
    client = new PocketBase(typeof window === "undefined" ? "http://127.0.0.1:8090" : window.location.origin);
    client.autoCancellation(false);
  }
  return client;
}

/** Mensaje legible a partir de un error de PocketBase. */
export function errorMessage(err: unknown): string {
  if (err instanceof ClientResponseError) {
    if (err.status === 0) return "No hay conexión con el servidor de datos. Revisá tu conexión e intentá de nuevo.";
    if (err.status === 401 || err.status === 403) return "Tu sesión no tiene permiso para esta acción. Volvé a iniciar sesión.";
    const fields = err.response?.data as Record<string, { message?: string }> | undefined;
    const first = fields && Object.entries(fields)[0];
    if (first) return `${first[0]}: ${first[1]?.message ?? "valor inválido"}`;
    return err.response?.message || err.message;
  }
  return err instanceof Error ? err.message : "Ocurrió un error inesperado.";
}

export function fileUrl(record: { id: string; collectionId: string }, filename: string) {
  return filename ? pb().files.getURL(record, filename) : "";
}

/**
 * Abre en otra pestaña un archivo protegido (comprobantes): PocketBase lo sirve solo con un token de unos minutos.
 * La pestaña se abre antes de pedir el token para que el navegador no la bloquee como ventana emergente.
 */
export async function abrirProtegido(record: { id: string; collectionId: string }, filename: string) {
  const ventana = window.open("", "_blank");
  try {
    const token = await pb().files.getToken();
    const url = pb().files.getURL(record, filename, { token });
    if (ventana) {
      ventana.opener = null;
      ventana.location.href = url;
    } else window.location.href = url;
  } catch (err) {
    ventana?.close();
    throw err;
  }
}
