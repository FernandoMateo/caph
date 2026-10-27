"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Maqueta de arquitectura que emerge de la pantalla-plano de una tablet.
// Escena de día, con los colores del logo, sobre el fondo claro del hero.

const C = {
  petrol: 0x002f43,
  blue: 0x3fb3e2,
  teal: 0x5bb5c1,
  mist: 0xa1c0d4,
  ink: 0x22313a,
  yellow: 0xfec73e,
  orange: 0xf9a63a,
  white: 0xffffff,
  haze: 0xe8f3f8, // igual al pie del degradado de .hero
};

const TOWER = { w: 4.2, d: 3.2, lobby: 0.78, floor: 0.46, floors: 13 };
const SCREEN = { w: 11.1, d: 7.5 };

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawBlueprint(canvas: HTMLCanvasElement, fontFamily: string) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const u = W / SCREEN.w; // px por unidad de mundo
  const cx = W / 2;
  const cy = H / 2;
  const line = "rgba(21,111,150,";

  const paper = ctx.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, "#f7fcfe");
  paper.addColorStop(1, "#e6f4fa");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // cuadrícula
  for (let x = 0; x <= W; x += u / 4) {
    const major = Math.round(x / (u / 4)) % 4 === 0;
    ctx.strokeStyle = line + (major ? "0.18)" : "0.07)");
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += u / 4) {
    const major = Math.round(y / (u / 4)) % 4 === 0;
    ctx.strokeStyle = line + (major ? "0.18)" : "0.07)");
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // plaza
  const pw = 7.6 * u;
  const pd = 5.8 * u;
  ctx.strokeStyle = line + "0.55)";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(cx - pw / 2, cy - pd / 2, pw, pd);
  ctx.setLineDash([]);

  // planta tipo
  const tw = (TOWER.w + 0.5) * u;
  const td = (TOWER.d + 0.5) * u;
  const x0 = cx - tw / 2;
  const y0 = cy - td / 2;
  ctx.strokeStyle = line + "0.95)";
  ctx.lineWidth = 5;
  ctx.strokeRect(x0, y0, tw, td);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = line + "0.7)";
  // núcleo y tabiques
  ctx.strokeRect(cx - 0.55 * u, cy - 0.7 * u, 1.1 * u, 1.4 * u);
  ctx.beginPath();
  ctx.moveTo(x0, cy);
  ctx.lineTo(cx - 0.55 * u, cy);
  ctx.moveTo(cx + 0.55 * u, cy);
  ctx.lineTo(x0 + tw, cy);
  ctx.moveTo(cx - 1.4 * u, y0);
  ctx.lineTo(cx - 1.4 * u, cy);
  ctx.moveTo(cx + 1.4 * u, cy);
  ctx.lineTo(cx + 1.4 * u, y0 + td);
  ctx.stroke();
  // puertas (arcos)
  ctx.strokeStyle = line + "0.5)";
  [
    [cx - 0.9 * u, cy, 0],
    [cx + 0.9 * u, cy, Math.PI],
  ].forEach(([x, y, a]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.35 * u, a, a + Math.PI / 2);
    ctx.stroke();
  });

  // cotas
  const dim = (xa: number, ya: number, xb: number, yb: number, label: string, vertical = false) => {
    ctx.strokeStyle = line + "0.8)";
    ctx.fillStyle = line + "0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
    const tick = (x: number, y: number) => {
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 10);
      ctx.lineTo(x + 10, y - 10);
      ctx.stroke();
    };
    tick(xa, ya);
    tick(xb, yb);
    ctx.save();
    ctx.font = `600 30px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.translate((xa + xb) / 2, (ya + yb) / 2);
    if (vertical) ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, -14);
    ctx.restore();
  };
  dim(x0, y0 - 0.45 * u, x0 + tw, y0 - 0.45 * u, "23,50");
  dim(x0 - 0.45 * u, y0, x0 - 0.45 * u, y0 + td, "18,50", true);

  // rótulos
  ctx.fillStyle = line + "0.9)";
  ctx.font = `700 34px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("PLANTA TIPO", 0.55 * u, H - 0.75 * u);
  ctx.font = `500 26px ${fontFamily}`;
  ctx.fillStyle = line + "0.6)";
  ctx.fillText("ESC. 1:200  ·  CAPH SANTA FE", 0.55 * u, H - 0.5 * u);

  // norte
  const nx = W - 0.8 * u;
  const ny = 0.85 * u;
  ctx.strokeStyle = line + "0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(nx, ny, 0.28 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = line + "0.9)";
  ctx.beginPath();
  ctx.moveTo(nx, ny - 0.26 * u);
  ctx.lineTo(nx + 0.09 * u, ny + 0.1 * u);
  ctx.lineTo(nx, ny + 0.03 * u);
  ctx.lineTo(nx - 0.09 * u, ny + 0.1 * u);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 28px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("N", nx, ny + 0.5 * u);
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.localClippingEnabled = true;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(C.haze, 26, 78);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    const target = new THREE.Vector3(0, 3.3, 0);

    // ---------- luces
    scene.add(new THREE.HemisphereLight(0xf2f9fc, C.mist, 1.9));
    const sun = new THREE.DirectionalLight(0xfff3df, 2.4);
    sun.position.set(-9, 15, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 11, bottom: -6, near: 1, far: 50 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(C.blue, 1.6);
    rim.position.set(10, 6, -10);
    scene.add(rim);

    // ---------- modelo (tablet + torre)
    const model = new THREE.Group();
    scene.add(model);

    const clipLocal = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.002);
    const clip = clipLocal.clone();

    const white = new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.82, clippingPlanes: [clip], clipShadows: true });
    const glass = new THREE.MeshStandardMaterial({ color: 0x4f9cbf, roughness: 0.28, metalness: 0.1, clippingPlanes: [clip], clipShadows: true });
    const lobbyMat = new THREE.MeshStandardMaterial({
      color: C.petrol,
      emissive: C.yellow,
      emissiveIntensity: 0.32,
      roughness: 0.4,
      clippingPlanes: [clip],
      clipShadows: true,
    });

    // tablet
    const tabletShape = new THREE.Shape();
    const tw = 12;
    const td = 8.4;
    const r = 0.6;
    tabletShape.moveTo(-tw / 2 + r, -td / 2);
    tabletShape.lineTo(tw / 2 - r, -td / 2);
    tabletShape.quadraticCurveTo(tw / 2, -td / 2, tw / 2, -td / 2 + r);
    tabletShape.lineTo(tw / 2, td / 2 - r);
    tabletShape.quadraticCurveTo(tw / 2, td / 2, tw / 2 - r, td / 2);
    tabletShape.lineTo(-tw / 2 + r, td / 2);
    tabletShape.quadraticCurveTo(-tw / 2, td / 2, -tw / 2, td / 2 - r);
    tabletShape.lineTo(-tw / 2, -td / 2 + r);
    tabletShape.quadraticCurveTo(-tw / 2, -td / 2, -tw / 2 + r, -td / 2);
    const tabletGeo = new THREE.ExtrudeGeometry(tabletShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 4,
      curveSegments: 10,
    });
    tabletGeo.rotateX(-Math.PI / 2);
    tabletGeo.translate(0, -0.35, 0);
    const tablet = new THREE.Mesh(
      tabletGeo,
      new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.32, metalness: 0.55 })
    );
    model.add(tablet);

    const bpCanvas = document.createElement("canvas");
    bpCanvas.width = 2048;
    bpCanvas.height = Math.round((2048 * SCREEN.d) / SCREEN.w);
    const bpTex = new THREE.CanvasTexture(bpCanvas);
    bpTex.colorSpace = THREE.SRGBColorSpace;
    bpTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const paintBlueprint = () => {
      drawBlueprint(bpCanvas, getComputedStyle(document.body).fontFamily || "sans-serif");
      bpTex.needsUpdate = true;
    };
    paintBlueprint();
    document.fonts?.ready.then(paintBlueprint);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN.w, SCREEN.d),
      new THREE.MeshBasicMaterial({ map: bpTex, toneMapped: false })
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = 0.001;
    model.add(screen);

    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN.w, SCREEN.d),
      new THREE.ShadowMaterial({ opacity: 0.22, color: C.petrol })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.004;
    shadowCatcher.receiveShadow = true;
    model.add(shadowCatcher);

    // brillo de la pantalla sobre la base de la torre
    const glow = new THREE.PointLight(C.blue, 4, 9, 2);
    glow.position.set(0, 0.6, 1.5);
    model.add(glow);

    // torre
    const tower = new THREE.Group();
    model.add(tower);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      tower.add(m);
      return m;
    };

    const { w, d, lobby, floor, floors } = TOWER;
    const slabGeo = new THREE.BoxGeometry(w + 0.5, 0.07, d + 0.5);
    const floorGlassH = floor - 0.07;
    const floorGlassGeo = new THREE.BoxGeometry(w, floorGlassH, d);

    // planta baja
    add(new THREE.BoxGeometry(w - 0.4, lobby, d - 0.4), lobbyMat, 0, lobby / 2, 0);
    const postGeo = new THREE.BoxGeometry(0.1, lobby, 0.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(postGeo, white, sx * (w / 2 - 0.05), lobby / 2, sz * (d / 2 - 0.05));

    // pisos tipo
    const windows: { pos: THREE.Vector3; rotY: number; delay: number; lit: boolean }[] = [];
    const cols = { x: 7, z: 5 };
    const winRand = makeRng(11);
    for (let i = 0; i < floors; i++) {
      const y0 = lobby + i * floor;
      add(slabGeo, white, 0, y0 + 0.035, 0);
      add(floorGlassGeo, glass, 0, y0 + 0.07 + floorGlassH / 2, 0);
      const wy = y0 + 0.07 + floorGlassH / 2;
      const faces: [number, number, number, number, number][] = [
        // [eje, signo, cantidad, largo, rotY]
        [0, 1, cols.x, w, 0],
        [0, -1, cols.x, w, Math.PI],
        [1, 1, cols.z, d, Math.PI / 2],
        [1, -1, cols.z, d, -Math.PI / 2],
      ];
      for (const [axis, sign, n, len, rotY] of faces) {
        for (let k = 0; k < n; k++) {
          const t = -len / 2 + (len / n) * (k + 0.5);
          const pos =
            axis === 0
              ? new THREE.Vector3(t, wy, sign * (d / 2 + 0.006))
              : new THREE.Vector3(sign * (w / 2 + 0.006), wy, t);
          const lit = winRand() < (i > floors - 3 ? 0.3 : 0.42);
          // se encienden de abajo hacia arriba, a medida que llega cada piso
          windows.push({ pos, rotY, delay: (i + 1) / (floors + 2) + winRand() * 0.12, lit });
        }
      }
    }
    // columnas de esquina
    const towerTop = lobby + floors * floor;
    const colGeo = new THREE.BoxGeometry(0.14, towerTop - lobby, 0.14);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(colGeo, white, sx * (w / 2), lobby + (towerTop - lobby) / 2, sz * (d / 2));
    // coronamiento
    add(new THREE.BoxGeometry(w + 0.5, 0.12, d + 0.5), white, 0, towerTop + 0.06, 0);
    add(new THREE.BoxGeometry(1.7, 0.5, 1.3), white, -0.6, towerTop + 0.37, -0.3);
    const roofPost = new THREE.BoxGeometry(0.07, 0.62, 0.07);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(roofPost, white, sx * (w / 2 + 0.1), towerTop + 0.43, sz * (d / 2 + 0.1));
    add(new THREE.BoxGeometry(w + 0.9, 0.06, d + 0.9), white, 0, towerTop + 0.77, 0);

    // ventanas instanciadas
    const winGeo = new THREE.PlaneGeometry((w / cols.x) * 0.78, floorGlassH * 0.74);
    const winMat = new THREE.MeshBasicMaterial({ toneMapped: false, clippingPlanes: [clip] });
    const winMesh = new THREE.InstancedMesh(winGeo, winMat, windows.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const off = new THREE.Color(0xbfe0ee);
    const on = new THREE.Color(C.yellow);
    const warm = new THREE.Color(C.orange);
    windows.forEach((win, idx) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), win.rotY);
      m4.compose(win.pos, q, one);
      winMesh.setMatrixAt(idx, m4);
      winMesh.setColorAt(idx, off);
    });
    tower.add(winMesh);

    // árboles de maqueta
    const treeTop = new THREE.SphereGeometry(0.26, 20, 14);
    const trunk = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8);
    const treeMat = new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.9 });
    [
      [-3.3, 2.3],
      [-2.4, 2.6],
      [-1.2, 2.55],
      [1.3, 2.6],
      [2.6, 2.4],
      [3.4, 2.2],
      [-3.4, -1.9],
      [3.3, -1.8],
      [3.5, 0.4],
      [-3.5, 0.6],
    ].forEach(([x, z], i) => {
      const s = 0.8 + ((i * 37) % 10) / 25;
      const g = new THREE.Group();
      const tr = new THREE.Mesh(trunk, treeMat);
      tr.position.y = 0.13;
      const top = new THREE.Mesh(treeTop, treeMat);
      top.position.y = 0.42;
      top.castShadow = tr.castShadow = true;
      g.add(tr, top);
      g.position.set(x, 0, z);
      g.scale.setScalar(s);
      model.add(g);
    });

    // plano fantasma: la torre dibujada antes de existir
    const ghostH = towerTop + 0.8;
    const ghostPts: number[] = [];
    const rect = (y: number, hw: number, hd: number) => {
      const c = [
        [-hw, -hd],
        [hw, -hd],
        [hw, hd],
        [-hw, hd],
      ];
      for (let i = 0; i < 4; i++) {
        const a = c[i];
        const b = c[(i + 1) % 4];
        ghostPts.push(a[0], y, a[1], b[0], y, b[1]);
      }
    };
    for (let i = 0; i <= floors; i++) rect(lobby + i * floor, (w + 0.5) / 2, (d + 0.5) / 2);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) ghostPts.push((sx * (w + 0.5)) / 2, 0, (sz * (d + 0.5)) / 2, (sx * (w + 0.5)) / 2, ghostH, (sz * (d + 0.5)) / 2);
    const ghostGeo = new THREE.BufferGeometry();
    ghostGeo.setAttribute("position", new THREE.Float32BufferAttribute(ghostPts, 3));
    const ghostMat = new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.7, toneMapped: false, depthWrite: false });
    const ghost = new THREE.LineSegments(ghostGeo, ghostMat);
    model.add(ghost);

    // anillo de emergencia sobre la pantalla
    const ringPts: number[] = [];
    const rw = (w + 0.7) / 2;
    const rd = (d + 0.7) / 2;
    [
      [-rw, -rd, rw, -rd],
      [rw, -rd, rw, rd],
      [rw, rd, -rw, rd],
      [-rw, rd, -rw, -rd],
    ].forEach(([a, b, c2, e]) => ringPts.push(a, 0.012, b, c2, 0.012, e));
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(ringPts, 3));
    const ringMat = new THREE.LineBasicMaterial({ color: C.yellow, transparent: true, opacity: 0, toneMapped: false });
    model.add(new THREE.LineSegments(ringGeo, ringMat));

    // línea de luz que recorre la torre de abajo hacia arriba (mismo lenguaje que la intro)
    const scanPts: number[] = [];
    const sw = (w + 0.62) / 2;
    const sd = (d + 0.62) / 2;
    [
      [-sw, -sd, sw, -sd],
      [sw, -sd, sw, sd],
      [sw, sd, -sw, sd],
      [-sw, sd, -sw, -sd],
    ].forEach(([a, b, c2, e]) => scanPts.push(a, 0, b, c2, 0, e));
    const scanGeo = new THREE.BufferGeometry();
    scanGeo.setAttribute("position", new THREE.Float32BufferAttribute(scanPts, 3));
    // sobre fondo claro la mezcla aditiva no se ve: líneas de color con mezcla normal
    const scanMat = new THREE.LineBasicMaterial({
      color: C.blue,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    });
    const scan = new THREE.LineSegments(scanGeo, scanMat);
    model.add(scan);
    // halo del anillo: un plano tenue que acompaña la línea
    const haloMat = new THREE.MeshBasicMaterial({
      color: C.blue,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.62, d + 0.62), haloMat);
    halo.rotation.x = -Math.PI / 2;
    model.add(halo);

    // barrido de luz sobre la pantalla-plano
    const sweepCanvas = document.createElement("canvas");
    sweepCanvas.width = 256;
    sweepCanvas.height = 4;
    const sctx = sweepCanvas.getContext("2d")!;
    const sg = sctx.createLinearGradient(0, 0, 256, 0);
    sg.addColorStop(0, "rgba(63,179,226,0)");
    sg.addColorStop(0.5, "rgba(63,179,226,1)");
    sg.addColorStop(1, "rgba(63,179,226,0)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 256, 4);
    const sweepTex = new THREE.CanvasTexture(sweepCanvas);
    const sweepMat = new THREE.MeshBasicMaterial({
      map: sweepTex,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    });
    const sweep = new THREE.Mesh(new THREE.PlaneGeometry(0.9, SCREEN.d), sweepMat);
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.y = 0.006;
    model.add(sweep);

    // ---------- ciudad al fondo
    const city = new THREE.Group();
    scene.add(city);
    const cityMat = new THREE.MeshBasicMaterial({ color: 0xcfe2eb });
    const lightsPos: number[] = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 70; i++) {
      const bw = 1.6 + rand() * 3.4;
      const bh = 1.5 + Math.pow(rand(), 1.8) * 9;
      const bx = -70 + rand() * 140;
      const bz = -34 - rand() * 30;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), cityMat);
      b.position.set(bx, bh / 2 - 5, bz);
      city.add(b);
      const n = Math.floor(bh * 1.4);
      for (let k = 0; k < n; k++) {
        if (rand() < 0.55) continue;
        lightsPos.push(bx - bw / 2 + 0.3 + rand() * (bw - 0.6), -5 + 0.5 + rand() * (bh - 1), bz + bw / 2 + 0.05);
      }
    }
    const lightsGeo = new THREE.BufferGeometry();
    lightsGeo.setAttribute("position", new THREE.Float32BufferAttribute(lightsPos, 3));
    const cityLights = new THREE.Points(
      lightsGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.24, transparent: true, opacity: 0.85, toneMapped: false, fog: false })
    );
    city.add(cityLights);

    // ---------- encuadre
    let mode: "wide" | "narrow" = "wide";
    const view = { w: 1, h: 1, x: 0, y: 0 };
    const resize = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      renderer.setSize(cw, ch, false);
      const aspect = cw / ch;
      camera.aspect = aspect;
      mode = aspect > 1.05 ? "wide" : "narrow";
      const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const needH = mode === "wide" ? 15.5 : 14;
      const needW = mode === "wide" ? 17 : 13.8;
      const dist = Math.max(needH / (2 * halfTan), needW / (2 * halfTan * aspect));
      const dir = new THREE.Vector3(0, 0.3, 1).normalize();
      camera.position.copy(target).addScaledVector(dir, dist);
      // la niebla acompaña la distancia de cámara: el modelo nunca se apaga, solo la ciudad del fondo
      const fog = scene.fog as THREE.Fog;
      fog.near = dist + 4;
      fog.far = dist + 52;
      camera.lookAt(target);
      Object.assign(view, mode === "wide" ? { w: cw, h: ch, x: -cw * 0.22, y: ch * 0.03 } : { w: cw, h: ch, x: -cw * 0.04, y: -ch * 0.2 });
      camera.setViewOffset(view.w, view.h, view.x, view.y, view.w, view.h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ---------- interacción
    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const hero = el.closest<HTMLElement>(".hero");
    let scrollP = 0;
    let sp = 0;
    const onScroll = () => {
      scrollP = Math.min(1.2, window.scrollY / Math.max(1, el.clientHeight));
      hero?.style.setProperty("--p", Math.min(1, scrollP).toFixed(3));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const baseRotY = -0.52;
    const baseRotX = 0.08;
    model.rotation.set(baseRotX, baseRotY, 0);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
    io.observe(el);

    // la torre sale piso por piso: cada nivel emerge con su propio paso
    const levels = [0, lobby];
    for (let i = 1; i <= floors; i++) levels.push(lobby + i * floor);
    levels.push(towerTop + 0.9);
    const STEP = 0.13;
    const RISE = STEP * (levels.length - 1);
    const LIGHTS = RISE + 0.4;
    // con intro, la torre espera a que la intro se vaya (components/Intro.tsx avisa con caph:intro-done)
    const introOn = document.documentElement.dataset.intro === "on";
    let start = performance.now() + (introOn ? 60_000 : 300);
    const onIntroDone = () => (start = performance.now() + 150);
    window.addEventListener("caph:intro-done", onIntroDone, { once: true });
    const SCAN_EVERY = 5.5;
    const SCAN_RUN = 2.4;
    let raf = 0;
    const towerHidden = -(towerTop + 0.9);
    let windowsDone = false;
    let firstFrame = true;
    const emerged = (t: number) => {
      const n = levels.length - 1;
      const k = Math.min(n - 1, Math.floor(t / STEP));
      if (t >= RISE) return levels[n];
      return levels[k] + (levels[k + 1] - levels[k]) * easeOutCubic((t - k * STEP) / STEP / 0.85);
    };

    const setWindows = (k: number) => {
      windows.forEach((win, idx) => {
        const lit = win.lit && win.delay <= k;
        winMesh.setColorAt(idx, lit ? (idx % 5 === 0 ? warm : on) : off);
      });
      winMesh.instanceColor!.needsUpdate = true;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || scrollP > 1.05) return;
      const t = Math.max(0, (now - start) / 1000);
      const up = reduced ? -towerHidden : emerged(t);
      const rise = up / -towerHidden;
      tower.position.y = towerHidden + up;
      ghostMat.opacity = 0.7 - 0.55 * easeOutExpo(rise);
      ringMat.opacity = reduced ? 0 : Math.max(0, Math.sin(Math.min(1, t / RISE) * Math.PI)) * 0.9;

      if (!windowsDone) {
        const k = reduced ? 1 : Math.min(1, Math.max(0, t / LIGHTS));
        setWindows(k);
        if (k >= 1) windowsDone = true;
      }

      // una vez en pie, la línea de luz sube por la torre cada tanto y la pantalla se barre
      if (!reduced && t > LIGHTS) {
        const c = ((t - LIGHTS) % SCAN_EVERY) / SCAN_RUN;
        if (c < 1) {
          const env = Math.sin(c * Math.PI);
          scan.position.y = halo.position.y = 0.05 + easeOutCubic(c) * (towerTop + 0.7);
          scanMat.opacity = env * 0.95;
          haloMat.opacity = env * 0.08;
          sweep.position.x = -SCREEN.w / 2 + c * SCREEN.w;
          sweepMat.opacity = env * 0.5;
        } else {
          scanMat.opacity = haloMat.opacity = sweepMat.opacity = 0;
        }
      }

      const idle = reduced ? 0 : t;
      // el scroll gira la maqueta y la acerca mientras la hoja de contenido la cubre
      sp += (scrollP - sp) * 0.12;
      const ty = baseRotY + pointer.x * 0.22 + Math.sin(idle * 0.25) * 0.04 + sp * 0.85;
      const tx = baseRotX + pointer.y * 0.05 + sp * 0.12;
      model.rotation.y += (ty - model.rotation.y) * 0.06;
      model.rotation.x += (tx - model.rotation.x) * 0.06;
      model.position.y = Math.sin(idle * 0.9) * 0.08;
      // la torre sube por delante del borde de la hoja y se aleja: se entrega a la página en vez de quedar tapada
      // en escritorio además se corre hacia el centro, que queda libre cuando se va el texto
      const lift = mode === "wide" ? 0.34 : 0.78;
      model.scale.setScalar(1 - sp * 0.3);
      camera.setViewOffset(view.w, view.h, view.x * (1 - sp), view.y + view.h * sp * lift, view.w, view.h);
      city.position.x = -pointer.x * 1.2;

      model.updateMatrixWorld();
      clip.copy(clipLocal).applyMatrix4(model.matrixWorld);
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        el.dataset.ready = "true";
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("caph:intro-done", onIntroDone);
      sweepTex.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      bpTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={wrap} className="hero-scene" data-failed={failed || undefined} />;
}
