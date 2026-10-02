"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import SafeImage from "./SafeImage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Tarjeta {
  slug: string;
  nombre: string;
  tipo: string;
  precio: number | null;
  imagen: string | null;
}

interface Mensaje {
  rol: "nati" | "yo";
  texto: string;
  tarjetas?: Tarjeta[];
  ubicacion?: { titulo: string; lat: number; lng: number; mapsUrl: string; wazeUrl: string } | null;
  sugerencias?: string[];
}

const fmtCOP = (v: number) => "$" + v.toLocaleString("es-CO");

/** Mini-markdown seguro para Nati: [texto](url), **negrita** y saltos de línea. */
function renderRico(texto: string, claro: boolean) {
  const linkCls = claro
    ? "font-medium text-emerald-200 underline decoration-emerald-300/60 underline-offset-2 hover:text-white"
    : "font-medium text-emerald-700 underline decoration-emerald-500/50 underline-offset-2";
  const partes: ReactNode[] = [];
  const reLink = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const pushTexto = (t: string) => {
    // URLs completas sueltas y rutas del sitio (/donaciones, /property/x)
    const partes2 = t.split(/((?:https?:\/\/[^\s)]+)|(?:(?<=[\s(]|^)\/(?:[a-z0-9-]+)(?:\/(?:[a-z0-9-]+))*))/g);
    partes2.forEach((s, j) => {
      if (!s) return;
      if (/^https?:\/\//i.test(s)) {
        partes.push(
          <a key={`${k}-${j}`} href={s} target="_blank" rel="noopener noreferrer" className={linkCls}>
            {s}
          </a>
        );
        return;
      }
      if (/^\/(?:[a-z0-9-]+)(?:\/(?:[a-z0-9-]+))*$/.test(s)) {
        partes.push(
          <Link key={`${k}-${j}`} href={s} className={linkCls}>
            {s}
          </Link>
        );
        return;
      }
      // negritas dentro del tramo
      const segs = s.split(/(\*\*[^*]+\*\*)/g);
      segs.forEach((g, h) => {
        if (g.startsWith("**") && g.endsWith("**") && g.length > 4) {
          partes.push(<strong key={`${k}-${j}-${h}`}>{g.slice(2, -2)}</strong>);
        } else if (g) {
          partes.push(<span key={`${k}-${j}-${h}`}>{g}</span>);
        }
      });
    });
    k++;
  };
  while ((m = reLink.exec(texto)) !== null) {
    if (m.index > ultimo) pushTexto(texto.slice(ultimo, m.index));
    const [_, etiqueta, url] = m;
    if (url.startsWith("/") || url.startsWith("#")) {
      partes.push(
        <Link key={`l${k++}`} href={url} className={linkCls}>
          {etiqueta}
        </Link>
      );
    } else if (/^https?:\/\//i.test(url)) {
      partes.push(
        <a key={`l${k++}`} href={url} target="_blank" rel="noopener noreferrer" className={linkCls}>
          {etiqueta}
        </a>
      );
    } else {
      pushTexto(m[0]);
    }
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) pushTexto(texto.slice(ultimo));
  return <span className="whitespace-pre-line">{partes}</span>;
}

export default function ChatWidget() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // La conversación sobrevive recargas y cambios de sección (24h)
  useEffect(() => {
    try {
      setSessionId(localStorage.getItem("tropical-chat-sid"));
      const raw = localStorage.getItem("tropical-chat-msgs");
      if (raw) {
        const guardados = JSON.parse(raw);
        if (Array.isArray(guardados.mensajes) && Date.now() - guardados.fecha < 24 * 3600 * 1000) {
          setMensajes(guardados.mensajes.slice(-20));
          if (localStorage.getItem("tropical-chat-abierto") === "1") setAbierto(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (mensajes.length > 0) {
        localStorage.setItem("tropical-chat-msgs", JSON.stringify({ fecha: Date.now(), mensajes: mensajes.slice(-20) }));
      } else {
        localStorage.removeItem("tropical-chat-msgs");
      }
    } catch {}
  }, [mensajes]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto]);

  const abrir = async () => {
    setAbierto(true);
    try {
      localStorage.setItem("tropical-chat-abierto", "1");
    } catch {}
    if (mensajes.length > 0) return;
    try {
      const r = await fetch(`${API_URL}/chat/saludo`).then((r) => r.json());
      setMensajes([{ rol: "nati", texto: r.reply, sugerencias: r.sugerencias }]);
    } catch {
      setMensajes([{ rol: "nati", texto: "¡Hola! Soy Nati 🪷, tu anfitriona en Tropical Biohostel. ¿En qué te ayudo?" }]);
    }
  };

  const enviar = async (texto: string) => {
    const msg = texto.trim();
    if (!msg || cargando) return;
    setEntrada("");
    setMensajes((m) => [...m, { rol: "yo", texto: msg }]);
    setCargando(true);
    try {
      const r = await fetch(`${API_URL}/chat/mensaje`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, mensaje: msg }),
      }).then((r) => r.json());
      if (r.sessionId && r.sessionId !== sessionId) {
        setSessionId(r.sessionId);
        try {
          localStorage.setItem("tropical-chat-sid", r.sessionId);
        } catch {}
      }
      setMensajes((m) => [
        ...m,
        { rol: "nati", texto: r.reply, tarjetas: r.propiedades, ubicacion: r.ubicacion || null, sugerencias: r.sugerencias },
      ]);
    } catch {
      setMensajes((m) => [...m, { rol: "nati", texto: "Uy, me enredé un momento 😅. ¿Me repites qué buscas?" }]);
    } finally {
      setCargando(false);
    }
  };

  const ultimasSugerencias = [...mensajes].reverse().find((m) => m.sugerencias?.length)?.sugerencias || [];

  return (
    <>
      {!abierto && (
        <button
          onClick={abrir}
          aria-label="Abrir chat de turismo"
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl transition hover:scale-105 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {abierto && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1f1a] text-white shadow-2xl sm:bottom-6 sm:right-6">
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3">
            <Sparkles className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-semibold leading-tight">Nati · Tu anfitriona</p>
              <p className="text-xs text-emerald-100">En línea · responde al instante</p>
            </div>
            <button onClick={() => { setAbierto(false); try { localStorage.removeItem("tropical-chat-abierto"); } catch {} }} aria-label="Cerrar chat" className="rounded-full p-1 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === "yo" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.rol === "yo"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm bg-white/10 text-emerald-50"
                  }`}
                >
                  {m.rol === "nati" ? renderRico(m.texto, true) : m.texto}
                  {m.ubicacion && (
                    <div className="mt-2 overflow-hidden rounded-xl bg-black/30">
                      <p className="px-2.5 pb-1 pt-2 text-xs font-semibold text-emerald-100">
                        📍 {m.ubicacion.titulo}
                      </p>
                      <iframe
                        title={`Mapa: ${m.ubicacion.titulo}`}
                        src={`https://maps.google.com/maps?q=${m.ubicacion.lat},${m.ubicacion.lng}&z=15&output=embed`}
                        className="h-40 w-full border-0"
                        loading="lazy"
                      />
                      <div className="flex gap-2 p-2">
                        <a
                          href={m.ubicacion.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-center text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Google Maps
                        </a>
                        <a
                          href={m.ubicacion.wazeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-lg bg-sky-600 px-2 py-1.5 text-center text-xs font-semibold text-white hover:bg-sky-500"
                        >
                          Waze
                        </a>
                      </div>
                    </div>
                  )}
                  {m.tarjetas && m.tarjetas.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.tarjetas.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/property/${t.slug}`}
                          className="flex items-center gap-2 rounded-xl bg-black/30 p-2 transition hover:bg-black/50"
                        >
                          <SafeImage
                            src={t.imagen}
                            alt={t.nombre}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{t.nombre}</span>
                            <span className="block text-xs text-emerald-200">
                              {t.precio != null ? fmtCOP(t.precio) : "Precio a convenir"} · Ver y reservar →
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-sm text-emerald-100">
                  <span className="animate-pulse">Nati está escribiendo…</span>
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {ultimasSugerencias.length > 0 && !cargando && (
            <div className="flex gap-2 overflow-x-auto px-3 pb-2">
              {ultimasSugerencias.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="shrink-0 rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(entrada);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Pregunta por hospedaje, comida o planes…"
              maxLength={500}
              className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              type="submit"
              aria-label="Enviar mensaje"
              disabled={cargando || !entrada.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
