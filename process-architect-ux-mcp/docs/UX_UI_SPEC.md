# Process Architect — Spécification UX/UI ready-to-develop
Version 1.0 — Interface française

## Mission
Refondre l'interface existante de Process Architect pour réduire la surcharge visuelle observée dans la capture de référence, sans supprimer de fonctionnalité métier. Auditer le dépôt, la stack, le modèle de données et les tests avant de modifier le code. Adapter l'existant plutôt que réécrire l'application sans justification.

## Principes non négociables
1. Le diagramme est la zone principale.
2. Divulgation progressive : détails accessibles sur demande.
3. Panneaux contextuels et refermables.
4. Préserver les fonctionnalités, données, identifiants et relations existants.
5. Aucun état « Enregistré » avant confirmation de persistance.
6. Interface en français, accessible au clavier et responsive.
7. Ne pas inventer de règles d'assurance ni prétendre à une conformité réglementaire.
8. Ne pas supprimer une fonctionnalité pour simplifier l'écran.

## 1. Barre supérieure
- Afficher le logo/nom, le nom du processus, la version et le mode AS-IS/TO-BE.
- États de sauvegarde explicites : Modifications non enregistrées, Enregistrement…, Enregistré, Échec de l'enregistrement.
- Actions principales : Nouveau, Ouvrir, Enregistrer, Dupliquer, Exporter.
- Regrouper les actions secondaires dans un menu si l'espace manque.
- « Atelier MOA » ouvre l'espace Validation, Simulation, Cas de test, Traçabilité.
- À moins de 1280 px, replier les actions secondaires dans un menu.
- Ne jamais afficher une sauvegarde réussie si la persistance a échoué.

## 2. Disposition principale
Trois zones logiques : panneau gauche, canevas central, inspecteur droit. Le canevas doit avoir la priorité.
- Bureau >=1280 px : panneau gauche 220–260 px, inspecteur 280–340 px, canevas flexible. L'inspecteur est fermé par défaut, sauf préférence utilisateur existante.
- Tablette 768–1279 px : panneau gauche repliable, inspecteur en tiroir.
- Mobile <768 px : une seule zone principale à la fois; panneaux en tiroirs/vues dédiées; aucun débordement horizontal.
- Ne pas forcer simultanément les deux panneaux ouverts si le canevas devient trop étroit.

## 3. Panneau gauche
Onglets : « Étapes » et « Règles métier ». Par défaut, ouvrir « Étapes ».
Palette compacte, regroupée :
- Flux : Début, Fin
- Activités : Tâche, Sous-processus
- Contrôle : Décision
- Données : Entrée/Sortie
Chaque type possède une icône, un libellé court, une aide accessible et une action click-to-add. Le glisser-déposer ne doit pas être le seul moyen d'ajouter une étape.

Onglet Règles métier :
- Recherche, filtre par catégorie/criticité, compteur et bouton « Nouvelle règle ».
- Par défaut, chaque règle affiche seulement ID, titre court et criticité.
- Description longue, source et détails sont repliés jusqu'à sélection/expansion.
- Modifier, lier et délier une règle sans quitter le processus.
- Délier une règle d'une étape ne supprime jamais la règle du catalogue.
- Suppression avec confirmation; criticité indiquée par texte/icône/couleur, pas par couleur seule.

## 4. Cartes du diagramme
Afficher par défaut uniquement :
- icône et type (Tâche, Décision, Début, Fin…)
- libellé sur deux lignes maximum
- rôle responsable facultatif sur une ligne secondaire
- distinction visuelle claire pour une Décision
Les descriptions complètes, noms d'applications longs, règles liées, entrées/sorties et contrôles restent dans l'inspecteur. Une métadonnée compacte facultative peut afficher durée ou « 2 règles », avec clic pour ouvrir la section correspondante.

- Largeur cohérente et texte long tronqué/retourné sans chevauchement.
- Les contrôles ne recouvrent jamais le libellé.
- Les nœuds sélectionnés ont un contour distinct, pas seulement une couleur.
- Les libellés de branches restent proches des arêtes et lisibles.
- Les décisions ont des branches nommées et uniques.
- Conserver les positions manuelles lors de la sauvegarde.
- Réorganisation automatique uniquement via action explicite « Réorganiser/Ajuster le diagramme », avec possibilité d'annuler si disponible.

## 5. Inspecteur contextuel droit
S'ouvre à la sélection d'une étape, se ferme avec un bouton visible. Fermeture/réouverture ne perd pas les brouillons. Sans sélection, afficher « Sélectionnez une étape pour modifier ses propriétés ».
Sections repliables :
1. Général : libellé, type, description fonctionnelle.
2. Responsabilité : rôle, application, mode d'exécution.
3. Temps : durée estimée en minutes.
4. Règles métier : règles liées, lier/délier, accès rapide aux détails.
5. Données : entrées et sorties.
6. Contrôles : contrôles opérationnels.
7. Avancé : ID et métadonnées techniques.
« Général » ouvert par défaut; les autres sections affichent un résumé/compteur. Tous les champs déjà supportés restent disponibles. Le bouton de suppression est isolé en bas et demande confirmation. Les erreurs de formulaire sont expliquées près du champ.

## 6. Atelier MOA
Regrouper dans un tiroir inférieur repliable ou une vue dédiée :
- Validation
- Simulation
- Cas de test
- Traçabilité
En mode édition, n'afficher qu'un résumé compact, par exemple « Validation : 2 avertissements ».
- Cliquer un constat sélectionne/focalise le nœud ou l'arête.
- Distinguer Erreur, Avertissement, Suggestion par texte + icône + couleur.
- La validation ne modifie pas le processus.
- La simulation demande un choix explicite à chaque décision non résolue; affiche parcours, durée estimée et motif d'arrêt.
- Les cas générés sont des brouillons à réviser par un humain.
- Les trous de traçabilité sont signalés, jamais comblés par des IDs inventés.
- Le tiroir peut être fermé sans perdre les résultats.

## 7. Interactions et sauvegarde
Ajout d'étape : palette → créer un ID stable et un libellé par défaut → ouvrir l'inspecteur → connecter au flux. Montrer les changements non enregistrés immédiatement. Pendant la sauvegarde, montrer « Enregistrement… »; après confirmation seulement, « Enregistré ». En cas d'échec, conserver les modifications et proposer Réessayer. Si navigation avec changements non sauvegardés et non récupérables, demander confirmation.

## 8. Compatibilité des données
- Inspecter le modèle actuel avant changement.
- Préserver IDs de processus, nœuds, arêtes et règles, coordonnées et associations.
- Ne pas renommer/supprimer de champs persistés sans migration explicite.
- Tester l'ouverture de projets existants, sauvegarde/rechargement, import/export et associations de règles.
- L'état d'ouverture des panneaux est une préférence UI, pas une donnée métier.
- Conserver la compatibilité des exports ou versionner et migrer explicitement.

## 9. Accessibilité et système visuel
- Réutiliser les tokens et la bibliothèque d'icônes existants.
- Sinon, échelle d'espacement 4/8/12/16/24/32 px, rayons 6–10 px, bordures discrètes, ombres limitées.
- Contraste lisible, focus clavier visible, boutons icône avec nom accessible.
- Aucun statut transmis uniquement par la couleur.
- États vides, chargement, succès et erreur.
- Respecter zoom navigateur et préférence reduced-motion.
- Aucune interaction essentielle disponible uniquement au survol.

## 10. Critères d'acceptation
- Le diagramme est la zone visuellement dominante.
- Le panneau gauche s'ouvre sur Étapes.
- Les descriptions des règles sont repliées par défaut.
- Les cartes affichent des informations compactes sans perdre de détails dans l'inspecteur.
- L'inspecteur est contextuel, repliable et organisé en sections.
- Validation, Simulation, Cas de test et Traçabilité sont accessibles via Atelier MOA.
- Les projets existants restent lisibles/modifiables.
- Les positions des nœuds, liens et règles survivent à save/reload.
- Les états de sauvegarde sont exacts.
- Vérifications desktop/tablette/mobile, clavier et focus.
- Tests unitaires, tests UI/e2e, lint, typecheck et build production exécutés.
- README avec décisions UX et captures avant/après si possible.

## Livrables attendus de l'agent
1. Audit du dépôt et résultat des tests avant changement.
2. Liste des fichiers modifiés.
3. Fonctionnalités préservées.
4. Tests et commandes réellement exécutés avec résultats.
5. Limites connues et éléments différés.
6. Captures avant/après si l'environnement le permet.
Ne jamais déclarer un test réussi sans l'avoir exécuté.
