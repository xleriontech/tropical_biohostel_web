import { useState } from "react";
import { filterProperties, formatRange, guestCount, money } from "@/lib";
import { useNido } from "@/store";
import type { CategoryId } from "@/types";
import { cn } from "@/utils/cn";
import { Atlas } from "./Atlas";
import { PropertyCard } from "./PropertyCard";
import { SearchBar } from "./SearchBar";
import { Avatar, Icon, paths } from "./ui";

const categories: { id: "todas" | CategoryId; label: string; icon: string }[] = [
  { id: "todas", label: "Todas", icon: paths.grid },
  { id: "playa", label: "Playa", icon: paths.wave },
  { id: "montana", label: "Montaña", icon: paths.peak },
  { id: "ciudad", label: "Ciudad", icon: paths.city },
  { id: "campo", label: "Campo", icon: paths.field },
  { id: "diseno", label: "Diseño", icon: paths.diamond },
  { id: "lagos", label: "Lagos", icon: paths.drop },
  { id: "unicos", label: "Únicos", icon: paths.spark },
  { id: "piscina", label: "Piscina", icon: paths.pool },
];

export function Explore() {
  const nido = useNido();
  const { items, hiddenByDates } = filterProperties(nido.properties, nido.search);
  const types = [...new Set(nido.properties.map((p) => p.type))];
  const spotlight = items.find((p) => p.guestFavorite) ?? items[0];
  const hosts = nido.hosts.filter((h) => h.id !== nido.me.id);
  const notes = nido.posts.slice(0, 2);
  const filtersOn =
    nido.search.category !== "todas" ||
    nido.search.maxPrice < 800 ||
    nido.search.instantOnly ||
    nido.search.petsOnly ||
    Boolean(nido.search.type) ||
    nido.search.sort !== "recomendados";
  const [priceOpen, setPriceOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 md:px-6">
      <section className="pt-6 md:pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-clay">Colección viva</p>
        <div className="mt-3 grid items-end gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <h1 className="font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-6xl">
            Casas con luz,
            <span className="italic text-clay"> mesa y silencio.</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">
            Estancias elegidas una a una. Villas junto al agua, masías con huerto, lofts donde se puede trabajar y casas que no se parecen entre sí.
          </p>
        </div>
        <div className="mt-8">
          <SearchBar />
        </div>
      </section>

      <div className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {categories.map((cat) => {
          const active = nido.search.category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => nido.patchSearch({ category: cat.id })}
              className={cn(
                "flex min-w-[76px] flex-col items-center gap-1.5 px-3 pb-3 pt-1 text-[11px] tracking-wide",
                active ? "border-b-2 border-ink text-ink" : "border-b-2 border-transparent text-muted hover:text-ink",
              )}
            >
              <Icon d={cat.icon} className="h-6 w-6" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div id="resultados" className="scroll-mt-24 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => setPriceOpen((v) => !v)} className={cn("rounded-full border px-4 py-2 text-sm", nido.search.maxPrice < 800 ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
              {nido.search.maxPrice < 800 ? `Hasta ${money(nido.search.maxPrice)}` : "Precio"}
            </button>
            {priceOpen && (
              <div className="absolute left-0 z-20 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-xl">
                <div className="flex items-center justify-between text-sm">
                  <span>Máximo por noche</span>
                  <span className="font-medium">{nido.search.maxPrice >= 800 ? "Sin tope" : money(nido.search.maxPrice)}</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={800}
                  step={10}
                  value={nido.search.maxPrice}
                  onChange={(event) => nido.patchSearch({ maxPrice: Number(event.target.value) })}
                  className="mt-4 w-full accent-clay"
                />
                <button type="button" onClick={() => setPriceOpen(false)} className="mt-3 text-sm underline">
                  Listo
                </button>
              </div>
            )}
          </div>
          <select
            value={nido.search.type}
            onChange={(event) => nido.patchSearch({ type: event.target.value })}
            className="rounded-full border border-line bg-card px-4 py-2 text-sm"
            aria-label="Tipo de espacio"
          >
            <option value="">Cualquier tipo</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={nido.search.sort}
            onChange={(event) => nido.patchSearch({ sort: event.target.value as typeof nido.search.sort })}
            className="rounded-full border border-line bg-card px-4 py-2 text-sm"
            aria-label="Ordenar"
          >
            <option value="recomendados">Recomendados</option>
            <option value="precio-asc">Precio: menor</option>
            <option value="precio-desc">Precio: mayor</option>
            <option value="valoracion">Mejor valoración</option>
          </select>
          <Toggle on={nido.search.instantOnly} onClick={() => nido.patchSearch({ instantOnly: !nido.search.instantOnly })}>
            Reserva inmediata
          </Toggle>
          <Toggle on={nido.search.petsOnly} onClick={() => nido.patchSearch({ petsOnly: !nido.search.petsOnly })}>
            Mascotas
          </Toggle>
          <button
            type="button"
            onClick={() => nido.setMapMode(!nido.mapMode)}
            className={cn("rounded-full border px-4 py-2 text-sm", nido.mapMode ? "border-ink bg-ink text-paper" : "border-line bg-card")}
          >
            {nido.mapMode ? "Ocultar mapa" : "Mapa"}
          </button>
          {filtersOn && (
            <button type="button" onClick={nido.resetFilters} className="px-2 text-sm underline">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {nido.search.where && <Chip label={nido.search.where} onClear={() => nido.patchSearch({ where: "" })} />}
          {nido.search.checkIn && <Chip label={formatRange(nido.search.checkIn, nido.search.checkOut)} onClear={nido.clearDates} />}
          {guestCount(nido.search) > 1 && (
            <Chip label={`${guestCount(nido.search)} huéspedes`} onClear={() => nido.patchSearch({ adults: 1, children: 0 })} />
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <p className="font-serif text-2xl md:text-3xl">
            {items.length === 0 ? "Nada encaja" : `${items.length} ${items.length === 1 ? "estancia" : "estancias"}`}
            {nido.search.where ? <span className="italic text-muted"> en {nido.search.where}</span> : null}
          </p>
          {hiddenByDates > 0 && (
            <p className="text-sm text-muted">{hiddenByDates} ocultas por fechas ocupadas</p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-serif text-3xl">Esa combinación no tiene casa.</p>
            <p className="mx-auto mt-3 max-w-md text-muted">Prueba con menos filtros, otras fechas o un destino más amplio. El atlas sigue teniendo sitios.</p>
            <button type="button" onClick={nido.resetSearch} className="mt-6 rounded-full bg-ink px-5 py-3 text-sm text-paper">
              Empezar de nuevo
            </button>
          </div>
        ) : (
          <div className={cn("mt-6", nido.mapMode && "lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-6")}>
            <div className={cn("grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2", nido.mapMode ? "xl:grid-cols-2" : "xl:grid-cols-4 lg:grid-cols-3")}>
              {items.map((property, index) => (
                <div key={property.id} className="contents">
                  <PropertyCard property={property} index={index} />
                  {index === 3 && spotlight && !nido.mapMode && (
                    <button
                      type="button"
                      onClick={() => nido.openProperty(spotlight.id)}
                      className="col-span-full grid overflow-hidden rounded-[28px] bg-moss text-left text-paper md:grid-cols-2"
                    >
                      <img src={spotlight.images[0]} alt="" className="h-64 w-full object-cover md:h-full" />
                      <span className="flex flex-col justify-between gap-6 p-7 md:p-10">
                        <span>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-paper/70">Casa de la semana</span>
                          <span className="mt-3 block font-serif text-4xl leading-tight">{spotlight.title}</span>
                          <span className="mt-3 block max-w-md text-sm leading-relaxed text-paper/80">{spotlight.description.slice(0, 160)}…</span>
                        </span>
                        <span className="inline-flex w-fit items-center rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink">
                          Ver estancia · {money(spotlight.price)}
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {nido.mapMode && (
              <div className="mt-6 lg:mt-0">
                <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                  <Atlas properties={items} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <section className="mt-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Anfitriones</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">Personas, no perfiles vacíos.</h2>
          </div>
          <button type="button" onClick={() => nido.setView("feed")} className="text-sm underline">
            Ver el feed
          </button>
        </div>
        <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2">
          {hosts.map((host) => {
            const count = nido.properties.filter((p) => p.hostId === host.id).length;
            const followed = nido.following.includes(host.id);
            return (
              <article key={host.id} className="w-64 shrink-0 rounded-[24px] border border-line bg-card p-4">
                <button type="button" onClick={() => nido.openProfile(host.id)} className="flex w-full items-center gap-3 text-left">
                  <Avatar src={host.avatar} name={host.name} className="h-14 w-14 rounded-full" />
                  <span>
                    <span className="block font-medium">{host.name}</span>
                    <span className="block text-sm text-muted">{host.location}</span>
                  </span>
                </button>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{host.bio}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {count} {count === 1 ? "casa" : "casas"}
                    {host.superhost ? " · Superanfitrión" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => nido.toggleFollow(host.id)}
                    className={cn("rounded-full px-3 py-1.5 text-xs font-medium", followed ? "bg-sand text-ink" : "bg-ink text-paper")}
                  >
                    {followed ? "Siguiendo" : "Seguir"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2">
        {notes.map((post) => {
          const author = nido.hosts.find((h) => h.id === post.authorId);
          return (
            <button key={post.id} type="button" onClick={() => nido.setView("feed")} className="overflow-hidden rounded-[28px] border border-line bg-card text-left">
              <img src={post.image} alt="" className="h-52 w-full object-cover" />
              <span className="block p-5">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Del feed · {post.place}</span>
                <span className="mt-2 block font-serif text-2xl leading-snug">{post.caption}</span>
                <span className="mt-3 block text-sm text-muted">{author?.name} · {post.time}</span>
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full border px-4 py-2 text-sm", on ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
      {children}
    </button>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="inline-flex items-center gap-2 rounded-full bg-sand px-3 py-1.5 text-sm">
      {label}
      <span aria-hidden>×</span>
    </button>
  );
}
