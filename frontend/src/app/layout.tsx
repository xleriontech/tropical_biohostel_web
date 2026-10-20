import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Outfit } from "next/font/google";
import "./globals.css";
import RouteLoader from "@/components/RouteLoader";
import PublicChrome from "@/components/PublicChrome";
import { SearchProvider } from "@/lib/SearchContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import ClientWrapper from "@/components/ClientWrapper";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-nido-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-nido-serif", style: ["normal", "italic"] });

// Cloudflare Pages (Workers): todo el render dinámico corre en el edge runtime
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Tropical Biohostel — Naturaleza que se vive | Nocaima",
  description:
    "Tropical Biohostel en Nocaima: 3 cabañas con baño privado, Cosmic Bungaló de arquitectura sagrada hexagonal, gastronomía del territorio a la mesa, café, cacao, caminatas y bienestar (Yoga, Tai Chi, Chi Kung).",
  keywords: [
    "Tropical Biohostel",
    "Nocaima",
    "Cosmic Bungaló",
    "eco-hostel",
    "cabañas Nocaima",
    "yoga",
    "tai chi",
    "chi kung",
    "tour café cacao",
    "gastronomía consciente",
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "Tropical Biohostel",
  appleWebApp: {
    capable: true,
    title: "Tropical Biohostel",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/icons/icon-192.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Tropical Biohostel",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#007A33" },
    { media: "(prefers-color-scheme: dark)", color: "#184E40" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${outfit.variable} ${fraunces.variable}`}>
        <ThemeProvider>
          <SearchProvider>
            <ClientWrapper>
              <RouteLoader />
              <PublicChrome slot="top" />
              <main>{children}</main>
              <PublicChrome slot="bottom" />
              <ServiceWorkerRegister />
              <InstallPrompt />
            </ClientWrapper>
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
