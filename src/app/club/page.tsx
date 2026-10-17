import { SectionTitle } from "@/components/SectionTitle";
import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Le club" };

const TIMELINE = [
  { year: "1985", title: "Les débuts", text: "Création des sections tennis de table à Pontcharra-sur-Turdine et à Saint-Forgeux." },
  { year: "19xx", title: "La fusion", text: "Les deux clubs unissent leurs forces : naissance du PSFTT. (Date à compléter par le comité.)" },
  { year: "20xx", title: "Les premières montées", text: "Les équipes grimpent les divisions départementales. (Moments forts à compléter.)" },
  { year: "2025", title: "40 ans !", text: "Quatre décennies de passion, fêtées avec les anciens et les nouveaux pongistes." },
];

export default function ClubPage() {
  return (
    <div>
      <section className="hero-bg relative overflow-hidden">
        <div className="stripes absolute inset-0" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
          <LogoMark className="float h-28 w-28" />
          <h1 className="font-display text-6xl uppercase sm:text-7xl">Deux villages,<br /><span className="text-club-yellow">un seul club</span></h1>
          <p className="max-w-2xl text-lg text-slate-200">
            Le Pontcharra Saint-Forgeux Tennis de Table est né de la fusion des clubs de Pontcharra-sur-Turdine et de Saint-Forgeux, dans le Rhône.
            Le jaune de l&apos;un, le bleu de l&apos;autre, et une même envie : jouer, progresser et partager.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="mt-16">
          <SectionTitle kicker="Notre histoire" title="40 ans en 4 dates" />
          <ol className="relative space-y-8 border-l-4 border-club-yellow/40 pl-8">
            {TIMELINE.map((t) => (
              <li key={t.year} className="relative">
                <span className="absolute -left-[46px] top-1 h-6 w-6 rounded-full border-4 border-club-navy bg-club-yellow" />
                <p className="font-display text-4xl text-club-yellow">{t.year}</p>
                <p className="font-display text-2xl uppercase">{t.title}</p>
                <p className="text-slate-300">{t.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="horaires" className="mt-20 grid gap-6 md:grid-cols-3">
          <div className="card-surface p-6 md:col-span-2">
            <SectionTitle kicker="Venir jouer" title="Horaires" />
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/10">
                {[
                  ["Lundi", "18h30 – 20h00", "Jeunes"],
                  ["Mercredi", "20h00 – 22h30", "Entraînement adultes"],
                  ["Vendredi", "20h00 – 23h00", "Championnat / jeu libre"],
                  ["Samedi", "10h00 – 12h00", "Loisir & débutants"],
                ].map(([d, h, w]) => (
                  <tr key={d}><td className="py-3 font-bold">{d}</td><td>{h}</td><td className="text-right text-slate-400">{w}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">Horaires indicatifs à valider par le comité.</p>
          </div>
          <div className="card-surface p-6">
            <p className="font-display text-2xl uppercase text-club-yellow">La salle</p>
            <p className="mt-2 text-slate-300">Gymnase de Pontcharra-sur-Turdine<br />(adresse à compléter)</p>
            <p className="font-display mt-6 text-2xl uppercase text-club-yellow">Tarifs</p>
            <p className="mt-2 text-slate-300">Loisir, compétition, jeunes : grille à compléter. 2 séances d&apos;essai offertes.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
