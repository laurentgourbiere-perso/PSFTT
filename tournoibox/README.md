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
- **Salle** (onglet Salle)
  - toutes les tables (ou terrains) d'un coup d'œil : libre, appelé, en jeu, avec le temps écoulé
  - bouton « Remplir les tables libres » : appelle les matchs prêts depuis le plus longtemps, sans jamais mettre un joueur sur deux tables (simples et doubles confondus), en laissant souffler 3 minutes ceux qui sortent de table
  - appel manuel sur une table choisie, « Commencer », « Libérer » (le match retourne dans la file)
  - saisie du score directement sur la table : la table se libère et le tableau avance
  - file d'attente commentée (joueur occupé, vient de jouer) et derniers résultats corrigeables
- **Écran de la salle** (fenêtre à glisser sur le vidéoprojecteur, plein écran, pointeur masqué), mis à jour toutes les 3 secondes et lisible à toute taille d'écran
  - **mode automatique** selon l'avancement : avant le tournoi les places restantes ; pendant, les appels, les tables, les poules (6 par page), les tableaux finaux, les derniers résultats et les podiums déjà connus ; à la fin, les podiums
  - en automatique, les matchs appelés restent affichés en bandeau sur toutes les diapositives
  - modes forcés : places restantes, appels, tables, poules, tableaux, résultats, podiums, annonce plein écran
  - annonce qui défile en bas de l'écran (« Remise des prix à 18h »), durée des diapositives réglable
- **Lots** (onglet Lots)
  - lots par tableau et par place (valeur, partenaire), en un clic « coupes et médailles » pour tous les tableaux
  - attribution automatique dès qu'un tableau se termine, refaite si un résultat est corrigé ; suivi des lots remis
  - tombola : tirage au sort parmi les joueurs présents, un lot par personne, « absent » pour remettre le lot en jeu
- **Tombola en direct** : chaque tirage passe en priorité sur l'écran de la salle (les noms défilent, ralentissent, puis le gagnant apparaît)
- **Palmarès** (onglet Palmarès) : podiums, classements, lots et tombola, imprimable ou en PDF
- **Onglet Écran** : on pilote le vidéoprojecteur depuis le poste organisateur (changement en 3 secondes), avec un aperçu en direct

## Feuille de route

1. ✅ Création du tournoi et inscriptions avec places restantes
2. ✅ Tirage au sort, poules et tableaux
3. ✅ Appel des matchs sur les tables, saisie des scores
4. ✅ Modes de diffusion qui s'enchaînent selon l'état du tournoi : places restantes, poules qui défilent, tableaux, appels des joueurs, résultats, podiums
5. ✅ Lots, tombola, palmarès
6. Installateur Windows (double-clic, raccourci sur le bureau, sauvegarde automatique de la base)
