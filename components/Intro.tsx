"use client";

import { useEffect, useRef, useState } from "react";
import { LOGO_CENTERS, LogoMark } from "./Logo";

// Intro: una línea de luz cruza la pantalla, implosiona en un punto, las piezas del logo
// caen hacia el centro y se arman con un destello. Se ve una vez por sesión (ver el script
// de app/layout.tsx que pone html[data-intro="on"]); se saltea con clic o tecla.
// Los tiempos viven en globals.css (sección intro); acá solo los marcadores.

const EXIT_AT = 2750; // empieza a irse
const EXIT_MS = 650; // igual que .intro[data-leave] en globals.css
export const INTRO_KEY = "caph-intro";

const LOGO_CENTER: [number, number] = [51, 32];

// cada pieza arranca lejos, en la dirección que ocupa dentro del logo, y cae hacia su lugar
const scatter = LOGO_CENTERS.map(([x, y], i) => {
  let dx = x - LOGO_CENTER[0];
  let dy = y - LOGO_CENTER[1];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const far = 150 + (i % 3) * 30;
  return {
    "--x": `${(dx * far).toFixed(1)}px`,
    "--y": `${(dy * far).toFixed(1)}px`,
    "--r": `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`,
    "--s": len < 6 ? "3.2" : "0.4",
    "--i": i,
  } as React.CSSProperties;
});

// chispas que la implosión arrastra hacia el centro
function sparks(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.hypot(W, H) / 2;
  // los colores del logo
  const colors = ["#3fb3e2", "#5bb5c1", "#fec73e", "#ff4f42", "#f9a63a", "#a1c0d4"];
  const N = W < 640 ? 70 : 140;
  const parts = Array.from({ length: N }, (_, i) => {
    const a = Math.random() * Math.PI * 2;
    // la mitad nace sobre la línea horizontal: la luz se rompe en chispas
    const onLine = i % 2 === 0;
    return {
      a: onLine ? (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.12 : a,
      r0: onLine ? (0.2 + Math.random() * 0.8) * (W / 2) : (0.55 + Math.random() * 0.45) * R,
      born: 0.85 + Math.random() * 0.45,
      life: 0.35 + Math.random() * 0.3,
      w: 0.6 + Math.random() * 1.6,
      c: colors[i % colors.length],
    };
  });
  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const k = (t - p.born) / p.life;
      if (k <= 0 || k >= 1) continue;
      // acelera al acercarse al centro
      const r = p.r0 * (1 - k * k * k);
      const rTail = p.r0 * (1 - Math.max(0, k - 0.18) ** 3);
      const cos = Math.cos(p.a);
      const sin = Math.sin(p.a);
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = Math.min(1, k * 4) * (1 - k * 0.4);
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(cx + cos * rTail, cy + sin * rTail);
      ctx.lineTo(cx + cos * r, cy + sin * r);
      ctx.stroke();
    }
    if (t < 2) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export function Intro() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"play" | "leave" | "gone">("play");
  const leaving = useRef(false);

  const leave = (ms: number) => {
    if (leaving.current) return;
    leaving.current = true;
    const root = document.documentElement;
    root.dataset.intro = "done";
    window.dispatchEvent(new Event("caph:intro-done"));
    setState("leave");
    window.setTimeout(() => setState("gone"), ms);
  };

  useEffect(() => {
    if (document.documentElement.dataset.intro !== "on") {
      setState("gone");
      return;
    }
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {}
    const stop = canvas.current ? sparks(canvas.current) : () => {};
    const timer = window.setTimeout(() => leave(EXIT_MS), EXIT_AT);
    const onKey = () => leave(EXIT_MS);
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div
      className="intro"
      data-leave={state === "leave" || undefined}
      aria-hidden="true"
      onClick={() => leave(EXIT_MS)}
    >
      <canvas ref={canvas} className="intro__sparks" />
      <div className="intro__line" />
      <div className="intro__core" />
      <div className="intro__ring" />
      <div className="intro__flash" />
      <div className="intro__brand">
        <svg className="intro__logo" viewBox="10 0 82 63" xmlns="http://www.w3.org/2000/svg">
          <LogoMark ground="#ffffff"piece={(i) => ({ className: "intro__piece", style: scatter[i] })} />
        </svg>
        <p className="intro__name">
          {"CAPH".split("").map((ch, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </p>
        <p className="intro__place">Santa Fe</p>
      </div>
      <span className="intro__skip">Tocá para saltear</span>
    </div>
  );
}
