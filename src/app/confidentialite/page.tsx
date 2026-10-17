import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Politique de confidentialité" };

const SECTIONS: [string, React.ReactNode][] = [
  ["Responsable du traitement", <>L&apos;association Pontcharra Saint-Forgeux Tennis de Table (PSFTT), représentée par son président. Contact : adresse e-mail du club (à compléter).</>],
  ["Données collectées", <>Compte : prénom, nom, e-mail, mot de passe (stocké chiffré, jamais en clair). Fiche joueur, facultative : surnom, devise, style de jeu, matériel, numéro de licence, téléphone, photos et avatar. Données sportives : points, victoires et défaites (à terme issues de la FFTT).</>],
  ["Finalités et bases légales", <>Gestion de la vie du club et des équipes (exécution de l&apos;adhésion). Publication de votre fiche, de vos photos et mise en avant sur les réseaux sociaux : <b>uniquement avec votre consentement</b>, modifiable à tout moment depuis « Mon profil ».</>],
  ["Qui voit quoi ?", <>Public : seulement les fiches des joueurs qui l&apos;ont autorisé (prénom et initiale du nom), et les photos si vous l&apos;avez autorisé. Adhérents connectés : l&apos;album complet. Le numéro de licence et le téléphone ne sont jamais publics. Comptes rendus et budget : réservés au comité.</>],
  ["Durée de conservation", <>Tant que votre compte est actif. Les comptes inactifs depuis plus de 3 ans après la fin de la dernière adhésion sont supprimés.</>],
  ["Vos droits", <>Accès, rectification, effacement, portabilité, retrait du consentement : directement depuis « Mon profil » (export JSON et suppression du compte en un clic) ou auprès du comité. Vous pouvez aussi saisir la CNIL (cnil.fr).</>],
  ["Mineurs", <>Pour les moins de 15 ans, le compte et toute publication de photo doivent être autorisés par un représentant légal.</>],
  ["Sécurité", <>Mots de passe hachés (bcrypt), session signée en cookie sécurisé, photos servies uniquement après vérification des droits, journal des actions d&apos;administration.</>],
];

export default function Confidentialite() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <SectionTitle kicker="RGPD" title="Vos données, vos règles" />
      <p className="mb-8 text-slate-300">Le club a besoin de quelques informations pour fonctionner, et vous gardez la main sur tout ce qui est publié. Ce texte est un modèle à valider par le comité.</p>
      <div className="space-y-4">
        {SECTIONS.map(([t, c]) => (
          <section key={t} className="card-surface p-5">
            <h2 className="font-display text-2xl uppercase text-club-yellow">{t}</h2>
            <p className="mt-1 text-slate-200">{c}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
