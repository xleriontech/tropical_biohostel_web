"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { THEMES, getTheme } from "@/lib/themes";

export default function ThemePicker() {
  const { themeId, setThemeId, mode, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = getTheme(themeId);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="nav-box flex items-center gap-1.5 rounded-lg border border-input p-2 text-muted-foreground hover:text-foreground transition-colors"
        title={`Tema: ${active.nombre}`}
      >
        <span
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ backgroundColor: `hsl(${active.vars.primary})` }}
        />
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[60] mt-2 w-72 overflow-hidden rounded-xl border bg-white shadow-xl">
          <p className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Temas de color
          </p>
          <div className="max-h-80 overflow-y-auto p-2">
            {THEMES.map((t) => {
              const isActive = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => { setThemeId(t.id); setOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: `hsl(${t.vars.primary})` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {t.nombre}
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.origen} · {t.descripcion}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={toggleMode}
            className="flex w-full items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              {mode === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Modo oscuro
            </span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${mode === "dark" ? "bg-primary" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${mode === "dark" ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
