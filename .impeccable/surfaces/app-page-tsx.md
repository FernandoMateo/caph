---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Home — CAPH Santa Fe

Scope: home page (`app/page.tsx`). Visitor mode: **Persuade**. Build path: code-led (no image generation in session).

## Audience, job, action
- Aspirante no asociado → asociarse (Google Form actual).
- Asociado activo → herramientas a un paso: validador, honorarios vigentes (oct–nov 2026, PDF), proveedores verificados, capacitaciones.
- Proveedor → "Quiero ser proveedor" (form).

## Proof / content
Real content from caphsf.ar: lema, honorarios tabla completa oct–nov 2026, 3 capacitaciones (todas con fecha ya pasada al 24/10/2026), 40 proveedores con rubro, servicios, beneficios, convocatoria arquitectos, contacto (Francia 2841, WhatsApp +54 9 342 626-2759, Instagram).

## Constraints
User-pinned: palette #091135, #7eb6c8, #171717, #ffffff, #FFD600; logo redrawn as SVG from the 100px PNG (logo red #FF4F42 lives only inside the logo); hero concept = edificio saliendo de una tablet (reference: photoreal tower on a hand-held tablet at dusk), rendered as interactive 3D (user choice).

## Direction contract
THESIS: The home is an architect's scale model rising out of a tablet: the Cámara's digital tools turning into a standing building. It refuses the institutional template (photo carousel "Unidos por metas" over three service cards).
OWN-WORLD (revised 2026-10-25 after user asked for "mucho más moderno", mobile-first, softer shapes, lighter type, motion across the page, digital-product feel): Navy night stage #091135 holding the white maquette on a #171717 tablet with blueprint screen; content lives on a white rounded "sheet" (top radius 28–36px) that slides over the pinned stage. Rounded system: panels 28–36px, tiles 22px, inputs 16px, pill buttons and chips. Geist (self-hosted via next/font) at 600 for display with -0.04em tracking, 400/500 text, tabular figures for money; second clause of headings in a muted tone. #FFD600 only for lit windows/city lights and primary actions; #7eb6c8 for secondary accents, verified marks and a full sky tile; surfaces #f2f6f9. Motion: one orchestrated reveal (fade + rise + blur-out, staggered) on every block; scroll drives the 3D model.
STORY: Visitor recognises the official Cámara of administrators, sees the sector's tools work (validador, calculadora de honorarios, directorio), believes membership is practical value, then joins / verifies / postulates.
FIRST VIEWPORT (revised): pinned full-bleed hero (100svh) with the WebGL canvas behind everything, no hard edge: mobile = copy on top, tower in the lower half, both CTAs as pills side by side above the fold; desktop = copy left, tablet right. Floating pill header (blurred navy). On scroll the white sheet rises over the stage, the copy fades up, a navy veil deepens and the model rotates/approaches with scroll progress; first sheet block is a tools bento (validator, honorarios, proveedores). Superseded original text follows. Full-bleed WebGL canvas. Tablet lies in perspective lower-right, ~55% width; tower rises to ~85% height with distant Santa Fe skyline blocks in fog. Left column: headline "La fuerza de una profesión, la fuerza de sus protagonistas." ~4.7vw expanded black (wdth 125 / 900), first clause white, second clause #7eb6c8 (the screen's blueprint line color, so the lema reads as drawn on the same plan the tower rises from); short sub (second sentence hidden ≤480px so both CTAs clear the mobile fold); yellow "Quiero asociarme" + outline "Soy proveedor". Bottom strip across the width: live validador input, Honorarios oct–nov 2026 link, Proveedores verificados link.
FORM: brief-pinned direction (user reference), position 1 of 1; seed: none (brief-pinned, no roll — new-work.md: a user-pinned direction reads mode-persuade.md instead of running concept-seed). Before WebGL paints (or if it fails) a raster poster of the scene's final state shows (public/hero-poster-*.png, provenance embedded). Signature interaction: tower extrudes floor by floor out of the blueprint screen on load, windows light in sequence, pointer tilts the model; reduced motion shows the final state.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Validador data source (demo data, labeled, until the real padrón is connected).
- Upcoming capacitaciones (all listed ones are past).
- Logo SVG redraw pending user approval.
