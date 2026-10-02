"use client";

import { useEffect, useRef } from "react";

const DEFAULT_CENTER: [number, number] = [5.0697, -74.3805];

function loadLeafletCSS() {
  if (document.getElementById("leaflet-css")) return;
  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

export default function MapPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const iniciando = useRef(false);
  const parts = value.split(",").map(Number);
  const hasCoords = parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]);
  const center: [number, number] = hasCoords ? [parts[0], parts[1]] : DEFAULT_CENTER;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || iniciando.current) return;
    iniciando.current = true;
    loadLeafletCSS();

    const initMap = async () => {
      try {
        if (!mapRef.current) return;
        const L = await import("leaflet");
        if (!mapRef.current || mapInstance.current) return;

        if ((mapRef.current as any)._leaflet_id) {
          mapRef.current.innerHTML = "";
          delete (mapRef.current as any)._leaflet_id;
        }

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current!).setView(center, 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker(center, { draggable: true }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(`${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`);
        });

        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          onChange(`${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`);
        });

        mapInstance.current = map;
        markerRef.current = marker;
        // El contenedor puede haber cambiado de tamaño al abrir la pestaña
        setTimeout(() => {
          try { map.invalidateSize(); } catch {}
        }, 150);
      } catch {
        // Si Leaflet falla, el formulario sigue funcionando sin mapa
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return;
    if (!hasCoords) return;
    const newCenter: [number, number] = [parts[0], parts[1]];
    markerRef.current.setLatLng(newCenter);
    mapInstance.current.setView(newCenter, mapInstance.current.getZoom());
  }, [value]);

  return (
    <div>
      <div ref={mapRef} className="h-64 w-full rounded-xl border" />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Haz clic en el mapa o arrastra el pin para ubicar la propiedad
      </p>
    </div>
  );
}
