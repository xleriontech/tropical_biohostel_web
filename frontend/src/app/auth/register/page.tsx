"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nombre }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Error al registrarse");
      setLoading(false);
      return;
    }

    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.dispatchEvent(new Event("auth-change"));

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Crear Cuenta</h1>
            <p className="mt-1 text-sm text-muted-foreground">Regístrate para gestionar tus reservas fácilmente</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nombre</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full rounded-xl border border-input bg-background text-foreground pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-input bg-background text-foreground pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Contraseña</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-input bg-background text-foreground pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creando..." : "Crear Cuenta"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <a href="/auth/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
