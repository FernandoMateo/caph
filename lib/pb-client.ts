"use client";

import PocketBase, { ClientResponseError } from "pocketbase";

// Cliente del panel: corre en el navegador y habla directo con PocketBase.
let client: PocketBase | null = null;

export function pb() {
  if (!client) {
    client = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "http://127.0.0.1:8090");
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
