# Process Architect — Plateforme BPMN 2.0, Agents IA & Ingénierie MOA

> **Avertissement méthodologique** : Ce projet est une réalisation indépendante dédiée à l'ingénierie des processus métier (BPM / MOA). Les scénarios de démonstration inclus (*Demande de rachat partiel* et *Sinistre Auto*) reposent sur des **données strictement fictives** et ne constituent aucune règle officielle ni recommandation réglementaire.

---

## Sommaire

1. [Présentation](#-1-présentation)
2. [Fonctionnalités Principales](#-2-fonctionnalités-principales)
3. [Architecture Technique](#-3-architecture-technique)
4. [Scénarios de Démonstration Inclus](#-4-scénarios-de-démonstration-inclus)
5. [Installation & Lancement Rapide](#-5-installation--lancement-rapide)
6. [Authentification & Comptes de Test](#-6-authentification--comptes-de-test)
7. [Tests Automatisés & Build](#-7-tests-automatisés--build)
8. [Licence](#-8-licence)

---

## 🎯 1. Présentation

**Process Architect** est une plateforme SaaS B2B conçue pour les **Business Analysts**, **Chefs de projet MOA**, **Architectes Processus** et **Product Owners**. Elle réunit dans une interface épurée (inspiration Apple macOS HIG) :
- la **modélisation BPMN 2.0 (OMG ISO 19510)** multi-vues,
- l'**audit structurel**, la **simulation de parcours** et la **recette QA**,
- une équipe de **5 agents IA collaborateurs** capables d'exécuter des livrables en 1 clic (avec ou sans clé API),
- la **gouvernance multi-projets** (versioning `v1/v2/v3`, comparaison `AS-IS / TO-BE`, échanges d'équipe, agenda Outlook),
- et des **exports industriels** (`.bpmn` conforme OMG 2.0, Excel multi-onglets, PNG Ultra-HD, Markdown, JSON, CSV).

---

## ✨ 2. Fonctionnalités Principales

### 2.1 Studio BPMN 2.0 Multi-Vues
- **3 moteurs de visualisation synchronisés en temps réel** :
  - **Diagramme BPMN** : flux orthogonal haute lisibilité, cercle radial d'édition rapide (6 actions) et fenêtres HUD.
  - **Vue Swimlanes (Pools & Lanes)** : séparation automatique des acteurs externes (*Client, Adhérent, Assuré, Fournisseur…*) dans un **Pool Externe** et des équipes internes en **Lanes**, avec routage anti-collision multi-pistes.
  - **Vue Flux Animés (Isométrique)** : visualisation pédagogique animée des flux, délais, alertes et décisions.
- **Constructeur Tableau (Table Builder)** : édition rapide en tableau avec colonnes redimensionnables, saisie de durées (`min` / `h` / `j`), règles métier (`RG-*`) et conditions d'exception personnalisables (presets génériques + saisie libre).
- **Notation BPMN 2.0 complète** :
  - Types de tâches : `User Task`, `Service Task`, `Manual Task`, `Business Rule Task` (et `Send Task` à l'export `.bpmn`).
  - Passerelles : `XOR (×)`, `OR (○)`, `AND (+)`, **`Event-Based (◎)`** (attente de message ou de délai/timer).
  - Connecteurs normés : `Sequence Flow` (trait plein), `Message Flow` (pointillés inter-pools), `Association` (données).
  - Événements Début (bordure fine) et Fin (bordure épaisse verte/rouge).
- **Capture Ultra-HD (`📷`)** : export plein cadre `2×` Retina avec modale d'aperçu, zoom (`-` / `Ajusté` / `+` / `100%`), copie presse-papiers, impression / PDF et téléchargement PNG.

### 2.2 Audit, Simulation & Recette QA
- **Audit de cohérence déterministe** : 5 indicateurs objectifs agnostiques du secteur (*Complétude des fiches*, *Cohérence BPMN 2.0*, *Couverture règles métier*, *Traçabilité & contrôles*, *Absence d'anomalies*) et badges de sévérité sur le diagramme.
- **Simulation de parcours** : sélection interactive des branches aux passerelles, surlignage du chemin parcouru, cumul des durées et comptage des étapes manuelles/automatisées.
- **Recette & Matrice de Traçabilité** : dérivation automatique de cas de test à partir des branches et règles métier, suivi d'alignement à 4 niveaux (*Exigences ↔ Règles ↔ Étapes ↔ Cas de test*).

### 2.3 Équipe de 5 Agents IA Collaborateurs
Disponibles dans l'onglet **Échanges** (mention `@`) et **strictement isolés par projet** :

| Agent | Mention | Rôle & Livrable 1-clic |
|---|---|---|
| **Architect Copilot** | `@Copilot` | Orchestrateur généraliste — oriente automatiquement la demande |
| **Agent Modélisateur** | `@Modelisateur` | Génère des étapes BPMN 2.0 typées et passerelles à 2 branches reliées au flux |
| **Agent Auditeur & Règles** | `@Auditeur` | Lance l'audit structurel et formalise une règle métier `RG-*` enregistrable en 1 clic |
| **Agent QA & Simulation** | `@QA` | Calcule la couverture et injecte des scénarios de test dans l'onglet Recette |
| **Agent Secrétaire de Projet** | `@Secretaire` | Synthétise les échanges et planifie une réunion d'équipe dans l'Agenda Outlook |

> **Fonctionne immédiatement sans aucune clé API** grâce au moteur local embarqué, et peut être enrichi à tout moment avec **OpenAI**, **Anthropic Claude**, **Google Gemini** ou un modèle local gratuit via **Ollama** (`http://localhost:11434/v1`).

### 2.4 Gouvernance Projets, Versioning & Collaboration
- **Portefeuille Projets** : regroupement des processus `AS-IS` et `TO-BE`, gestion des membres humains et agents IA par projet, héritage automatique des règles métier (`RG-*`) entre processus d'un même projet.
- **Versioning persistant (`v1`, `v2`, `v3`…)** : enregistrement brouillon, publication de version (`Mettre à jour vX` ou `Passer en v(X+1)`), historique complet et restauration en 1 clic.
- **Comparateur `AS-IS / TO-BE`** : analyse des écarts d'étapes, de durée et d'automatisation.
- **Échanges & Agenda** : fils de discussion filtrés par projet et planification de comités avec export calendrier `.ics` / lien Microsoft Outlook.

### 2.5 Exports & Interopérabilité
- **BPMN 2.0 XML (`.bpmn`) conforme OMG ISO 19510** : `<bpmn:collaboration>`, Pool boîte noire externe, `<bpmn:messageFlow>` bidirectionnels, `<bpmn:eventBasedGateway>` avec `<bpmn:intermediateCatchEvent>` (Timer ISO-8601 `P30D` & Message), `default="..."` + `<bpmn:conditionExpression>` sur les passerelles XOR, et BPMNDI complet anti-collision — directement ouvrable dans **Camunda Modeler**, **`demo.bpmn.io`**, **Signavio** et **Bizagi**.
- **Classeur Excel complet (`.xls`)** : 4 onglets structurés (*Synthèse*, *Étapes*, *Flux & Décisions*, *Règles métier*) avec protection anti-injection de formules.
- **PNG Ultra-HD**, **Rapport Markdown**, **JSON intégral** (import/export validé Pydantic) et **CSV sécurisé**.

### 2.6 Authentification & Sessions
- Écran **Connexion / Créer un compte** en split-screen 50 % / 50 % (email + mot de passe).
- Mots de passe hashés en **PBKDF2-HMAC-SHA256** (avec sel aléatoire) dans SQLite.
- Sessions serveur persistantes (jeton cryptographique 32 octets, validité 7 jours, révocation à la déconnexion).

---

## 🏗️ 3. Architecture Technique

```text
┌────────────────────────────────────────────────────────────────┐
│                       Process Architect                        │
├──────────────────────────────┬─────────────────────────────────┤
│           Frontend           │             Backend             │
│  React 19 + TypeScript       │  FastAPI + Pydantic v2          │
│  Vite + Tailwind CSS         │  SQLite (processes.db)          │
│  Studio BPMN + Swimlanes     │  Auth PBKDF2 + Sessions         │
│  Vue Animée + Export .bpmn   │  Moteur Multi-Agents IA         │
├──────────────────────────────┴─────────────────────────────────┤
│                Moteur Métier Déterministe Commun               │
│                 (mcp-server/process_engine.py)                 │
├────────────────────────────────────────────────────────────────┤
│                          Serveur MCP                           │
│        FastMCP / MCP SDK (stdio) pour assistants IA            │
└────────────────────────────────────────────────────────────────┘
```

### Structure du dépôt
```text
process-architect-mcp/
├── backend/
│   ├── app/
│   │   ├── main.py            # API FastAPI (Processus, Projets, Versions, Auth, Agents, Agenda)
│   │   ├── storage.py         # Couche SQLite (persistance, seeds, sessions)
│   │   ├── models.py          # Schémas Pydantic v2
│   │   ├── auth.py            # Hashage PBKDF2-SHA256 & jetons de session
│   │   ├── ai_agents.py       # Moteur des 5 agents IA + connecteurs LLM
│   │   ├── sample_data.py     # Scénarios de démonstration (AS-IS & TO-BE)
│   │   └── outlook.py         # Export .ics & deeplinks Outlook
│   └── data/processes.db      # Base SQLite locale (auto-initialisée)
├── frontend/
│   └── src/
│       ├── components/        # Studio (CurvedDiagram3D, StudioTableBuilder, AnimatedFinanceDiagram, AuthLoginScreen…)
│       ├── utils/             # bpmnXmlExport.ts, swimlaneLayout.ts, bpmnTaskKind.ts, excelExport.ts, processAudit.ts
│       ├── services/api.ts    # Client HTTP typé & gestion de session
│       └── types/process.ts   # Types TypeScript du domaine
├── mcp-server/
│   ├── server.py              # Serveur MCP (stdio)
│   └── process_engine.py      # Validation, simulation, analytics & traçabilité déterministes
└── tests/                     # Suite de tests Python (pytest)
```

---

## 📂 4. Scénarios de Démonstration Inclus

Au premier démarrage, la base SQLite initialise automatiquement **2 projets complets** (chacun en version `AS-IS` et `TO-BE`) :
1. **Demande de rachat partiel — Épargne Retraite** : dépôt Adhérent, contrôle pièces, relance + passerelle événementielle 30 jours (`P30D`), éligibilité & nantissement, calcul fiscal, seuil `≥ 50 000 €`, double validation manager avec branche de refus, ordonnancement SEPA.
2. **Sinistre Auto — Indemnisation Digitale** : déclaration Assuré, contrôle garanties, scoring anti-fraude IA, seuil `> 3 000 €` & expertise automobile, calcul indemnité nette, virement SEPA.

---

## 🚀 5. Installation & Lancement Rapide

### Prérequis
- **Python 3.12+**
- **Node.js 18+ & npm**

### 1. Démarrer le Backend (FastAPI)
```powershell
# À la racine du projet
uvicorn backend.app.main:app --reload --port 8000
```
- API : `http://127.0.0.1:8000`
- Documentation Swagger : `http://127.0.0.1:8000/docs`

### 2. Démarrer le Frontend (React + Vite)
```powershell
cd frontend
npm install
npm run dev
```
- Application : `http://localhost:5173`

### 3. Utiliser le Serveur MCP *(optionnel)*
```powershell
cd mcp-server
python server.py
```
Exemple de configuration pour un client MCP (Claude Desktop, Cursor, etc.) :
```json
{
  "mcpServers": {
    "process-architect": {
      "command": "python",
      "args": ["<CHEMIN_VERS_PROJET>/mcp-server/server.py"]
    }
  }
}
```

---

## 🔐 6. Authentification & Comptes de Test

Au premier lancement, un écran de connexion s'affiche. Vous pouvez :
- **Créer un nouveau compte** directement depuis l'onglet **Créer un compte**, ou
- Vous connecter avec un compte pré-initialisé (mot de passe par défaut : **`demo1234`**) :
  - `khalil.benhassen@organisation.fr`
  - `sarah.benali@organisation.fr`
  - `thomas.mercier@organisation.fr`
  - `claire.dubois@organisation.fr`

---

## 🧪 7. Tests Automatisés & Build

### Tests Backend & Moteur MCP (Python / Pytest)
```powershell
python -m pytest
```

### Tests Frontend (Vitest)
```powershell
cd frontend
npx vitest run
```

### Build de Production Frontend (TypeScript + Vite)
```powershell
cd frontend
npm run build
```

---

## 📄 8. Licence

Ce logiciel est distribué sous licence open-source **MIT**. Les utilisateurs restent seuls responsables des spécifications, processus et tests métier conçus à l'aide de la plateforme.
