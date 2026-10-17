import { Medal, Trophy } from "lucide-react";
import type { Tournament, EventFill, TEvent } from "@/lib/tournament";
import { groupLetter, roundLabel, type Entry, type EventView, type Match } from "@/lib/engine";
import { FillCard } from "@/components/FillCard";

// Diapositives de l'écran de la salle. Tailles en vw : lisibles sur n'importe quel vidéoprojecteur.

type Entries = Map<number, Entry>;
const name = (entries: Entries, id: number | null) => (id ? entries.get(id)?.name ?? "?" : "à venir");
const minutesSince = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000)) : 0);

export function SlideTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <div className="mb-[1.5vw]">
      {kicker && <p className="text-[1.1vw] font-bold uppercase tracking-[0.3em] text-brand-2">{kicker}</p>}
      <h2 className="font-display text-[3.2vw] font-bold leading-none">{title}</h2>
    </div>
  );
}

/** Ligne de match lisible de loin. */
function ScreenMatch({ m, entries, label }: { m: Match; entries: Entries; label?: string }) {
  const wa = m.sets.filter(([x, y]) => x > y).length, wb = m.sets.filter(([x, y]) => y > x).length;
  const row = (id: number | null, won: number, side: "a" | "b") => {
    const w = m.winner != null && m.winner === id;
    return (
      <div className={`flex items-center gap-[0.8vw] ${m.winner != null && !w ? "opacity-45" : ""}`}>
        <span className={`min-w-0 flex-1 truncate text-[1.5vw] ${w ? "font-bold text-lime" : "font-semibold"}`}>{id ? name(entries, id) : <i className="text-muted">{m.status === "termine" ? "exempt" : "à venir"}</i>}</span>
        {m.status === "termine" && m.outcome !== "exempt" && (
          <>
            <span className="hidden text-[1vw] tabular-nums text-muted xl:inline">{m.sets.map((s) => s[side === "a" ? 0 : 1]).join("  ")}</span>
            <span className={`w-[2.4vw] rounded text-center font-display text-[1.6vw] font-bold ${w ? "bg-lime text-ink" : "bg-white/10"}`}>{m.outcome === "forfait" ? (w ? "V" : "F") : won}</span>
          </>
        )}
      </div>
    );
  };
  return (
    <div className="rounded-[0.6vw] border border-line bg-panel/80 px-[1vw] py-[0.6vw]">
      {label && <p className="truncate text-[0.8vw] font-bold uppercase tracking-wider text-muted">{label}</p>}
      {row(m.entry_a, wa, "a")}
      {row(m.entry_b, wb, "b")}
    </div>
  );
}

export function InscriptionsSlide({ fills }: { fills: EventFill[] }) {
  const cols = fills.length <= 4 ? "grid-cols-2" : fills.length <= 6 ? "grid-cols-3" : "grid-cols-4";
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="Inscriptions ouvertes à la table de marque" title="Places restantes" />
      <div className={`grid flex-1 content-center gap-[1.5vw] ${cols}`}>{fills.map((ev) => <FillCard key={ev.id} ev={ev} big />)}</div>
    </div>
  );
}

export function CallsSlide({ calls, entries, court, eventName }: { calls: Match[]; entries: Entries; court: string; eventName: (m: Match) => string }) {
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="Rendez-vous à votre table" title="📣 Appel des joueurs" />
      <div className={`grid flex-1 content-center gap-[1.2vw] ${calls.length > 4 ? "grid-cols-2" : "grid-cols-1"}`}>
        {calls.map((m) => (
          <div key={m.id} className={`flex items-center gap-[2vw] rounded-[1vw] bg-lime px-[2vw] py-[1.2vw] text-ink ${minutesSince(m.called_at) < 1 ? "animate-pulse" : ""}`}>
            <div className="text-center">
              <p className="text-[1vw] font-bold uppercase">{court}</p>
              <p className="font-display text-[5vw] font-bold leading-none">{m.court_no}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[2.2vw] font-bold leading-tight">{name(entries, m.entry_a)}</p>
              <p className="text-[1.1vw] font-semibold opacity-60">contre</p>
              <p className="truncate text-[2.2vw] font-bold leading-tight">{name(entries, m.entry_b)}</p>
              <p className="truncate text-[0.9vw] font-bold uppercase opacity-60">{eventName(m)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourtsSlide({ t, onCourts, entries, eventName }: { t: Tournament; onCourts: Map<number | null, Match>; entries: Entries; eventName: (m: Match) => string }) {
  const n = t.courts_count;
  const cols = n <= 4 ? "grid-cols-2" : n <= 9 ? "grid-cols-3" : n <= 16 ? "grid-cols-4" : "grid-cols-5";
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="En ce moment" title={`Sur les ${t.court_label.toLowerCase()}s`} />
      <div className={`grid flex-1 content-center gap-[1vw] ${cols}`}>
        {Array.from({ length: n }, (_, i) => i + 1).map((c) => {
          const m = onCourts.get(c);
          return (
            <div key={c} className={`flex gap-[1vw] rounded-[0.8vw] border p-[0.8vw] ${m ? (m.status === "en_cours" ? "border-lime/60 bg-lime/5" : "border-amber/60 bg-amber/5") : "border-dashed border-line"}`}>
              <span className="font-display text-[3vw] font-bold leading-none text-white/80">{c}</span>
              {m ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.3vw] font-bold">{name(entries, m.entry_a)}</p>
                  <p className="truncate text-[1.3vw] font-bold">{name(entries, m.entry_b)}</p>
                  <p className="truncate text-[0.8vw] uppercase text-muted">
                    {m.status === "en_cours" ? `En jeu · ${minutesSince(m.started_at)} min` : "Appelé"} · {eventName(m)}
                  </p>
                </div>
              ) : <span className="self-center text-[1.2vw] text-muted">libre</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GroupsSlide({ ev, groups, page, pages, qualifiers }: { ev: TEvent; groups: EventView["groups"]; page: number; pages: number; qualifiers: number }) {
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker={`Poules${pages > 1 ? ` · ${page}/${pages}` : ""}`} title={ev.name} />
      <div className={`grid flex-1 content-center gap-[1.2vw] ${groups.length > 4 ? "grid-cols-3" : groups.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {groups.map((g) => {
          const played = g.matches.filter((m) => m.status === "termine").length;
          return (
            <div key={g.no} className="rounded-[0.8vw] border border-line bg-panel/80 p-[1vw]">
              <div className="mb-[0.5vw] flex items-baseline justify-between">
                <p className="font-display text-[2vw] font-bold">Poule {groupLetter(g.no)}</p>
                <p className="text-[0.9vw] text-muted">{g.done ? "terminée" : `${played}/${g.matches.length} matchs`}</p>
              </div>
              <table className="w-full text-[1.2vw]">
                <tbody>
                  {g.standings.map((s) => (
                    <tr key={s.entry.id} className={`border-t border-line ${g.done && s.rank <= qualifiers ? "text-lime" : ""}`}>
                      <td className="w-[2vw] py-[0.2vw] font-bold">{s.played ? s.rank : "–"}</td>
                      <td className="max-w-0 truncate font-semibold">{s.entry.name}</td>
                      <td className="w-[4vw] text-right text-[0.9vw] text-muted">{s.won}V {s.lost}D</td>
                      <td className="w-[3vw] text-right font-bold tabular-nums">{s.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BracketSlide({ ev, rounds, entries }: { ev: TEvent; rounds: EventView["rounds"]; entries: Entries }) {
  const shown = rounds.slice(-4); // au plus 4 colonnes : huitièmes, quarts, demies, finale
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="Tableau final" title={ev.name} />
      <div className="flex flex-1 gap-[1.2vw]">
        {shown.map((r) => (
          <div key={r.round} className="flex flex-1 flex-col">
            <p className="mb-[0.5vw] text-center text-[1vw] font-bold uppercase tracking-widest text-brand-2">{roundLabel(r.round)}</p>
            <div className="flex flex-1 flex-col justify-around gap-[0.5vw]">
              {r.matches.map((m) => <ScreenMatch key={m.id} m={m} entries={entries} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultsSlide({ results, entries, eventName }: { results: Match[]; entries: Entries; eventName: (m: Match) => string }) {
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="Tout juste terminés" title="Derniers résultats" />
      <div className="grid flex-1 content-center gap-[0.8vw] grid-cols-2">
        {results.map((m) => <ScreenMatch key={m.id} m={m} entries={entries} label={eventName(m)} />)}
      </div>
    </div>
  );
}

export function PodiumSlide({ ev, podium }: { ev: TEvent; podium: Entry[] }) {
  const first = podium.find((e) => e.final_rank === 1);
  const second = podium.find((e) => e.final_rank === 2);
  const thirds = podium.filter((e) => e.final_rank === 3);
  const step = (e: Entry | undefined, h: string, color: string, icon: React.ReactNode, label: string) => (
    <div className="flex flex-1 flex-col items-center justify-end">
      {e && (
        <div className="mb-[1vw] text-center">
          {icon}
          <p className="font-display text-[2.6vw] font-bold leading-tight">{e.name}</p>
          {e.club && <p className="text-[1.2vw] text-muted">{e.club}</p>}
        </div>
      )}
      <div className={`flex w-full items-start justify-center rounded-t-[1vw] pt-[1vw] font-display text-[3vw] font-bold ${h} ${color}`}>{label}</div>
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="Podium" title={ev.name} />
      <div className="flex flex-1 items-end gap-[1.5vw] px-[4vw]">
        {step(second, "h-[18vh]", "bg-slate-400/30", <Medal className="mx-auto h-[3vw] w-[3vw] text-slate-300" />, "2")}
        {step(first, "h-[28vh]", "bg-lime text-ink", <Trophy className="mx-auto h-[4vw] w-[4vw] text-lime" />, "1")}
        <div className="flex flex-1 flex-col items-center justify-end">
          <div className="mb-[1vw] space-y-[0.8vw] text-center">
            <Medal className="mx-auto h-[3vw] w-[3vw] text-amber" />
            {thirds.map((e) => (
              <div key={e.id}><p className="font-display text-[2vw] font-bold leading-tight">{e.name}</p>{e.club && <p className="text-[1vw] text-muted">{e.club}</p>}</div>
            ))}
          </div>
          <div className="flex h-[12vh] w-full items-start justify-center rounded-t-[1vw] bg-amber/25 pt-[1vw] font-display text-[3vw] font-bold">3</div>
        </div>
      </div>
    </div>
  );
}

export function MessageSlide({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <p className="max-w-[80vw] font-display text-[5vw] font-bold leading-tight">📢 {message}</p>
    </div>
  );
}

export function EmptySlide({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-[2vw] text-muted">{text}</div>;
}

export function RaffleListSlide({ prizes }: { prizes: { id: number; label: string; sponsor: string | null; raffle_name: string | null }[] }) {
  return (
    <div className="flex h-full flex-col">
      <SlideTitle kicker="Parmi les joueurs présents" title="🎟️ Tombola" />
      <div className={`grid flex-1 content-center gap-[1vw] ${prizes.length > 6 ? "grid-cols-3" : "grid-cols-2"}`}>
        {prizes.map((p) => (
          <div key={p.id} className={`rounded-[0.8vw] border p-[1vw] ${p.raffle_name ? "border-lime/60 bg-lime/10" : "border-line bg-panel/80"}`}>
            <p className="truncate text-[1.3vw] text-muted">{p.label}{p.sponsor ? ` · ${p.sponsor}` : ""}</p>
            <p className="truncate font-display text-[2.2vw] font-bold">{p.raffle_name ?? "à tirer…"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
