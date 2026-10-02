import { useState } from "react";
import { useNido } from "@/store";
import type { FeedPost } from "@/types";
import { cn } from "@/utils/cn";
import { Avatar, Icon, paths } from "./ui";

const filters = [
  { id: "todos", label: "Todo" },
  { id: "anfitrion", label: "Anfitriones" },
  { id: "viajero", label: "Viajeros" },
  { id: "guia", label: "Guías" },
  { id: "siguiendo", label: "Siguiendo" },
] as const;

export function Feed() {
  const nido = useNido();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("todos");
  const [caption, setCaption] = useState("");
  const [propertyId, setPropertyId] = useState(nido.properties[0]?.id ?? "");
  const [kind, setKind] = useState<FeedPost["kind"]>("viajero");
  const [openComments, setOpenComments] = useState<string | null>(null);

  const visible = nido.posts.filter((post) => {
    if (filter === "todos") return true;
    if (filter === "siguiendo") return nido.following.includes(post.authorId) || post.authorId === nido.me.id;
    return post.kind === filter;
  });

  const publish = () => {
    if (caption.trim().length < 8) {
      nido.toast("Escribe un poco más");
      return;
    }
    nido.addPost({ caption, propertyId, kind });
    setCaption("");
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,640px)_280px]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-clay">Cuaderno de viaje</p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Lo que se ve desde la casa.</h1>
        <p className="mt-3 max-w-lg text-muted">Notas de anfitriones, guías cortas y recuerdos de quien ya se quedó. No es un tablón: es el contexto de cada estancia.</p>

        <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto pb-1">
          {nido.hosts
            .filter((host) => host.id !== nido.me.id)
            .map((host) => (
              <button key={host.id} type="button" onClick={() => nido.openProfile(host.id)} className="w-16 shrink-0 text-center">
                <Avatar src={host.avatar} name={host.name} className="mx-auto h-14 w-14 rounded-full ring-2 ring-card ring-offset-2 ring-offset-paper" />
                <span className="mt-1 block truncate text-[11px] text-muted">{host.name.split(" ")[0]}</span>
              </button>
            ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            publish();
          }}
          className="mt-6 rounded-[28px] border border-line bg-card p-4"
        >
          <div className="flex gap-3">
            <Avatar src={nido.me.avatar} name={nido.me.name} className="h-10 w-10 rounded-full" />
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="¿Qué viste en el camino?"
              rows={3}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="rounded-full border border-line bg-paper px-3 py-2 text-sm" aria-label="Lugar">
              {nido.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.city} · {property.title}
                </option>
              ))}
            </select>
            <select value={kind} onChange={(event) => setKind(event.target.value as FeedPost["kind"])} className="rounded-full border border-line bg-paper px-3 py-2 text-sm" aria-label="Tipo de nota">
              <option value="viajero">Viaje</option>
              <option value="guia">Guía</option>
              <option value="anfitrion">Casa</option>
            </select>
            <button type="submit" className="ml-auto rounded-full bg-ink px-4 py-2 text-sm text-paper">
              Publicar
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn("rounded-full px-3 py-1.5 text-sm", filter === item.id ? "bg-ink text-paper" : "bg-sand text-ink")}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-8">
          {visible.length === 0 && <p className="rounded-3xl border border-dashed border-line px-4 py-12 text-center text-muted">Nada en este filtro. Sigue a alguien o publica la primera nota.</p>}
          {visible.map((post) => {
            const author = nido.hosts.find((host) => host.id === post.authorId);
            const liked = nido.liked.includes(post.id);
            const saved = nido.savedPosts.includes(post.id);
            if (!author) return null;
            return (
              <article key={post.id} className="overflow-hidden rounded-[28px] border border-line bg-card">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button type="button" onClick={() => nido.openProfile(author.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar src={author.avatar} name={author.name} className="h-11 w-11 rounded-full" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{author.name}</span>
                      <span className="block text-xs text-muted">
                        {post.place} · {post.time} · {labelKind(post.kind)}
                      </span>
                    </span>
                  </button>
                  {author.id !== nido.me.id && (
                    <button type="button" onClick={() => nido.toggleFollow(author.id)} className="text-sm font-medium text-clay">
                      {nido.following.includes(author.id) ? "Siguiendo" : "Seguir"}
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => post.propertyId && nido.openProperty(post.propertyId)} className="block w-full">
                  <img src={post.image} alt="" className="aspect-[5/4] w-full object-cover sm:aspect-[16/10]" />
                </button>
                <div className="px-4 py-4">
                  <p className="font-serif text-xl leading-snug md:text-2xl">{post.caption}</p>
                  <div className="mt-4 flex items-center gap-1">
                    <button type="button" onClick={() => nido.toggleLike(post.id)} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm", liked && "text-clay")} aria-pressed={liked}>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                        <path d={paths.heart} className={liked ? "fill-clay stroke-clay" : "fill-none stroke-current"} strokeWidth="1.7" />
                      </svg>
                      {post.likes}
                    </button>
                    <button type="button" onClick={() => setOpenComments(openComments === post.id ? null : post.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm">
                      <Icon d={paths.message} className="h-4 w-4" />
                      {post.comments.length}
                    </button>
                    <button type="button" onClick={() => nido.toggleSavePost(post.id)} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm" aria-pressed={saved}>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                        <path d={paths.bookmark} className={saved ? "fill-ink stroke-ink" : "fill-none stroke-current"} strokeWidth="1.7" />
                      </svg>
                      {saved ? "Guardada" : "Guardar"}
                    </button>
                  </div>
                  {(openComments === post.id || post.comments.length > 0) && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      {post.comments.map((comment) => (
                        <p key={comment.id} className="text-sm">
                          <span className="font-medium">{comment.author}</span> <span className="text-ink/80">{comment.text}</span>
                        </p>
                      ))}
                      {openComments === post.id && <CommentBox onSend={(text) => nido.addComment(post.id, text)} />}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-[24px] border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Para seguir</p>
            <div className="mt-3 space-y-3">
              {nido.hosts
                .filter((host) => host.id !== nido.me.id && !nido.following.includes(host.id))
                .slice(0, 4)
                .map((host) => (
                  <div key={host.id} className="flex items-center gap-3">
                    <button type="button" onClick={() => nido.openProfile(host.id)}>
                      <Avatar src={host.avatar} name={host.name} className="h-10 w-10 rounded-full" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{host.name}</p>
                      <p className="truncate text-xs text-muted">{host.work}</p>
                    </div>
                    <button type="button" onClick={() => nido.toggleFollow(host.id)} className="text-xs font-medium">
                      Seguir
                    </button>
                  </div>
                ))}
              {nido.hosts.filter((host) => host.id !== nido.me.id && !nido.following.includes(host.id)).length === 0 && (
                <p className="text-sm text-muted">Sigues a todo el vecindario.</p>
              )}
            </div>
          </div>
          <div className="rounded-[24px] bg-moss p-5 text-paper">
            <p className="font-serif text-2xl">Una casa se entiende mejor con la voz de quien la abre.</p>
            <button type="button" onClick={() => nido.setView("explore")} className="mt-4 rounded-full bg-paper px-4 py-2 text-sm text-ink">
              Volver a las casas
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CommentBox({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onSend(text);
        setText("");
      }}
      className="flex gap-2"
    >
      <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe un comentario" className="flex-1 rounded-full border border-line bg-paper px-3 py-2 text-sm outline-none" />
      <button type="submit" className="rounded-full bg-ink px-3 text-sm text-paper" aria-label="Enviar comentario">
        <Icon d={paths.send} className="h-4 w-4" />
      </button>
    </form>
  );
}

function labelKind(kind: FeedPost["kind"]) {
  if (kind === "guia") return "Guía";
  if (kind === "anfitrion") return "Casa";
  return "Viaje";
}
