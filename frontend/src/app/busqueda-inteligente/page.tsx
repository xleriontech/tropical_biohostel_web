"use client";

import { useEffect, useState } from "react";
import { SmartSearchResponse } from "@/types";
import { TipoIcon, unidadPrecio } from "@/components/icons";
import {
  Armchair,
  Bath,
  Brain,
  Car,
  Check,
  Coffee,
  Compass,
  CookingPot,
  Croissant,
  Flame,
  Gem,
  Heart,
  Home,
  Leaf,
  Mountain,
  PawPrint,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Sunrise,
  ThumbsUp,
  Users,
  Wifi,
  Waves,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const STORAGE_KEY = "smart-search-last";

const TIPO_LABEL: Record<string, string> = {
  hotel: "Hotel",
  hostal: "Hostal",
  glamping: "Glamping / Cabaña",
  centro_turistico: "Centro turístico",
  finca: "Finca",
  restaurante: "Restaurante",
  bar: "Bar",
  actividad: "Actividad / Tour",
};

const TIPOS = [
  { value: "", label: "Sin preferencia", Icon: Compass },
  { value: "hotel", label: "Hotel", tipo: "hotel" },
  { value: "hostal", label: "Hostal", tipo: "hostal" },
  { value: "glamping", label: "Glamping / Cabaña", tipo: "glamping" },
  { value: "centro_turistico", label: "Centro turístico", tipo: "centro_turistico" },
  { value: "finca", label: "Finca", tipo: "finca" },
  { value: "restaurante", label: "Restaurante", tipo: "restaurante" },
  { value: "bar", label: "Bar", tipo: "bar" },
  { value: "actividad", label: "Actividad / Tour", tipo: "actividad" },
];

const HOSPEDAJE = ["hotel", "hostal", "glamping", "centro_turistico", "finca"];

type Contexto = "hospedaje" | "restaurante" | "bar" | "actividad";

function contextoDe(tipo: string): Contexto {
  if (tipo === "restaurante") return "restaurante";
  if (tipo === "bar") return "bar";
  if (tipo === "actividad") return "actividad";
  return "hospedaje";
}

const PLANES = [
  { value: "descanso", label: "Descanso", Icon: Armchair, ctx: ["hospedaje", "bar"] },
  { value: "aventura", label: "Aventura", Icon: Mountain, ctx: ["hospedaje", "actividad"] },
  { value: "romance", label: "Romance", Icon: Heart, ctx: ["hospedaje", "restaurante", "bar"] },
  { value: "familia", label: "Familia", Icon: Users, ctx: ["hospedaje", "restaurante", "actividad"] },
  { value: "naturaleza", label: "Naturaleza", Icon: Leaf, ctx: ["hospedaje", "actividad"] },
  { value: "cafe", label: "Cultura cafetera", Icon: Coffee, ctx: ["hospedaje", "actividad"] },
] as const;

const EXTRAS = [
  { value: "piscina", label: "Piscina", Icon: Waves, ctx: ["hospedaje"] },
  { value: "wifi", label: "Wifi", Icon: Wifi, ctx: ["hospedaje", "restaurante", "bar"] },
  { value: "cocina", label: "Cocina", Icon: CookingPot, ctx: ["hospedaje"] },
  { value: "parqueadero", label: "Parqueadero", Icon: Car, ctx: ["hospedaje", "restaurante", "bar", "actividad"] },
  { value: "desayuno", label: "Desayuno", Icon: Croissant, ctx: ["hospedaje", "restaurante", "actividad"] },
  { value: "chimenea", label: "Chimenea", Icon: Flame, ctx: ["hospedaje"] },
  { value: "jacuzzi", label: "Jacuzzi", Icon: Bath, ctx: ["hospedaje"] },
  { value: "vista", label: "Vista", Icon: Sunrise, ctx: ["hospedaje", "restaurante", "bar", "actividad"] },
  { value: "seguro", label: "Seguro", Icon: ShieldCheck, ctx: ["hospedaje", "actividad"] },
] as const;

const PRESUPUESTOS: Record<Contexto, { value: string; label: string; desc: string }[]> = {
  hospedaje: [
    { value: "", label: "Sin límite", desc: "Muéstrame todo" },
    { value: "120000", label: "Económico", desc: "Hasta $120.000 / noche" },
    { value: "250000", label: "Medio", desc: "Hasta $250.000 / noche" },
    { value: "400000", label: "Cómodo", desc: "Hasta $400.000 / noche" },
  ],
  restaurante: [
    { value: "", label: "Sin límite", desc: "Muéstrame todo" },
    { value: "20000", label: "Económico", desc: "Hasta $20.000 / persona" },
    { value: "35000", label: "Medio", desc: "Hasta $35.000 / persona" },
    { value: "60000", label: "Cómodo", desc: "Hasta $60.000 / persona" },
  ],
  bar: [
    { value: "", label: "Sin límite", desc: "Muéstrame todo" },
    { value: "15000", label: "Económico", desc: "Hasta $15.000 / persona" },
    { value: "30000", label: "Medio", desc: "Hasta $30.000 / persona" },
    { value: "50000", label: "Cómodo", desc: "Hasta $50.000 / persona" },
  ],
  actividad: [
    { value: "", label: "Sin límite", desc: "Muéstrame todo" },
    { value: "35000", label: "Económico", desc: "Hasta $35.000 / persona" },
    { value: "60000", label: "Medio", desc: "Hasta $60.000 / persona" },
    { value: "100000", label: "Cómodo", desc: "Hasta $100.000 / persona" },
  ],
};

const TITULO_GRUPO: Record<Contexto, { titulo: string; adulto: string; adultoHint: string }> = {
  hospedaje: { titulo: "¿Quiénes viajan?", adulto: "Adultos", adultoHint: "Mayores de 12 años" },
  restaurante: { titulo: "¿Cuántos comensales?", adulto: "Adultos", adultoHint: "Inclúyete en la cuenta" },
  bar: { titulo: "¿Quiénes salen?", adulto: "Personas", adultoHint: "Mayores de edad" },
  actividad: { titulo: "¿Quiénes van al tour?", adulto: "Adultos", adultoHint: "Mayores de 12 años" },
};

function Counter({ label, hint, value, setValue, min, max }: {
  label: string; hint: string; value: number;
  setValue: (v: number) => void; min: number; max: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setValue(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border text-lg hover:bg-muted"
        >−</button>
        <span className="w-6 text-center font-semibold">{value}</span>
        <button
          onClick={() => setValue(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border text-lg hover:bg-muted"
        >+</button>
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 85) return "bg-green-500";
  if (score >= 65) return "bg-yellow-500";
  return "bg-gray-400";
}

function scoreBadge(score: number) {
  if (score >= 90)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
        <Gem className="h-3.5 w-3.5" /> Coincidencia perfecta
      </span>
    );
  if (score >= 75)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> Ideal para ti
      </span>
    );
  if (score >= 55)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
        <ThumbsUp className="h-3.5 w-3.5" /> Buena opción
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <Search className="h-3.5 w-3.5" /> Alternativa
    </span>
  );
}

export default function BusquedaInteligentePage() {
  const [step, setStep] = useState(0);
  const [adultos, setAdultos] = useState(2);
  const [ninos, setNinos] = useState(0);
  const [mascotas, setMascotas] = useState(false);
  const [habitaciones, setHabitaciones] = useState(0);
  const [banos, setBanos] = useState(0);
  const [tipo, setTipo] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [planes, setPlanes] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [textoLibre, setTextoLibre] = useState("");
  const [opciones, setOpciones] = useState<{ tipos: { tipo: string; total: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartSearchResponse | null>(null);
  const [view, setView] = useState<"form" | "results">("form");
  const [restored, setRestored] = useState(false);

  const ctx = contextoDe(tipo);
  const isHospedaje = ctx === "hospedaje";
  const STEPS = isHospedaje
    ? ["Tipo", "Viajeros", "Espacio", "Presupuesto", "Plan", "Extras", "Cuéntanos"]
    : ["Tipo", "Grupo", "Presupuesto", "Intereses", "Extras", "Cuéntanos"];
  const lastStep = STEPS.length - 1;

  // Opciones vivas del catálogo: el cuestionario crece con la oferta
  useEffect(() => {
    fetch(`${API}/busqueda/opciones`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOpciones(d))
      .catch(() => {});
  }, []);

  const conteoTipo = (v: string) => opciones?.tipos.find((t) => t.tipo === v)?.total;
  // Sin opciones aún: todo visible. Con catálogo: solo tipos con oferta (escalable).
  const tiposVisibles = !opciones
    ? TIPOS
    : TIPOS.filter((t) => t.value === "" || (conteoTipo(t.value) || 0) > 0);

  // Restaurar última búsqueda (respuestas + resultados) al volver a la página
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setAdultos(saved.adultos ?? 2);
        setNinos(saved.ninos ?? 0);
        setMascotas(!!saved.mascotas);
        setHabitaciones(saved.habitaciones ?? 0);
        setBanos(saved.banos ?? 0);
        setTipo(saved.tipo ?? "");
        setPresupuesto(saved.presupuesto ?? "");
        setPlanes(saved.planes ?? []);
        setExtras(saved.extras ?? []);
        setTextoLibre(saved.textoLibre ?? "");
        if (saved.result) {
          setResult(saved.result);
          setView("results");
        }
      }
    } catch {}
    setRestored(true);
  }, []);

  const persist = (res: SmartSearchResponse) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        adultos, ninos, mascotas, habitaciones, banos,
        tipo, presupuesto, planes, extras, textoLibre, result: res,
      }));
    } catch {}
  };

  const toggle = (list: string[], setList: (v: string[]) => void, v: string) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const buscar = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/busqueda/ancestral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adultos,
          ninos: ctx === "bar" ? 0 : ninos,
          llevaMascotas: isHospedaje || ctx === "bar" ? mascotas : false,
          habitacionesMin: isHospedaje ? habitaciones : 0,
          banosMin: isHospedaje ? banos : 0,
          tipo: tipo || null,
          presupuestoMax: presupuesto ? Number(presupuesto) : null,
          planes, extras,
          textoLibre: textoLibre.trim() || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      setView("results");
      persist(data);
    } catch {
      const empty = { total: 0, results: [] };
      setResult(empty);
      setView("results");
    } finally {
      setLoading(false);
    }
  };

  const modificar = () => setView("form");

  const reiniciar = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setStep(0); setResult(null); setView("form");
    setAdultos(2); setNinos(0); setMascotas(false);
    setHabitaciones(0); setBanos(0); setTipo("");
    setPresupuesto(""); setPlanes([]); setExtras([]); setTextoLibre("");
  };

  const grupo = TITULO_GRUPO[ctx];
  const planesVisibles = PLANES.filter((p) => (p.ctx as readonly string[]).includes(ctx));
  const extrasVisibles = EXTRAS.filter((e) => (e.ctx as readonly string[]).includes(ctx));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-2 text-center">
        <h1 className="flex items-center justify-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Brain className="h-8 w-8 text-primary" /> Zemisqua
        </h1>
        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Buscador ancestral</p>
        <p className="mt-2 text-muted-foreground">
          Responde y te encontramos: el cuestionario se arma con la oferta viva del sitio y tu
          descripción se cruza con la documentación de la finca
        </p>
      </div>

      {/* Progreso */}
      {view === "form" && (
        <div className="mb-8 mt-6">
          <div className="flex justify-between gap-1 overflow-x-auto text-[10px] text-muted-foreground sm:text-xs">
            {STEPS.map((s, i) => (
              <span key={`${s}-${i}`} className={`whitespace-nowrap ${i <= step ? "font-semibold text-primary" : ""}`}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((Math.min(step, lastStep) + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {restored && view === "form" && !loading && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {/* Paso 0: tipo (siempre primero) */}
          {step === 0 && (
            <div>
              <h2 className="mb-1 text-xl font-semibold">¿Qué estás buscando?</h2>
              <p className="mb-4 text-sm text-muted-foreground">El cuestionario se adapta a tu elección</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tiposVisibles.map((t) => (
                  <button
                    key={t.value || "todas"}
                    onClick={() => setTipo(t.value)}
                    className={`rounded-xl border p-4 text-center ${tipo === t.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                  >
                    <span className="flex justify-center text-primary">
                      {"tipo" in t ? <TipoIcon tipo={(t as any).tipo} className="h-8 w-8" /> : <Compass className="h-8 w-8" />}
                    </span>
                    <p className="mt-1 text-sm font-medium">{t.label}</p>
                    {t.value !== "" && conteoTipo(t.value) !== undefined && (
                      <p className="text-[11px] text-muted-foreground">
                        {conteoTipo(t.value)} {conteoTipo(t.value) === 1 ? "opción" : "opciones"}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Viajeros / Grupo */}
          {step === 1 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">{grupo.titulo}</h2>
              <div className="space-y-3">
                <Counter label={grupo.adulto} hint={grupo.adultoHint} value={adultos} setValue={setAdultos} min={1} max={30} />
                {ctx !== "bar" && (
                  <Counter label="Niños" hint="Menores de 12 años" value={ninos} setValue={setNinos} min={0} max={10} />
                )}
                {(isHospedaje || ctx === "bar") && (
                  <button
                    onClick={() => setMascotas(!mascotas)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 ${mascotas ? "border-primary bg-primary/5" : ""}`}
                  >
                    <div className="text-left">
                      <p className="flex items-center gap-1.5 font-medium">
                        <PawPrint className="h-4 w-4" /> ¿Van mascotas?
                      </p>
                      <p className="text-sm text-muted-foreground">Perro, gato u otra mascota</p>
                    </div>
                    <span className={`relative h-6 w-11 rounded-full transition-colors ${mascotas ? "bg-primary" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${mascotas ? "left-[22px]" : "left-0.5"}`} />
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Espacio (solo hospedaje) */}
          {isHospedaje && step === 2 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">¿Cuánto espacio necesitas?</h2>
              <div className="space-y-3">
                <Counter label="Habitaciones" hint="Mínimo (0 = no importa)" value={habitaciones} setValue={setHabitaciones} min={0} max={10} />
                <Counter label="Baños" hint="Mínimo (0 = no importa)" value={banos} setValue={setBanos} min={0} max={5} />
              </div>
            </div>
          )}

          {/* Presupuesto */}
          {((isHospedaje && step === 3) || (!isHospedaje && step === 2)) && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">
                ¿Presupuesto{isHospedaje ? " por noche" : " por persona"}?
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {PRESUPUESTOS[ctx].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPresupuesto(p.value)}
                    className={`rounded-xl border p-4 text-left ${presupuesto === p.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                  >
                    <p className="font-medium">{p.label}</p>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plan / Intereses */}
          {((isHospedaje && step === 4) || (!isHospedaje && step === 3)) && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {isHospedaje ? "¿Cuál es el plan?" : "¿Qué te provoca?"} <span className="text-sm font-normal text-muted-foreground">(elige varios)</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {planesVisibles.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => toggle(planes, setPlanes, p.value)}
                    className={`rounded-xl border p-4 text-center ${planes.includes(p.value) ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                  >
                    <span className="flex justify-center text-primary">
                      <p.Icon className="h-8 w-8" />
                    </span>
                    <p className="mt-1 text-sm font-medium">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extras */}
          {((isHospedaje && step === 5) || (!isHospedaje && step === 4)) && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">Imprescindibles <span className="text-sm font-normal text-muted-foreground">(opcional)</span></h2>
              <div className="grid grid-cols-3 gap-3">
                {extrasVisibles.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => toggle(extras, setExtras, e.value)}
                    className={`rounded-xl border p-3 text-center ${extras.includes(e.value) ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                  >
                    <span className="flex justify-center text-primary">
                      <e.Icon className="h-7 w-7" />
                    </span>
                    <p className="mt-1 text-xs font-medium">{e.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cuéntanos (texto libre contra el RAG) */}
          {step === lastStep && (
            <div>
              <h2 className="mb-1 text-xl font-semibold">Cuéntanos con tus palabras <span className="text-sm font-normal text-muted-foreground">(opcional)</span></h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Zemisqua cruza tu descripción con la documentación de la finca para afinar la recomendación
              </p>
              <textarea
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value.slice(0, 400))}
                placeholder="Ej: quiero desconectarme entre bosque y agua, me encanta el café y voy con mi perro…"
                rows={4}
                className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-lg border px-5 py-2.5 text-sm disabled:opacity-40"
            >
              Atrás
            </button>
            {step < lastStep ? (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={buscar}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Search className="h-4 w-4" /> Encontrar mi lugar ideal
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 font-medium">Analizando tu búsqueda en Tropical Biohostel…</p>
          <p className="mt-1 text-sm text-muted-foreground">Calculando compatibilidad, actividades y servicios</p>
        </div>
      )}

      {view === "results" && result && !loading && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">
              {result.total > 0
                ? `Encontramos ${result.total} opción${result.total === 1 ? "" : "es"} para ti`
                : "Sin resultados con esos requisitos"}
            </h2>
            <div className="flex gap-2">
              <button onClick={modificar} className="flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">
                <Pencil className="h-3.5 w-3.5" /> Modificar búsqueda
              </button>
              <button onClick={reiniciar} className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                <RotateCcw className="h-3.5 w-3.5" /> Nuevo cuestionario
              </button>
            </div>
          </div>
          {result.total === 0 && (
            <div className="rounded-2xl border bg-white p-8 text-center text-muted-foreground">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2">Ningún sitio cumple todos los requisitos. Prueba con menos exigencias o más presupuesto.</p>
            </div>
          )}
          {result.mensaje && (
            <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Brain className="h-4 w-4" /> Zemisqua dice
              </p>
              <p className="mt-1.5 leading-relaxed">{result.mensaje}</p>
              {result.fuentes && result.fuentes.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Fuentes: {result.fuentes.join(" · ")}
                </p>
              )}
            </div>
          )}
          <div className="space-y-4">
            {result.results.map((m) => {
              const img = m.propiedad.images?.find((i: any) => i.esPrincipal) || m.propiedad.images?.[0];
              return (
                <a
                  key={m.propiedad.id}
                  href={`/property/${m.propiedad.slug}`}
                  className="block overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative h-48 w-full shrink-0 bg-muted sm:h-auto sm:w-56">
                      {img ? (
                        <img src={img.url} alt={m.propiedad.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground/30">
                          <Home className="h-12 w-12" />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                        {m.compatibilidad}% compatible
                      </span>
                    </div>
                    <div className="flex-1 p-4">
                      <div>{scoreBadge(m.compatibilidad)}</div>
                      <h3 className="mt-0.5 text-lg font-semibold">{m.propiedad.nombre}</h3>
                      <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                        <span>{m.propiedad.tipo.replace("_", " ")} · {m.propiedad.ciudad || m.propiedad.ubicacion} · ${Number(m.propiedad.precioNoche).toLocaleString("es-CO")} {unidadPrecio(m.propiedad.tipo)}</span>
                        {m.totalReviews > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            {`${m.ratingPromedio} (${m.totalReviews})`}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${scoreColor(m.compatibilidad)}`} style={{ width: `${m.compatibilidad}%` }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.motivos.map((mot) => (
                          <span key={mot} className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                            <Check className="h-3 w-3" /> {mot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
        <strong>Zemisqua</strong> — del muysccubun, lengua muisca de Cundinamarca y Boyacá:{" "}
        <em>zemisqua</em> = “buscar” (muysca.cubun.org, mss. 158 y 2922). Un buscador con raíz ancestral.
      </p>
    </div>
  );
}
