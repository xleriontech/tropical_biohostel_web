import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { isBlocked, isPast, monthMatrix, monthTitle, rangeBlocked } from "@/lib";
import { useNido } from "@/store";
import type { SearchQuery } from "@/types";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="10" className="fill-moss" />
      <path d="M8 17.2c0-4.8 3.5-8.4 8-8.4s8 3.6 8 8.4" fill="none" stroke="#f6f1ea" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.8 19.6h18.4" stroke="#f6f1ea" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.2 19.6c.45 2.5 2 4 4.8 4s4.35-1.5 4.8-4" fill="none" stroke="#e7b5a4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({ src, name, className }: { src?: string; name: string; className?: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const tones = ["bg-moss", "bg-clay", "bg-ink", "bg-[#8d5a32]"];
  const tone = tones[name.charCodeAt(0) % tones.length];
  if (src) return <img src={src} alt="" className={cn("object-cover", className)} />;
  return (
    <span className={cn("grid place-items-center font-medium text-paper", tone, className)} aria-hidden>
      {initials}
    </span>
  );
}

export function Star({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("fill-ink", className)} aria-hidden>
      <path d="M10 1.8 12.4 7l5.6.5-4.3 3.6 1.3 5.4L10 13.8 5 16.5l1.3-5.4L2 7.5 7.6 7 10 1.8Z" />
    </svg>
  );
}

export function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const paths = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3",
  heart: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z",
  share: "M12 16V4m0 0 4 4M12 4 8 8M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  message: "M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  users: "M16 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 7v-1a3 3 0 0 0-2.2-2.9M16 6.1a3 3 0 0 1 0 5.8",
  check: "m5 12 5 5L20 7",
  map: "M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Zm0 0V4m6 2v14",
  list: "M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01",
  send: "m5 12 14-7-4 14-3-5-7-2Z",
  home: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8Z",
  bookmark: "M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  wave: "M3 14c1.5 1.2 2.5 1.2 4 0s2.5-1.2 4 0 2.5 1.2 4 0 2.5-1.2 4 0M3 18c1.5 1.2 2.5 1.2 4 0s2.5-1.2 4 0 2.5 1.2 4 0 2.5-1.2 4 0",
  peak: "m3 18 6-9 4 5 3-4 5 8H3Z",
  city: "M4 20V9l5-3v14M9 20V6l6-3v17M15 20V9h5v11",
  field: "M4 18c3-6 5-8 8-8s5 2 8 8M8 14c1-2 2-3 4-3s3 1 4 3",
  diamond: "m12 3 8 8-8 10L4 11 12 3Z",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z",
  pool: "M3 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0M8 16V7m0 0h3m3 9V9",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
};

export function Modal({
  open,
  onClose,
  children,
  className,
  dark = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button className={cn("absolute inset-0", dark ? "bg-ink/80" : "bg-ink/40 backdrop-blur-[2px]")} onClick={onClose} aria-label="Cerrar" />
      <div className={cn("relative z-10 max-h-[92vh] w-full overflow-auto", dark ? "" : "rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl", className)}>
        {children}
      </div>
    </div>
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Menos ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-lg leading-none disabled:opacity-30">
          −
        </button>
        <span className="w-5 text-center text-sm tabular-nums">{value}</span>
        <button type="button" aria-label={`Más ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-ink text-lg leading-none disabled:opacity-30">
          +
        </button>
      </div>
    </div>
  );
}

export function Calendar({ propertyId, compact = false }: { propertyId?: string; compact?: boolean }) {
  const { search, pickDate, toast, clearDates } = useNido();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const second = cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 };
  const atStart = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const choose = (date: string) => {
    if (isPast(date)) return;
    if (propertyId && isBlocked(propertyId, date)) {
      toast("Ese día está ocupado");
      return;
    }
    if (propertyId && search.checkIn && !search.checkOut && date > search.checkIn && rangeBlocked(propertyId, search.checkIn, date)) {
      toast("Esas fechas cruzan un día ocupado");
      return;
    }
    pickDate(date);
  };

  return (
    <div>
      <div className={cn("grid gap-8", compact ? "" : "md:grid-cols-2")}>
        <MonthGrid year={cursor.y} month={cursor.m} propertyId={propertyId} onPick={choose} search={search} />
        {!compact && (
          <div className="hidden md:block">
            <MonthGrid year={second.y} month={second.m} propertyId={propertyId} onPick={choose} search={search} />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={clearDates} className="text-sm underline decoration-line underline-offset-4">
          Borrar fechas
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={atStart}
            onClick={() => setCursor(cursor.m === 0 ? { y: cursor.y - 1, m: 11 } : { y: cursor.y, m: cursor.m - 1 })}
            className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-30"
          >
            <Icon d={paths.chevronLeft} className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => setCursor(cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 })}
            className="grid h-9 w-9 place-items-center rounded-full border border-line"
          >
            <Icon d={paths.chevron} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  propertyId,
  onPick,
  search,
}: {
  year: number;
  month: number;
  propertyId?: string;
  onPick: (date: string) => void;
  search: SearchQuery;
}) {
  const cells = monthMatrix(year, month);
  return (
    <div>
      <p className="mb-3 text-center font-medium">{monthTitle(year, month)}</p>
      <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wider text-muted">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, index) => {
          if (!date) return <span key={`e-${year}-${month}-${index}`} />;
          const past = isPast(date);
          const blocked = propertyId ? isBlocked(propertyId, date) : false;
          const start = date === search.checkIn;
          const end = date === search.checkOut;
          const inRange = Boolean(search.checkIn && search.checkOut && date > search.checkIn && date < search.checkOut);
          const disabled = past || blocked;
          return (
            <div
              key={date}
              className={cn(
                "py-0.5",
                inRange && "bg-sand",
                start && search.checkOut && "rounded-l-full bg-sand",
                end && search.checkIn && "rounded-r-full bg-sand",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(date)}
                className={cn(
                  "mx-auto grid h-10 w-10 place-items-center rounded-full text-sm",
                  (start || end) && "bg-ink text-paper",
                  !start && !end && !disabled && "hover:ring-1 hover:ring-ink",
                  disabled && "cursor-not-allowed text-muted/40",
                  blocked && !past && "line-through",
                )}
              >
                {Number(date.slice(-2))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AmenityIcon({ name }: { name: string }) {
  const map: Record<string, string> = {
    Wifi: "M5 12.5c2.2-2.2 5-3.4 7-3.4s4.8 1.2 7 3.4M8 15.4c1.3-1.2 2.8-1.8 4-1.8s2.7.6 4 1.8M12 18h.01",
    Cocina: "M6 4v8a3 3 0 0 0 6 0V4M9 4v16M16 4v16M16 8h3a2 2 0 0 1 0 4h-3",
    Piscina: "M3 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0M8 16V7m0 0h3",
    Chimenea: "M5 20h14M7 20V10l5-5 5 5v10",
    Jardín: "M12 21V10M12 10c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Z",
    Terraza: "M4 20h16M6 20V9l6-4 6 4v11",
    Parking: "M6 4h8a4 4 0 0 1 0 8H6V4Zm0 16V4",
    "Vista al mar": paths.wave,
    "Vistas a la montaña": paths.peak,
    "Acceso al lago": paths.drop,
    "Jardín japonés": paths.spark,
    Calefacción: "M12 3v18M8 7c2 2 2 4 0 6s-2 4 0 6M16 7c-2 2-2 4 0 6s2 4 0 6",
    "Aire acondicionado": "M4 7h16v6H4V7Zm4 6v3m4-3v4m4-4v3",
    Lavadora: "M6 3h12v18H6V3Zm6 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    Barbacoa: "M6 8h12v3a6 6 0 0 1-12 0V8Zm2-3h8M8 20v-3m8 3v-3",
    "Zona de trabajo": "M4 7h16v10H4V7Zm4 14v-4m8 4v-4",
    "Llegada autónoma": "M8 11V8a4 4 0 0 1 8 0v3M7 11h10v9H7v-9Z",
    Mascotas: "M8 14c-2 0-3 2-3 4 2 1 4 1 5 0 1 1 3 1 5 0 0-2-1-4-3-4-1 1-3 1-4 0Zm-1-5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5 2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    Bañera: "M5 12h14v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2Zm2-4V6a2 2 0 0 1 4 0",
    Secador: "M6 8h8a4 4 0 0 1 0 8H6V8Zm8 2 4-2v8l-4-2",
    Plancha: "M4 14h12l3-4H8l-4 4Zm2 0v3m8-3v3",
    Desayuno: "M6 8h12v2a6 6 0 0 1-12 0V8Zm2 10h8",
  };
  return <Icon d={map[name] ?? paths.check} className="h-5 w-5" />;
}
