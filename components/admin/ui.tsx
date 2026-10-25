"use client";

import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Icon } from "../Icon";

/* ---------- avisos ---------- */

type Toast = { id: number; kind: "ok" | "error"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-kind={t.kind}>
            <Icon name={t.kind === "ok" ? "check" : "x"} size={16} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ---------- confirmación ---------- */

export function useConfirm() {
  const [state, setState] = useState<{ text: string; action: string; resolve: (v: boolean) => void } | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (state) ref.current?.showModal();
    else ref.current?.close();
  }, [state]);

  const confirm = (text: string, action = "Eliminar") =>
    new Promise<boolean>((resolve) => setState({ text, action, resolve }));

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  const dialog = (
    <dialog ref={ref} className="confirm" onCancel={() => close(false)}>
      <p>{state?.text}</p>
      <div className="confirm__actions">
        <button type="button" className="btn btn--ghost-dark" onClick={() => close(false)}>
          Cancelar
        </button>
        <button type="button" className="btn btn--danger" onClick={() => close(true)} autoFocus>
          {state?.action}
        </button>
      </div>
    </dialog>
  );
  return { confirm, dialog };
}

/* ---------- panel lateral de edición ---------- */

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog ref={ref} className="drawer" onCancel={(e) => (e.preventDefault(), onClose())} aria-label={title}>
      <header className="drawer__head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" size={20} />
        </button>
      </header>
      <div className="drawer__body">{open && children}</div>
    </dialog>
  );
}

/* ---------- campos ---------- */

export function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
  wide?: boolean;
}) {
  // la etiqueta se asocia por id: el nombre accesible es solo la etiqueta y la ayuda queda como descripción
  const id = useId();
  const hintId = `${id}-ayuda`;
  const control = isValidElement(children)
    ? cloneElement(children, { id, "aria-describedby": hint ? hintId : undefined })
    : children;
  return (
    <div className="field" data-wide={wide || undefined}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {control}
      {hint && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function PageHead({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children && <div className="page-head__actions">{children}</div>}
    </header>
  );
}

export function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      Cargando…
    </div>
  );
}
