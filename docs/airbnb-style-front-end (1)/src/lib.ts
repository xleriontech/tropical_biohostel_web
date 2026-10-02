import type { Property, SearchQuery } from "./types";

export function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string) {
  return new Date(`${s}T12:00:00`);
}

export function shiftDays(n: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function nightsBetween(a: string, b: string) {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
}

export function money(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ratingLabel(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function strip(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function formatDay(s: string) {
  return parseIso(s).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function formatLong(s: string) {
  return parseIso(s).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export function formatRange(a: string | null, b: string | null) {
  if (!a) return "Añade fechas";
  if (!b) return formatDay(a);
  if (parseIso(a).getMonth() === parseIso(b).getMonth()) {
    return `${parseIso(a).getDate()}–${formatDay(b)}`;
  }
  return `${formatDay(a)} – ${formatDay(b)}`;
}

export function todayIso() {
  return iso(new Date());
}

export function isPast(date: string) {
  return date < todayIso();
}

export function isBlocked(propertyId: string, date: string) {
  let h = 0;
  for (let i = 0; i < propertyId.length; i++) h = (h * 33 + propertyId.charCodeAt(i)) >>> 0;
  const d = parseIso(date);
  return (h + d.getDate() * 5 + d.getMonth() * 13) % 10 === 0;
}

export function rangeBlocked(propertyId: string, start: string, end: string) {
  const cursor = parseIso(start);
  const last = parseIso(end);
  while (cursor < last) {
    if (isBlocked(propertyId, iso(cursor))) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

export function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day++) cells.push(iso(new Date(year, month, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function monthTitle(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function guestCount(q: Pick<SearchQuery, "adults" | "children">) {
  return q.adults + q.children;
}

export function guestLabel(q: Pick<SearchQuery, "adults" | "children" | "infants" | "pets">) {
  const g = q.adults + q.children;
  const parts = [`${g} huésped${g === 1 ? "" : "es"}`];
  if (q.infants) parts.push(`${q.infants} bebé${q.infants === 1 ? "" : "s"}`);
  if (q.pets) parts.push(`${q.pets} mascota${q.pets === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function placeLine(p: Pick<Property, "city" | "region" | "country">) {
  if (p.region === p.city) return `${p.city}, ${p.country}`;
  return `${p.city}, ${p.region}`;
}

export function quote(property: Property, checkIn: string | null, checkOut: string | null) {
  const nights = checkIn && checkOut ? Math.max(nightsBetween(checkIn, checkOut), 0) : 0;
  const stay = property.price * nights;
  const cleaning = nights > 0 ? property.cleaning : 0;
  const service = nights > 0 ? Math.round(stay * 0.08) : 0;
  return { nights, stay, cleaning, service, total: stay + cleaning + service };
}

export function cancelCopy(kind: Property["cancel"]) {
  if (kind === "flexible") {
    return "Cancelación flexible. Reembolso íntegro si cancelas al menos 5 días antes de la llegada.";
  }
  if (kind === "moderada") {
    return "Cancelación moderada. Reembolso íntegro hasta 7 días antes; después se retiene la primera noche.";
  }
  return "Cancelación estricta. Reembolso del 50% si cancelas al menos 14 días antes.";
}

export function filterProperties(list: Property[], q: SearchQuery) {
  const where = strip(q.where);
  const guests = guestCount(q);
  let hiddenByDates = 0;

  const items = list.filter((p) => {
    if (where) {
      const hay = strip(`${p.title} ${p.city} ${p.region} ${p.country} ${p.type}`);
      if (!hay.includes(where)) return false;
    }
    if (q.category !== "todas" && !p.categories.includes(q.category)) return false;
    if (q.maxPrice < 800 && p.price > q.maxPrice) return false;
    if (q.instantOnly && !p.instant) return false;
    if ((q.petsOnly || q.pets > 0) && !p.petFriendly) return false;
    if (q.type && p.type !== q.type) return false;
    if (guests > p.guests) return false;
    if (q.checkIn && q.checkOut && rangeBlocked(p.id, q.checkIn, q.checkOut)) {
      hiddenByDates += 1;
      return false;
    }
    return true;
  });

  const score = (p: Property) =>
    (p.guestFavorite ? 3 : 0) + p.rating * 2 + Math.min(p.reviewsCount, 180) / 180;

  items.sort((a, b) => {
    if (q.sort === "precio-asc") return a.price - b.price;
    if (q.sort === "precio-desc") return b.price - a.price;
    if (q.sort === "valoracion") return b.rating - a.rating || b.reviewsCount - a.reviewsCount;
    return score(b) - score(a);
  });

  return { items, hiddenByDates };
}

export function suggestions(list: Property[], q: string) {
  const n = strip(q);
  const places = new Map<string, { label: string; sub: string; image: string }>();
  for (const p of list) {
    if (!places.has(p.city)) {
      places.set(p.city, {
        label: p.city,
        sub: placeLine(p),
        image: p.images[0],
      });
    }
  }
  const all = [...places.values()];
  if (!n) return all.slice(0, 6);
  return all.filter((p) => strip(`${p.label} ${p.sub}`).includes(n)).slice(0, 6);
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
