# TournoiBox 🏆

**Le tournoi dans une boîte.** On l'installe sur un PC, on l'allume dans la salle, et tout le tournoi se gère sans internet : inscriptions, tableaux, matchs, résultats, écrans de diffusion.

Pensé d'abord pour le tennis de table, mais prévu pour d'autres sports (badminton, tennis, pétanque…).

## Lancer TournoiBox

Il faut **Node.js 20 ou plus récent**.

```bash
cd tournoibox
npm install
npm run dev        # puis ouvrir http://localhost:3210
```

Au premier lancement, TournoiBox demande de choisir le **mot de passe organisateur**.

## Sécurité

- Le serveur n'écoute que sur `127.0.0.1` : **seul le PC qui fait tourner TournoiBox peut l'ouvrir**, personne d'autre sur le Wi-Fi de la salle
- Toute requête portant un autre nom d'hôte que `localhost` est refusée (protection contre le « DNS rebinding »)
- Mot de passe organisateur haché (bcrypt), 5 essais par minute maximum, session signée qui expire après 14 h, bouton « Verrouiller »
- Changer le mot de passe déconnecte les autres fenêtres
- Les écrans de diffusion sont en lecture seule
- Aucune police, aucun script ni aucune donnée ne vient d'internet ou n'y part. Les données restent dans `data/` (jamais versionné)

## Ce qui marche aujourd'hui

- **Création d'un tournoi en 3 étapes** : le sport (vocabulaire adapté : table, terrain, court…), les infos et tarifs, les tableaux proposés avec leur nombre de places
- **Bureau des inscriptions**
  - places restantes de chaque tableau en direct (vert libre, orange presque complet, rouge complet)
  - limite globale de joueurs dans la salle
  - liste d'attente automatique quand un tableau est complet ; une place libérée, ou des places ajoutées, font monter le premier en attente
  - contrôle des conditions (points, année de naissance, nombre de tableaux maximum)
  - doubles avec partenaire, tarif calculé, encaissement (espèces, chèque, carte, offert), présence
- **Compétition** (onglet Compétition)
  - aperçu avant tirage : nombre de poules et leur taille
  - tirage au sort : têtes de série en serpentin, chapeaux tirés au sort en séparant les clubs, absents déclarés forfait ; élimination directe avec têtes de série et exempts
  - échange manuel de deux joueurs de poule, nouveau tirage ou annulation du tirage tant qu'aucun match n'est joué
  - saisie des scores contrôlée selon le sport (11 points à 2 d'écart au tennis de table, 21 avec plafond à 30 au badminton, 13 à la pétanque, score libre ailleurs), forfaits, correction d'un résultat
  - classements de poule avec départage par confrontations directes, tableau final généré automatiquement (sortants d'une même poule dans des moitiés opposées), podium
- **Écran de la salle** (fenêtre à glisser sur le vidéoprojecteur, plein écran) : places restantes par tableau, mises à jour toutes les 3 secondes

## Feuille de route

1. ✅ Création du tournoi et inscriptions avec places restantes
2. ✅ Tirage au sort, poules et tableaux
3. Appel des matchs sur les tables, saisie des scores
4. Modes de diffusion qui s'enchaînent selon l'état du tournoi : places restantes, poules qui défilent, tableaux, appels des joueurs, résultats, podiums
5. Lots, tombola, palmarès
6. Installateur Windows (double-clic, raccourci sur le bureau, sauvegarde automatique de la base)
