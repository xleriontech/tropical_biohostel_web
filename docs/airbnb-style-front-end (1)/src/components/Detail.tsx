import { useEffect, useState } from "react";
import {
  cancelCopy,
  formatLong,
  formatRange,
  guestCount,
  guestLabel,
  money,
  nightsBetween,
  placeLine,
  quote,
  rangeBlocked,
  ratingLabel,
} from "@/lib";
import { useNido } from "@/store";
import { cn } from "@/utils/cn";
import { Atlas } from "./Atlas";
import { PropertyCard } from "./PropertyCard";
import { AmenityIcon, Avatar, Calendar, Icon, Modal, paths, Star, Stepper } from "./ui";

export function Detail() {
  const nido = useNido();
  const property = nido.properties.find((item) => item.id === nido.propertyId);
  const host = nido.hosts.find((item) => item.id === property?.hostId);
  const [light, setLight] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("Llegamos por la tarde. Si hace falta, avisamos.");
  const [showReviews, setShowReviews] = useState(4);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (light === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (!property) return;
      if (event.key === "ArrowRight") setLight((i) => (i === null ? 0 : (i + 1) % property.images.length));
      if (event.key === "ArrowLeft") setLight((i) => (i === null ? 0 : (i - 1 + property.images.length) % property.images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [light, property]);

  if (!property || !host) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="font-serif text-3xl">No encontramos esa casa.</p>
        <button type="button" onClick={() => nido.setView("explore")} className="mt-4 underline">
          Volver a explorar
        </button>
      </div>
    );
  }

  const saved = nido.favorites.includes(property.id);
  const own = property.hostId === nido.me.id;
  const bill = quote(property, nido.search.checkIn, nido.search.checkOut);
  const guests = guestCount(nido.search);
  const reason = reserveReason(property, nido.search.checkIn, nido.search.checkOut, guests, nido.search.pets);
  const related = nido.properties
    .filter((item) => item.id !== property.id && item.categories.some((cat) => property.categories.includes(cat)))
    .slice(0, 3);
  const bars = scoreBars(property.id, property.rating || 5);

  const share = async () => {
    const text = `${property.title} · ${placeLine(property)} · Nido`;
    try {
      if (navigator.share) await navigator.share({ title: property.title, text });
      else {
        await navigator.clipboard.writeText(text);
        nido.toast("Ficha copiada");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      nido.toast("No se pudo compartir");
    }
  };

  const reserve = () => {
    if (!nido.search.checkIn || !nido.search.checkOut) {
      document.getElementById("calendario")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (reason) {
      nido.toast(reason);
      return;
    }
    setDone(false);
    setConfirm(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => nido.setView("explore")} className="inline-flex items-center gap-2 text-sm">
          <Icon d={paths.chevronLeft} className="h-4 w-4" />
          Explorar
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-sm">
            <Icon d={paths.share} className="h-4 w-4" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPop(true);
              nido.toggleFavorite(property.id);
              window.setTimeout(() => setPop(false), 350);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-sm"
          >
            <svg viewBox="0 0 24 24" className={cn("h-4 w-4", pop && "animate-pop")} aria-hidden>
              <path d={paths.heart} className={saved ? "fill-clay stroke-clay" : "fill-none stroke-current"} strokeWidth="1.7" />
            </svg>
            {saved ? "Guardada" : "Guardar"}
          </button>
        </div>
      </div>

      <div className={cn("grid gap-2", property.images.length > 1 && "sm:h-[480px] sm:grid-cols-[1.45fr_.9fr]")}>
        <button type="button" onClick={() => setLight(0)} className="relative h-72 overflow-hidden rounded-[28px] bg-sand sm:h-full">
          <img src={property.images[0]} alt={`${property.title}, foto 1`} className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]" />
          {property.images.length > 1 && (
            <span className="absolute bottom-4 right-4 rounded-full bg-card px-3 py-1.5 text-sm sm:hidden">Ver fotos</span>
          )}
        </button>
        {property.images.length > 1 && (
          <div className="hidden gap-2 sm:flex sm:flex-col">
            {property.images.slice(1, 4).map((src, index) => (
              <button key={`${src}-${index}`} type="button" onClick={() => setLight(index + 1)} className="relative min-h-0 flex-1 overflow-hidden rounded-[22px] bg-sand">
                <img src={src} alt={`${property.title}, foto ${index + 2}`} className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.03]" />
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={() => setLight(0)} className="mt-3 hidden rounded-full border border-line bg-card px-4 py-2 text-sm sm:inline-flex">
        Ver las {property.images.length} fotos
      </button>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-clay">
            {property.type} · {placeLine(property)}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">{property.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {property.reviewsCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium">
                <Star /> {ratingLabel(property.rating)} · {property.reviewsCount} reseñas
              </span>
            ) : (
              <span className="rounded-full bg-sand px-2 py-0.5 text-xs">Nuevo en Nido</span>
            )}
            <span className="text-muted">
              {property.guests} huéspedes · {property.bedrooms} hab · {property.beds} camas · {property.baths} baños
            </span>
            {property.guestFavorite && <span className="rounded-full bg-moss-soft px-2 py-0.5 text-xs text-moss">Favorita de huéspedes</span>}
          </div>

          <button type="button" onClick={() => nido.openProfile(host.id)} className="mt-8 flex w-full items-center gap-4 border-y border-line py-5 text-left">
            <Avatar src={host.avatar} name={host.name} className="h-14 w-14 rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Anfitrión: {host.name}</span>
              <span className="block text-sm text-muted">
                {host.superhost ? "Superanfitrión · " : ""}Se unió en {host.joined} · Responde {host.responseTime}
              </span>
            </span>
            <Icon d={paths.chevron} className="h-4 w-4 text-muted" />
          </button>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {property.highlights.map((item) => (
              <div key={item.title} className="rounded-2xl bg-card p-4 ring-1 ring-line">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl">
            <p className="text-base leading-relaxed text-ink/90">
              {more || property.description.length < 280 ? property.description : `${property.description.slice(0, 280)}…`}
            </p>
            {property.description.length >= 280 && (
              <button type="button" onClick={() => setMore((v) => !v)} className="mt-2 text-sm font-medium underline">
                {more ? "Mostrar menos" : "Mostrar más"}
              </button>
            )}
          </div>

          <section className="mt-10">
            <h2 className="font-serif text-2xl">Qué hay en la casa</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {property.amenities.slice(0, 8).map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <AmenityIcon name={item} />
                  {item}
                </div>
              ))}
            </div>
            {property.amenities.length > 8 && (
              <button type="button" onClick={() => setAmenitiesOpen(true)} className="mt-4 rounded-full border border-ink px-4 py-2 text-sm">
                Mostrar las {property.amenities.length} comodidades
              </button>
            )}
          </section>

          <section id="calendario" className="mt-12 scroll-mt-28">
            <h2 className="font-serif text-2xl">Disponibilidad</h2>
            <p className="mt-1 text-sm text-muted">
              Estancia mínima: {property.minNights} {property.minNights === 1 ? "noche" : "noches"}. Los días tachados están ocupados.
            </p>
            <div className="mt-5 rounded-[28px] border border-line bg-card p-4 md:p-6">
              <Calendar propertyId={property.id} />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-2xl">Reseñas</h2>
            {property.reviewsCount === 0 ? (
              <p className="mt-3 text-muted">Aún no hay reseñas. La primera estancia deja la casa con historia.</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-end gap-8">
                  <p className="font-serif text-6xl leading-none">{ratingLabel(property.rating)}</p>
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    {bars.map((bar) => (
                      <div key={bar.label} className="grid grid-cols-[110px_1fr_32px] items-center gap-2 text-xs">
                        <span>{bar.label}</span>
                        <span className="h-1 overflow-hidden rounded-full bg-sand">
                          <span className="block h-full bg-ink" style={{ width: `${(bar.value / 5) * 100}%` }} />
                        </span>
                        <span className="tabular-nums">{bar.value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {property.reviews.slice(0, showReviews).map((review) => (
                    <article key={review.id} className="rounded-2xl bg-card p-4 ring-1 ring-line">
                      <div className="flex items-center gap-3">
                        <Avatar name={review.author} className="h-10 w-10 rounded-full text-sm" />
                        <div>
                          <p className="text-sm font-medium">{review.author}</p>
                          <p className="text-xs text-muted">{review.date}</p>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3" /> {review.rating}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed">{review.text}</p>
                    </article>
                  ))}
                </div>
                {property.reviews.length > showReviews && (
                  <button type="button" onClick={() => setShowReviews(property.reviews.length)} className="mt-4 text-sm underline">
                    Mostrar las {property.reviews.length} reseñas escritas
                  </button>
                )}
              </>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-2xl">Dónde está</h2>
            <p className="mt-1 text-sm text-muted">{placeLine(property)}, {property.country}. La dirección exacta se comparte al reservar.</p>
            <div className="mt-4">
              <Atlas properties={[property]} activeId={property.id} tall onSelect={() => undefined} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl">Normas de la casa</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {property.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-clay" />
                  {rule}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">{cancelCopy(property.cancel)}</p>
          </section>
        </div>

        <aside className="h-fit rounded-[28px] border border-line bg-card p-6 shadow-[0_20px_50px_-32px_rgba(27,25,22,0.55)] lg:sticky lg:top-24">
          <div className="flex items-end justify-between">
            <p>
              <span className="font-serif text-3xl">{bill.nights > 0 ? money(bill.total) : money(property.price)}</span>
              <span className="text-sm text-muted">{bill.nights > 0 ? " total" : " noche"}</span>
            </p>
            {property.reviewsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm">
                <Star /> {ratingLabel(property.rating)}
              </span>
            )}
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
            <button type="button" onClick={() => document.getElementById("calendario")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="grid w-full grid-cols-2 text-left">
              <span className="border-r border-line px-3 py-2">
                <span className="block text-[10px] uppercase tracking-wider text-muted">Llegada</span>
                <span className="text-sm">{nido.search.checkIn ? formatLong(nido.search.checkIn) : "Añadir"}</span>
              </span>
              <span className="px-3 py-2">
                <span className="block text-[10px] uppercase tracking-wider text-muted">Salida</span>
                <span className="text-sm">{nido.search.checkOut ? formatLong(nido.search.checkOut) : "Añadir"}</span>
              </span>
            </button>
            <div className="border-t border-line px-3">
              <Stepper
                label="Huéspedes"
                hint={guestLabel(nido.search)}
                value={nido.search.adults}
                min={1}
                max={property.guests}
                onChange={(adults) => nido.patchSearch({ adults })}
              />
            </div>
          </div>
          {bill.nights > 0 && (
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={`${money(property.price)} × ${bill.nights} noches`} value={money(bill.stay)} />
              <Row label="Limpieza" value={bill.cleaning ? money(bill.cleaning) : "Incluida"} />
              <Row label="Comisión de Nido" value={money(bill.service)} />
              <div className="flex justify-between border-t border-line pt-2 font-medium">
                <dt>Total</dt>
                <dd>{money(bill.total)}</dd>
              </div>
            </dl>
          )}
          {own ? (
            <button type="button" onClick={() => nido.openProfile(nido.me.id)} className="mt-5 w-full rounded-full bg-ink py-3.5 text-sm font-medium text-paper">
              Es tu casa
            </button>
          ) : (
            <button type="button" onClick={reserve} className="mt-5 w-full rounded-full bg-clay py-3.5 text-sm font-medium text-white hover:bg-clay-deep">
              {bill.nights > 0 ? "Reservar" : "Elegir fechas"}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            {own ? "Las reservas de tu propio anuncio no se confirman." : reason && bill.nights > 0 ? reason : "No se te cobrará todavía. Esto es una demostración."}
          </p>
          {!own && (
            <button
              type="button"
              onClick={() => nido.openThreadWith(host.id, property.id, `Hola ${host.name.split(" ")[0]}, estoy mirando ${property.title}.`)}
              className="mt-3 w-full rounded-full border border-line py-3 text-sm"
            >
              Escribir a {host.name.split(" ")[0]}
            </button>
          )}
          {property.instant && <p className="mt-3 text-center text-xs text-moss">Reserva inmediata · confirmación al momento</p>}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl">Cerca en espíritu</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        </section>
      )}

      <Modal open={light !== null} onClose={() => setLight(null)} dark className="max-w-5xl bg-transparent">
        {light !== null && (
          <div className="relative">
            <img src={property.images[light]} alt="" className="max-h-[80vh] w-full rounded-2xl object-contain" />
            <button type="button" onClick={() => setLight(null)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-card" aria-label="Cerrar fotos">
              <Icon d={paths.close} className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setLight((i) => (i === null ? 0 : (i - 1 + property.images.length) % property.images.length))} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card" aria-label="Anterior">
              <Icon d={paths.chevronLeft} className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setLight((i) => (i === null ? 0 : (i + 1) % property.images.length))} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card" aria-label="Siguiente">
              <Icon d={paths.chevron} className="h-4 w-4" />
            </button>
            <p className="mt-3 text-center text-sm text-paper">
              {light + 1} / {property.images.length}
            </p>
          </div>
        )}
      </Modal>

      <Modal open={amenitiesOpen} onClose={() => setAmenitiesOpen(false)} className="max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Comodidades</h3>
          <button type="button" onClick={() => setAmenitiesOpen(false)} aria-label="Cerrar">
            <Icon d={paths.close} className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 divide-y divide-line">
          {property.amenities.map((item) => (
            <div key={item} className="flex items-center gap-3 py-3 text-sm">
              <AmenityIcon name={item} />
              {item}
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={confirm} onClose={() => setConfirm(false)} className="max-w-lg p-6">
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-moss text-paper">
              <Icon d={paths.check} />
            </div>
            <h3 className="mt-4 font-serif text-3xl">Ya es tuya, por esas noches.</h3>
            <p className="mt-2 text-sm text-muted">
              {property.title} · {formatRange(nido.search.checkIn, nido.search.checkOut)}. No se ha realizado ningún cargo.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => { setConfirm(false); nido.setView("trips"); }} className="rounded-full bg-ink px-5 py-3 text-sm text-paper">
                Ver el viaje
              </button>
              <button type="button" onClick={() => { setConfirm(false); nido.setView("messages"); }} className="rounded-full border border-line px-5 py-3 text-sm">
                Abrir mensajes
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Confirmar estancia</p>
                <h3 className="mt-1 font-serif text-3xl">{property.title}</h3>
              </div>
              <button type="button" onClick={() => setConfirm(false)} aria-label="Cerrar">
                <Icon d={paths.close} className="h-5 w-5" />
              </button>
            </div>
            <img src={property.images[0]} alt="" className="mt-4 h-36 w-full rounded-2xl object-cover" />
            <p className="mt-4 text-sm">
              {formatRange(nido.search.checkIn, nido.search.checkOut)} · {guestLabel(nido.search)} · {money(bill.total)}
            </p>
            <label className="mt-4 block text-sm">
              Nota para {host.name.split(" ")[0]}
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2 outline-none focus:border-ink" />
            </label>
            <p className="mt-3 text-xs text-muted">{cancelCopy(property.cancel)} Prototipo: no hay cobro real.</p>
            <button
              type="button"
              onClick={() => {
                if (!nido.search.checkIn || !nido.search.checkOut) return;
                nido.addBooking({
                  propertyId: property.id,
                  checkIn: nido.search.checkIn,
                  checkOut: nido.search.checkOut,
                  guests,
                  total: bill.total,
                  note,
                });
                setDone(true);
              }}
              className="mt-4 w-full rounded-full bg-clay py-3 text-sm font-medium text-white"
            >
              Confirmar reserva
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-muted">
      <dt className="underline decoration-line underline-offset-4">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function reserveReason(
  property: { id: string; minNights: number; guests: number; petFriendly: boolean },
  checkIn: string | null,
  checkOut: string | null,
  guests: number,
  pets: number,
) {
  if (!checkIn || !checkOut) return "Elige un rango de fechas";
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < property.minNights) return `Estancia mínima de ${property.minNights} noches`;
  if (rangeBlocked(property.id, checkIn, checkOut)) return "Esas fechas incluyen días ocupados";
  if (guests > property.guests) return `Esta casa admite hasta ${property.guests} huéspedes`;
  if (pets > 0 && !property.petFriendly) return "No admite mascotas";
  return null;
}

function scoreBars(id: string, base: number) {
  const labels = ["Limpieza", "Exactitud", "Llegada", "Comunicación", "Ubicación", "Calidad"];
  let hash = 0;
  for (const char of id) hash += char.charCodeAt(0);
  return labels.map((label, index) => {
    const delta = ((hash + index * 7) % 5) * 0.03 - 0.06;
    const value = Math.min(5, Math.max(4.5, Math.round((base + delta) * 10) / 10));
    return { label, value };
  });
}
