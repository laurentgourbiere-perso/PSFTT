import Link from "next/link";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-black/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <LogoMark className="h-14 w-14 shrink-0" />
          <p className="text-sm text-slate-400">
            Pontcharra Saint-Forgeux Tennis de Table. Club affilié FFTT, Rhône (69).<br />
            40 ans de passion, de picots et de top spins.
          </p>
        </div>
        <div className="text-sm text-slate-400">
          <p className="label">Le club</p>
          <Link href="/club" className="block hover:text-club-yellow">Présentation</Link>
          <Link href="/equipes" className="block hover:text-club-yellow">Équipes</Link>
          <Link href="/rencontres" className="block hover:text-club-yellow">Rencontres</Link>
        </div>
        <div className="text-sm text-slate-400">
          <p className="label">Vos données</p>
          <Link href="/confidentialite" className="block hover:text-club-yellow">Politique de confidentialité (RGPD)</Link>
          <Link href="/profil#donnees" className="block hover:text-club-yellow">Exporter ou supprimer mes données</Link>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} PSFTT · Prototype local pour le comité</p>
    </footer>
  );
}
