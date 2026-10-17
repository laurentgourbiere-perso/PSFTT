import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlayer, toCard, rarity } from "@/lib/players";
import { parseAvatar, DEFAULT_AVATAR } from "@/lib/avatar";
import { ROLE_LABELS } from "@/lib/roles";
import { updatePrivacy, deleteAccount } from "@/app/actions/profile";
import { ProfileForm, PhotoUploader, AvatarBuilder, PasswordForm } from "@/components/forms/ProfileForms";
import { PaniniCard } from "@/components/PaniniCard";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Mon profil" };

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const user = await requireUser();
  const { bienvenue } = await searchParams;
  const p = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id) as Record<string, string | number | null>;
  const asPlayer = getPlayer(user.id, user);
  const card = asPlayer
    ? toCard(asPlayer)
    : {
        id: user.id, first_name: user.first_name, last_name: user.last_name, nickname: p.nickname as string | null, points: p.points as number | null,
        team_name: null, play_style: p.play_style as string | null, hand: p.hand as string | null, favorite_shot: p.favorite_shot as string | null,
        motto: p.motto as string | null, photo_portrait: p.photo_portrait as string | null, photo_victory: p.photo_victory as string | null,
        avatar: p.avatar as string | null, wins: 0, losses: 0, rarity: rarity(p.points as number | null),
      };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {bienvenue && (
        <div className="mb-8 rounded-2xl bg-club-yellow p-5 text-club-navy">
          <p className="font-display text-2xl uppercase">Bienvenue au PSFTT, {user.first_name} ! 🏓</p>
          <p className="text-sm">Complétez votre fiche, ajoutez vos photos et créez votre avatar. Votre carte Panini se met à jour en direct.</p>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PaniniCard p={card} link={false} />
          <p className="mt-3 text-center text-xs text-slate-400">Ma carte · cliquez pour la retourner</p>
          <div className="mt-4 text-center">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase">{ROLE_LABELS[user.role]}</span>
          </div>
        </aside>

        <div className="space-y-14">
          <section>
            <SectionTitle kicker="Comme les pros du foot" title="Mes deux photos" />
            <div className="grid gap-5 sm:grid-cols-3">
              <PhotoUploader kind="portrait" current={p.photo_portrait as string | null} title="Présentation" hint="Bras croisés, regard qui tue, raquette en main." emoji="😎" />
              <PhotoUploader kind="victory" current={p.photo_victory as string | null} title="Victoire" hint="Poing serré, cri de joie, glissade à genoux…" emoji="🤩" />
              <div className="card-surface p-4 text-sm text-slate-300">
                <p className="font-display text-xl uppercase text-club-yellow">Conseils</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Format portrait, de préférence en maillot du club.</li>
                  <li>JPEG, PNG ou WebP, 5 Mo maximum.</li>
                  <li>Pas de photo ? Votre avatar balle de ping-pong prend le relais sur la carte.</li>
                  <li>Les photos restent visibles des seuls adhérents, sauf si vous autorisez leur publication.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle kicker="Version cartoon" title="Mon avatar" />
            <div className="card-surface p-6">
              <AvatarBuilder initial={parseAvatar(p.avatar as string | null) ?? DEFAULT_AVATAR} />
            </div>
          </section>

          <section>
            <SectionTitle kicker="Ma fiche joueur" title="Mon jeu" />
            <div className="card-surface p-6"><ProfileForm p={p} /></div>
          </section>

          <section id="confidentialite">
            <SectionTitle kicker="RGPD · c'est vous qui décidez" title="Ma confidentialité" />
            <form action={updatePrivacy} className="card-surface space-y-3 p-6">
              {[
                { k: "public_profile", t: "Fiche visible du public", d: "Prénom, initiale du nom, surnom, style de jeu et stats sur le site public. Sinon, seuls les adhérents vous voient." },
                { k: "public_photos", t: "Photos visibles du public", d: "Sinon, le public voit votre avatar à la place des photos." },
                { k: "social_sharing", t: "Mise en avant sur les réseaux sociaux", d: "Le club peut publier votre carte (perfs, victoires) sur Facebook et Instagram." },
                { k: "show_phone", t: "Téléphone visible des adhérents", d: "Pratique pour le covoiturage et les capitaines." },
              ].map((o) => (
                <label key={o.k} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 hover:bg-white/5">
                  <input type="checkbox" name={o.k} defaultChecked={!!p[o.k]} className="mt-1 h-5 w-5 accent-yellow-400" />
                  <span><b>{o.t}</b><br /><span className="text-sm text-slate-400">{o.d}</span></span>
                </label>
              ))}
              <button className="btn btn-primary">Enregistrer mes choix</button>
            </form>
          </section>

          <section>
            <SectionTitle kicker="Sécurité" title="Mot de passe" />
            <div className="card-surface p-6"><PasswordForm /></div>
          </section>

          <section id="donnees">
            <SectionTitle kicker="Vos droits" title="Mes données" />
            <div className="card-surface grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <p className="font-bold">📦 Télécharger mes données</p>
                <p className="mb-3 text-sm text-slate-400">Toutes les informations que le club détient sur vous, au format JSON.</p>
                <a href="/profil/export" className="btn btn-ghost !text-xs">Exporter</a>
              </div>
              <form action={deleteAccount}>
                <p className="font-bold text-red-300">🗑️ Supprimer mon compte</p>
                <p className="mb-3 text-sm text-slate-400">Effacement définitif du compte, de la fiche et des photos. Tapez <b>SUPPRIMER</b> pour confirmer.</p>
                <div className="flex gap-2">
                  <input name="confirm" className="input" placeholder="SUPPRIMER" pattern="SUPPRIMER" required />
                  <button className="btn btn-red !text-xs">Supprimer</button>
                </div>
              </form>
            </div>
            <p className="mt-3 text-xs text-slate-500">Plus d&apos;infos : <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
