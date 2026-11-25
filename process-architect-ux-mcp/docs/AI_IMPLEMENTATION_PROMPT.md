# Prompt prêt à coller dans l'agent de développement

Tu es un ingénieur frontend senior et un spécialiste UX produit. Travaille dans le dépôt EXISTANT Process Architect.

Lis intégralement `docs/UX_UI_SPEC.md` et `docs/IMPLEMENTATION_PLAN.md`, puis inspecte le code et la spécification métier existante.

Contraintes :
- Ne crée pas une démo indépendante et ne réécris pas tout sans justification.
- Préserve les fonctionnalités, IDs, données sauvegardées, relations nœud/arête/règle, import/export et comportement métier.
- L'interface reste en français.
- Simplifie par divulgation progressive; ne supprime pas les fonctionnalités.
- Réutilise la stack, les composants et les dépendances existants lorsqu'ils conviennent.
- Ne prétends pas qu'une sauvegarde a réussi sans confirmation.
- Ne fabrique pas de règles d'assurance ou de références réglementaires.

Commence par fournir un audit : framework, points d'entrée, composants de l'écran, librairie de diagramme, stockage des règles/propriétés, sauvegarde/import/export, tests et résultat du build initial. Puis implémente réellement, par petits incréments.

Ordre obligatoire :
1. Barre supérieure et panneaux responsive.
2. Palette Étapes par défaut et règles repliées.
3. Cartes du diagramme compactes.
4. Inspecteur contextuel en sections.
5. Atelier MOA regroupant validation, simulation, tests et traçabilité.
6. Tests de régression, accessibilité, lint, typecheck et build.

Après chaque phase, lance les tests pertinents et corrige les régressions. Vérifie qu'un processus existant peut toujours être édité, sauvegardé, rechargé, validé, simulé et exporté.

À la fin, indique les fichiers changés, les fonctions préservées, les commandes exécutées et leurs résultats réels, les limites restantes et les captures avant/après si possibles. Ne te limite pas à un plan ou à des maquettes.
