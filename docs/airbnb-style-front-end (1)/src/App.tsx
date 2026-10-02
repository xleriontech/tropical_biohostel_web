import { useEffect } from "react";
import { Detail } from "@/components/Detail";
import { Explore } from "@/components/Explore";
import { Feed } from "@/components/Feed";
import { Footer, Header, MobileNav } from "@/components/Header";
import { MessagesView, ProfileView, PublishView, TripsView, WishlistView } from "@/components/Pages";
import { placeLine } from "@/lib";
import { StoreProvider, useNido } from "@/store";
import { cn } from "@/utils/cn";

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const nido = useNido();
  const property = nido.properties.find((item) => item.id === nido.propertyId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [nido.view, nido.propertyId, nido.userId]);

  useEffect(() => {
    const titles: Record<string, string> = {
      explore: "Nido — Estancias con carácter",
      detail: property ? `${property.title} · ${placeLine(property)}` : "Estancia · Nido",
      feed: "Feed · Nido",
      profile: "Perfil · Nido",
      wishlist: "Guardados · Nido",
      trips: "Viajes · Nido",
      messages: "Mensajes · Nido",
      publish: "Anunciar · Nido",
    };
    document.title = titles[nido.view] ?? "Nido";
  }, [nido.view, property]);

  return (
    <div className="min-h-screen text-ink">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className={cn("animate-rise", nido.view !== "messages" && "pb-6")}>
        {nido.view === "explore" && <Explore />}
        {nido.view === "detail" && <Detail />}
        {nido.view === "feed" && <Feed />}
        {nido.view === "profile" && <ProfileView />}
        {nido.view === "wishlist" && <WishlistView />}
        {nido.view === "trips" && <TripsView />}
        {nido.view === "messages" && <MessagesView />}
        {nido.view === "publish" && <PublishView />}
      </main>
      {nido.view !== "messages" && <Footer />}
      {nido.view !== "messages" && <div className="h-16 md:hidden" />}
      {nido.view !== "messages" && <MobileNav />}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 md:bottom-6">
        {nido.toasts.map((item) => (
          <div key={item.id} className="animate-toast pointer-events-auto rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg">
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
