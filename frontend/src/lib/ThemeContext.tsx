"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTheme } from "./themes";

type Mode = "light" | "dark";

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => void;
  mode: Mode;
  toggleMode: () => void;
  /** Solo compatibilidad con el toggle anterior */
  theme: Mode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "tropical-theme";
const MODE_KEY = "theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>("biohostel");
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme) setThemeIdState(storedTheme);
    const storedMode = localStorage.getItem(MODE_KEY);
    if (storedMode === "dark" || storedMode === "light") setMode(storedMode);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themeId && themeId !== "biohostel") {
      root.setAttribute("data-theme", themeId);
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem(THEME_KEY, themeId);
  }, [themeId]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const setThemeId = (id: string) => {
    // Valida que el tema exista
    setThemeIdState(getTheme(id).id);
  };
  const toggleMode = () => setMode((m) => (m === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider
      value={{ themeId, setThemeId, mode, toggleMode, theme: mode, toggleTheme: toggleMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
