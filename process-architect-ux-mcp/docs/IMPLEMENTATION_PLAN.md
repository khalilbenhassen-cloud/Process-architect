# Plan d'implémentation UX/UI

## Phase 0 — Audit
Inspecter framework, composants, bibliothèque du diagramme, état, modèle, persistance, import/export et tests. Exécuter le build et les tests avant modification. Documenter la baseline.

## Phase 1 — Structure
Réduire la barre supérieure, donner priorité au canevas, rendre les panneaux repliables et mettre en place les breakpoints.

## Phase 2 — Palette et cartes
Ouvrir par défaut l'onglet Étapes; replier les règles longues; compacter les cartes sans retirer les détails métier.

## Phase 3 — Inspecteur
Regrouper les champs en Général, Responsabilité, Temps, Règles métier, Données, Contrôles et Avancé. Préserver les brouillons lors de la fermeture.

## Phase 4 — Atelier MOA
Regrouper Validation, Simulation, Cas de test et Traçabilité; permettre de focaliser l'élément depuis un constat.

## Phase 5 — Régression
Tester édition, sauvegarde/rechargement, règles liées, import/export, validation, simulation, responsive, clavier, lint, tests et build.

Priorité si temps limité : 1) cartes compactes, 2) panneau gauche Étapes par défaut, 3) inspecteur contextuel, 4) Atelier MOA, 5) responsive/accessibilité.
Ne pas ajouter de nouvelles fonctions métier durant cette refonte sauf nécessité de compatibilité.
