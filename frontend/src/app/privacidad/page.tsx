"use client";

import { useEffect } from "react";
import { Sun, Moon, Leaf, Heart, MapPin, Shield, Lock, UserCheck, Calendar, Image } from "lucide-react";

export default function PrivacidadPage() {
  useEffect(() => {
    document.title = "Política de Privacidad · Tropical Biohostel";
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Política de Privacidad</span>
      </nav>

      <h1 className="mt-2 font-display text-4xl font-semibold">Política de Privacidad</h1>

      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        En Tropical Biohostel nos comprometemos a proteger tu privacidad y a ser transparente sobre
        los datos que recopilamos cuando interactúas con nuestro sitio web.
      </p>

      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-semibold tracking-tight mb-4">Información que recogemos</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-medium">Datos de contacto:</span> Cuando te comunicas con nosotros a través del formulario de reservas, chat o correo electrónico, recopilamos tu nombre, correo electrónico y número de teléfono (opcional) para atender tu solicitud.
          </li>
          <li>
            <span className="font-medium">Información técnica:</span> Cada visita al sitio registra tu dirección IP, tipo de navegador, sistema operativo y tiempo de permanencia. Estos datos son exclusivamente estadísticos y nos ayudan a mejorar la experiencia del usuario.
          </li>
          <li>
            <span className="font-medium">Cookies:</span> Utilizamos cookies esenciales para el funcionamiento del sitio y cookies de análisis (Google Analytics) para comprender cómo los visitantes interactúan con nuestro contenido. Puedes rechazar las cookies de análisis en la configuración de tu navegador.
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-semibold tracking-tight mb-4">Uso de la información</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>Para procesar reservas y solicitudes de información.</li>
          <li>Para mejorar nuestro sitio web y servicios basándonos en cómo los usuarios interactúan con él.</li>
          <li>Para comunicarnos contigo sobre actualizaciones, ofertas especiales o cambios en nuestros servicios.</li>
          <li>Para cumplir con obligaciones legales y regulatorias aplicables.</li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-semibold tracking-tight mb-4">Tus derechos</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>Puedes solicitar el acceso, rectificación o eliminación de tus datos personales en cualquier momento escribiendo a <a href="mailto:info@tropicalbiohostel.com" className="text-primary hover:underline">info@tropicalbiohostel.com</a>.</li>
          <li>Puedes oponerte al procesamiento de tus datos para fines de marketing.</li>
          <li>Puedes retirar tu consentimiento para el tratamiento de datos en cualquier momento.</li>
        </ul>
      </section>

      <footer className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>Tropical Biohostel · Finca rural · a 10 minutos del casco urbano de Nocaima, Cundinamarca</p>
        <p>© {new Date().getFullYear()} Tropical Biohostel. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}