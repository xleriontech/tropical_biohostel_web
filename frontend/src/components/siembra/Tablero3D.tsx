"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Etapa, ParcelaTablero } from "@/lib/siembra";

/** Los colores son los del manual de identidad, no colores "de juego". */
const C = {
  bosque: "#1F3D2B",
  cascara: "#6B4423",
  sol: "#E8A94A",
  hoja: "#8FB573",
  tierra: "#3E2F23",
  crema: "#F5EFE0",
  piedra: "#D4C9B0",
} as const;

const PASO = 1;
const ALTURA: Record<Etapa, number> = { SEMILLA: 0.22, BROTE: 0.5, JUVENIL: 0.85, PRODUCTIVO: 1.25 };

type Props = {
  parcelas: ParcelaTablero[];
  filas: number;
  columnas: number;
  seleccion: { fila: number; columna: number } | null;
  onSelect: (p: ParcelaTablero) => void;
  onHover?: (p: ParcelaTablero | null) => void;
  animar: boolean;
};

function puntosFruto(fila: number, columna: number, alto: number) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = ((fila * 7 + columna * 13 + i * 61) % 360) * (Math.PI / 180);
    const r = 0.17 + ((i * 7 + columna) % 3) * 0.035;
    pts.push([Math.cos(a) * r, alto * (0.45 + (i % 3) * 0.17), Math.sin(a) * r]);
  }
  return pts;
}

export default function Tablero3D(props: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const vivos = useRef(props);
  vivos.current = props;
  const pintar = useRef<(() => void) | null>(null);

  useEffect(() => {
    pintar.current?.();
  }, [props.parcelas, props.seleccion, props.animar]);

  useEffect(() => {
    const nodo = caja.current;
    if (!nodo) return;

    const escena = new THREE.Scene();
    escena.fog = new THREE.Fog(new THREE.Color(C.piedra).getHex(), 18, 34);

    const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    camara.position.set(0, 8.5, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    nodo.appendChild(renderer.domElement);

    const control = new OrbitControls(camara, renderer.domElement);
    control.enablePan = false;
    control.enableDamping = vivos.current.animar;
    control.dampingFactor = 0.08;
    control.minDistance = 5;
    control.maxDistance = 22;
    control.maxPolarAngle = 1.15;
    control.target.set(0, 0.4, 0);

    escena.add(new THREE.HemisphereLight(new THREE.Color(C.crema).getHex(), new THREE.Color(C.tierra).getHex(), 0.7));
    escena.add(new THREE.AmbientLight(new THREE.Color(C.crema).getHex(), 0.35));
    const sol = new THREE.DirectionalLight(new THREE.Color(C.sol).getHex(), 1.15);
    sol.position.set(6, 10, 4);
    escena.add(sol);
    const relleno = new THREE.DirectionalLight(new THREE.Color(C.hoja).getHex(), 0.35);
    relleno.position.set(-7, 6, -5);
    escena.add(relleno);

    // Materiales y geometrías compartidos: 81 casillas no crean 81 materiales.
    const est = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
    const brillo = (color: string, intensidad: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      est(color, { emissive: new THREE.Color(C.sol), emissiveIntensity: intensidad, ...extra });
    type Loseta = "clara" | "oscura" | "ocupada" | "reservada";
    const LOSETA: Record<Loseta, { base: THREE.MeshStandardMaterial; hover: THREE.MeshStandardMaterial; sel: THREE.MeshStandardMaterial }> = {
      clara: { base: est(C.crema), hover: brillo(C.crema, 0.3), sel: brillo(C.crema, 0.62) },
      oscura: { base: est(C.piedra), hover: brillo(C.piedra, 0.3), sel: brillo(C.piedra, 0.62) },
      ocupada: {
        base: est(C.hoja, { roughness: 0.7 }),
        hover: brillo(C.hoja, 0.3, { roughness: 0.7 }),
        sel: brillo(C.hoja, 0.62, { roughness: 0.7 }),
      },
      reservada: {
        base: est(C.sol, { transparent: true, opacity: 0.55 }),
        hover: brillo(C.sol, 0.25, { transparent: true, opacity: 0.72 }),
        sel: brillo(C.sol, 0.55, { transparent: true, opacity: 0.9 }),
      },
    };
    const tipoDe = (p: ParcelaTablero): Loseta =>
      p.estado === "OCUPADA" ? "ocupada" : p.estado === "RESERVADA" ? "reservada" : (p.fila + p.columna) % 2 === 0 ? "clara" : "oscura";
    const M = {
      tronco: est(C.cascara, { roughness: 0.95 }),
      copaCafe: est(C.bosque),
      copaCacao: est(C.hoja, { roughness: 0.75 }),
      frutoCafe: est(C.tierra, { roughness: 0.5 }),
      frutoCacao: est(C.sol, { roughness: 0.5 }),
    };
    const G = {
      loseta: new THREE.BoxGeometry(0.88, 0.14, 0.88),
      base: new THREE.BoxGeometry(1, 0.06, 1),
      tronco: new THREE.CylinderGeometry(0.045, 0.075, 1, 7),
      copa: new THREE.SphereGeometry(0.24, 12, 10),
      semilla: new THREE.ConeGeometry(0.09, 0.2, 8),
      fruto: new THREE.SphereGeometry(0.055, 8, 7),
      anillo: new THREE.RingGeometry(0.5, 0.64, 48),
    };

    const mesa = new THREE.Mesh(G.base, est(C.tierra, { roughness: 1 }));
    mesa.scale.set(props.filas * PASO + 0.5, 1, props.columnas * PASO + 0.5);
    mesa.position.y = -0.02;
    escena.add(mesa);

    const tablero = new THREE.Group();
    escena.add(tablero);

    const anillo = new THREE.Mesh(G.anillo, new THREE.MeshBasicMaterial({ color: C.sol, side: THREE.DoubleSide }));
    anillo.rotation.x = -Math.PI / 2;
    anillo.visible = false;
    escena.add(anillo);

    const construyeArbol = (p: ParcelaTablero, x: number, z: number, y = 0.14) => {
      const especie = p.arbol!.especie;
      const etapa = p.arbol!.etapa;
      const alto = ALTURA[etapa];
      const g = new THREE.Group();
      const copa = especie === "CAFE" ? M.copaCafe : M.copaCacao;
      const fruto = especie === "CAFE" ? M.frutoCafe : M.frutoCacao;
      if (etapa === "SEMILLA") {
        const s = new THREE.Mesh(G.semilla, copa);
        s.position.y = 0.11;
        g.add(s);
      } else {
        const t = new THREE.Mesh(G.tronco, M.tronco);
        t.scale.y = alto;
        t.position.y = alto / 2;
        g.add(t);
        const copas: [number, number, number, number][] =
          etapa === "BROTE"
            ? [[0, alto * 0.86, 0, 0.62]]
            : etapa === "JUVENIL"
              ? [
                  [0, alto * 0.78, 0, 0.86],
                  [0.13, alto * 0.55, -0.1, 0.6],
                ]
              : [
                  [0, alto * 0.82, 0, 1],
                  [-0.16, alto * 0.6, 0.12, 0.72],
                  [0.15, alto * 0.52, -0.14, 0.66],
                ];
        for (const [cx, cy, cz, s] of copas) {
          const m = new THREE.Mesh(G.copa, copa);
          m.position.set(cx, cy, cz);
          m.scale.setScalar(s);
          g.add(m);
        }
        if (etapa === "PRODUCTIVO") {
          for (const [fx, fy, fz] of puntosFruto(p.fila, p.columna, alto)) {
            const f = new THREE.Mesh(G.fruto, fruto);
            f.position.set(fx, fy, fz);
            g.add(f);
          }
        }
      }
      g.position.set(x, y, z);
      return g;
    };

    let hover: THREE.Mesh | null = null;
    let hoverParcela: ParcelaTablero | null = null;
    const pinta = () => {
      const { parcelas, filas, columnas, seleccion } = vivos.current;
      const elegido = seleccion ? `${seleccion.fila}-${seleccion.columna}` : null;
      // Reconstruir el grupo cuesta poco (81 casillas) y evita sincronizar estados a mano.
      tablero.clear();
      for (const p of parcelas) {
        const x = (p.columna - (columnas - 1) / 2) * PASO;
        const z = (p.fila - (filas - 1) / 2) * PASO;
        const tipo = tipoDe(p);
        const activo = `${p.fila}-${p.columna}` === elegido;
        const loseta = new THREE.Mesh(G.loseta, activo ? LOSETA[tipo].sel : LOSETA[tipo].base);
        loseta.position.set(x, activo ? 0.13 : 0.07, z);
        loseta.userData.parcela = p;
        loseta.userData.tipo = tipo;
        tablero.add(loseta);
        if (p.arbol) tablero.add(construyeArbol(p, x, z, activo ? 0.2 : 0.14));
      }
      // El puntero no se movió al elegir: la casilla sobrevolada recupera su brillo.
      hover = null;
      if (hoverParcela) {
        const bajo = tablero.children.find((c) => {
          const u = c.userData.parcela as ParcelaTablero | undefined;
          return !!u && u.fila === hoverParcela!.fila && u.columna === hoverParcela!.columna;
        }) as THREE.Mesh | undefined;
        if (bajo) {
          bajo.material = LOSETA[bajo.userData.tipo as Loseta].hover;
          hover = bajo;
        } else {
          hoverParcela = null;
        }
      }
      const sel = seleccion && parcelas.find((p) => p.fila === seleccion.fila && p.columna === seleccion.columna);
      anillo.visible = !!sel;
      if (sel) anillo.position.set((sel.columna - (columnas - 1) / 2) * PASO, 0.16, (sel.fila - (filas - 1) / 2) * PASO);
      mesa.scale.set(columnas * PASO + 0.5, 1, filas * PASO + 0.5);
      // El raycast lee matrixWorld: sin esto, un clic antes del primer render no toca nada.
      escena.updateMatrixWorld(true);
      camara.updateMatrixWorld();
    };
    pintar.current = pinta;
    pinta();

    const rayo = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const casillaBajo = (e: PointerEvent): THREE.Mesh | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      rayo.setFromCamera(ndc, camara);
      const golpe = rayo.intersectObjects(tablero.children, false)[0];
      return golpe && golpe.object.userData.parcela ? (golpe.object as THREE.Mesh) : null;
    };

    const alMover = (e: PointerEvent) => {
      const m = casillaBajo(e);
      if (hover === m) return;
      const saliente = hover?.userData.parcela as ParcelaTablero | undefined;
      if (hover && saliente) {
        const elegido = vivos.current.seleccion && `${saliente.fila}-${saliente.columna}` === `${vivos.current.seleccion.fila}-${vivos.current.seleccion.columna}`;
        const t = hover!.userData.tipo as Loseta;
        hover!.material = elegido ? LOSETA[t].sel : LOSETA[t].base;
      }
      hover = m;
      if (!m) {
        renderer.domElement.style.cursor = "default";
        hoverParcela = null;
        vivos.current.onHover?.(null);
        return;
      }
      const p = m.userData.parcela as ParcelaTablero;
      renderer.domElement.style.cursor = "pointer";
      m.material = LOSETA[m.userData.tipo as Loseta].hover;
      hoverParcela = p;
      vivos.current.onHover?.(p);
    };

    // Toda casilla se elige: la libre ofrece apadrinamiento, las demás cuentan qué hay ahí.
    // Solo cuenta como elección si el puntero no se movió: arrastrar sirve para girar la finca.
    let pulsado: { x: number; y: number } | null = null;
    const alPulsar = (e: PointerEvent) => {
      pulsado = { x: e.clientX, y: e.clientY };
    };
    const alSoltar = (e: PointerEvent) => {
      if (!pulsado) return;
      const girado = Math.hypot(e.clientX - pulsado.x, e.clientY - pulsado.y) > 6;
      pulsado = null;
      if (girado) return;
      const m = casillaBajo(e);
      if (!m) return;
      vivos.current.onSelect(m.userData.parcela as ParcelaTablero);
    };

    renderer.domElement.addEventListener("pointermove", alMover);
    renderer.domElement.addEventListener("pointerdown", alPulsar);
    renderer.domElement.addEventListener("pointerup", alSoltar);

    const ajusta = () => {
      const { clientWidth: w, clientHeight: h } = nodo;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(ajusta);
    ro.observe(nodo);
    ajusta();

    // La GPU solo trabaja mientras el tablero está en pantalla.
    let activo = true;
    const io = new IntersectionObserver(([e]) => {
      activo = e.isIntersecting;
      if (activo) ajusta();
    }, { threshold: 0.05 });
    io.observe(nodo);

    const reloj = new THREE.Clock();
    let quadro = 0;
    const bucle = () => {
      quadro = requestAnimationFrame(bucle);
      if (!activo) return;
      control.update();
      if (vivos.current.animar && anillo.visible) {
        anillo.scale.setScalar(1 + Math.sin(reloj.getElapsedTime() * 2.4) * 0.06);
      }
      renderer.render(escena, camara);
    };
    bucle();

    return () => {
      cancelAnimationFrame(quadro);
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", alMover);
      renderer.domElement.removeEventListener("pointerdown", alPulsar);
      renderer.domElement.removeEventListener("pointerup", alSoltar);
      control.dispose();
      Object.values(M).forEach((m) => m.dispose());
      Object.values(LOSETA).forEach((t) => Object.values(t).forEach((m) => m.dispose()));
      Object.values(G).forEach((g) => g.dispose());
      renderer.dispose();
      nodo.removeChild(renderer.domElement);
      pintar.current = null;
    };
  }, []);

  return (
    <div
      ref={caja}
      data-testid="tablero-3d"
      role="img"
      aria-label="Tablero tridimensional de la finca: cada casilla es un lugar donde la finca siembra un árbol apadrinado. Usa la vista lista para elegir casillas con teclado."
      className="h-[340px] w-full overflow-hidden rounded-3xl border sm:h-[460px]"
      style={{ background: "radial-gradient(120% 90% at 50% 10%, #F5EFE0 0%, #D4C9B0 60%, #3E2F23 100%)" }}
    />
  );
}
