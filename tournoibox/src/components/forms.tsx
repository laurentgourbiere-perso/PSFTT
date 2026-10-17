"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import {
  setupOrganizer, login, changePassword, createTournament, updateTournament, saveEvent, registerPlayer, type FormState,
} from "@/app/actions";
import { SPORTS, sportOf, type EventPreset } from "@/lib/sports";

export function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="rounded-lg bg-hot/15 px-3 py-2 text-sm font-semibold text-hot">{state.error}</p>;
  if (state?.ok) return <p role="status" className="rounded-lg bg-lime/15 px-3 py-2 text-sm font-semibold text-lime">{state.ok}</p>;
  return null;
}

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOrganizer, undefined);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="password">Mot de passe organisateur</label><input className="input" id="password" name="password" type="password" minLength={8} required autoFocus autoComplete="new-password" /></div>
      <div><label className="label" htmlFor="confirm">Confirmation</label><input className="input" id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" /></div>
      <button className="btn btn-primary w-full" disabled={pending}><Lock className="h-4 w-4" />Protéger TournoiBox</button>
      <Feedback state={state} />
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="password">Mot de passe organisateur</label><input className="input" id="password" name="password" type="password" required autoFocus autoComplete="current-password" /></div>
      <button className="btn btn-primary w-full" disabled={pending}>Entrer</button>
      <Feedback state={state} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <div><label className="label">Mot de passe actuel</label><input className="input" name="current" type="password" required autoComplete="current-password" /></div>
      <div><label className="label">Nouveau</label><input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></div>
      <div><label className="label">Confirmation</label><input className="input" name="confirm" type="password" minLength={8} required autoComplete="new-password" /></div>
      <div className="flex items-center gap-3 sm:col-span-3"><button className="btn btn-ghost" disabled={pending}>Changer le mot de passe</button><Feedback state={state} /></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Création d'un tournoi
// ---------------------------------------------------------------------------

type Draft = EventPreset & { key: number; on: boolean };

export function NewTournamentForm() {
  const [state, action, pending] = useActionState(createTournament, undefined);
  const [sport, setSport] = useState("tennis_de_table");
  const s = sportOf(sport);
  const [drafts, setDrafts] = useState<Draft[]>(() => s.presets.map((p, i) => ({ ...p, key: i, on: !!p.checked })));
  const [custom, setCustom] = useState("");
  const pick = (key: string) => {
    setSport(key);
    setDrafts(sportOf(key).presets.map((p, i) => ({ ...p, key: i, on: !!p.checked })));
  };
  const update = (key: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const chosen = drafts.filter((d) => d.on);
  const seats = chosen.reduce((n, d) => n + (d.capacity ?? 0) * (d.is_double ? 2 : 1), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="events" value={JSON.stringify(chosen.map(({ key: _k, on: _o, checked: _c, ...p }) => p))} />

      <section>
        <p className="mb-3 font-display text-2xl font-bold">1. Le sport</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(SPORTS).map(([key, sp]) => (
            <button key={key} type="button" onClick={() => pick(key)}
              className={`panel flex flex-col items-center gap-1 p-4 text-sm font-bold transition ${sport === key ? "!border-brand bg-brand/15" : "hover:!border-brand-2"}`}>
              <span className="text-3xl">{sp.emoji}</span>{sp.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <p className="font-display text-2xl font-bold sm:col-span-4">2. Le tournoi</p>
        <div className="sm:col-span-2"><label className="label">Nom</label><input className="input" name="name" required maxLength={120} placeholder="Tournoi de printemps" /></div>
        <div><label className="label">Date</label><input className="input" name="date" type="date" required defaultValue={today} /></div>
        <div><label className="label">Début</label><input className="input" name="start_time" type="time" defaultValue="13:30" /></div>
        <div className="sm:col-span-2"><label className="label">Lieu</label><input className="input" name="venue" maxLength={200} placeholder="Gymnase, salle…" /></div>
        <div><label className="label">Nombre de {s.court.toLowerCase()}s</label><input className="input" name="courts_count" type="number" min={1} max={100} defaultValue={8} required /></div>
        <div><label className="label">Appellation</label><input className="input" name="court_label" key={sport} defaultValue={s.court} maxLength={20} required /></div>
        <div><label className="label">Joueurs max dans la salle</label><input className="input" name="max_players" type="number" min={2} placeholder="illimité" /></div>
        <div><label className="label">Tableaux max / joueur</label><input className="input" name="max_events" type="number" min={1} max={10} defaultValue={2} /></div>
        <div className="sm:col-span-2 grid grid-cols-3 gap-2">
          <div><label className="label">1 tableau €</label><input className="input" name="price_1" type="number" min={0} step="0.5" defaultValue={7} /></div>
          <div><label className="label">2 tableaux €</label><input className="input" name="price_2" type="number" min={0} step="0.5" defaultValue={12} /></div>
          <div><label className="label">Double €</label><input className="input" name="price_double" type="number" min={0} step="0.5" defaultValue={5} /></div>
        </div>
      </section>

      <section>
        <p className="font-display text-2xl font-bold">3. Les tableaux et leurs places</p>
        <p className="mb-3 text-sm text-muted">Cochez les tableaux proposés et fixez le nombre de places : le bureau des inscriptions affichera les places restantes en temps réel.</p>
        <div className="space-y-2">
          {drafts.map((d) => (
            <div key={d.key} className={`panel flex flex-wrap items-center gap-3 p-3 ${d.on ? "" : "opacity-50"}`}>
              <input type="checkbox" checked={d.on} onChange={(e) => update(d.key, { on: e.target.checked })} className="h-5 w-5 accent-[#7c5cff]" aria-label={`Proposer ${d.name}`} />
              <input className="input !w-auto flex-1 min-w-48" value={d.name} onChange={(e) => update(d.key, { name: e.target.value })} aria-label="Nom du tableau" />
              {d.is_double && <span className="chip bg-brand/20 text-brand-2">Double</span>}
              {d.handicap && <span className="chip bg-lime/15 text-lime">Handicap</span>}
              {d.max_points != null && <span className="chip bg-white/10">≤ {d.max_points} pts</span>}
              {d.under_age != null && <span className="chip bg-white/10">-{d.under_age} ans</span>}
              <label className="flex items-center gap-2 text-sm text-muted">
                Places
                <input className="input !w-24" type="number" min={2} value={d.capacity ?? ""} placeholder="∞"
                  onChange={(e) => update(d.key, { capacity: e.target.value ? Number(e.target.value) : undefined })} />
                {d.is_double && <span className="text-xs">paires</span>}
              </label>
              <button type="button" onClick={() => setDrafts((x) => x.filter((y) => y.key !== d.key))} className="text-muted hover:text-hot" aria-label={`Retirer ${d.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ajouter un tableau (ex. Vétérans)" />
            <button type="button" className="btn btn-ghost" disabled={!custom.trim()}
              onClick={() => { setDrafts((d) => [...d, { name: custom.trim(), capacity: 32, key: Date.now(), on: true }]); setCustom(""); }}>
              <Plus className="h-4 w-4" />Ajouter
            </button>
          </div>
        </div>
      </section>

      <div className="panel flex flex-wrap items-center gap-4 p-4">
        <p className="text-sm text-muted"><b className="text-white">{chosen.length}</b> tableau(x) · <b className="text-white">{seats || "∞"}</b> places au total</p>
        <button className="btn btn-lime ml-auto" disabled={pending || !chosen.length}>Créer et ouvrir les inscriptions</button>
        <div className="w-full"><Feedback state={state} /></div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

type TournamentLike = {
  id: number; name: string; date: string; venue: string | null; start_time: string | null; court_label: string; courts_count: number;
  max_players: number | null; max_events: number; price_1: number; price_2: number; price_double: number;
};

export function TournamentSettingsForm({ t }: { t: TournamentLike }) {
  const [state, action, pending] = useActionState(updateTournament, undefined);
  const f = (name: keyof TournamentLike, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = "") => (
    <div className={span}><label className="label">{label}</label><input className="input" name={name} defaultValue={String(t[name] ?? "")} {...props} /></div>
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={t.id} />
      {f("name", "Nom", { required: true }, "sm:col-span-2")}
      {f("date", "Date", { type: "date", required: true })}
      {f("start_time", "Début", { type: "time" })}
      {f("venue", "Lieu", {}, "sm:col-span-2")}
      {f("courts_count", "Nombre", { type: "number", min: 1, max: 100 })}
      {f("court_label", "Appellation", { required: true })}
      {f("max_players", "Joueurs max", { type: "number", min: 2, placeholder: "illimité" })}
      {f("max_events", "Tableaux max / joueur", { type: "number", min: 1, max: 10 })}
      {f("price_1", "1 tableau €", { type: "number", min: 0, step: "0.5" })}
      {f("price_2", "2 tableaux €", { type: "number", min: 0, step: "0.5" })}
      {f("price_double", "Double € / joueur", { type: "number", min: 0, step: "0.5" })}
      <div className="flex items-center gap-3 sm:col-span-4"><button className="btn btn-primary" disabled={pending}>Enregistrer</button><Feedback state={state} /></div>
    </form>
  );
}

type EventLike = {
  id: number; name: string; is_double: number; handicap: number; min_points: number | null; max_points: number | null;
  min_birth_year: number | null; max_birth_year: number | null; capacity: number | null; format: string; group_size: number;
  qualifiers: number; best_of: number; start_time: string | null;
};

export function EventForm({ tournamentId, ev, pointsLabel }: { tournamentId: number; ev?: EventLike; pointsLabel: string }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !ev) ref.current?.reset(); }, [state, ev]);
  const v = (k: keyof EventLike) => (ev?.[k] ?? "") as string | number;
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-6">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="event_id" value={ev?.id ?? ""} />
      <div className="sm:col-span-2"><label className="label">Nom</label><input className="input" name="name" required defaultValue={v("name")} /></div>
      <div><label className="label">Places</label><input className="input" name="capacity" type="number" min={2} defaultValue={v("capacity")} placeholder="illimité" /></div>
      <div><label className="label">Heure</label><input className="input" name="start_time" type="time" defaultValue={v("start_time")} /></div>
      <div><label className="label">{pointsLabel} mini</label><input className="input" name="min_points" type="number" defaultValue={v("min_points")} /></div>
      <div><label className="label">{pointsLabel} maxi</label><input className="input" name="max_points" type="number" defaultValue={v("max_points")} /></div>
      <div><label className="label">Né(e) en ou après</label><input className="input" name="min_birth_year" type="number" defaultValue={v("min_birth_year")} /></div>
      <div><label className="label">Né(e) en ou avant</label><input className="input" name="max_birth_year" type="number" defaultValue={v("max_birth_year")} /></div>
      <div><label className="label">Formule</label>
        <select className="input" name="format" defaultValue={ev?.format ?? "poules"}><option value="poules">Poules + tableau</option><option value="ko">Élimination directe</option></select>
      </div>
      <div><label className="label">Joueurs / poule</label><input className="input" name="group_size" type="number" min={3} max={6} defaultValue={ev?.group_size ?? 3} /></div>
      <div><label className="label">Sortants</label><input className="input" name="qualifiers" type="number" min={1} max={3} defaultValue={ev?.qualifiers ?? 2} /></div>
      <div><label className="label">Manches</label>
        <select className="input" name="best_of" defaultValue={ev?.best_of ?? 5}><option value={1}>1 manche</option><option value={3}>2 gagnantes</option><option value={5}>3 gagnantes</option><option value={7}>4 gagnantes</option></select>
      </div>
      <div className="flex flex-col justify-end gap-1 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_double" defaultChecked={!!ev?.is_double} className="accent-[#7c5cff]" /> Double (places = paires)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="handicap" defaultChecked={!!ev?.handicap} className="accent-[#7c5cff]" /> Handicap</label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-4"><button className="btn btn-primary" disabled={pending}>{ev ? "Enregistrer" : "Ajouter le tableau"}</button><Feedback state={state} /></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Bureau des inscriptions
// ---------------------------------------------------------------------------

export type DeskEvent = {
  id: number; name: string; is_double: number; open: boolean; free: number | null; waiting: number;
  min_points: number | null; max_points: number | null; min_birth_year: number | null; max_birth_year: number | null;
};
type Prices = { price_1: number; price_2: number; price_double: number; max_events: number };
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function RegistrationDesk({ tournamentId, events, prices, pointsLabel, hallFull }: {
  tournamentId: number; events: DeskEvent[]; prices: Prices; pointsLabel: string; hallFull: boolean;
}) {
  const [state, action, pending] = useActionState(registerPlayer, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [points, setPoints] = useState("");
  const [birth, setBirth] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    if (state?.ok) { ref.current?.reset(); setPicked([]); setPoints(""); setBirth(""); ref.current?.querySelector<HTMLInputElement>("[name=first_name]")?.focus(); }
  }, [state]);

  const pts = Number(points) || 500;
  const why = (e: DeskEvent) => {
    if (!e.open) return "a commencé";
    if (e.is_double) return null;
    if (e.max_points != null && pts > e.max_points) return `${e.max_points} ${pointsLabel.toLowerCase()} max`;
    if (e.min_points != null && pts < e.min_points) return `${e.min_points} ${pointsLabel.toLowerCase()} min`;
    if (e.min_birth_year != null && (!birth || Number(birth) < e.min_birth_year)) return `né(e) en ${e.min_birth_year} ou après`;
    if (e.max_birth_year != null && (!birth || Number(birth) > e.max_birth_year)) return `né(e) en ${e.max_birth_year} ou avant`;
    return null;
  };
  const byId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const valid = picked.filter((id) => byId.get(id) && !why(byId.get(id)!));
  const singles = valid.filter((id) => !byId.get(id)!.is_double).length;
  const hasDouble = valid.some((id) => byId.get(id)!.is_double);
  const total = (singles === 0 ? 0 : singles === 1 ? prices.price_1 : prices.price_2 + (singles - 2) * prices.price_1) + (hasDouble ? prices.price_double : 0);

  return (
    <form ref={ref} action={action} className="space-y-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="first_name">Prénom</label><input className="input" id="first_name" name="first_name" required maxLength={60} autoFocus autoComplete="off" /></div>
        <div><label className="label" htmlFor="last_name">Nom</label><input className="input" id="last_name" name="last_name" required maxLength={60} autoComplete="off" /></div>
        <div><label className="label" htmlFor="club">Club</label><input className="input" id="club" name="club" maxLength={80} autoComplete="off" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="points">{pointsLabel}</label><input className="input" id="points" name="points" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="500" /></div>
          <div><label className="label" htmlFor="birth_year">Naissance</label><input className="input" id="birth_year" name="birth_year" type="number" min={1900} value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="année" /></div>
        </div>
        <div><label className="label" htmlFor="licence">Licence (facultatif)</label><input className="input" id="licence" name="licence" maxLength={20} autoComplete="off" /></div>
        <div><label className="label" htmlFor="phone">Téléphone (facultatif)</label><input className="input" id="phone" name="phone" type="tel" maxLength={20} autoComplete="off" /></div>
      </div>

      <div>
        <p className="label">Tableaux · {prices.max_events} max + double</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {events.map((e) => {
            const blocked = why(e);
            const checked = picked.includes(e.id) && !blocked;
            const limit = !e.is_double && !checked && singles >= prices.max_events;
            const full = e.free === 0;
            return (
              <label key={e.id} className={`flex items-center gap-3 rounded-lg border p-3 transition ${checked ? "border-brand bg-brand/15" : "border-line"} ${blocked || limit ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-brand-2"}`}>
                <input type="checkbox" name="events" value={e.id} checked={checked} disabled={!!blocked || limit}
                  onChange={() => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} className="h-4 w-4 accent-[#7c5cff]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{e.name}</span>
                  {blocked && <span className="block text-xs text-hot">{blocked}</span>}
                </span>
                <span className={`chip ${full ? "bg-hot/20 text-hot" : e.free == null ? "bg-white/10 text-muted" : e.free <= 3 ? "bg-amber/20 text-amber" : "bg-lime/15 text-lime"}`}>
                  {e.free == null ? "∞" : full ? `complet${e.waiting ? ` · ${e.waiting} en attente` : ""}` : `${e.free} place${e.free > 1 ? "s" : ""}`}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {hasDouble ? (
        <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-4">
          <p className="label sm:col-span-4">Partenaire de double</p>
          <input className="input" name="partner_first_name" placeholder="Prénom" required maxLength={60} aria-label="Prénom du partenaire" />
          <input className="input" name="partner_last_name" placeholder="Nom" required maxLength={60} aria-label="Nom du partenaire" />
          <input className="input" name="partner_club" placeholder="Club" maxLength={80} aria-label="Club du partenaire" />
          <input className="input" name="partner_points" type="number" min={0} placeholder={pointsLabel} aria-label={`${pointsLabel} du partenaire`} />
        </div>
      ) : (
        ["partner_first_name", "partner_last_name", "partner_club", "partner_points"].map((n) => <input key={n} type="hidden" name={n} value="" />)
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white/5 p-3">
        <div>
          <p className="label">À payer</p>
          <p className="font-display text-4xl font-bold tabular-nums text-lime">{eur(total)}</p>
        </div>
        <div className="ml-auto">
          <label className="label" htmlFor="payment">Paiement</label>
          <select className="input" id="payment" name="payment" defaultValue="">
            <option value="">Plus tard</option><option value="especes">Espèces</option><option value="cheque">Chèque</option><option value="cb">Carte</option><option value="offert">Offert</option>
          </select>
        </div>
        <button className="btn btn-lime" disabled={pending || !valid.length || hallFull}>{hallFull ? "Salle complète" : "Inscrire"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
