import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COVERS, hosts as seedHosts, ME_ID, posts as seedPosts, properties as seedProperties, threads as seedThreads } from "./data";
import { loadJson, quote, shiftDays, uid } from "./lib";
import type {
  Booking,
  FeedPost,
  Host,
  Property,
  PublishInput,
  SearchQuery,
  Thread,
  View,
} from "./types";

export const defaultSearch: SearchQuery = {
  where: "",
  checkIn: null,
  checkOut: null,
  adults: 1,
  children: 0,
  infants: 0,
  pets: 0,
  category: "todas",
  maxPrice: 800,
  instantOnly: false,
  petsOnly: false,
  sort: "recomendados",
  type: "",
};

interface Toast {
  id: string;
  text: string;
}

interface Nido {
  view: View;
  setView: (view: View) => void;
  propertyId: string | null;
  openProperty: (id: string) => void;
  userId: string;
  openProfile: (id: string) => void;
  properties: Property[];
  hosts: Host[];
  me: Host;
  search: SearchQuery;
  patchSearch: (patch: Partial<SearchQuery>) => void;
  pickDate: (date: string) => void;
  clearDates: () => void;
  resetFilters: () => void;
  resetSearch: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  bookings: Booking[];
  addBooking: (input: Omit<Booking, "id" | "status" | "reviewed">) => void;
  cancelBooking: (id: string) => void;
  posts: FeedPost[];
  liked: string[];
  toggleLike: (id: string) => void;
  savedPosts: string[];
  toggleSavePost: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  addPost: (input: { caption: string; propertyId?: string; kind: FeedPost["kind"] }) => void;
  threads: Thread[];
  activeThread: string | null;
  setActiveThread: (id: string | null) => void;
  sendMessage: (threadId: string, text: string) => void;
  openThreadWith: (hostId: string, propertyId: string, greeting?: string) => void;
  following: string[];
  toggleFollow: (id: string) => void;
  toast: (text: string) => void;
  toasts: Toast[];
  publishListing: (input: PublishInput) => void;
  addReview: (propertyId: string, rating: number, text: string, bookingId: string) => void;
  updateBio: (text: string) => void;
  mapMode: boolean;
  setMapMode: (value: boolean) => void;
  highlightId: string | null;
  setHighlightId: (id: string | null) => void;
  recent: string[];
  remember: (where: string) => void;
  unreadCount: number;
}

const Ctx = createContext<Nido | null>(null);

export function useNido() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useNido fuera de proveedor");
  return value;
}

const pastIn = shiftDays(-46);
const pastOut = shiftDays(-43);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("explore");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [userId, setUserId] = useState(ME_ID);
  const [properties, setProperties] = useState<Property[]>(seedProperties);
  const [hosts, setHosts] = useState<Host[]>(seedHosts);
  const [search, setSearch] = useState<SearchQuery>(defaultSearch);
  const [favorites, setFavorites] = useState<string[]>(() => loadJson("nido-favs", ["cala-serena", "ryokan-shizuka", "casa-copas"]));
  const [bookings, setBookings] = useState<Booking[]>(() =>
    loadJson("nido-trips", [
      {
        id: "bk-past",
        propertyId: "atico-chamberi",
        checkIn: pastIn,
        checkOut: pastOut,
        guests: 2,
        total: quote(seedProperties.find((p) => p.id === "atico-chamberi")!, pastIn, pastOut).total,
        status: "pasada",
        note: "Llegamos tarde. Gracias por la flexibilidad con las llaves.",
        reviewed: false,
      },
    ] satisfies Booking[]),
  );
  const [posts, setPosts] = useState<FeedPost[]>(seedPosts);
  const [liked, setLiked] = useState<string[]>(() => loadJson("nido-likes", ["p4"]));
  const [savedPosts, setSavedPosts] = useState<string[]>(() => loadJson("nido-saved-posts", ["p6"]));
  const [threads, setThreads] = useState<Thread[]>(seedThreads);
  const [activeThread, setActiveThreadState] = useState<string | null>("th-lucia");
  const [following, setFollowing] = useState<string[]>(() => loadJson("nido-follow", ["lucia", "kenji", "jordi"]));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mapMode, setMapMode] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() => loadJson("nido-recent", ["Deià", "Kioto"]));

  useEffect(() => localStorage.setItem("nido-favs", JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem("nido-trips", JSON.stringify(bookings)), [bookings]);
  useEffect(() => localStorage.setItem("nido-likes", JSON.stringify(liked)), [liked]);
  useEffect(() => localStorage.setItem("nido-saved-posts", JSON.stringify(savedPosts)), [savedPosts]);
  useEffect(() => localStorage.setItem("nido-follow", JSON.stringify(following)), [following]);
  useEffect(() => localStorage.setItem("nido-recent", JSON.stringify(recent)), [recent]);

  const toast = (text: string) => {
    const id = uid("t");
    setToasts((list) => [...list, { id, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 2800);
  };

  const me = hosts.find((h) => h.id === ME_ID) ?? seedHosts[seedHosts.length - 1];

  const openProperty = (id: string) => {
    setPropertyId(id);
    setView("detail");
  };

  const openProfile = (id: string) => {
    setUserId(id);
    setView("profile");
  };

  const patchSearch = (patch: Partial<SearchQuery>) => setSearch((s) => ({ ...s, ...patch }));

  const pickDate = (date: string) => {
    setSearch((s) => {
      if (!s.checkIn || s.checkOut) return { ...s, checkIn: date, checkOut: null };
      if (date <= s.checkIn) return { ...s, checkIn: date, checkOut: null };
      return { ...s, checkOut: date };
    });
  };

  const clearDates = () => setSearch((s) => ({ ...s, checkIn: null, checkOut: null }));

  const resetFilters = () =>
    setSearch((s) => ({
      ...s,
      category: "todas",
      maxPrice: 800,
      instantOnly: false,
      petsOnly: false,
      sort: "recomendados",
      type: "",
    }));

  const resetSearch = () => setSearch(defaultSearch);

  const toggleFavorite = (id: string) => {
    setFavorites((list) => {
      const has = list.includes(id);
      toast(has ? "Quitada de guardados" : "Guardada en tu lista");
      return has ? list.filter((item) => item !== id) : [id, ...list];
    });
  };

  const addBooking = (input: Omit<Booking, "id" | "status" | "reviewed">) => {
    const booking: Booking = { ...input, id: uid("bk"), status: "proxima", reviewed: false };
    setBookings((list) => [booking, ...list]);
    const property = properties.find((p) => p.id === input.propertyId);
    const host = hosts.find((h) => h.id === property?.hostId);
    if (property && host && host.id !== ME_ID) {
      const existing = threads.find((t) => t.hostId === host.id && t.propertyId === property.id);
      const threadId = existing?.id ?? uid("th");
      const stamp = "Ahora";
      const extra = [
        { id: uid("m"), from: "me" as const, text: `Reserva confirmada para ${property.title}. ${input.note || "Llegamos con ganas."}`, time: stamp },
        {
          id: uid("m"),
          from: "them" as const,
          text: `Recibido, Marina. Te esperamos en ${property.city}. Si llegas después de las 20 h, avísame y dejo la luz encendida.`,
          time: stamp,
        },
      ];
      setThreads((list) => {
        const found = list.find((t) => t.id === threadId);
        if (!found) {
          return [{ id: threadId, hostId: host.id, propertyId: property.id, unread: false, messages: extra }, ...list];
        }
        return list.map((thread) =>
          thread.id === threadId ? { ...thread, unread: false, messages: [...thread.messages, ...extra] } : thread,
        );
      });
      setActiveThreadState(threadId);
    }
    toast("Reserva confirmada");
  };

  const cancelBooking = (id: string) => {
    setBookings((list) => list.map((b) => (b.id === id ? { ...b, status: "cancelada" } : b)));
    toast("Reserva cancelada");
  };

  const toggleLike = (id: string) => {
    setLiked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
    setPosts((list) =>
      list.map((post) =>
        post.id === id ? { ...post, likes: post.likes + (liked.includes(id) ? -1 : 1) } : post,
      ),
    );
  };

  const toggleSavePost = (id: string) => {
    setSavedPosts((list) => {
      const has = list.includes(id);
      toast(has ? "Nota quitada" : "Nota guardada");
      return has ? list.filter((item) => item !== id) : [id, ...list];
    });
  };

  const addComment = (postId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setPosts((list) =>
      list.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, { id: uid("c"), author: me.name, text: clean }] }
          : post,
      ),
    );
  };

  const addPost = (input: { caption: string; propertyId?: string; kind: FeedPost["kind"] }) => {
    const property = properties.find((p) => p.id === input.propertyId);
    const post: FeedPost = {
      id: uid("p"),
      authorId: ME_ID,
      propertyId: property?.id,
      image: property?.images[0] ?? COVERS[2].url,
      caption: input.caption.trim(),
      place: property ? `${property.city}, ${property.region}` : "En el camino",
      time: "ahora",
      likes: 0,
      comments: [],
      kind: input.kind,
    };
    setPosts((list) => [post, ...list]);
    toast("Publicado en el feed");
  };

  const setActiveThread = (id: string | null) => {
    setActiveThreadState(id);
    if (!id) return;
    setThreads((list) => list.map((thread) => (thread.id === id ? { ...thread, unread: false } : thread)));
  };

  const sendMessage = (threadId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setThreads((list) =>
      list.map((thread) =>
        thread.id === threadId
          ? { ...thread, messages: [...thread.messages, { id: uid("m"), from: "me", text: clean, time: "Ahora" }] }
          : thread,
      ),
    );
  };

  const openThreadWith = (hostId: string, propertyIdValue: string, greeting?: string) => {
    let id = threads.find((t) => t.hostId === hostId && t.propertyId === propertyIdValue)?.id;
    if (!id) {
      id = uid("th");
      const starter = greeting
        ? [{ id: uid("m"), from: "me" as const, text: greeting, time: "Ahora" }]
        : [];
      setThreads((list) => [{ id: id!, hostId, propertyId: propertyIdValue, unread: false, messages: starter }, ...list]);
    }
    setActiveThread(id);
    setView("messages");
  };

  const toggleFollow = (id: string) => {
    setFollowing((list) => {
      const has = list.includes(id);
      const host = hosts.find((h) => h.id === id);
      toast(has ? `Dejaste de seguir a ${host?.name.split(" ")[0] ?? "este perfil"}` : `Sigues a ${host?.name.split(" ")[0] ?? "este perfil"}`);
      return has ? list.filter((item) => item !== id) : [...list, id];
    });
  };

  const publishListing = (input: PublishInput) => {
    const extra = COVERS.find((c) => c.url !== input.image)?.url ?? input.image;
    const property: Property = {
      id: uid("casa"),
      title: input.title.trim(),
      type: input.type,
      city: input.city.trim(),
      region: input.city.trim(),
      country: input.country.trim() || "España",
      categories: [input.category],
      price: input.price,
      cleaning: 35,
      rating: 0,
      reviewsCount: 0,
      images: [input.image, extra, COVERS[5].url],
      hostId: ME_ID,
      guests: input.guests,
      bedrooms: input.bedrooms,
      beds: input.beds,
      baths: input.baths,
      description: input.description.trim(),
      highlights: [
        { title: "Recién publicada", text: "Eres la primera persona en anunciar este espacio en Nido." },
        { title: "Llegada a convenir", text: "Acuerda la entrada por mensaje cuando llegue la primera reserva." },
      ],
      amenities: ["Wifi", "Cocina", "Llegada autónoma", "Calefacción"],
      rules: ["No fumar dentro", "Sin fiestas", "Tratar la casa como propia"],
      cancel: "flexible",
      x: 38 + Math.round(Math.random() * 16),
      y: 36 + Math.round(Math.random() * 18),
      petFriendly: false,
      instant: true,
      guestFavorite: false,
      minNights: 1,
      reviews: [],
      isNew: true,
    };
    setProperties((list) => [property, ...list]);
    setPropertyId(property.id);
    setView("detail");
    toast("Tu espacio ya está en Nido");
  };

  const addReview = (propertyIdValue: string, rating: number, text: string, bookingId: string) => {
    setProperties((list) =>
      list.map((property) => {
        if (property.id !== propertyIdValue) return property;
        const reviewsCount = property.reviewsCount + 1;
        const nextRating =
          property.reviewsCount === 0
            ? rating
            : Math.round(((property.rating * property.reviewsCount + rating) / reviewsCount) * 100) / 100;
        return {
          ...property,
          reviewsCount,
          rating: nextRating,
          reviews: [
            { id: uid("r"), author: me.name, date: "ahora", rating, text: text.trim() },
            ...property.reviews,
          ],
        };
      }),
    );
    setBookings((list) => list.map((b) => (b.id === bookingId ? { ...b, reviewed: true } : b)));
    toast("Reseña publicada");
  };

  const updateBio = (text: string) => {
    setHosts((list) => list.map((host) => (host.id === ME_ID ? { ...host, bio: text.trim() } : host)));
    toast("Perfil actualizado");
  };

  const remember = (where: string) => {
    const clean = where.trim();
    if (!clean) return;
    setRecent((list) => [clean, ...list.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 4));
  };

  const unreadCount = threads.filter((t) => t.unread).length;

  const value = useMemo<Nido>(
    () => ({
      view,
      setView,
      propertyId,
      openProperty,
      userId,
      openProfile,
      properties,
      hosts,
      me,
      search,
      patchSearch,
      pickDate,
      clearDates,
      resetFilters,
      resetSearch,
      favorites,
      toggleFavorite,
      bookings,
      addBooking,
      cancelBooking,
      posts,
      liked,
      toggleLike,
      savedPosts,
      toggleSavePost,
      addComment,
      addPost,
      threads,
      activeThread,
      setActiveThread,
      sendMessage,
      openThreadWith,
      following,
      toggleFollow,
      toast,
      toasts,
      publishListing,
      addReview,
      updateBio,
      mapMode,
      setMapMode,
      highlightId,
      setHighlightId,
      recent,
      remember,
      unreadCount,
    }),
    [
      view,
      propertyId,
      userId,
      properties,
      hosts,
      me,
      search,
      favorites,
      bookings,
      posts,
      liked,
      savedPosts,
      threads,
      activeThread,
      following,
      toasts,
      mapMode,
      highlightId,
      recent,
      unreadCount,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
