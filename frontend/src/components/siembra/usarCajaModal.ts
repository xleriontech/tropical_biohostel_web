"use client";

import { useEffect, type RefObject } from "react";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * La caja modal accesible: Escape la cierra, el foco entra y no se escapa de
 * ella, el fondo deja de hacer scroll y al cerrar vuelve al botón que la abrió.
 */
export function usarCajaModal(panel: RefObject<HTMLElement | null>, onCerrar: () => void) {
  useEffect(() => {
    const caja = panel.current;
    const previo = document.activeElement as HTMLElement | null;
    caja?.focus();
    const visibles = () =>
      [...(caja?.querySelectorAll<HTMLElement>(ENFOCABLES) || [])].filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key !== "Tab") return;
      const items = visibles();
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      const activo = document.activeElement as HTMLElement | null;
      const fuera = !activo || !caja?.contains(activo);
      if (e.shiftKey && (fuera || activo === primero)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (fuera || activo === ultimo)) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previo?.focus?.();
    };
  }, [onCerrar]);
}
