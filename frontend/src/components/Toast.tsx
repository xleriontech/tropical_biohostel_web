"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Toast {
  id: number;
  tipo: "success" | "error" | "info" | "warning";
  titulo: string;
  mensaje?: string;
}

interface ToastContextType {
  showToast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 8000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" style={{ maxWidth: "100vw" }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-up pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-gray-900 py-2.5 pl-4 pr-3 text-sm text-white shadow-xl"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${t.tipo === "success" ? "bg-green-400" : t.tipo === "error" ? "bg-red-400" : t.tipo === "warning" ? "bg-yellow-400" : "bg-sky-400"}`} />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{t.titulo}</span>
              {t.mensaje && <span className="text-white/70"> · {t.mensaje}</span>}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 rounded-full px-1.5 text-base leading-none text-white/60 hover:text-white"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
