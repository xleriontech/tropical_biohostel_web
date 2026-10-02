import { useEffect, useState, type ReactNode } from "react";
import { formatRange, guestLabel, suggestions } from "@/lib";
import { useNido } from "@/store";
import { cn } from "@/utils/cn";
import { Calendar, Icon, paths, Stepper } from "./ui";

type Pane = "where" | "when" | "who" | null;

export function SearchBar() {
  const { search, patchSearch, properties, remember, setView } = useNido();
  const [pane, setPane] = useState<Pane>(null);
  const ideas = suggestions(properties, search.where);

  useEffect(() => {
    if (!pane) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPane(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pane]);

  const go = () => {
    remember(search.where);
    setPane(null);
    setView("explore");
    window.setTimeout(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  return (
    <div className="relative z-30">
      {pane && <button className="fixed inset-0 z-20 cursor-default" aria-label="Cerrar búsqueda" onClick={() => setPane(null)} />}
      <div className="relative z-30 rounded-[28px] border border-line bg-card shadow-[0_18px_50px_-28px_rgba(27,25,22,0.45)]">
        <div className="grid md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
          <Segment
            label="Dónde"
            active={pane === "where"}
            onClick={() => setPane("where")}
            plain
          >
            <input
              value={search.where}
              onChange={(event) => patchSearch({ where: event.target.value })}
              onFocus={() => setPane("where")}
              placeholder="Deià, Kioto, una masía…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Destino"
            />
          </Segment>
          <Segment label="Cuándo" active={pane === "when"} onClick={() => setPane(pane === "when" ? null : "when")} divided>
            <span className={cn("text-sm", search.checkIn ? "text-ink" : "text-muted")}>{formatRange(search.checkIn, search.checkOut)}</span>
          </Segment>
          <Segment label="Quiénes" active={pane === "who"} onClick={() => setPane(pane === "who" ? null : "who")} divided>
            <span className="truncate text-sm">{guestLabel(search)}</span>
          </Segment>
          <div className="p-2">
            <button
              type="button"
              onClick={go}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-clay px-5 text-sm font-medium text-white transition hover:bg-clay-deep md:w-auto"
            >
              <Icon d={paths.search} className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {pane && (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 max-h-[70vh] overflow-auto rounded-[28px] border border-line bg-card p-5 shadow-2xl">
          {pane === "where" && (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Destinos</p>
              <div className="mt-3 grid gap-1 sm:grid-cols-2">
                {ideas.length === 0 && <p className="py-6 text-sm text-muted">Ningún destino con ese nombre. Prueba con un país o una ciudad.</p>}
                {ideas.map((idea) => (
                  <button
                    key={idea.label}
                    type="button"
                    onClick={() => {
                      patchSearch({ where: idea.label });
                      remember(idea.label);
                      setPane("when");
                    }}
                    className="flex items-center gap-3 rounded-2xl p-2 text-left hover:bg-sand"
                  >
                    <img src={idea.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    <span>
                      <span className="block text-sm font-medium">{idea.label}</span>
                      <span className="block text-xs text-muted">{idea.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {pane === "when" && <Calendar />}
          {pane === "who" && (
            <div className="mx-auto max-w-md divide-y divide-line">
              <Stepper label="Adultos" hint="13 años o más" value={search.adults} min={1} max={12} onChange={(adults) => patchSearch({ adults })} />
              <Stepper label="Niños" hint="De 2 a 12 años" value={search.children} min={0} max={8} onChange={(children) => patchSearch({ children })} />
              <Stepper label="Bebés" hint="Menos de 2 años" value={search.infants} min={0} max={5} onChange={(infants) => patchSearch({ infants })} />
              <Stepper label="Mascotas" hint="Solo en casas que las admiten" value={search.pets} min={0} max={3} onChange={(pets) => patchSearch({ pets, petsOnly: pets > 0 })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Segment({
  label,
  active,
  onClick,
  children,
  divided,
  plain,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  divided?: boolean;
  plain?: boolean;
}) {
  const className = cn(
    "flex w-full flex-col items-start px-5 py-3 text-left md:px-6 md:py-4",
    divided && "md:border-l md:border-line",
    active && "rounded-[24px] bg-sand/80",
  );
  if (plain) {
    return (
      <div className={className} onClick={onClick}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
        <span className="mt-0.5 w-full">{children}</span>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      <span className="mt-0.5 w-full">{children}</span>
    </button>
  );
}
