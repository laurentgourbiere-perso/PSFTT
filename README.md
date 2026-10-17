# PSFTT · l'appli du club 🏓

Prototype du futur site du **Pontcharra Saint-Forgeux Tennis de Table** (69). Il tourne en local pour être présenté au comité.

## Lancer le site sur votre ordinateur

Il faut **Node.js 20 ou plus récent** (https://nodejs.org).

```bash
git clone https://github.com/laurentgourbiere-perso/PSFTT.git
cd PSFTT
npm install
npm run seed      # crée la base locale avec des données de démo
npm run dev       # puis ouvrir http://localhost:3000
```

### Comptes de démonstration

Mot de passe commun : `Psftt2025!`

| E-mail | Rôle |
|---|---|
| admin@psftt.local | Administrateur |
| bureau@psftt.local | Comité |
| capitaine@psftt.local | Capitaine |
| adherent@psftt.local | Adhérent |

Pour repartir de zéro : `npm run reset`.

## Ce qui est déjà là

- **Site public** : accueil avec bandeau de scores, album Panini, actus, présentation du club et frise des 40 ans, équipes et rencontres
- **Comptes** : inscription, connexion, mots de passe hachés (bcrypt), session signée
- **5 niveaux de droits** : Supporter → Adhérent → Capitaine → Comité → Admin
- **Fiche joueur ludique** : photo « présentation » et photo « victoire », comme les footballeurs. La carte Panini se retourne et affiche une rareté (bronze, argent, or, légende) et des badges. Avatar « balle de ping-pong » personnalisable
- **RGPD** : rien n'est public sans accord, les photos sont servies après contrôle des droits, licence et téléphone ne sont jamais publics. Export JSON et suppression du compte en un clic, journal des actions d'admin, page de politique de confidentialité
- **Comité** : comptes rendus de réunion avec décisions et suivi des actions, et un budget par saison avec catégories, recettes, dépenses et solde
- **Admin** : rôles, équipes et points des membres
- **Tournoi** (`/tournoi`, ex. Tournoi du Torrenchin) :
  - inscription en ligne avec contrôle des tableaux (points, âge, 2 tableaux maxi + double), calcul du tarif, liste d'attente, récapitulatif avec code de réservation et paiement en ligne (**simulé** : à brancher sur HelloAsso ou Stripe)
  - table de marque : pointage, encaissement sur place (espèces, chèque, CB, offert), inscription sur place, export CSV, report des recettes au budget
  - tirage au sort : têtes de série en serpentin, chapeaux tirés au sort en séparant les clubs, joueurs non pointés forfait ; poules puis tableau final (sortants d'une même poule dans des moitiés opposées) ou élimination directe ; handicap selon l'écart de points
  - salle : appel automatique des matchs sur les tables libres (aucun joueur sur deux tables, 3 min de repos), saisie du score ou forfait, feuille de match sur téléphone pour marquer point par point
  - direct public rafraîchi toutes les 5 s, mode écran géant pour la salle, palmarès
  - lots par tableau et par place attribués d'après les résultats, suivi des remises, tombola tirée au sort parmi les présents
  - outils de démo (inscrits fictifs, simulation des matchs) dans Gestion → Tableau de bord

## Technique

Next.js 15 (App Router), TypeScript, Tailwind CSS 4, SQLite (better-sqlite3). Les données locales (base, photos, secret de session) sont dans `data/`, qui n'est **jamais versionné**.

```
src/app/          pages et actions serveur
src/components/   carte Panini, avatar, logo, formulaires
src/lib/          base de données, auth, rôles, règles RGPD
scripts/seed.mjs  données de démonstration (joueurs fictifs)
```

## Feuille de route

1. ✅ Prototype local : site, comptes, fiches, comité
2. Branchement sur l'API FFTT (rencontres, résultats, points officiels)
3. Disponibilités et compositions d'équipes par journée, covoiturage
4. Génération des visuels Panini pour Facebook et Instagram (avec consentement)
5. ✅ Gestion de tournoi (reste : paiement HelloAsso réel, e-mails de confirmation, mode hors ligne)
6. Chatbot WhatsApp, gamification, archives des 40 ans
7. Mise en ligne (hébergement, base de données partagée)

À compléter par le comité : dates de l'historique, adresse de la salle, horaires, tarifs, e-mail de contact.
