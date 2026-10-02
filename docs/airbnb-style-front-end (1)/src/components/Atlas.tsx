import { money, placeLine } from "@/lib";
import { useNido } from "@/store";
import type { Property } from "@/types";
import { cn } from "@/utils/cn";

const labels = [
  { x: 18, y: 18, t: "Atlántico" },
  { x: 62, y: 16, t: "Mediterráneo" },
  { x: 84, y: 18, t: "Lejano oriente" },
  { x: 48, y: 84, t: "Sur" },
];

export function Atlas({
  properties,
  onSelect,
  activeId,
  tall = false,
}: {
  properties: Property[];
  onSelect?: (id: string) => void;
  activeId?: string | null;
  tall?: boolean;
}) {
  const { highlightId, setHighlightId, openProperty } = useNido();
  const current = activeId ?? highlightId;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-line",
        tall ? "h-[420px] md:h-[520px]" : "h-full min-h-[420px]",
      )}
      style={{
        background:
          "radial-gradient(circle at 28% 42%, #f7f3ec 0%, #e7efe8 38%, #f0e4d4 68%, #e7d5c8 100%)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <ellipse cx="48" cy="46" rx="30" ry="22" fill="none" stroke="#1f3d34" strokeOpacity="0.15" />
        <ellipse cx="50" cy="48" rx="40" ry="30" fill="none" stroke="#1f3d34" strokeOpacity="0.08" />
        <ellipse cx="44" cy="44" rx="16" ry="12" fill="none" stroke="#b84a34" strokeOpacity="0.18" />
        <path d="M6 60 C 24 48, 38 72, 58 56 S 86 46, 98 68" fill="none" stroke="#1f3d34" strokeOpacity="0.18" strokeWidth="0.4" />
        <path d="M10 34 C 30 28, 46 40, 70 30" fill="none" stroke="#1f3d34" strokeOpacity="0.12" strokeWidth="0.35" />
      </svg>
      {labels.map((label) => (
        <span
          key={label.t}
          className="pointer-events-none absolute font-serif text-[11px] italic text-moss/50"
          style={{ left: `${label.x}%`, top: `${label.y}%` }}
        >
          {label.t}
        </span>
      ))}
      <div className="absolute left-4 top-4 rounded-full bg-card/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted backdrop-blur">
        Atlas Nido
      </div>
      {properties.map((property) => {
        const active = current === property.id;
        const above = property.y > 34;
        return (
          <button
            key={property.id}
            type="button"
            onMouseEnter={() => setHighlightId(property.id)}
            onMouseLeave={() => setHighlightId(null)}
            onClick={() => (onSelect ? onSelect(property.id) : openProperty(property.id))}
            className={cn("absolute -translate-x-1/2 -translate-y-1/2", active ? "z-20" : "z-10")}
            style={{ left: `${property.x}%`, top: `${property.y}%` }}
            aria-label={property.title}
          >
            <span
              className={cn(
                "block rounded-full px-2.5 py-1 text-xs font-semibold shadow-md transition",
                active ? "scale-110 bg-ink text-paper" : "bg-card text-ink hover:scale-105",
              )}
            >
              {money(property.price)}
            </span>
            {active && (
              <span
                className={cn(
                  "absolute left-1/2 z-30 w-44 -translate-x-1/2 overflow-hidden rounded-2xl bg-card text-left shadow-xl",
                  above ? "bottom-9" : "top-9",
                )}
              >
                <img src={property.images[0]} alt="" className="h-20 w-full object-cover" />
                <span className="block px-2.5 py-2">
                  <span className="block text-xs font-medium leading-tight">{property.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{placeLine(property)}</span>
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
