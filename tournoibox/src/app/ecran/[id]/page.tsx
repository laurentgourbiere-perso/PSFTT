import { notFound } from "next/navigation";
import { getTournament, getEvents, eventFills, playerCount } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { SCREEN_MODES, type ScreenMode } from "@/lib/screen-modes";
import { entriesById, eventView, tournamentMatches, groupLetter, roundLabel, type Match } from "@/lib/engine";
import { AutoRefresh } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { Clock, FullscreenButton } from "./ScreenTools";
import { Carousel, type SlideItem } from "./Carousel";
import {
  InscriptionsSlide, CallsSlide, CourtsSlide, GroupsSlide, BracketSlide, ResultsSlide, PodiumSlide, MessageSlide, EmptySlide, RaffleListSlide,
} from "./slides";
import { Roulette } from "./Roulette";
import { db } from "@/lib/db";
import { getPrizes, recentRaffle } from "@/lib/prizes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Écran de la salle" };

const GROUPS_PER_SLIDE = 6;

/**
 * Écran de diffusion (vidéoprojecteur, télé), en lecture seule : TournoiBox n'est joignable que depuis ce PC.
 * Le mode est choisi depuis l'onglet Écran du poste organisateur ; `?mode=` permet de le forcer pour cette fenêtre.
 */
export default async function EcranPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const t = getTournament(Number((await params).id));
  if (!t) notFound();
  const { mode: forced } = await searchParams;
  const mode = (forced && forced in SCREEN_MODES ? forced : t.screen_mode in SCREEN_MODES ? t.screen_mode : "auto") as ScreenMode;

  const sport = sportOf(t.sport);
  const events = getEvents(t.id);
  const names = new Map(events.map((e) => [e.id, e.name]));
  const eventName = (m: Match) => `${names.get(m.event_id)} · ${m.stage === "poule" ? `Poule ${groupLetter(m.group_no!)}` : roundLabel(m.round)}`;
  const entries = entriesById(t.id);
  const fills = eventFills(t.id);
  const views = events.map((ev) => ({ ev, view: eventView(ev) }));
  const onCourtsList = tournamentMatches(t.id, "m.status IN ('appele','en_cours') ORDER BY m.court_no");
  const onCourts = new Map(onCourtsList.map((m) => [m.court_no, m]));
  const calls = onCourtsList.filter((m) => m.status === "appele");
  const results = tournamentMatches(t.id, "m.status = 'termine' AND m.outcome != 'exempt' ORDER BY m.finished_at DESC LIMIT 12");

  // Construction des diapositives de chaque type
  const make = {
    inscriptions: (): SlideItem[] => (fills.some((e) => e.status === "inscriptions") ? [{ id: "inscriptions", node: <InscriptionsSlide fills={fills.filter((e) => e.status === "inscriptions")} /> }] : []),
    appels: (): SlideItem[] => (calls.length ? [{ id: "appels", node: <CallsSlide calls={calls.slice(0, 8)} entries={entries} court={t.court_label} eventName={eventName} /> }] : []),
    tables: (): SlideItem[] => (onCourtsList.length ? [{ id: "tables", node: <CourtsSlide t={t} onCourts={onCourts} entries={entries} eventName={eventName} /> }] : []),
    poules: (): SlideItem[] =>
      views.filter(({ ev, view }) => ev.status === "poules" && view.groups.length).flatMap(({ ev, view }) => {
        const pages = Math.ceil(view.groups.length / GROUPS_PER_SLIDE);
        return Array.from({ length: pages }, (_, p) => ({
          id: `poules-${ev.id}-${p}`,
          node: <GroupsSlide ev={ev} groups={view.groups.slice(p * GROUPS_PER_SLIDE, (p + 1) * GROUPS_PER_SLIDE)} page={p + 1} pages={pages} qualifiers={ev.qualifiers} />,
        }));
      }),
    tableaux: (): SlideItem[] =>
      views.filter(({ ev, view }) => (ev.status === "tableau" || ev.status === "termine") && view.rounds.length)
        .map(({ ev, view }) => ({ id: `tableau-${ev.id}`, node: <BracketSlide ev={ev} rounds={view.rounds} entries={entries} /> })),
    resultats: (): SlideItem[] => (results.length ? [{ id: "resultats", node: <ResultsSlide results={results} entries={entries} eventName={eventName} /> }] : []),
    podiums: (): SlideItem[] =>
      views.filter(({ ev, view }) => ev.status === "termine" && view.podium.length).map(({ ev, view }) => ({ id: `podium-${ev.id}`, node: <PodiumSlide ev={ev} podium={view.podium} /> })),
    tombola: (): SlideItem[] => {
      const raffle = getPrizes(t.id).filter((p) => p.event_id == null);
      return raffle.length ? [{ id: "tombola", node: <RaffleListSlide prizes={raffle} /> }] : [];
    },
    annonce: (): SlideItem[] => (t.screen_message ? [{ id: "annonce", node: <MessageSlide message={t.screen_message} /> }] : []),
  };

  let slides: SlideItem[];
  if (mode === "auto") {
    // Selon l'avancement : avant le tournoi les places, pendant les appels et l'état des tableaux, à la fin les podiums
    slides = t.status === "termine"
      ? [...make.podiums(), ...make.tombola(), ...make.tableaux(), ...make.annonce()]
      : [...make.appels(), ...make.inscriptions(), ...make.tables(), ...make.poules(), ...make.tableaux(), ...make.resultats(), ...make.podiums(), ...make.annonce()];
  } else {
    slides = make[mode]();
  }
  // Un tirage de tombola vient d'avoir lieu : il passe avant tout le reste, quel que soit le mode
  const raffle = recentRaffle(t.id);
  if (raffle) {
    const names = (db.prepare("SELECT first_name || ' ' || last_name n FROM players WHERE tournament_id = ? AND checked_in = 1 ORDER BY random() LIMIT 60").all(t.id) as { n: string }[]).map((r) => r.n);
    slides = [{ id: `tirage-${raffle.id}-${raffle.drawn_at}`, node: <Roulette names={names} winner={raffle.raffle_name!} club={raffle.raffle_club} prize={raffle.label} drawnAt={raffle.drawn_at!} /> }];
  }
  if (!slides.length) {
    const why: Record<ScreenMode, string> = {
      auto: "Le tournoi va bientôt commencer", inscriptions: "Les inscriptions sont closes", appels: "Aucun match appelé pour le moment",
      tables: "Aucun match en cours", poules: "Pas de poule en cours", tableaux: "Pas encore de tableau final",
      resultats: "Pas encore de résultat", podiums: "Les podiums arrivent bientôt", tombola: "Pas de tombola", annonce: "Aucune annonce",
    };
    slides = [{ id: "vide", node: <EmptySlide text={why[mode]} /> }];
  }
  // En automatique, les appels restent visibles en bandeau sur toutes les autres diapositives
  const showCallBar = mode === "auto" && calls.length > 0;

  return (
    <main className="flex h-screen cursor-none flex-col overflow-hidden px-[2.5vw] py-[2vw]" style={{ background: "radial-gradient(70vw 40vw at 90% -10%, rgb(124 92 255 / .3), transparent 60%), #0c0f1d" }}>
      <AutoRefresh seconds={3} />
      <header className="mb-[1.5vw] flex items-center gap-[1.5vw]">
        <span className="text-[3vw]">{sport.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[2.6vw] font-bold leading-none">{t.name}</h1>
          <p className="text-[1vw] text-muted">{playerCount(t.id)} joueurs{t.venue ? ` · ${t.venue}` : ""}</p>
        </div>
        <Clock />
      </header>

      {showCallBar && (
        <div className="mb-[1vw] flex items-center gap-[1vw] overflow-hidden rounded-[0.8vw] bg-lime px-[1.2vw] py-[0.6vw] text-ink">
          <span className="shrink-0 text-[1.2vw] font-bold uppercase">📣 Appel</span>
          <div className="flex min-w-0 gap-[2vw] overflow-hidden">
            {calls.slice(0, 4).map((m) => (
              <span key={m.id} className="shrink-0 truncate text-[1.3vw] font-bold">
                <span className="mr-[0.4vw] rounded bg-ink px-[0.5vw] text-lime">{t.court_label} {m.court_no}</span>
                {entries.get(m.entry_a!)?.name} – {entries.get(m.entry_b!)?.name}
              </span>
            ))}
            {calls.length > 4 && <span className="shrink-0 text-[1.3vw] font-bold">+{calls.length - 4}</span>}
          </div>
        </div>
      )}

      <Carousel slides={slides} seconds={mode === "auto" ? t.slide_seconds : Math.max(t.slide_seconds, 8)} />

      <footer className="mt-[1vw] flex items-center gap-[1.5vw] text-muted">
        <Logo size={24} />
        {t.screen_message && mode !== "annonce" ? (
          <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[1.2vw] font-semibold text-white">
            <span className="ticker inline-block">📢 {t.screen_message}&emsp;&emsp;&emsp;📢 {t.screen_message}&emsp;&emsp;&emsp;</span>
          </div>
        ) : <span className="flex-1" />}
        <FullscreenButton />
      </footer>
    </main>
  );
}
