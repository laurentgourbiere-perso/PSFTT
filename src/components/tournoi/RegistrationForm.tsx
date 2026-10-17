"use client";
import { useActionState, useRef, useState, useEffect } from "react";
import { registerPlayer } from "@/app/actions/tournoi";
import { Feedback } from "@/components/forms/ProfileForms";

export type RegEvent = {
  id: number; name: string; is_double: number; rules: string[]; full: boolean; open: boolean;
  min_points: number | null; max_points: number | null; min_birth_year: number | null; start_time: string | null;
};
type Prices = { price_1: number; price_2: number; price_double: number; max_events: number };

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function RegistrationForm({ tournamentId, events, prices, source = "public", defaults = {} }: {
  tournamentId: number; events: RegEvent[]; prices: Prices; source?: "public" | "gestion"; defaults?: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(registerPlayer, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [points, setPoints] = useState("");
  const [birth, setBirth] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    if (state?.ok) { ref.current?.reset(); setPicked([]); setPoints(""); setBirth(""); }
  }, [state]);

  const pts = Number(points) || 500;
  const why = (e: RegEvent) => {
    if (!e.open) return "Tableau commencé";
    if (e.is_double) return null;
    if (e.max_points != null && pts > e.max_points) return `Réservé aux ${e.max_points} pts maximum`;
    if (e.min_points != null && pts < e.min_points) return `Réservé aux ${e.min_points} pts minimum`;
    if (e.min_birth_year != null && (!birth || Number(birth) < e.min_birth_year)) return `Né(e) en ${e.min_birth_year} ou après`;
    return null;
  };
  const isDouble = (id: number) => !!events.find((e) => e.id === id)?.is_double;
  const valid = picked.filter((id) => !why(events.find((e) => e.id === id)!));
  const singles = valid.filter((id) => !isDouble(id)).length;
  const hasDouble = valid.some(isDouble);
  const total = (singles === 0 ? 0 : singles === 1 ? prices.price_1 : prices.price_2 + (singles - 2) * prices.price_1) + (hasDouble ? prices.price_double : 0);

  const toggle = (e: RegEvent) => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]));
  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`${source}-${name}`}>{label}</label>
      <input className="input" id={`${source}-${name}`} name={name} defaultValue={defaults[name]} {...props} />
    </div>
  );

  return (
    <form ref={ref} action={action} className="space-y-6">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="source" value={source} />

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-display text-2xl uppercase">Joueur</legend>
        {field("first_name", "Prénom", { required: true, maxLength: 60, autoComplete: "given-name" })}
        {field("last_name", "Nom", { required: true, maxLength: 60, autoComplete: "family-name" })}
        {field("email", source === "public" ? "E-mail" : "E-mail (facultatif)", { type: "email", required: source === "public", autoComplete: "email" })}
        {field("phone", "Téléphone (facultatif)", { type: "tel", maxLength: 20, autoComplete: "tel" })}
        {field("club", "Club (vide si non licencié)", { maxLength: 80 })}
        {field("licence", "N° de licence", { maxLength: 20 })}
        <div>
          <label className="label" htmlFor={`${source}-points`}>Points classement</label>
          <input className="input" id={`${source}-points`} name="points" type="number" min={500} max={4000} placeholder="500 si non classé" value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${source}-birth_year`}>Année de naissance</label>
          <input className="input" id={`${source}-birth_year`} name="birth_year" type="number" min={1920} max={new Date().getFullYear()} placeholder="ex. 2012" value={birth} onChange={(e) => setBirth(e.target.value)} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-display text-2xl uppercase">Tableaux</legend>
        <p className="mb-3 text-sm text-slate-400">{prices.max_events} tableaux maximum, plus le double.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {events.map((e) => {
            const blocked = why(e);
            const checked = picked.includes(e.id) && !blocked;
            const limit = !e.is_double && !checked && singles >= prices.max_events;
            return (
              <label key={e.id} className={`flex gap-3 rounded-xl border p-3 transition ${checked ? "border-club-yellow bg-club-yellow/10" : "border-white/10 bg-white/5"} ${blocked || limit ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-white/30"}`}>
                <input type="checkbox" name="events" value={e.id} checked={checked} disabled={!!blocked || limit} onChange={() => toggle(e)} className="mt-1 h-4 w-4 accent-[#ffd400]" />
                <span className="min-w-0">
                  <span className="block font-bold">{e.name}{e.start_time && <span className="ml-2 text-xs font-normal text-slate-400">{e.start_time.replace(":", "h")}</span>}</span>
                  <span className="block text-xs text-slate-400">{e.rules.join(" · ")}</span>
                  {blocked && <span className="block text-xs font-bold text-red-300">{blocked}</span>}
                  {!blocked && e.full && <span className="block text-xs font-bold text-amber-300">Complet : liste d&apos;attente</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {hasDouble ? (
        <fieldset className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2">
          <legend className="px-2 font-display text-xl uppercase">Partenaire de double</legend>
          {field("partner_first_name", "Prénom", { required: true, maxLength: 60 })}
          {field("partner_last_name", "Nom", { required: true, maxLength: 60 })}
          {field("partner_club", "Club", { maxLength: 80 })}
          {field("partner_licence", "N° de licence", { maxLength: 20 })}
          {field("partner_points", "Points", { type: "number", min: 500, max: 4000, placeholder: "500" })}
          <p className="self-end text-xs text-slate-400">Votre partenaire règle sa part du double ({eur(prices.price_double)}) sur place.</p>
        </fieldset>
      ) : (
        ["partner_first_name", "partner_last_name", "partner_club", "partner_licence", "partner_points"].map((n) => <input key={n} type="hidden" name={n} value="" />)
      )}

      <label className="flex gap-3 text-sm text-slate-300">
        <input type="checkbox" name="consent" required defaultChecked={source === "gestion"} className="mt-1 h-4 w-4 shrink-0 accent-[#ffd400]" />
        <span>J&apos;accepte que mon nom, mon club et mes résultats soient affichés pendant le tournoi (direct, écrans de la salle, palmarès). Mon e-mail, mon téléphone et ma licence ne sont jamais publiés.</span>
      </label>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 p-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">Total à régler</p>
          <p className="font-display text-4xl tabular-nums text-club-yellow">{eur(total)}</p>
        </div>
        <button className="btn btn-primary ml-auto" disabled={pending || valid.length === 0}>
          {pending ? "Envoi…" : source === "gestion" ? "Inscrire et pointer" : "Réserver ma place"}
        </button>
        <div className="w-full"><Feedback state={state} /></div>
      </div>
    </form>
  );
}
