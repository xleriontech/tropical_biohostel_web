import type { Metadata } from "next";
import { Fraunces, Inter, Outfit } from "next/font/google";
import "./globals.css";
import RouteLoader from "@/components/RouteLoader";
import PublicChrome from "@/components/PublicChrome";
import { SearchProvider } from "@/lib/SearchContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import ClientWrapper from "@/components/ClientWrapper";

const inter = Inter({ subsets: ["latin"] });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-nido-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-nido-serif", style: ["normal", "italic"] });

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
  icons: { icon: "/favicon.svg", apple: "/tropical-logo.png" },
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
            </ClientWrapper>
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
