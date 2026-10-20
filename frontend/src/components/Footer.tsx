"use client";

import SiteBrand from "./SiteBrand";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-input">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <SiteBrand className="h-9 w-auto" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tropical Biohostel · Naturaleza que se vive, sabores que se descubren, experiencias que permanecen.
            Finca rural a 10 minutos del casco urbano de Nocaima, Cundinamarca: 30 % de bosque nativo,
            400 plantas de café, frutales y huerta de aromáticas. Tres cabañas con baño privado (hasta 10
            huéspedes), Cosmic Bungalow, comedor para 10 y cocina abierta.
          </p>
          <p className="mt-3 text-sm">
            <a href="/en" className="text-primary hover:underline">Read in English</a>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recorrer</p>
          <div className="mt-3 flex flex-col items-start gap-2 text-sm">
            <a href="/cosmic-bungalo" className="font-medium hover:underline">Cosmic Bungalow</a>
            <a href="/territorio" className="hover:underline">Territorio</a>
            <a href="/gastronomia" className="hover:underline">Gastronomía</a>
            <a href="/experiencias" className="hover:underline">Experiencias</a>
            <a href="/rutas" className="hover:underline">Rutas del café</a>
            <a href="/fical-y-el-cafe" className="hover:underline">Fical y el café</a>
            <a href="/bienestar" className="hover:underline">Bienestar · Yoga, Tai Chi, Chi Kung</a>
            <a href="/donaciones" className="font-medium hover:underline">Donar · Siembra y carbono 🌳</a>
            <a href="/busqueda-inteligente" className="hover:underline">Zemisqua · Buscador ancestral</a>
            <a href="/guardados" className="hover:underline">Guardados</a>
            <a href="/privacidad" className="hover:underline text-xs">Política de privacidad</a>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Antes de reservar</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <details className="rounded-2xl border border-input bg-white px-4 py-3">
              <summary className="cursor-pointer font-medium text-foreground">¿Cómo evitan la doble reserva?</summary>
              <p className="mt-2 leading-relaxed">
                Verificamos tus fechas contra nuestras reservas y los calendarios de Airbnb/Booking antes de confirmar.
              </p>
            </details>
            <details className="rounded-2xl border border-input bg-white px-4 py-3">
              <summary className="cursor-pointer font-medium text-foreground">¿El pago es en línea?</summary>
              <p className="mt-2 leading-relaxed">
                No. Reservas aquí y pagas en el sitio (efectivo o tarjeta según el lugar).
              </p>
            </details>
            <details className="rounded-2xl border border-input bg-white px-4 py-3">
              <summary className="cursor-pointer font-medium text-foreground">¿Yoga, Chi Kung o Tai Chi están incluidos?</summary>
              <p className="mt-2 leading-relaxed">
                Una vez realizada tu reserva podrás programarlos según disponibilidad, en especial en Cosmic Bungalow.
              </p>
            </details>
          </div>
        </div>
      </div>
      <div className="border-t border-input px-4 py-4 text-center text-xs text-muted-foreground md:px-6">
        <p>Tropical Biohostel · Nocaima, Cundinamarca · Naturaleza que se vive · Sabores que se descubren · Experiencias que permanecen</p>
        <p className="mt-1.5">
          Sitio desarrollado por{" "}
          <a href="/xlerion" className="font-semibold text-primary hover:underline">
            Xlerion Disruptive Tech - Colombia
          </a>
        </p>
      </div>
    </footer>
  );
}
