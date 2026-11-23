"use client";

import { useEffect, useRef } from "react";

export default function HummingbirdCursor() {
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

    const spawnFeathers = (cx: number, cy: number) => {
      if (reduce) return;
      const colors = ["#2A9D8F", "#34A0A4", "#E9C46A", "#F4A261", "#1B4332"];
      const count = 14;
      for (let i = 0; i < count; i++) {
        const f = document.createElement("span");
        f.className = "hb-feather";
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        const dist = 40 + Math.random() * 55;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const rot = Math.random() * 540 - 270;
        const size = 10 + Math.random() * 8;
        f.style.cssText = `left:${cx}px;top:${cy}px;--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;width:${size}px;height:${size * 1.9}px;background:${colors[i % colors.length]};`;
        document.body.appendChild(f);
        f.addEventListener("animationend", () => f.remove(), { once: true });
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const termLink = target?.closest('a[href="/terminos"], a[href*="terminos"]') as HTMLAnchorElement | null;
      if (!termLink) return;
      spawnFeathers(e.clientX, e.clientY);
      if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const href = termLink.href;
        window.setTimeout(() => { window.location.href = href; }, 650);
      }
    };

    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      const dx = tx - x;
      const angle = Math.max(-25, Math.min(25, dx * 0.15));
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${angle}deg)`;
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("click", onClick);
    raf = requestAnimationFrame(tick);
    document.documentElement.classList.add("has-hummingbird-cursor");

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-hummingbird-cursor");
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="hummingbird-cursor pointer-events-none fixed left-0 top-0 z-[9999] opacity-0"
      style={{ transition: "opacity 150ms ease" }}
    >
      <svg width="38" height="38" viewBox="0 0 64 64" fill="none" className="hummingbird-svg">
        <g className="hb-wing hb-wing-left">
          <path d="M30 28 C18 18, 4 16, 6 24 C8 31, 20 33, 30 30 Z" fill="#2A9D8F" fillOpacity="0.95" stroke="#1B4332" strokeWidth="1.2"/>
        </g>
        <g className="hb-wing hb-wing-right">
          <path d="M34 28 C46 18, 60 16, 58 24 C56 31, 44 33, 34 30 Z" fill="#2A9D8F" fillOpacity="0.95" stroke="#1B4332" strokeWidth="1.2"/>
        </g>
        <path d="M32 22 C28 22, 25 25, 26 30 C27 35, 29 40, 32 44 C35 40, 37 35, 38 30 C39 25, 36 22, 32 22 Z" fill="#34A0A4" stroke="#1B4332" strokeWidth="1.2"/>
        <path d="M32 44 L30 54 L32 56 L34 54 Z" fill="#1B4332"/>
        <circle cx="30.5" cy="27.5" r="1.2" fill="#1B4332"/>
        <path d="M32 28 L32 18 L33 18 L32.5 28 Z" fill="#264653"/>
        <path d="M31.5 18 L32.5 18 L32 12 Z" fill="#264653"/>
        <path d="M28 31 C30 33, 34 33, 36 31" stroke="#E76F51" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}