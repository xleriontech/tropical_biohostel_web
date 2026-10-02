"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileJson,
  FileSpreadsheet,
  Globe,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type Formato = "json" | "csv" | "texto";

interface FilaPreview {
  index: number;
  datos: any;
  slug: string | null;
  accion: "crear" | "actualizar" | "duplicado";
  existente: { id: string; nombre: string; slug: string } | null;
  errores: string[];
  agregado?: string[];
}

const EJEMPLOS: Record<Formato, string> = {
  json: `[
  {
    "nombre": "Habitación Deluxe Tropical",
    "tipo": "hotel",
    "descripcion": "Hotel familiar con piscina y restaurante típico.",
    "direccion": "Calle 4 # 2-30",
    "telefono": "+57 601 555 0101",
    "precio": 135000,
    "capacidad": 10,
    "habitaciones": 6,
    "actividades": "piscina, senderismo"
  },
  {
    "nombre": "Bar El Mirador",
    "tipo": "bar",
    "descripcion": "Bar con vista panorámica y cócteles artesanales.",
    "precio": "25000",
    "mascotas": "no"
  }
]`,
  csv: `nombre;tipo;descripcion;precio;telefono;actividades
Habitación Deluxe Tropical;hotel;Habitación doble con vista al jardín;135000;+57 601 555 0101;piscina, senderismo
Bar El Mirador;bar;Bar con vista panoramica;25000;;musica, cocteles`,
  texto: `Pega aquí texto copiado de Google, Booking, redes sociales, etc.
Ejemplo: "Restaurante Doña Juana aquí, comida típica, menú del día a 18000,
tel 311 222 3344, atiende todos los días..."

NOTA: el texto libre necesita un proveedor de IA activo
(Proveedores IA). Sin IA, usa JSON o CSV.`,
};

const TIPOS_SCRAPE = [
  { value: "hotel", label: "Hoteles" },
  { value: "hostal", label: "Hostales" },
  { value: "glamping", label: "Glamping" },
  { value: "centro_turistico", label: "Centros" },
  { value: "restaurante", label: "Restaurantes" },
  { value: "bar", label: "Bares" },
  { value: "finca", label: "Fincas" },
  { value: "actividad", label: "Actividades" },
];

function accionBadge(accion: string) {
  if (accion === "crear")
    return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-800">Nuevo</span>;
  if (accion === "actualizar")
    return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">Actualiza existente</span>;
  return <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-800">Posible duplicado</span>;
}

export default function AlimentacionPage() {
  const [modo, setModo] = useState<"pegar" | "scrapear">("pegar");
  const [formato, setFormato] = useState<Formato>("json");
  const [municipio, setMunicipio] = useState("");
  const [departamento, setDepartamento] = useState("Cundinamarca");
  const [tiposScrape, setTiposScrape] = useState<string[]>([]);
  const [contenido, setContenido] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [enriqueciendo, setEnriqueciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaPreview[]>([]);
  const [acciones, setAcciones] = useState<Record<number, "crear" | "actualizar" | "omitir">>({});
  const [publicar, setPublicar] = useState(true);
  const [resultado, setResultado] = useState<any>(null);
  const [verif, setVerif] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [verificando, setVerificando] = useState(false);
  const [googleKey, setGoogleKey] = useState("");
  const [googleGuardada, setGoogleGuardada] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") || "" : "");
  const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const aplicarFilas = (rows: FilaPreview[]) => {
    setFilas(rows);
    const init: Record<number, "crear" | "actualizar" | "omitir"> = {};
    for (const r of rows) {
      init[r.index] = r.accion === "duplicado" ? "omitir" : r.accion === "actualizar" ? "actualizar" : "crear";
    }
    setAcciones(init);
  };

  const toggle = (list: string[], setList: (v: string[]) => void, v: string) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const analizar = async () => {
    if (!contenido.trim()) return;
    setAnalizando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch(`${API}/admin/ingestion/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ formato, contenido, municipio: municipio.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      aplicarFilas(data.rows || []);
    } catch (e: any) {
      setError(e?.message || "No se pudo analizar");
      setFilas([]);
    } finally {
      setAnalizando(false);
    }
  };

  const scrapear = async () => {
    if (!municipio.trim()) return;
    setAnalizando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch(`${API}/admin/ingestion/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          municipio: municipio.trim(),
          departamento: departamento.trim() || "",
          tipos: tiposScrape,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      aplicarFilas(data.rows || []);
      setPublicar(false); // lo scrapeado entra a revisión (borrador)
    } catch (e: any) {
      setError(e?.message || "No se pudo completar el scraping");
      setFilas([]);
    } finally {
      setAnalizando(false);
    }
  };

  const ejecutar = async () => {
    setEjecutando(true);
    setError(null);
    try {
      const items = filas.map((f) => ({
        datos: f.datos,
        accion: acciones[f.index] || "omitir",
        slugObjetivo: f.existente?.slug,
      }));
      const res = await fetch(`${API}/admin/ingestion/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ items, publicarNuevos: publicar }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      setResultado(data);
    } catch (e: any) {
      setError(e?.message || "No se pudo ejecutar");
    } finally {
      setEjecutando(false);
    }
  };

  const reiniciar = () => {
    setFilas([]); setAcciones({}); setResultado(null); setError(null); setContenido("");
  };

  useEffect(() => {
    cargarVerificacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarVerificacion = async () => {
    try {
      const [e, h, s] = await Promise.all([
        fetch(`${API}/admin/ingestion/estado`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API}/admin/ingestion/actualizaciones?estado=pendiente`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API}/admin/claves/estado`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()).catch(() => ({})),
      ]);
      setVerif(e);
      setLogs(Array.isArray(h) ? h : []);
      setGoogleGuardada(!!s?.google_places);
    } catch {}
  };

  const verificarAhora = async () => {
    setVerificando(true);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/ingestion/verificar`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ municipio: municipio.trim() || "", departamento: departamento.trim() || "" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      await cargarVerificacion();
    } catch (e: any) {
      setError(e?.message || "No se pudo verificar");
    } finally {
      setVerificando(false);
    }
  };

  const resolverLog = async (id: string, accion: "aplicado" | "descartado" | "archivar") => {
    try {
      const res = await fetch(`${API}/admin/ingestion/actualizaciones/${id}/resolver`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ accion }),
      });
      if (!res.ok) throw new Error("No se pudo resolver");
      setLogs(logs.filter((l) => l.id !== id));
    } catch (e: any) {
      setError(e?.message || "No se pudo resolver");
    }
  };

  const enriquecerGoogle = async () => {
    if (filas.length === 0) return;
    setEnriqueciendo(true);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/ingestion/google`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ rows: filas.map((f) => ({ datos: f.datos })), apiKey: googleKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      const nuevas: FilaPreview[] = (data.rows || []).map((r: any, i: number) => ({
        ...filas[i],
        datos: r.datos,
        agregado: [...(filas[i].agregado || []), ...(r.agregado || [])],
      }));
      setFilas(nuevas);
      if (data.enriquecidos === 0) setError("Google no aportó datos nuevos para estas filas.");
    } catch (e: any) {
      setError(e?.message || "No se pudo enriquecer con Google");
    } finally {
      setEnriqueciendo(false);
    }
  };

  const conWeb = filas.filter((f) => f.datos?.website).length;

  const enriquecer = async () => {
    if (filas.length === 0) return;
    setEnriqueciendo(true);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/ingestion/enriquecer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ rows: filas.map((f) => ({ datos: f.datos })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      const nuevas: FilaPreview[] = (data.rows || []).map((r: any, i: number) => ({
        ...filas[i],
        datos: r.datos,
        agregado: r.agregado || [],
      }));
      setFilas(nuevas);
      setResultado(null);
      if (data.enriquecidos === 0) {
        setError("Las webs no aportaron datos nuevos (sitios sin web pública o sin precios visibles).");
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo enriquecer");
    } finally {
      setEnriqueciendo(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Database className="h-6 w-6 text-primary" /> Alimentación de datos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pega información actualizada de hoteles, hostales, glampings, bares, restaurantes,
          fincas y actividades del municipio. El motor la cruza con lo existente y crea o actualiza sitios reales.
        </p>
      </div>

      {/* Entrada */}
      <div className="mb-4 flex gap-1 rounded-xl border bg-secondary/30 p-1 w-fit">
        <button
          onClick={() => setModo("pegar")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            modo === "pegar" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pegar datos
        </button>
        <button
          onClick={() => setModo("scrapear")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            modo === "scrapear" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4" /> Scrapear municipio
        </button>
      </div>

      {modo === "scrapear" && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold">Buscar sitios reales en OpenStreetMap</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sin API keys: ubica el municipio y trae hoteles, restaurantes, bares y
            atractivos registrados (nombre, coordenadas, teléfono y web cuando existen).
            Revisa la previsualización antes de importar.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Municipio *</label>
              <input
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Municipio"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Departamento</label>
              <input
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Cundinamarca"
              />
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Tipos a buscar <span className="font-normal text-muted-foreground">(vacío = todos)</span></p>
            <div className="flex flex-wrap gap-2">
              {TIPOS_SCRAPE.map((t) => (
                <button
                  key={t.value}
                  onClick={() => toggle(tiposScrape, setTiposScrape, t.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    tiposScrape.includes(t.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={scrapear}
              disabled={analizando || !municipio.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Globe className="h-4 w-4" /> {analizando ? "Buscando en el mapa..." : "Buscar sitios del municipio"}
            </button>
          </div>
        </div>
      )}

      {modo === "pegar" && (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl border bg-secondary/30 p-1">
            {([
              { v: "json", label: "JSON", Icon: FileJson },
              { v: "csv", label: "CSV", Icon: FileSpreadsheet },
              { v: "texto", label: "Texto libre", Icon: Type },
            ] as const).map((t) => (
              <button
                key={t.v}
                onClick={() => setFormato(t.v)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  formato === t.v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.Icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Municipio:</label>
            <input
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="w-40 rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Municipio"
            />
          </div>
          <button
            onClick={() => setContenido(EJEMPLOS[formato])}
            className="ml-auto rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Cargar ejemplo
          </button>
        </div>

        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={10}
          placeholder={formato === "json" ? "Pega un arreglo JSON de sitios..." : formato === "csv" ? "Pega CSV con encabezados..." : "Pega texto con la información de los sitios..."}
          className="w-full rounded-xl border border-input bg-white px-4 py-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring min-h-[220px] resize-y"
        />

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {(filas.length > 0 || resultado) && (
            <button onClick={reiniciar} className="flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm hover:bg-muted">
              <RotateCcw className="h-4 w-4" /> Limpiar
            </button>
          )}
          <button
            onClick={analizar}
            disabled={analizando || !contenido.trim()}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {analizando ? "Analizando..." : "Analizar datos"}
          </button>
        </div>
      </div>
      )}

      {/* Previsualización */}
      {filas.length > 0 && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Previsualización ({filas.length} sitios detectados)</h2>
            <div className="flex flex-wrap items-center gap-3">
              {conWeb > 0 && (
                <button
                  onClick={enriquecer}
                  disabled={enriqueciendo}
                  title="Visita la web de cada sitio para completar descripción, precios, contacto y fotos"
                  className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {enriqueciendo ? "Enriqueciendo..." : `Enriquecer (${conWeb} con web)`}
                </button>
              )}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} />
                Publicar nuevos inmediatamente (si no, quedan en borrador)
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Sitio</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Precio</th>
                  <th className="px-3 py-2">Cruce</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.index} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{f.datos.nombre || <span className="text-red-500">(sin nombre)</span>}</p>
                      <p className="text-xs text-muted-foreground">{f.datos.ciudad || municipio}{f.datos.telefono ? ` · ${f.datos.telefono}` : ""}{f.datos.coordenadas ? " · GPS" : ""}{f.datos.fuenteWeb ? ` · ${f.datos.fuenteWeb}` : f.datos.website ? " · web" : ""}</p>
                      {f.errores.length > 0 && (
                        <p className="mt-1 text-xs text-red-600">{f.errores.join(" ")}</p>
                      )}
                      {f.existente && (
                        <p className="mt-1 text-xs text-blue-600">Existe: {f.existente.nombre}</p>
                      )}
                      {(f.agregado?.length || 0) > 0 && (
                        <p className="mt-1 text-xs font-medium text-green-700">
                          Enriquecido: {f.agregado!.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 capitalize">{(f.datos.tipo || "—").replace("_", " ")}</td>
                    <td className="px-3 py-2.5">${Number(f.datos.precioNoche || 0).toLocaleString("es-CO")}</td>
                    <td className="px-3 py-2.5">{accionBadge(f.accion)}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={acciones[f.index] || "omitir"}
                        onChange={(e) => setAcciones({ ...acciones, [f.index]: e.target.value as any })}
                        className="rounded-lg border border-input bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="crear">Crear nuevo</option>
                        <option value="actualizar">Actualizar existente</option>
                        <option value="omitir">Omitir</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={ejecutar}
              disabled={ejecutando}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> {ejecutando ? "Importando..." : "Ejecutar importación"}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5 text-green-600" /> Importación completada
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{resultado.creados}</p>
              <p className="text-xs text-green-600">creados</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{resultado.actualizados}</p>
              <p className="text-xs text-blue-600">actualizados</p>
            </div>
            <div className="rounded-lg bg-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{resultado.omitidos}</p>
              <p className="text-xs text-gray-500">omitidos</p>
            </div>
          </div>
          {resultado.errores?.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-red-600">
              {resultado.errores.map((e: string, i: number) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}
      {/* Verificación continua */}
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verificación continua
          </h2>
          <button
            onClick={() => { cargarVerificacion(); }}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Actualizar estado
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          El sistema re-verifica el municipio a diario contra el mapa: detecta sitios nuevos,
          cambios de datos y posibles cierres. Nada se publica ni se borra solo.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={verificarAhora}
            disabled={verificando}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {verificando ? "Verificando municipio..." : `Verificar ${municipio || "municipio"} ahora`}
          </button>
          {verif && (
            <span className="text-sm text-muted-foreground">
              {verif.sinVerificar} sitios publicados sin verificar hace {verif.dias}+ días · {logs.length} hallazgos pendientes
            </span>
          )}
        </div>

        {logs.length > 0 && (
          <div className="mt-4 space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  l.tipo === "posible_cierre" ? "bg-red-100 text-red-800"
                  : l.tipo === "nuevo" ? "bg-green-100 text-green-800"
                  : l.tipo === "cambio" ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-700"
                }`}>
                  {l.tipo === "posible_cierre" ? "Posible cierre" : l.tipo === "nuevo" ? "Nuevo" : l.tipo === "cambio" ? "Cambio" : "Revisión"}
                </span>
                <span className="min-w-0 flex-1">{l.titulo}</span>
                <span className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleDateString("es-CO")}</span>
                <div className="flex gap-1.5">
                  {l.tipo === "posible_cierre" ? (
                    <>
                      <button onClick={() => resolverLog(l.id, "archivar")} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50">
                        Archivar sitio
                      </button>
                      <button onClick={() => resolverLog(l.id, "descartado")} className="rounded-lg border border-input px-2.5 py-1 text-xs hover:bg-muted">
                        Sigue abierto
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => resolverLog(l.id, "aplicado")} className="rounded-lg border border-input px-2.5 py-1 text-xs hover:bg-muted">
                        Revisado
                      </button>
                      <button onClick={() => resolverLog(l.id, "descartado")} className="rounded-lg border border-input px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                        Descartar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 border-t pt-4">
          <p className="mb-2 text-sm font-medium">
            Enriquecer con Google Places{" "}
            {googleGuardada ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">key guardada ✓</span>
            ) : (
              <a href="/admin/claves" className="text-xs font-normal text-primary hover:underline">configúrala en Claves API</a>
            )}
            <span className="block font-normal text-muted-foreground">(opcional: rating, horario y teléfono de Google)</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              type="password"
              placeholder={googleGuardada ? "Vacío = usar la guardada (o pega otra para esta vez)" : "Pega tu Google Places API key (solo esta vez)"}
              className="flex-1 rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={enriquecerGoogle}
              disabled={enriqueciendo || filas.length === 0 || (!googleKey.trim() && !googleGuardada)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {enriqueciendo ? "Consultando Google..." : "Enriquecer filas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
