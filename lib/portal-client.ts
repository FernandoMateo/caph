"use client";

import PocketBase, { ClientResponseError, LocalAuthStore } from "pocketbase";

// Cliente del portal de asociados, proveedores y profesionales. Guarda su sesión aparte de la del panel
// (otra clave en el navegador): entrar a una no cierra ni pisa la otra.
let client: PocketBase | null = null;

export function portal() {
  if (!client) {
    client = new PocketBase(
      typeof window === "undefined" ? "http://127.0.0.1:8090" : window.location.origin,
      new LocalAuthStore("caph_portal_auth")
    );
    client.autoCancellation(false);
  }
  return client;
}

export type Rol = "asociado" | "proveedor" | "profesional";

export const ROLES: Record<Rol, { titulo: string; texto: string }> = {
  asociado: { titulo: "Administrador de consorcios", texto: "Me asocio a la Cámara como administrador." },
  proveedor: { titulo: "Proveedor", texto: "Ofrezco servicios a consorcios como socio adherente." },
  profesional: { titulo: "Profesional", texto: "Abogado, contador, arquitecto u otra profesión afín." },
};

/** Mensaje legible para los errores del alta (los demás, como en el panel). */
export function errorAlta(err: unknown, fallback: (err: unknown) => string) {
  if (err instanceof ClientResponseError) {
    const data = err.response?.data as Record<string, { code?: string }> | undefined;
    if (data?.email?.code === "validation_not_unique") return "Ya hay una cuenta con ese email. Si es tuya, escribinos para recuperarla.";
    if (data?.email) return "El email no es válido.";
    if (data?.password) return "La contraseña tiene que tener al menos 8 caracteres.";
    if (data?.cuenta) return "Tu cuenta ya tiene una ficha cargada.";
  }
  return fallback(err);
}
