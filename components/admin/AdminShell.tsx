"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { errorMessage, pb } from "../../lib/pb-client";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";
import { ToastProvider } from "./ui";

// secciones del menú, agrupadas: [ruta, nombre, ícono]
const GRUPOS: { titulo: string; items: [string, string, string][] }[] = [
  {
    titulo: "Socios",
    items: [
      ["/admin/altas", "Altas", "inbox"],
      ["/admin/profesionales", "Asociados y profesionales", "users"],
      ["/admin/proveedores", "Proveedores", "store"],
      ["/admin/contabilidad", "Contabilidad", "chart"],
    ],
  },
  {
    titulo: "Formación",
    items: [
      ["/admin/capacitaciones", "Capacitaciones", "cap"],
      ["/admin/cursos", "Cursos online", "play"],
    ],
  },
  {
    titulo: "Web",
    items: [
      ["/admin/honorarios", "Honorarios", "scale"],
      ["/admin/galeria", "Galería", "image"],
      ["/admin/textos", "Textos y rubros", "text"],
      ["/admin/datos", "Importar y exportar", "swap"],
    ],
  },
];
const NAV = GRUPOS.flatMap((g) => g.items);

function Login() {
  const emailId = useId();
  const passId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="login">
      <form
        className="login__card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await pb().collection("users").authWithPassword(email.trim(), password);
          } catch (err) {
            const msg = errorMessage(err);
            setError(msg.includes("authenticate") || msg.includes("identity") ? "Email o contraseña incorrectos." : msg);
          } finally {
            setBusy(false);
          }
        }}
      >
        <svg viewBox="10 0 82 63" className="login__mark" aria-hidden="true">
          <LogoMark ground="#ffffff" />
        </svg>
        <h1>Panel de la Cámara</h1>
        <p>Ingresá para actualizar honorarios, proveedores, capacitaciones y la galería de la web.</p>
        <label className="field" htmlFor={emailId}>
          <span className="field__label">Email</span>
          <input id={emailId} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" htmlFor={passId}>
          <span className="field__label">Contraseña</span>
          <input
            id={passId}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--navy btn--block" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
        <a href="/" className="login__back">
          Volver a la web
        </a>
      </form>
    </main>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);

  // en el teléfono el menú se cierra al cambiar de sección o con Escape
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    const client = pb();
    const sync = () =>
      setUser(client.authStore.isValid && client.authStore.record ? (client.authStore.record as unknown as { email: string; name?: string }) : null);
    sync();
    setReady(true);
    // refresca el token si sigue vigente; si no, cierra la sesión
    if (client.authStore.isValid) client.collection("users").authRefresh().catch(() => client.authStore.clear());
    return client.authStore.onChange(sync);
  }, []);

  if (!ready) return null;
  if (!user) return <Login />;

  return (
    <ToastProvider>
      <div className="admin">
        <aside className="admin__side">
          <a href="/" className="admin__brand" title="Ver la web">
            <svg viewBox="10 0 82 63" aria-hidden="true">
              <LogoMark ground="#091135" />
            </svg>
            <span>
              CAPH <small>Panel</small>
            </span>
          </a>
          <button
            type="button"
            className="admin__menu-btn"
            aria-expanded={menu}
            aria-controls="admin-menu"
            onClick={() => setMenu((m) => !m)}
          >
            {NAV.find(([href]) => pathname?.startsWith(href))?.[1] ?? "Menú"}
            <Icon name={menu ? "x" : "menu"} size={18} />
          </button>
          <div className="admin__panel" id="admin-menu" data-open={menu || undefined}>
            <nav aria-label="Secciones del panel">
              {GRUPOS.map((g) => (
                <div key={g.titulo} className="admin__group">
                  <span className="admin__group-title">{g.titulo}</span>
                  {g.items.map(([href, label, icon]) => (
                    <Link key={href} href={href} aria-current={pathname?.startsWith(href) ? "page" : undefined}>
                      <Icon name={icon} size={18} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div className="admin__user">
              <span className="admin__avatar" aria-hidden="true">
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="admin__who">
                <span className="admin__email">{user.name || user.email}</span>
                <a href="/" target="_blank" rel="noopener noreferrer" className="admin__view">
                  Ver la web <Icon name="link" size={14} />
                </a>
              </span>
              <button type="button" className="admin__logout" onClick={() => pb().authStore.clear()} title="Cerrar sesión" aria-label="Cerrar sesión">
                <Icon name="logout" size={18} />
              </button>
            </div>
          </div>
        </aside>
        {menu && <button type="button" className="admin__scrim" aria-label="Cerrar menú" tabIndex={-1} onClick={() => setMenu(false)} />}
        <main className="admin__main">{children}</main>
      </div>
    </ToastProvider>
  );
}
