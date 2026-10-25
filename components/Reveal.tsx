"use client";

import { useEffect } from "react";

// Revela [data-reveal] al entrar en pantalla. Sin JS el contenido queda visible.
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      // lo que ya está a la vista se muestra sin esperar
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("is-in");
      else io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
