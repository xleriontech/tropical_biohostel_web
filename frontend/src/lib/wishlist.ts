"use client";

import { useSyncExternalStore } from "react";

const KEY = "tropical-wishlist";
const EVENT = "tropical:wishlist-change";
const EMPTY: string[] = [];

let cache: string[] | null = null;

function leer(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    return cache;
  } catch {
    return EMPTY;
  }
}

function guardar(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onChange = () => {
    cache = null;
    cb();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useWishlist(): string[] {
  return useSyncExternalStore(subscribe, leer, () => EMPTY);
}

export function esGuardado(id: string): boolean {
  return leer().includes(id);
}

export function alternarGuardado(id: string): boolean {
  const ids = leer();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  guardar(next);
  return next.includes(id);
}
