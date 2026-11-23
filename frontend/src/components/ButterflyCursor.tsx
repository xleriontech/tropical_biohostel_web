"use client";

import { useEffect, useRef } from "react";

export default function ButterflyCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
    };
    const onLeave = () => { el.style.opacity = "0"; };
    const onEnter = () => { el.style.opacity = "1"; };

    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);
    document.documentElement.classList.add("has-butterfly-cursor");

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-butterfly-cursor");
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="butterfly-cursor pointer-events-none fixed left-0 top-0 z-[9999] opacity-0"
      style={{ transition: "opacity 150ms ease" }}
    >
      <svg width="32" height="32" viewBox="0 0 64 64" fill="none" className="butterfly-svg">
        <g className="butterfly-wing butterfly-wing-left">
          <path d="M32 32 C20 20, 6 18, 8 30 C10 40, 22 42, 32 34 Z" fill="#F4A261" fillOpacity="0.95" stroke="#7A2E14" strokeWidth="1.5"/>
          <path d="M32 34 C22 38, 12 46, 18 52 C24 56, 30 48, 32 38 Z" fill="#E9C46A" fillOpacity="0.95" stroke="#7A2E14" strokeWidth="1.5"/>
        </g>
        <g className="butterfly-wing butterfly-wing-right">
          <path d="M32 32 C44 20, 58 18, 56 30 C54 40, 42 42, 32 34 Z" fill="#F4A261" fillOpacity="0.95" stroke="#7A2E14" strokeWidth="1.5"/>
          <path d="M32 34 C42 38, 52 46, 46 52 C40 56, 34 48, 32 38 Z" fill="#E9C46A" fillOpacity="0.95" stroke="#7A2E14" strokeWidth="1.5"/>
        </g>
        <ellipse cx="32" cy="34" rx="2.2" ry="8" fill="#3B2F2F"/>
        <path d="M31 27 C28 22, 26 20, 24 19" stroke="#3B2F2F" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M33 27 C36 22, 38 20, 40 19" stroke="#3B2F2F" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}