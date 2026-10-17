import type { EventFill } from "@/lib/tournament";

const STATE_TEXT = { libre: "Places libres", presque: "Presque complet", complet: "Complet", illimite: "Ouvert" } as const;

/** Carte de remplissage d'un tableau : jauge colorée et places restantes. */
export function FillCard({ ev, big = false }: { ev: EventFill; big?: boolean }) {
  const pct = ev.capacity ? Math.min(100, (ev.registered / ev.capacity) * 100) : 100;
  const unit = ev.is_double ? "paire" : "place";
  return (
    <div className={`panel fill-${ev.state} relative overflow-hidden ${big ? "p-6" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`font-display font-bold leading-tight ${big ? "text-4xl" : "text-lg"}`}>{ev.name}</p>
        <span className="chip shrink-0 uppercase" style={{ background: "color-mix(in srgb, var(--fill) 18%, transparent)", color: "var(--fill)" }}>
          {STATE_TEXT[ev.state]}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className={`font-display font-bold tabular-nums leading-none ${big ? "text-8xl" : "text-5xl"}`} style={{ color: "var(--fill)" }}>
          {ev.free ?? ev.registered}
        </span>
        <span className={`pb-1 text-muted ${big ? "text-2xl" : "text-sm"}`}>
          {ev.free == null ? `inscrit${ev.registered > 1 ? "s" : ""}` : `${unit}${ev.free > 1 ? "s" : ""} libre${ev.free > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className={`mt-3 overflow-hidden rounded-full bg-white/10 ${big ? "h-4" : "h-2"}`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--fill)" }} />
      </div>
      <p className={`mt-2 text-muted ${big ? "text-xl" : "text-xs"}`}>
        {ev.registered}{ev.capacity ? ` / ${ev.capacity}` : ""} inscrit{ev.registered > 1 ? "s" : ""}
        {ev.waiting > 0 && <span className="text-amber"> · {ev.waiting} en liste d&apos;attente</span>}
      </p>
    </div>
  );
}
