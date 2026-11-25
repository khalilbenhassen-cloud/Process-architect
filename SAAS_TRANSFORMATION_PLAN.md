# Plan de Transformation SaaS B2B — Process Architect
*(Architecture Générique & Paramétrable × Design System Chatwoot × Navigation macOS Launchpad/Dock & Apple Fluid Design × Équipe d'Agents IA Collaborateurs & Agenda Outlook)*

> [!IMPORTANT]
> **Principes fondamentaux de la plateforme :**
> 1. **100 % générique, neutre et personnalisable (« Espace Vierge »)** : Zéro catégorisation sectorielle figée. Le client crée librement ses propres **catégories, projets, équipes, intervenants humains, tags carrés colorés (`■`), jalons de validation et Agents IA collaborateurs personnalisés**.
> 2. **Navigation macOS (Launchpad Central $\rightarrow$ Dock Flottant en bas au centre)** :
>    - **À l'ouverture de l'application** : L'utilisateur voit au centre de l'écran **7 grandes icônes carrées illustrées (*macOS Squircles*)** pour accéder directement à la catégorie de son choix.
>    - **Une fois une catégorie choisie** : Les icônes descendent se ranger **en bas au centre dans un Dock flottant style macOS**, et l'écran principal n'affiche **QUE la catégorie sélectionnée** (suppression de la barre latérale gauche permanente pour désengorger l'écran).
> 3. **Design System Chatwoot × Apple Design (`emilkowalski/skills/apple-design`)** :
>    - Conservation intégrale des couleurs et de la typographie **Chatwoot** (`#FAFAFA`, `#ECEEF0`, `#1F93FF`, `#EBF5FF`, `#DDF0FF`, `#F2F3F7`, `#FFF6D6` pour les Notes Privées `🔒`, police `Inter`).
>    - Enrichissement par les principes **Apple Fluid Interfaces (`apple-design`)** : matériaux translucides multicouches sur le Dock et la barre supérieure uniquement, physique de ressort amorti (`damping: 1.0`, `response: 0.35s`), cohérence spatiale (`transform-origin` ancré), réactivité immédiate au clic (`:active scale(0.97)`), et typographie optique (`letter-spacing` adaptatif).
> 4. *(La gestion des abonnements et des paiements est exclue et reportée après la mise en production).*

---

## 1. Architecture Multi-Agents IA Collaborateurs (dans `Conversations` & `Studio`)

Dans **Process Architect**, les Agents IA sont traités comme de **véritables collaborateurs d'équipe**. On peut discuter avec eux en **1-to-1** ou les **mentionner (`@`)** au milieu d'une conversation entre collègues humains.

### A. Les 5 Agents IA Collaborateurs inclus par défaut

| Agent IA | Mention `@` | Rôle & Compétences dans `Conversations` et le `Studio` | Actions directes (Cartes interactives 1-clic) |
| :--- | :--- | :--- | :--- |
| **🤖 Architect Copilot** | `@Copilot` | **Orchestrateur Général** : répond à toute question sur le projet ou le processus lié, coordonne les autres agents et assiste l'équipe en temps réel. | Suggestions globales, diagnostic rapide, routage vers l'agent spécialisé. |
| **📐 Agent Modélisateur** | `@Modelisateur` | **Conception de Flux** : transforme une discussion entre collaborateurs ou un besoin exprimé en texte en étapes de processus (`Activité`, `Décision`, `Début/Fin`) et connecteurs. | Carte **`[✨ Appliquer les étapes au Studio]`** (ajoute/relie les nœuds sur le canevas et bascule vers le Studio). |
| **🔍 Agent Auditeur & Règles** | `@Auditeur` | **Gouvernance & Règles Métier** : vérifie la cohérence structurelle du flux, détecte les étapes orphelines ou sans responsable, et rédige/corrige les règles de gestion (`RG-*`). | Carte **`[➕ Enregistrer la règle de gestion]`** et rapport d'anomalies cliquable. |
| **🧪 Agent QA & Simulation** | `@QA` | **Recette & Couverture** : génère automatiquement les scénarios de test (nominaux et cas d'erreur), simule les embranchements et vérifie la couverture des règles. | Carte **`[🧪 Ajouter aux cas de test du processus]`** + score de couverture. |
| **📅 Agent Secrétaire de Projet** | `@Secretaire` | **Synthèse & Agenda Outlook** : résume les longs fils d'échanges entre collaborateurs, extrait les décisions en **`🔒 Note Privée`** et prépare automatiquement l'ordre du jour des **réunions Outlook**. | Carte **`[📅 Planifier Réunion Outlook & Créer Note Privée 🔒]`**. |

### B. Création & Configuration d'Agents IA par le Client (`+ Nouvel Agent IA`)
Le client peut créer et configurer ses propres Agents IA collaborateurs :
- **Identité** : Nom de l'agent, identifiant de mention (`@mon-agent`), titre/rôle, avatar/icône, couleur et équipe de rattachement.
- **Instructions Système (Prompt Métier)** : Directives personnalisées du client.
- **Compétences activées (Tools)** : Modélisation BPMN, Audit & Règles (`RG-*`), Recette QA, Synthèse `🔒` & Réunion Outlook.

---

## 2. Architecture Ergonomique CRM : macOS Launchpad + Dock Central × Chatwoot × Apple Design

### A. Le Fonctionnement en 2 Temps (Zéro Barre Latérale Gauche Permanente)

1. **État 1 — À l'ouverture de l'application : Le « Launchpad Central » (Accueil)** :
   - Au centre de l'écran, l'utilisateur voit **7 grandes icônes carrées aux coins arrondis (*macOS Squircles*, `108×108px`, `border-radius: 22.5%`)** contenant chacune une **illustration graphique représentative** + un **badge de notification** en temps réel.
   - En haut, une **fine barre supérieure style macOS Menu Bar (`38px`)** affiche :
     - Logo `PA Process Architect` + bouton rapide `Menu Central (Launchpad)`
     - **Sélecteur de contexte CRM actif** : `📁 Projet actif ▾` $\rightarrow$ `📐 Processus actif ▾`
     - Recherche rapide et Sélecteur de collaborateur actif (`🟢 Khalil Benhassen`).
2. **État 2 — Dès que l'utilisateur choisit une catégorie : Vue Dédiée Plein Écran + « Dock macOS » en bas au centre** :
   - Les icônes se rangent **en bas au centre de l'écran dans un Dock flottant vitré (`MacDock.tsx`)** avec :
     - Icône `0` : **Menu Central (Launchpad)** pour réafficher les grandes icônes au centre à tout moment,
     - Les **7 icônes illustrées des catégories** avec effet de zoom au survol, infobulle, badge de notification et **point lumineux bleu (`•`)** sous la catégorie active.
   - **L'écran principal (100 % de la largeur)** n'affiche **QUE la catégorie sélectionnée**.

### B. Décomposition des 7 Catégories (Icônes Carrées Illustrées)
*(Note : **Règles (`RG-*`) & Audit QA** sont directement intégrés à l'intérieur du **Studio BPMN**).*

| # | Catégorie (Icône Carrée) | Illustration représentative intégrée | Contenu exclusif affiché à l'écran (et liaisons inter-modules) |
| :-: | :--- | :--- | :--- |
| **1** | **Conversations & Notes** | 💬 Bulles de dialogue 3D bleues + badge rouge non-lus | **Espace Chatwoot épuré (sans sidebar gauche)** : Liste des échanges (`310px`, sans bandeau redondant) + Fil de discussion aéré (`flex-1`, bulles `#F2F3F7` / `#DDF0FF`, Notes Privées jaunes `#FFF6D6` `🔒`, menu compact `[✨ Solliciter un Agent IA ▾]`, puces compactes `📖 RG-*` / `🔗 @étape`) + Fiche CRM à droite (`290px`, repliable, en 2 onglets `Propriétés` \| `Processus & Outlook`). |
| **2** | **Agents IA Collaborateurs** | 🤖 Robot IA lumineux violet/bleu + pastille verte `🟢` | **Hub dédié aux Agents IA** : Cartes des 5 Agents IA natifs + Agents IA créés par le client, bouton **`+ Créer un Agent IA`**, configuration des prompts/compétences (`AIAgentBuilderModal`), et bouton **`💬 Discuter en 1 clic`** (qui bascule le Dock sur `Conversations`). |
| **3** | **Studio BPMN, Règles & QA** | 📐 Schéma de flux, losange de décision & bouclier `RG` | **Atelier complet de modélisation & gouvernance** : Canevas React Flow plein écran + Palette d'étapes & **Référentiel des Règles de gestion (`RG-*`)** + **Tiroir intégré Règles, Audit de cohérence, Simulation, Traçabilité & Recette QA (`AnalysisDrawer`)** + Pont rapide vers la conversation projet. |
| **4** | **Projets & Jalons** | 📁 Dossiers dorés & coche de validation verte | **Dossiers CRM & Gouvernance** : Création/filtrage libre des Projets par catégorie et tag, suivi et approbation en 1 clic des **Jalons de validation (`Approbations`)**, et boutons d'ouverture directe dans le `Studio BPMN` ou dans `Conversations`. |
| **5** | **Agenda & Outlook** | 📅 Calendrier + enveloppe bleue Microsoft Outlook | **Agenda collaboratif connecté à Microsoft Outlook** : Planification manuelle ou pré-remplie par `📅 Agent Secrétaire de Projet`, bouton **`📅 Ouvrir dans Microsoft Outlook (Web / 365)`**, téléchargement **`.ics` (RFC 5545)** et synchronisation Graph API. |
| **6** | **Équipes & Intervenants** | 👥 Groupe d'avatars d'équipe colorés | **Annuaire humain & Organisation** : Création et gestion des **Équipes (`+ Nouvelle équipe`)** et des **Collaborateurs humains (`+ Nouvel intervenant`)**, rôles, statuts de présence (`🟢 En ligne`, `🟡 Occupé`, `⚪ Absent`) et lancement de discussion directe. |
| **7** | **Paramètres & Tags** | ⚙️ Curseurs de réglage & carrés de tags colorés (`■`) | **Configuration du SaaS** : Création/suppression libre des **Catégories de projets**, des **Tags carrés colorés (`■`)**, et bouton **`Réinitialiser l'espace (Espace Vierge)`**. |

### C. Principes du Skill `apple-design` (`emilkowalski/skills`) appliqués sur la base Chatwoot

1. **Réactivité immédiate au clic (`Respond on pointer-down`)** :
   - Classe `.apple-pressable:active { transform: scale(0.97); transition: transform 100ms ease-out; }` sur toutes les icônes carrées du Launchpad, du Dock et les boutons d'action.
2. **Physique de Ressort Amorti (`Critically Damped Springs : damping 1.0, response 0.35s`)** :
   - Courbe fluide `cubic-bezier(0.22, 1, 0.36, 1)` sans blocage des entrées utilisateur (*interruptible*) lors du basculement entre le Launchpad central et les vues du Dock, ainsi que pour l'ouverture des panneaux (Studio Règles/QA et Fiche CRM).
3. **Cohérence Spatiale & Origines Ancrées (`Spatial Consistency`)** :
   - Les transitions entre le Launchpad central et le Dock en bas utilisent `transform-origin: bottom center` pour que les icônes semblent physiquement descendre dans le Dock et en remonter.
4. **Matériaux Translucides Multicouches (`Translucent Materials & Depth`)** :
   - Appliqués **exclusivement** au **Dock flottant en bas (`MacDock.tsx`)** et à la **Barre supérieure (`MacTopBar.tsx`)** : `backdrop-filter: blur(20px) saturate(180%)`, reflet spéculaire supérieur `inset 0 1px 0 rgba(255,255,255,0.85)`, bordure Chatwoot `#DFE3E6` et ombre ambiante douce.
5. **Typographie Optique (`Optical Sizing, Tracking & Leading`) sur `Inter`** :
   - Titres (`18px–24px`) : `letter-spacing: -0.022em` | Corps & Chat (`13px–14px`) : `letter-spacing: -0.006em` | Labels d'icônes & Tags (`11px`) : `letter-spacing: +0.01em`.

---

## 3. Découpage en Phases Réalisables

### Phases 1 à 6 : Socle Backend, Multi-Agents IA, Synchronisation Outlook, Composants Chatwoot & Tests *(✅ Terminées & Validées)*
- **Phase 1** : Socle Backend Générique (`models.py`, `database.py`, `storage.py`), Moteur des 5 Agents IA + Agents personnalisés (`ai_agents.py`), et Service Microsoft Outlook (`outlook.py`).
- **Phase 2** : Tokens CSS Chatwoot (`index.css`).
- **Phase 3** : Composants `Conversations` (`ConversationList`, `ConversationThread`, `ConversationDetailsPanel`) et `AIAgentBuilderModal`.
- **Phase 4** : Composants Agenda & Microsoft Outlook (`MeetingChatCard`, `MeetingSchedulerModal`, `AgendaView`).
- **Phase 5** : Vues `ProjectsWorkspaceView`, `TeamsDirectoryView` et pont bidirectionnel avec le Studio React Flow (`App.tsx`).
- **Phase 6** : Suite de tests unitaires Backend (`40 passed` dans `pytest`) et Frontend (`12 passed` dans `vitest`) + Build de production.

---

### Phase 7 : Refonte Ergonomique CRM — Launchpad Central macOS, Dock Flottant Illustré & Design System Chatwoot × Apple Design *(✅ Terminée & Validée)*
**Objectif** : Désengorger l'interface en remplaçant la barre latérale gauche par le **Launchpad Central à 7 grandes icônes carrées illustrées** (à l'ouverture) qui se réduit en **Dock macOS flottant en bas au centre** dès qu'une catégorie est sélectionnée, tout en intégrant **Règles & QA dans le Studio BPMN** et en allégeant l'espace `Conversations` façon CRM moderne.

1. ✅ **Tokens CSS Apple Design × Chatwoot (`frontend/src/index.css`)** :
   - Ajout des classes `.apple-glass-dock`, `.apple-glass-topbar`, `.apple-squircle`, `.apple-squircle-dock`, `.apple-pressable`, `.apple-workspace-enter`, `.apple-launchpad-enter`, et des règles de typographie optique (`tracking` / `leading` adaptatifs sur `Inter`).
2. ✅ **Composant d'Icônes Carrées Illustrées (`frontend/src/components/launchpad/MacAppIcon.tsx`)** :
   - Icônes carrées *squircle* avec illustrations SVG riches et représentatives en haute définition pour chacune des **7 catégories** (`Conversations`, `Agents IA`, `Studio BPMN + Règles & QA`, `Projets & Jalons`, `Agenda Outlook`, `Équipes & Intervenants`, `Paramètres & Tags`), utilisables en grand format (`104×104px` sur le Launchpad) et en format Dock (`48×48px` avec effet de zoom macOS au survol et badges dynamiques).
3. ✅ **Barre Supérieure Contextuelle (`frontend/src/components/launchpad/MacTopBar.tsx`) & Launchpad Central (`frontend/src/components/launchpad/MacLaunchpadView.tsx`) & Dock Flottant (`frontend/src/components/launchpad/MacDock.tsx`)** :
   - **À l'ouverture de l'app** : affichage du **Launchpad Central** avec les 7 grandes icônes carrées illustrées au centre de l'écran.
   - **Dès le clic sur une icône** : ouverture plein écran de la catégorie choisie + apparition du **Dock macOS en bas au centre** pour changer de catégorie à tout moment (ou revenir au Launchpad).
   - **Fil conducteur CRM en haut** : sélecteur rapide du `Projet actif` et du `Processus actif` + statut de présence de l'utilisateur.
4. ✅ **Séparation nette des 7 Vues Dédiées & Allègement CRM de `Conversations`** :
   - **Allègement de `ConversationList.tsx`, `ConversationThread.tsx` & `ConversationDetailsPanel.tsx`** :
     - Bandeau Agents IA affiché uniquement sur l'onglet `Agents IA` dans la liste des conversations.
     - Puces `@étape` et `RG-*` compactées avec infobulles au survol + sections secondaires repliées par défaut dans `ConversationDetailsPanel`.
   - **Vues dédiées par icône** :
     - Icône **`Agents IA Collaborateurs`** $\rightarrow$ affiche uniquement le Hub des Agents IA (`mode="ai_only"` : 5 agents natifs + agents personnalisés + création/configuration + chat 1 clic).
     - Icône **`Équipes & Intervenants`** $\rightarrow$ affiche uniquement les équipes et collaborateurs humains (`mode="humans_only"`).
     - Icône **`Studio BPMN, Règles & QA`** $\rightarrow$ regroupe le canevas React Flow, la bibliothèque des règles `RG-*`, l'audit de cohérence, la simulation et les cas de test QA (avec boutons directs `+ Règle RG`, `Audit` et `Recette QA` intégrés à la barre d'outils du Studio).
     - Icône **`Paramètres & Tags`** (`SettingsAndTagsView.tsx`) $\rightarrow$ vue dédiée à la gestion des Catégories, des Tags carrés colorés (`■`) et de la réinitialisation **`Espace Vierge`**.
5. ✅ **Tests Automatisés (`vitest`) & Build de Production (`npm run build`)** :
   - `14 passed` dans `vitest` (`AnalysisDrawer.test.tsx` + `SaaSWorkspace.test.tsx` incluant `MacLaunchpadView` et `MacDock`) et `0 erreur` au build de production (`tsc -b && vite build`).

