"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { absoluteUrl, apiUrl } from "@/lib/api-base";

interface Props {
  value: string | string[];
  onChange: (v: string | string[]) => void;
  carpeta?: string;
  multiple?: boolean;
  label?: string;
}

/**
 * Subida de imágenes: desde el PC (multipart al backend) o pegando URL.
 * Acepta valor simple (string) o múltiple (string[]).
 */
export default function ImageUploader({ value, onChange, carpeta = "general", multiple = false, label }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [modoUrl, setModoUrl] = useState(false);
  const [urlTexto, setUrlTexto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const lista: string[] = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  const emitir = (urls: string[]) => {
    onChange(multiple ? urls : urls[0] || "");
  };

  const subir = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setSubiendo(true);
    try {
      const token = localStorage.getItem("token") || "";
      const nuevas: string[] = [];
      const pendientes = multiple ? [...files] : [files[0]];
      for (const f of pendientes) {
        if (!f.type.startsWith("image/")) throw new Error(`"${f.name}" no es una imagen.`);
        if (f.size > 8 * 1024 * 1024) throw new Error(`"${f.name}" supera 8 MB.`);
        const fd = new FormData();
        fd.append("file", f);
        fd.append("carpeta", carpeta);
        const res = await fetch(`${apiUrl()}/admin/upload/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "No se pudo subir la imagen.");
        if (data?.url) nuevas.push(data.url);
      }
      emitir(multiple ? [...lista, ...nuevas] : nuevas);
    } catch (e: any) {
      setError(e?.message || "No se pudo subir.");
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const agregarUrl = () => {
    const u = urlTexto.trim();
    if (!u) return;
    emitir(multiple ? [...lista, u] : [u]);
    setUrlTexto("");
    setModoUrl(false);
  };

  const quitar = (i: number) => {
    emitir(lista.filter((_, j) => j !== i));
  };

  return (
    <div>
      {label && <p className="mb-1.5 block text-sm font-medium">{label}</p>}
      {lista.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {lista.map((u, i) => (
            <div key={`${u}-${i}`} className="relative h-16 w-20 overflow-hidden rounded-lg border">
              <img src={absoluteUrl(u)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => quitar(i)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                title="Quitar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => subir(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={subiendo}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {subiendo ? "Subiendo..." : multiple ? "Subir desde el PC" : "Subir imagen"}
        </button>
        <button
          type="button"
          onClick={() => setModoUrl(!modoUrl)}
          className="flex items-center gap-1.5 rounded-lg border border-input px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link2 className="h-3.5 w-3.5" /> Pegar URL
        </button>
      </div>
      {modoUrl && (
        <div className="mt-2 flex gap-2">
          <input
            value={urlTexto}
            onChange={(e) => setUrlTexto(e.target.value)}
            placeholder="https://ejemplo.com/foto.jpg"
            className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={agregarUrl}
            className="rounded-lg border border-input px-3 py-2 text-xs hover:bg-muted"
          >
            Agregar
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
