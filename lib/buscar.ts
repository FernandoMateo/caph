// Búsqueda de los directorios (proveedores y profesionales, en la web y en el panel).
// No distingue mayúsculas ni acentos; cada palabra tiene que aparecer en algún dato.
// Los teléfonos se comparan solo por sus dígitos: "342 453-1968", "0342 4531968" y "4531968" encuentran lo mismo.

export function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dígitos de un teléfono sin el 0 de larga distancia ni el +54 9. */
function digitos(tel: string) {
  return tel.replace(/\D/g, "").replace(/^0+/, "").replace(/^549?/, "");
}

export function coincide(consulta: string, textos: (string | undefined)[], telefonos: (string | undefined)[] = []) {
  const q = normalizar(consulta);
  if (!q) return true;
  const tels = telefonos.filter(Boolean).map((t) => digitos(t!));
  const texto = normalizar(textos.filter(Boolean).join(" · "));

  // consulta que es un número (teléfono, N.º): los dígitos se buscan juntos, sin importar los separadores
  if (/^[\d\s()+\-./]+$/.test(q)) {
    const d = digitos(q);
    return (d.length >= 3 && tels.some((t) => t.includes(d))) || texto.includes(q);
  }

  return q.split(" ").every((palabra) => texto.includes(palabra) || (/^\d{3,}$/.test(palabra) && tels.some((t) => t.includes(palabra))));
}
