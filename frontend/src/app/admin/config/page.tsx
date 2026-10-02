"use client";

import { useEffect, useState } from "react";
import { Images, Megaphone, Palette } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import { absoluteUrl } from "@/lib/api-base";

interface ParallaxImage {
  url: string;
  alt: string;
}

interface ParallaxConfig {
  images: ParallaxImage[];
  intervalSeconds: number;
  transitionMode: "fade" | "slide" | "zoom";
  transitionDuration: number;
}

interface AdDisplayFormat {
  format: "horizontal" | "vertical" | "sidebar";
  showWithParallax: boolean;
}

interface AdsDisplayConfig {
  HOME_BANNER: AdDisplayFormat;
  SEARCH_RESULTS_TOP: AdDisplayFormat;
  SEARCH_RESULTS_SIDEBAR: AdDisplayFormat;
  PROPERTY_DETAIL: AdDisplayFormat;
}

const TRANSITION_MODES = [
  { value: "fade", label: "Desvanecer", desc: "Transición suave de opacidad entre imágenes" },
  { value: "slide", label: "Deslizar", desc: "La imagen actual se desliza hacia la izquierda mientras entra la nueva" },
  { value: "zoom", label: "Zoom", desc: "Efecto de acercamiento mientras transiciona" },
];

const PLACEMENTS_LIST = [
  { key: "HOME_BANNER", label: "Banner Principal" },
  { key: "SEARCH_RESULTS_TOP", label: "Resultados de Búsqueda (Top)" },
  { key: "SEARCH_RESULTS_SIDEBAR", label: "Resultados de Búsqueda (Sidebar)" },
  { key: "PROPERTY_DETAIL", label: "Detalle de Propiedad" },
];

const FORMAT_OPTIONS = [
  { value: "horizontal", label: "Horizontal", desc: "Banner ancho completo" },
  { value: "vertical", label: "Vertical", desc: "Banner estrecho vertical" },
  { value: "sidebar", label: "Sidebar", desc: "Panel lateral" },
];

const getToken = () => localStorage.getItem("token");

export default function AdminConfigPage() {
  const [activeTab, setActiveTab] = useState<string>("parallax");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Parallax state
  const [parallax, setParallax] = useState<ParallaxConfig>({
    images: [],
    intervalSeconds: 5,
    transitionMode: "fade",
    transitionDuration: 600,
  });
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [parallaxLoading, setParallaxLoading] = useState(true);

  // Ads Display state
  const [adsDisplay, setAdsDisplay] = useState<AdsDisplayConfig>({
    HOME_BANNER: { format: "horizontal", showWithParallax: false },
    SEARCH_RESULTS_TOP: { format: "horizontal", showWithParallax: false },
    SEARCH_RESULTS_SIDEBAR: { format: "vertical", showWithParallax: false },
    PROPERTY_DETAIL: { format: "sidebar", showWithParallax: false },
  });
  const [adsLoading, setAdsLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/parallax`)
      .then((res) => res.ok ? res.json() : {})
      .then((data: any) => {
        if (data?.images) setParallax((p) => ({ ...p, images: data.images }));
        if (data?.intervalSeconds) setParallax((p) => ({ ...p, intervalSeconds: data.intervalSeconds }));
        if (data?.transitionMode) setParallax((p) => ({ ...p, transitionMode: data.transitionMode }));
        if (data?.transitionDuration) setParallax((p) => ({ ...p, transitionDuration: data.transitionDuration }));
      })
      .catch(() => {})
      .finally(() => setParallaxLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/ads-display`)
      .then((res) => res.ok ? res.json() : {})
      .then((data: any) => {
        if (data && Object.keys(data).length > 0) {
          setAdsDisplay((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {})
      .finally(() => setAdsLoading(false));
  }, []);

  const saveMessage = (text: string, isError = false) => {
    setMessage(isError ? `Error: ${text}` : text);
    setTimeout(() => setMessage(""), 4000);
  };

  const saveParallax = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/parallax`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(parallax),
      });
      if (res.ok) saveMessage("Configuración de parallax guardada");
      else saveMessage("Error al guardar parallax", true);
    } catch {
      saveMessage("Error de conexión", true);
    }
    setSaving(false);
  };

  const saveAdsDisplay = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/ads-display`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(adsDisplay),
      });
      if (res.ok) saveMessage("Configuración de anuncios guardada");
      else saveMessage("Error al guardar anuncios", true);
    } catch {
      saveMessage("Error de conexión", true);
    }
    setSaving(false);
  };

  const addImage = () => {
    if (!newUrl.trim()) return;
    setParallax((p) => ({ ...p, images: [...p.images, { url: newUrl.trim(), alt: newAlt.trim() }] }));
    setNewUrl("");
    setNewAlt("");
  };

  const removeImage = (index: number) => {
    setParallax((p) => ({ ...p, images: p.images.filter((_, i) => i !== index) }));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= parallax.images.length) return;
    const updated = [...parallax.images];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setParallax((p) => ({ ...p, images: updated }));
  };

  const updatePlacementFormat = (key: string, field: keyof AdDisplayFormat, value: any) => {
    setAdsDisplay((prev) => ({
      ...prev,
      [key]: { ...prev[key as keyof AdsDisplayConfig], [field]: value },
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configuración del Sitio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Administra la apariencia y el comportamiento del sitio</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border bg-secondary/30 p-1 w-fit">
        {[
          { id: "parallax", label: "Parallax", Icon: Images },
          { id: "ads", label: "Anuncios", Icon: Megaphone },
          { id: "marca", label: "Marca", Icon: Palette },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span><tab.Icon className="h-4 w-4" /></span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Message toast */}
      {message && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
          message.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-green-50 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* ==================== TAB: PARALLAX ==================== */}
      {activeTab === "parallax" && (
        <div>
          {parallaxLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="space-y-6">
              {/* Transition Settings */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-base font-semibold text-foreground">Transiciones</h2>
                <p className="mb-4 text-xs text-muted-foreground">Controla cómo las imágenes de fondo cambian entre sí</p>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Modo de transición</label>
                    <div className="space-y-2">
                      {TRANSITION_MODES.map((mode) => (
                        <label
                          key={mode.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            parallax.transitionMode === mode.value
                              ? "border-primary bg-primary/5"
                              : "border-input hover:border-foreground/20"
                          }`}
                        >
                          <input
                            type="radio"
                            name="transitionMode"
                            value={mode.value}
                            checked={parallax.transitionMode === mode.value}
                            onChange={() => setParallax((p) => ({ ...p, transitionMode: mode.value as ParallaxConfig["transitionMode"] }))}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{mode.label}</p>
                            <p className="text-xs text-muted-foreground">{mode.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Intervalo (segundos): <span className="font-bold text-primary">{parallax.intervalSeconds}s</span>
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={15}
                        value={parallax.intervalSeconds}
                        onChange={(e) => setParallax((p) => ({ ...p, intervalSeconds: Number(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>2s</span>
                        <span>15s</span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Duración de transición: <span className="font-bold text-primary">{parallax.transitionDuration}ms</span>
                      </label>
                      <input
                        type="range"
                        min={200}
                        max={2000}
                        step={100}
                        value={parallax.transitionDuration}
                        onChange={(e) => setParallax((p) => ({ ...p, transitionDuration: Number(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>200ms</span>
                        <span>2000ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-base font-semibold text-foreground">Imágenes de Fondo</h2>
                <p className="mb-4 text-xs text-muted-foreground">Agrega y ordena las imágenes del carrusel de fondo</p>

                <div className="mb-4 flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="URL de la imagen"
                    className="min-w-0 flex-1 rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={newAlt}
                    onChange={(e) => setNewAlt(e.target.value)}
                    placeholder="Texto alternativo"
                    className="w-40 rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={addImage} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 shrink-0">
                    + Agregar
                  </button>
                </div>
                <div className="mb-4">
                  <ImageUploader
                    multiple
                    carpeta="parallax"
                    value={[]}
                    onChange={(v) => {
                      const urls = (Array.isArray(v) ? v : [v]).filter(Boolean);
                      if (urls.length > 0) {
                        setParallax((p) => ({
                          ...p,
                          images: [...p.images, ...urls.map((u) => ({ url: u, alt: "Fondo" }))],
                        }));
                      }
                    }}
                  />
                </div>

                {parallax.images.length > 0 ? (
                  <div className="space-y-2">
                    {parallax.images.map((img, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-input bg-secondary/20 p-2">
                        <img
                          src={absoluteUrl(img.url)}
                          alt={img.alt}
                          className="h-14 w-20 rounded object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm text-foreground">{img.url}</p>
                          <p className="text-xs text-muted-foreground">{img.alt || "Sin descripción"}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => moveImage(i, -1)} disabled={i === 0}
                            className="rounded p-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-30">↑</button>
                          <button onClick={() => moveImage(i, 1)} disabled={i === parallax.images.length - 1}
                            className="rounded p-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-30">↓</button>
                          <button onClick={() => removeImage(i)}
                            className="rounded p-1 text-xs text-destructive hover:bg-destructive/10">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No hay imágenes configuradas. Se usarán imágenes por defecto.
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <button onClick={saveParallax} disabled={saving}
                    className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar Configuración"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: ADS DISPLAY ==================== */}
      {activeTab === "ads" && (
        <div>
          {adsLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-base font-semibold text-foreground">Formato de Anuncios por Ubicación</h2>
                <p className="mb-4 text-xs text-muted-foreground">Configura cómo se muestran los anuncios en cada sección del sitio</p>

                <div className="space-y-4">
                  {PLACEMENTS_LIST.map((pl) => {
                    const config = adsDisplay[pl.key as keyof AdsDisplayConfig];
                    return (
                      <div key={pl.key} className="rounded-lg border border-input bg-secondary/20 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{pl.label}</h3>
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{pl.key}</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Formato de visualización</label>
                            <div className="flex flex-wrap gap-1.5">
                              {FORMAT_OPTIONS.map((fmt) => (
                                <button
                                  key={fmt.value}
                                  onClick={() => updatePlacementFormat(pl.key, "format", fmt.value)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                    config.format === fmt.value
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "border border-input bg-white text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {fmt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={config.showWithParallax}
                                onChange={(e) => updatePlacementFormat(pl.key, "showWithParallax", e.target.checked)}
                                className="peer sr-only"
                              />
                              <div className="h-6 w-11 rounded-full border border-input bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
                            </label>
                            <div>
                              <p className="text-sm font-medium text-foreground">Mostrar con parallax</p>
                              <p className="text-xs text-muted-foreground">Superponer anuncio sobre el carrusel de fondo</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <button onClick={saveAdsDisplay} disabled={saving}
                    className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar Configuración"}
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-base font-semibold text-foreground">Vista Previa de Ubicaciones</h2>
                <p className="mb-4 text-xs text-muted-foreground">Resumen visual de dónde aparecen los anuncios en el sitio</p>
                <div className="space-y-2 text-sm">
                  {PLACEMENTS_LIST.map((pl) => {
                    const config = adsDisplay[pl.key as keyof AdsDisplayConfig];
                    return (
                      <div key={pl.key} className="flex items-center gap-3 rounded-lg border border-input p-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Megaphone className="h-4 w-4" /></span>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{pl.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Formato: <span className="font-medium capitalize">{config.format}</span>
                            {config.showWithParallax && <span className="ml-2 text-primary">· Con parallax</span>}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{pl.key}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: MARCA ==================== */}
      {activeTab === "marca" && (
        <MarcaTab
          onMessage={(t, e) => saveMessage(t, e)}
        />
      )}
    </div>
  );
}

function MarcaTab({ onMessage }: { onMessage: (t: string, e?: boolean) => void }) {
  const [logoUrl, setLogoUrl] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/site-branding`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.logoUrl) setLogoUrl(d.logoUrl);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/site-branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ logoUrl: logoUrl.trim() || null }),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      onMessage("Logo actualizado. Se ve reflejado al recargar el sitio.");
    } catch {
      onMessage("No se pudo guardar el logo.", true);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-foreground">Logo de la plataforma</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Sube una imagen desde tu PC o pega una URL. Aparece en la barra superior, el pie de página y la pestaña del navegador.
      </p>
      <ImageUploader value={logoUrl} onChange={(v) => setLogoUrl(v as string)} carpeta="logo" />
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <button onClick={guardar} disabled={guardando}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar logo"}
        </button>
        {!logoUrl && (
          <span className="text-xs text-muted-foreground">Vacío = se usa el logo original de TROPICAL BIOHOSTEL.</span>
        )}
      </div>
    </div>
  );
}
