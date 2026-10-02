import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { COVERS } from "@/data";
import { formatLong, money } from "@/lib";
import { useNido } from "@/store";
import type { CategoryId } from "@/types";
import { cn } from "@/utils/cn";
import { PropertyCard } from "./PropertyCard";
import { Avatar, Icon, paths, Star } from "./ui";

export function ProfileView() {
  const nido = useNido();
  const host = nido.hosts.find((item) => item.id === nido.userId) ?? nido.me;
  const listings = nido.properties.filter((property) => property.hostId === host.id);
  const reviews = listings.flatMap((property) => property.reviews.map((review) => ({ ...review, property: property.title, propertyId: property.id })));
  const mine = host.id === nido.me.id;
  const [tab, setTab] = useState<"casas" | "resenas" | "sobre">("casas");
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(host.bio);

  useEffect(() => {
    setBio(host.bio);
    setEditing(false);
    setTab("casas");
  }, [host.id, host.bio]);

  const cover = listings[0]?.images[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="relative h-44 overflow-hidden rounded-[28px] bg-moss md:h-56">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover opacity-80" /> : <div className="h-full w-full bg-gradient-to-br from-moss to-clay" />}
      </div>
      <div className="relative -mt-12 px-2 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar src={host.avatar} name={host.name} className="h-24 w-24 rounded-full ring-4 ring-paper" />
            <div className="pb-1">
              <h1 className="font-serif text-3xl md:text-4xl">{host.name}</h1>
              <p className="text-sm text-muted">{host.work} · {host.location}</p>
            </div>
          </div>
          {!mine ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => nido.toggleFollow(host.id)} className={cn("rounded-full px-4 py-2 text-sm", nido.following.includes(host.id) ? "bg-sand" : "bg-ink text-paper")}>
                {nido.following.includes(host.id) ? "Siguiendo" : "Seguir"}
              </button>
              {listings[0] && (
                <button type="button" onClick={() => nido.openThreadWith(host.id, listings[0].id)} className="rounded-full border border-line bg-card px-4 py-2 text-sm">
                  Mensaje
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => nido.setView("publish")} className="rounded-full bg-clay px-4 py-2 text-sm text-white">
              Anunciar un espacio
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Valoración" value={host.rating ? host.rating.toLocaleString("es-ES", { minimumFractionDigits: 2 }) : "—"} />
          <Stat label="Reseñas" value={String(host.reviews)} />
          <Stat label="Respuesta" value={`${host.responseRate}%`} />
          <Stat label="En Nido" value={`desde ${host.joined}`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {host.verified && <Badge>Identidad verificada</Badge>}
          {host.superhost && <Badge>Superanfitrión</Badge>}
          {host.languages.map((language) => (
            <Badge key={language}>{language}</Badge>
          ))}
        </div>

        <div className="mt-8 flex gap-4 border-b border-line text-sm">
          {(
            [
              ["casas", `Casas · ${listings.length}`],
              ["resenas", "Reseñas"],
              ["sobre", "Sobre"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn("pb-3", tab === id ? "border-b-2 border-ink font-medium" : "text-muted")}>
              {label}
            </button>
          ))}
        </div>

        {tab === "casas" && (
          <div className="mt-6">
            {listings.length === 0 ? (
              <Empty title="Todavía no anuncias ninguna casa." text="Cuando publiques un espacio, aparecerá aquí y en explorar." action="Anunciar" onAction={() => nido.setView("publish")} />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "resenas" && (
          <div className="mt-6 space-y-3">
            {reviews.length === 0 && <p className="text-sm text-muted">Aún no hay reseñas públicas en sus casas.</p>}
            {reviews.map((review) => (
              <button key={review.id} type="button" onClick={() => nido.openProperty(review.propertyId)} className="block w-full rounded-2xl border border-line bg-card p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{review.author}</p>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3" /> {review.rating}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
                <p className="mt-2 text-xs text-muted">{review.property} · {review.date}</p>
              </button>
            ))}
          </div>
        )}

        {tab === "sobre" && (
          <div className="mt-6 max-w-2xl">
            {editing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  nido.updateBio(bio);
                  setEditing(false);
                }}
              >
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={5} className="w-full rounded-2xl border border-line bg-card p-3 outline-none" />
                <div className="mt-3 flex gap-2">
                  <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Guardar</button>
                  <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm">Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-lg leading-relaxed">{host.bio}</p>
                {mine && (
                  <button type="button" onClick={() => setEditing(true)} className="mt-3 text-sm underline">
                    Editar presentación
                  </button>
                )}
                <p className="mt-6 text-sm text-muted">Suele responder {host.responseTime}. Idiomas: {host.languages.join(", ")}.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function WishlistView() {
  const nido = useNido();
  const [tab, setTab] = useState<"casas" | "notas">("casas");
  const houses = nido.properties.filter((property) => nido.favorites.includes(property.id));
  const notes = nido.posts.filter((post) => nido.savedPosts.includes(post.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-clay">Tu lista</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Guardados</h1>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setTab("casas")} className={cn("rounded-full px-4 py-2 text-sm", tab === "casas" ? "bg-ink text-paper" : "bg-sand")}>
          Estancias · {houses.length}
        </button>
        <button type="button" onClick={() => setTab("notas")} className={cn("rounded-full px-4 py-2 text-sm", tab === "notas" ? "bg-ink text-paper" : "bg-sand")}>
          Del feed · {notes.length}
        </button>
      </div>
      {tab === "casas" && (
        <div className="mt-6">
          {houses.length === 0 ? (
            <Empty title="Ninguna casa guardada." text="El corazón de cada ficha la deja aquí, lista para comparar con calma." action="Explorar" onAction={() => nido.setView("explore")} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {houses.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "notas" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {notes.length === 0 && <p className="text-sm text-muted">Guarda notas del feed para leerlas después.</p>}
          {notes.map((post) => (
            <button key={post.id} type="button" onClick={() => nido.setView("feed")} className="overflow-hidden rounded-[24px] border border-line bg-card text-left">
              <img src={post.image} alt="" className="h-40 w-full object-cover" />
              <span className="block p-4">
                <span className="text-xs uppercase tracking-wider text-muted">{post.place}</span>
                <span className="mt-1 block font-serif text-xl">{post.caption}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TripsView() {
  const nido = useNido();
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const groups = [
    { id: "proxima" as const, title: "Próximas" },
    { id: "pasada" as const, title: "Pasadas" },
    { id: "cancelada" as const, title: "Canceladas" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-clay">Tus fechas</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Viajes</h1>
      <p className="mt-2 text-muted">Las reservas de esta demostración viven solo en tu navegador.</p>
      {nido.bookings.length === 0 && (
        <Empty title="Aún no tienes viajes." text="Cuando confirmes una estancia, aparecerá aquí con su anfitrión y el total." action="Buscar casa" onAction={() => nido.setView("explore")} />
      )}
      {groups.map((group) => {
        const items = nido.bookings.filter((booking) => booking.status === group.id);
        if (!items.length) return null;
        return (
          <section key={group.id} className="mt-8">
            <h2 className="font-serif text-2xl">{group.title}</h2>
            <div className="mt-4 space-y-4">
              {items.map((booking) => {
                const property = nido.properties.find((item) => item.id === booking.propertyId);
                const host = nido.hosts.find((item) => item.id === property?.hostId);
                if (!property || !host) return null;
                return (
                  <article key={booking.id} className="grid overflow-hidden rounded-[24px] border border-line bg-card sm:grid-cols-[200px_1fr]">
                    <button type="button" onClick={() => nido.openProperty(property.id)}>
                      <img src={property.images[0]} alt="" className="h-40 w-full object-cover sm:h-full" />
                    </button>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium">{property.title}</h3>
                          <p className="text-sm text-muted">{property.city} · {host.name}</p>
                        </div>
                        <span className="rounded-full bg-sand px-2 py-1 text-xs capitalize">{booking.status}</span>
                      </div>
                      <p className="mt-2 text-sm">
                        {formatLong(booking.checkIn)} — {formatLong(booking.checkOut)} · {booking.guests} huéspedes
                      </p>
                      <p className="mt-1 text-sm font-medium">{money(booking.total)}</p>
                      {booking.note && <p className="mt-2 text-sm text-muted">“{booking.note}”</p>}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => nido.openProperty(property.id)} className="rounded-full border border-line px-3 py-1.5 text-sm">
                          Ver casa
                        </button>
                        <button type="button" onClick={() => nido.openThreadWith(host.id, property.id)} className="rounded-full border border-line px-3 py-1.5 text-sm">
                          Mensaje
                        </button>
                        {booking.status === "proxima" && (
                          confirmCancel === booking.id ? (
                            <button type="button" onClick={() => { nido.cancelBooking(booking.id); setConfirmCancel(null); }} className="rounded-full bg-clay px-3 py-1.5 text-sm text-white">
                              Confirmar cancelación
                            </button>
                          ) : (
                            <button type="button" onClick={() => setConfirmCancel(booking.id)} className="rounded-full px-3 py-1.5 text-sm text-muted">
                              Cancelar
                            </button>
                          )
                        )}
                        {booking.status === "pasada" && !booking.reviewed && (
                          <button type="button" onClick={() => { setReviewFor(booking.id); setRating(5); setText(""); }} className="rounded-full bg-ink px-3 py-1.5 text-sm text-paper">
                            Escribir reseña
                          </button>
                        )}
                        {booking.reviewed && <span className="self-center text-xs text-moss">Reseña enviada</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {reviewFor && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const booking = nido.bookings.find((item) => item.id === reviewFor);
              if (!booking || text.trim().length < 12) {
                nido.toast("Cuéntalo con un poco más de detalle");
                return;
              }
              nido.addReview(booking.propertyId, rating, text, booking.id);
              setReviewFor(null);
            }}
            className="w-full max-w-md rounded-3xl bg-card p-5"
          >
            <h3 className="font-serif text-2xl">Tu reseña</h3>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} estrellas`} className="p-1">
                  <Star className={cn("h-6 w-6", value <= rating ? "fill-ink" : "fill-sand")} />
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} placeholder="Qué se queda de esa casa" className="mt-3 w-full rounded-2xl border border-line bg-paper p-3 text-sm outline-none" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setReviewFor(null)} className="rounded-full px-4 py-2 text-sm">Cerrar</button>
              <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Publicar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function MessagesView() {
  const nido = useNido();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const thread = nido.threads.find((item) => item.id === nido.activeThread) ?? null;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread?.id, thread?.messages.length]);

  useEffect(() => {
    if (thread?.unread) nido.setActiveThread(thread.id);
  }, [thread?.id, thread?.unread, nido]);

  return (
    <div className="mx-auto grid h-[calc(100dvh-72px)] max-w-6xl md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={cn("overflow-auto border-line md:border-r", thread && "hidden md:block")}>
        <div className="px-4 py-4">
          <h1 className="font-serif text-3xl">Mensajes</h1>
          <p className="text-sm text-muted">Conversaciones con anfitriones.</p>
        </div>
        {nido.threads.length === 0 && <p className="px-4 text-sm text-muted">Cuando escribas a alguien, el hilo aparecerá aquí.</p>}
        {nido.threads.map((item) => {
          const host = nido.hosts.find((person) => person.id === item.hostId);
          const property = nido.properties.find((place) => place.id === item.propertyId);
          const last = item.messages[item.messages.length - 1];
          if (!host) return null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => nido.setActiveThread(item.id)}
              className={cn("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sand", thread?.id === item.id && "bg-sand")}
            >
              <Avatar src={host.avatar} name={host.name} className="h-11 w-11 rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{host.name}</span>
                  {item.unread && <span className="h-2 w-2 rounded-full bg-clay" />}
                </span>
                <span className="block truncate text-xs text-muted">{property?.title}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">{last?.text ?? "Empieza la conversación"}</span>
              </span>
            </button>
          );
        })}
      </aside>
      <section className={cn("flex min-h-0 flex-col", !thread && "hidden md:flex")}>
        {thread ? <Conversation threadId={thread.id} draft={draft} setDraft={setDraft} end={end} /> : <div className="grid flex-1 place-items-center text-sm text-muted">Elige una conversación</div>}
      </section>
    </div>
  );
}

function Conversation({
  threadId,
  draft,
  setDraft,
  end,
}: {
  threadId: string;
  draft: string;
  setDraft: (value: string) => void;
  end: RefObject<HTMLDivElement | null>;
}) {
  const nido = useNido();
  const thread = nido.threads.find((item) => item.id === threadId);
  if (!thread) return null;
  const host = nido.hosts.find((item) => item.id === thread.hostId);
  const property = nido.properties.find((item) => item.id === thread.propertyId);
  if (!host || !property) return null;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" className="md:hidden" onClick={() => nido.setActiveThread(null)} aria-label="Volver a la lista">
          <Icon d={paths.chevronLeft} className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => nido.openProfile(host.id)} className="flex items-center gap-3 text-left">
          <Avatar src={host.avatar} name={host.name} className="h-10 w-10 rounded-full" />
          <span>
            <span className="block text-sm font-medium">{host.name}</span>
            <span className="block text-xs text-muted">Responde {host.responseTime}</span>
          </span>
        </button>
        <button type="button" onClick={() => nido.openProperty(property.id)} className="ml-auto hidden text-sm underline sm:inline">
          {property.title}
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
        <button type="button" onClick={() => nido.openProperty(property.id)} className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-card p-2 text-left">
          <img src={property.images[0]} alt="" className="h-14 w-16 rounded-xl object-cover" />
          <span>
            <span className="block text-sm font-medium">{property.title}</span>
            <span className="block text-xs text-muted">{money(property.price)} / noche</span>
          </span>
        </button>
        {thread.messages.length === 0 && <p className="text-center text-sm text-muted">Escribe a {host.name.split(" ")[0]} sobre {property.title}.</p>}
        {thread.messages.map((message) => (
          <div key={message.id} className={cn("flex", message.from === "me" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed", message.from === "me" ? "bg-ink text-paper" : "bg-card ring-1 ring-line")}>
              <p>{message.text}</p>
              <p className={cn("mt-1 text-[10px]", message.from === "me" ? "text-paper/60" : "text-muted")}>{message.time}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          nido.sendMessage(thread.id, draft);
          setDraft("");
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Mensaje para ${host.name.split(" ")[0]}`} className="flex-1 rounded-full border border-line bg-card px-4 py-3 text-sm outline-none" />
        <button type="submit" className="grid h-12 w-12 place-items-center rounded-full bg-clay text-white" aria-label="Enviar">
          <Icon d={paths.send} className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}

export function PublishView() {
  const nido = useNido();
  const [step, setStep] = useState(0);
  const [type, setType] = useState("Apartamento");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("España");
  const [category, setCategory] = useState<CategoryId>("ciudad");
  const [guests, setGuests] = useState(2);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [price, setPrice] = useState(120);
  const [image, setImage] = useState(COVERS[0].url);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const next = () => {
    if (step === 0 && (title.trim().length < 4 || city.trim().length < 2)) {
      setError("Pon un título y una ciudad.");
      return;
    }
    if (step === 1 && price < 40) {
      setError("El precio mínimo de demostración es 40 €.");
      return;
    }
    if (step === 2 && description.trim().length < 40) {
      setError("Describe la casa en al menos un párrafo corto.");
      return;
    }
    setError("");
    if (step < 2) setStep(step + 1);
    else {
      nido.publishListing({ type, title, city, country, category, guests, bedrooms, beds, baths, price, description, image });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-clay">Anunciar</p>
      <h1 className="mt-2 font-serif text-4xl">Abre tu casa en Nido.</h1>
      <div className="mt-6 flex gap-2">
        {["El lugar", "La casa", "La voz"].map((label, index) => (
          <button key={label} type="button" onClick={() => setStep(index)} className={cn("h-1.5 flex-1 rounded-full", index <= step ? "bg-clay" : "bg-line")} aria-label={label} />
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{["El lugar", "La casa", "La voz"][step]}</p>

      {step === 0 && (
        <div className="mt-6 space-y-4">
          <Field label="Tipo">
            <select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-2xl border border-line bg-card px-3 py-3">
              {["Apartamento", "Loft", "Villa", "Cabaña", "Casa", "Casa rural", "Finca", "Único"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Título">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Casa con patio y tarde larga" className="w-full rounded-2xl border border-line bg-card px-3 py-3 outline-none" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ciudad">
              <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Valencia" className="w-full rounded-2xl border border-line bg-card px-3 py-3 outline-none" />
            </Field>
            <Field label="País">
              <input value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-2xl border border-line bg-card px-3 py-3 outline-none" />
            </Field>
          </div>
          <Field label="Categoría">
            <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)} className="w-full rounded-2xl border border-line bg-card px-3 py-3">
              <option value="ciudad">Ciudad</option>
              <option value="playa">Playa</option>
              <option value="montana">Montaña</option>
              <option value="campo">Campo</option>
              <option value="diseno">Diseño</option>
              <option value="lagos">Lagos</option>
              <option value="unicos">Únicos</option>
              <option value="piscina">Piscina</option>
            </select>
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Num label="Huéspedes" value={guests} set={setGuests} min={1} max={16} />
            <Num label="Dormitorios" value={bedrooms} set={setBedrooms} min={1} max={10} />
            <Num label="Camas" value={beds} set={setBeds} min={1} max={16} />
            <Num label="Baños" value={baths} set={setBaths} min={1} max={8} />
          </div>
          <Field label="Precio por noche">
            <input type="number" min={40} value={price} onChange={(event) => setPrice(Number(event.target.value))} className="w-full rounded-2xl border border-line bg-card px-3 py-3 outline-none" />
          </Field>
          <p className="text-sm text-muted">Elige una cubierta. En este prototipo no se suben archivos.</p>
          <div className="grid grid-cols-3 gap-2">
            {COVERS.map((cover) => (
              <button key={cover.id} type="button" onClick={() => setImage(cover.url)} className={cn("overflow-hidden rounded-2xl ring-2", image === cover.url ? "ring-clay" : "ring-transparent")}>
                <img src={cover.url} alt={cover.label} className="h-24 w-full object-cover" />
                <span className="block bg-card px-2 py-1 text-xs">{cover.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <Field label="Descripción">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={7} placeholder="Cómo entra la luz, qué se oye por la mañana, para quién es esta casa." className="w-full rounded-2xl border border-line bg-card px-3 py-3 outline-none" />
          </Field>
          <p className="mt-2 text-xs text-muted">{description.trim().length} caracteres · mínimo 40</p>
          <div className="mt-4 rounded-2xl bg-sand p-4 text-sm">
            <p className="font-medium">{title || "Sin título"}</p>
            <p className="text-muted">{type} en {city || "…"}, {country} · {money(price)} / noche</p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-clay">{error}</p>}
      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} className="rounded-full px-4 py-2 text-sm" disabled={step === 0}>
          Atrás
        </button>
        <button type="button" onClick={next} className="rounded-full bg-clay px-5 py-3 text-sm font-medium text-white">
          {step === 2 ? "Publicar en Nido" : "Continuar"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-3 py-3">
      <p className="font-serif text-2xl">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="rounded-full bg-sand px-3 py-1 text-xs">{children}</span>;
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="mt-8 rounded-[28px] border border-dashed border-line px-6 py-14 text-center">
      <p className="font-serif text-3xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{text}</p>
      <button type="button" onClick={onAction} className="mt-5 rounded-full bg-ink px-5 py-3 text-sm text-paper">
        {action}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function Num({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-sm">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => set(Math.max(min, value - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-line">−</button>
        <span className="font-medium">{value}</span>
        <button type="button" onClick={() => set(Math.min(max, value + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-ink">+</button>
      </div>
    </div>
  );
}
