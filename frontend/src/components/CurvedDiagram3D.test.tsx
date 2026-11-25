import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CurvedDiagram3D } from './CurvedDiagram3D';
import { BusinessRule, ProcessEdge, ProcessNode } from '../types/process';
import { STORAGE_KEY_FILES } from './modals/DataDocumentsModal';

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (globalThis as any).ResizeObserver = MockResizeObserver;
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const INITIAL_RULES: BusinessRule[] = [
  {
    id: 'RG-DOC-01',
    title: 'Complétude et conformité des pièces',
    statement: 'Toutes les pièces doivent être conformes.',
    category: 'data_quality',
    severity: 'high',
    sourceType: 'business_requirement',
    active: true,
  },
  {
    id: 'RG-DEL-02',
    title: 'Délai de relance et forclusion à 30 jours',
    statement: 'Relance puis forclusion après 30 jours.',
    category: 'sla',
    severity: 'medium',
    sourceType: 'business_requirement',
    active: true,
  },
  {
    id: 'RG-ELIG-03',
    title: "Conditions d'éligibilité et libre disposition",
    statement: 'Absence de nantissement ou opposition.',
    category: 'compliance',
    severity: 'high',
    sourceType: 'regulatory',
    active: true,
  },
];

const INITIAL_NODES: ProcessNode[] = [
  {
    id: 'n-start',
    type: 'start',
    label: 'Réception de la demande de rachat',
    position: { x: 40, y: 240 },
    ownerRole: 'Portail Adhérent',
    application: 'Portail Client',
    estimatedDurationMinutes: 0,
    executionMode: 'automated',
    inputs: [],
    outputs: ['Demande signée'],
    ruleIds: [],
  },
  {
    id: 'n-task-1',
    type: 'task',
    label: 'Clôturer la demande pour forclusion',
    position: { x: 300, y: 240 },
    ownerRole: 'Gestionnaire Back-Office',
    application: 'Outil de Gestion GED',
    estimatedDurationMinutes: 10,
    executionMode: 'manual',
    inputs: ["Constat d'expiration du délai de 30 jours"],
    outputs: ['Courrier de caducité'],
    ruleIds: ['RG-DEL-02'],
  },
  {
    id: 'n-dec-1',
    type: 'decision',
    label: 'Dossier complet et pièces conformes ?',
    position: { x: 600, y: 240 },
    ownerRole: 'Gestionnaire Back-Office',
    application: 'Outil de Gestion GED',
    estimatedDurationMinutes: 5,
    executionMode: 'manual',
    inputs: ['RIB certifié'],
    outputs: [],
    ruleIds: ['RG-DOC-01'],
  },
  {
    id: 'n-end',
    type: 'end',
    label: 'Fin — Demande caduque sans suite',
    position: { x: 900, y: 240 },
    ownerRole: 'Système',
    application: 'GED',
    estimatedDurationMinutes: 0,
    executionMode: 'automated',
    inputs: [],
    outputs: [],
    ruleIds: [],
  },
];

const INITIAL_EDGES: ProcessEdge[] = [
  { id: 'e-1', sourceNodeId: 'n-start', targetNodeId: 'n-task-1' },
  { id: 'e-2', sourceNodeId: 'n-task-1', targetNodeId: 'n-dec-1' },
  {
    id: 'e-3',
    sourceNodeId: 'n-dec-1',
    targetNodeId: 'n-end',
    label: 'Complet et conforme',
  },
];

interface HarnessCallbacks {
  onAddNodeWithEdge: ReturnType<typeof vi.fn>;
  onDeleteNode: ReturnType<typeof vi.fn>;
  onQuickCreateRuleForNode: ReturnType<typeof vi.fn>;
  onOpenRulesCatalog: ReturnType<typeof vi.fn>;
  onOpenDataDocumentsForStep: ReturnType<typeof vi.fn>;
  onUpdateNodeSpy: ReturnType<typeof vi.fn>;
}

function renderHarness() {
  const callbacks: HarnessCallbacks = {
    onAddNodeWithEdge: vi.fn(),
    onDeleteNode: vi.fn(),
    onQuickCreateRuleForNode: vi.fn(),
    onOpenRulesCatalog: vi.fn(),
    onOpenDataDocumentsForStep: vi.fn(),
    onUpdateNodeSpy: vi.fn(),
  };

  let createdCounter = 1;

  const Wrapper: React.FC = () => {
    const [nodes, setNodes] = useState<ProcessNode[]>(INITIAL_NODES);
    const [edges, setEdges] = useState<ProcessEdge[]>(INITIAL_EDGES);
    const [rules, setRules] = useState<BusinessRule[]>(INITIAL_RULES);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const handleUpdateNode = (updated: ProcessNode) => {
      callbacks.onUpdateNodeSpy(updated);
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    };

    const handleAddNodeWithEdge = (
      type: ProcessNode['type'],
      connectFromNodeId?: string,
      edgeLabel?: string,
      branchType: 'nominal' | 'exception' = 'nominal'
    ): string => {
      callbacks.onAddNodeWithEdge(type, connectFromNodeId, edgeLabel, branchType);
      const newId = `created-${createdCounter++}`;
      const newNode: ProcessNode = {
        id: newId,
        type,
        label: type === 'decision' ? 'Contrôle de conformité ?' : 'Nouvelle étape métier',
        position: { x: 450, y: 240 },
        ownerRole: 'Gestionnaire Métier',
        application: 'Portail Métier / GED',
        estimatedDurationMinutes: type === 'task' ? 15 : 0,
        executionMode: 'manual',
        inputs: [],
        outputs: [],
        ruleIds: [],
      };
      setNodes((prev) => [...prev, newNode]);
      if (connectFromNodeId) {
        setEdges((prev) => [
          ...prev,
          { id: `e-${newId}`, sourceNodeId: connectFromNodeId, targetNodeId: newId, label: edgeLabel },
        ]);
      }
      setSelectedNodeId(newId);
      return newId;
    };

    const handleDeleteNode = (nodeId: string) => {
      callbacks.onDeleteNode(nodeId);
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId)
      );
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    };

    const handleQuickCreateRuleForNode = (nodeId: string) => {
      callbacks.onQuickCreateRuleForNode(nodeId);
      const newRuleId = `RG-MET-0${rules.length + 1}`;
      const newRule: BusinessRule = {
        id: newRuleId,
        title: `Règle auto ${newRuleId}`,
        statement: 'Règle générée automatiquement.',
        category: 'data_quality',
        severity: 'high',
        sourceType: 'business_requirement',
        active: true,
      };
      setRules((prev) => [...prev, newRule]);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, ruleIds: [newRuleId, ...(n.ruleIds || [])] }
            : n
        )
      );
    };

    return (
      <div style={{ width: 1280, height: 800 }}>
        <CurvedDiagram3D
          nodes={nodes}
          edges={edges}
          rules={rules}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateNode={handleUpdateNode}
          onAddNodeWithEdge={handleAddNodeWithEdge}
          onDeleteNode={handleDeleteNode}
          onQuickCreateRuleForNode={handleQuickCreateRuleForNode}
          onOpenRulesCatalog={callbacks.onOpenRulesCatalog}
          onOpenDataDocumentsForStep={callbacks.onOpenDataDocumentsForStep}
        />
      </div>
    );
  };

  const utils = render(<Wrapper />);
  return { ...utils, callbacks };
}

describe('CurvedDiagram3D — Cercle Radial (6 boutons) & 4 Fenêtres HUD', () => {
  // =========================================================================
  // PARTIE A : LES 6 BOUTONS DU CERCLE RADIAL
  // =========================================================================

  it('ouvre le cercle radial à 6 secteurs au simple clic sans ouvrir les 4 fenêtres HUD', () => {
    const { container } = renderHarness();
    const taskCard = container.querySelector('[data-node-id="n-task-1"]')!;
    fireEvent.click(taskCard);

    expect(screen.getByTestId('radial-sector-add_task')).toBeInTheDocument();
    expect(screen.getByTestId('radial-sector-add_dec')).toBeInTheDocument();
    expect(screen.getByTestId('radial-sector-edit_lbl')).toBeInTheDocument();
    expect(screen.getByTestId('radial-sector-role')).toBeInTheDocument();
    expect(screen.getByTestId('radial-sector-rg')).toBeInTheDocument();
    expect(screen.getByTestId('radial-sector-del')).toBeInTheDocument();

    // Les 4 fenêtres HUD ne doivent PAS être ouvertes au simple clic
    expect(screen.queryByText(/Règles Métier & RG/i)).not.toBeInTheDocument();
  });

  it('Bouton 1 (+ Tâche suivante) ajoute une tâche sur une étape normale et ouvre le choix Nominale/Exception sur une décision', () => {
    const { container, callbacks } = renderHarness();

    // Sur tâche normale
    fireEvent.click(container.querySelector('[data-node-id="n-task-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-add_task'));
    expect(callbacks.onAddNodeWithEdge).toHaveBeenCalledWith(
      'task',
      'n-task-1',
      undefined,
      'nominal'
    );

    // Sur décision -> sous-menu Nominale / Exception
    fireEvent.click(container.querySelector('[data-node-id="n-dec-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-add_task'));
    expect(screen.getByText(/Voie à créer/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Nominale/i }));
    expect(callbacks.onAddNodeWithEdge).toHaveBeenCalledWith(
      'task',
      'n-dec-1',
      'Complet et conforme',
      'nominal'
    );

    // Re-clic sur décision -> branche Exception
    fireEvent.click(container.querySelector('[data-node-id="n-dec-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-add_task'));
    fireEvent.click(screen.getByRole('button', { name: /Exception/i }));
    expect(callbacks.onAddNodeWithEdge).toHaveBeenCalledWith(
      'task',
      'n-dec-1',
      'Incomplet',
      'exception'
    );
  });

  it('Bouton 2 (◇ Insérer décision) crée un nœud de décision connecté', () => {
    const { container, callbacks } = renderHarness();
    fireEvent.click(container.querySelector('[data-node-id="n-task-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-add_dec'));

    expect(callbacks.onAddNodeWithEdge).toHaveBeenCalledWith(
      'decision',
      'n-task-1',
      undefined,
      'nominal'
    );
  });

  it('Bouton 3 (✎ Modifier libellé) édite en inline sur une tâche ET sur une capsule Début/Fin, et focus #hud-title-input en mode HUD', () => {
    const { container, callbacks } = renderHarness();

    // 1. Hors HUD sur tâche
    fireEvent.click(container.querySelector('[data-node-id="n-task-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-edit_lbl'));
    const inlineInput = screen.getByDisplayValue('Clôturer la demande pour forclusion');
    fireEvent.change(inlineInput, { target: { value: 'Clôture automatique 30j' } });
    fireEvent.keyDown(inlineInput, { key: 'Enter' });
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', label: 'Clôture automatique 30j' })
    );

    // 2. Hors HUD sur capsule Début
    fireEvent.click(container.querySelector('[data-node-id="n-start"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-edit_lbl'));
    const startInput = screen.getByDisplayValue('Réception de la demande de rachat');
    fireEvent.change(startInput, { target: { value: 'Dépôt demande adhérent' } });
    fireEvent.keyDown(startInput, { key: 'Enter' });
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-start', label: 'Dépôt demande adhérent' })
    );

    // 3. En mode HUD ouvert -> focus #hud-title-input
    fireEvent.doubleClick(container.querySelector('[data-node-id="n-task-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-edit_lbl'));
    const hudInput = document.getElementById('hud-title-input');
    expect(hudInput).toBeInTheDocument();
    expect(document.activeElement).toBe(hudInput);
  });

  it('Bouton 4 (⇄ Changer rôle) ouvre le sous-menu rôles et met à jour ownerRole', () => {
    const { container, callbacks } = renderHarness();
    fireEvent.click(container.querySelector('[data-node-id="n-task-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-role'));

    const submenu = screen.getByTestId('radial-submenu-role');
    expect(submenu).toBeInTheDocument();

    const roleBtn = screen.getByRole('button', { name: 'Responsable Conformité' });
    fireEvent.click(roleBtn);

    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', ownerRole: 'Responsable Conformité' })
    );
    expect(screen.queryByTestId('radial-submenu-role')).not.toBeInTheDocument();
  });

  it('Bouton 5 (§ Lier règle RG) lie/délie une règle et crée une nouvelle RG via + Nouvelle RG', () => {
    const { container, callbacks } = renderHarness();
    fireEvent.click(container.querySelector('[data-node-id="n-task-1"]')!);
    fireEvent.click(screen.getByTestId('radial-sector-rg'));

    const submenu = screen.getByTestId('radial-submenu-rg');
    expect(submenu).toBeInTheDocument();

    // Lier RG-01 (RG-DOC-01)
    fireEvent.click(screen.getByRole('button', { name: /RG-01/i }));
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'n-task-1',
        ruleIds: ['RG-DEL-02', 'RG-DOC-01'],
      })
    );

    // Délier RG-02 (RG-DEL-02)
    fireEvent.click(screen.getByRole('button', { name: /RG-02/i }));
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'n-task-1',
        ruleIds: ['RG-DOC-01'],
      })
    );

    // Créer une nouvelle RG
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouvelle RG/i }));
    expect(callbacks.onQuickCreateRuleForNode).toHaveBeenCalledWith('n-task-1');
  });

  it('Bouton 6 (✕ Supprimer) supprime le nœud et ferme le cercle & le HUD', () => {
    const { container, callbacks } = renderHarness();
    fireEvent.doubleClick(container.querySelector('[data-node-id="n-task-1"]')!);
    expect(screen.getByText(/Règles Métier & RG/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('radial-sector-del'));
    expect(callbacks.onDeleteNode).toHaveBeenCalledWith('n-task-1');
    expect(container.querySelector('[data-node-id="n-task-1"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/Règles Métier & RG/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // PARTIE B : LES 4 FENÊTRES HUD & NAVIGATION
  // =========================================================================

  it('Double-clic ouvre les 4 fenêtres HUD et toutes leurs commandes fonctionnent', () => {
    // Pré-remplir localStorage comme DataDocumentsModal le fait (clé scopée nodeId::input::inp)
    localStorage.setItem(
      STORAGE_KEY_FILES,
      JSON.stringify({
        "n-task-1::input::Constat d'expiration du délai de 30 jours": [
          {
            name: 'constat_forclusion.pdf',
            size: 12400,
            type: 'application/pdf',
            dataUrl: 'data:application/pdf;base64,AAA',
            uploadedAt: '19/11/2026',
          },
          {
            name: 'accuse_relance.pdf',
            size: 8400,
            type: 'application/pdf',
            dataUrl: 'data:application/pdf;base64,BBB',
            uploadedAt: '19/11/2026',
          },
        ],
      })
    );

    const { container, callbacks } = renderHarness();
    fireEvent.doubleClick(container.querySelector('[data-node-id="n-task-1"]')!);

    // Vérifier présence des 4 fenêtres HUD
    expect(screen.getByText(/Règles Métier & RG/i)).toBeInTheDocument();
    expect(screen.getByText(/Télémétrie SLA & Durée/i)).toBeInTheDocument();
    expect(screen.getByText(/▸ Données & Documents/i)).toBeInTheDocument();
    expect(screen.getByText(/▸ Acteur & Système SI/i)).toBeInTheDocument();

    // --- FENÊTRE 1 : RÈGLES MÉTIER & RG ---
    expect(screen.getByText('1 liée(s)')).toBeInTheDocument();
    const completudeRow = screen.getByText('Complétude fiche').parentElement!;
    expect(completudeRow).toHaveTextContent('100%');

    // Lier RG-01 depuis la Fenêtre 1
    fireEvent.click(screen.getByRole('button', { name: /RG-01 · Complétude/i }));
    expect(screen.getByText('2 liée(s)')).toBeInTheDocument();

    // + Nouvelle règle
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouvelle règle/i }));
    expect(callbacks.onQuickCreateRuleForNode).toHaveBeenCalledWith('n-task-1');
    expect(screen.getByText('3 liée(s)')).toBeInTheDocument();

    // Catalogue ↗
    fireEvent.click(screen.getByRole('button', { name: /Catalogue/i }));
    expect(callbacks.onOpenRulesCatalog).toHaveBeenCalledTimes(1);

    // --- FENÊTRE 2 : TÉLÉMÉTRIE SLA & DURÉE ---
    // 10 / (10 + 5) = 67% du flux
    expect(screen.getByText('67% du flux')).toBeInTheDocument();
    const durationInput = screen.getByDisplayValue('10');
    fireEvent.change(durationInput, { target: { value: '25' } });
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', estimatedDurationMinutes: 25 })
    );
    expect(screen.getByText('25m')).toBeInTheDocument();

    // Modes d'exécution Manuel / Auto / Mixte
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', executionMode: 'automated' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mixte' }));
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', executionMode: 'mixed' })
    );

    // --- FENÊTRE 3 : DONNÉES & DOCUMENTS ---
    // 1 input + 2 fichiers joints scopés = 3 élém. & bouton "Données & documents (2)"
    expect(screen.getByText('3 élém.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Données & documents \(2\)/i })).toBeInTheDocument();

    // Ajouter une donnée d'entrée via le champ + bouton '+'
    const addDataInput = screen.getByPlaceholderText('Ajouter donnée (ex: RIB)...');
    fireEvent.change(addDataInput, { target: { value: 'RIB certifié' } });
    fireEvent.click(screen.getByTitle('Ajouter la donnée'));
    expect(screen.getByText('• RIB certifié')).toBeInTheDocument();
    expect(screen.getByText('4 élém.')).toBeInTheDocument();

    // Supprimer la donnée ajoutée
    const ribRow = screen.getByText('• RIB certifié').parentElement!;
    fireEvent.click(ribRow.querySelector('button')!);
    expect(screen.queryByText('• RIB certifié')).not.toBeInTheDocument();

    // Synchronisation temps réel quand un fichier est ajouté via DataDocumentsModal
    act(() => {
      localStorage.setItem(
        STORAGE_KEY_FILES,
        JSON.stringify({
          "n-task-1::input::Constat d'expiration du délai de 30 jours": [
            {
              name: 'doc1.pdf',
              size: 1000,
              type: 'application/pdf',
              dataUrl: '',
              uploadedAt: '19/11/2026',
            },
          ],
        })
      );
      window.dispatchEvent(new Event('pa-attached-files-updated'));
    });
    expect(screen.getByRole('button', { name: /Données & documents \(1\)/i })).toBeInTheDocument();

    // Clic sur "Données & documents (1)"
    fireEvent.click(screen.getByRole('button', { name: /Données & documents \(1\)/i }));
    expect(callbacks.onOpenDataDocumentsForStep).toHaveBeenCalledWith('n-task-1');

    // --- FENÊTRE 4 : ACTEUR & SYSTÈME SI ---
    const titleInput = document.getElementById('hud-title-input') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Clôturer dossier (30j)' } });
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', label: 'Clôturer dossier (30j)' })
    );

    const roleInput = screen.getByDisplayValue('Gestionnaire Back-Office');
    fireEvent.change(roleInput, { target: { value: 'Directeur Sinistres' } });
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', ownerRole: 'Directeur Sinistres' })
    );

    const appInput = screen.getByDisplayValue('Outil de Gestion GED');
    fireEvent.change(appInput, { target: { value: 'Core Assurance V4' } });
    expect(callbacks.onUpdateNodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-task-1', application: 'Core Assurance V4' })
    );
  });

  it('Barre basse HUD : Préc., Suiv., raccourcis clavier ArrowRight/ArrowLeft et Vue globale / Escape', () => {
    const { container } = renderHarness();
    fireEvent.doubleClick(container.querySelector('[data-node-id="n-task-1"]')!);

    expect(screen.getByText(/Étape 2\/4 · Clôturer la demande/i)).toBeInTheDocument();

    // Clic Suiv. -> Étape 3/4
    fireEvent.click(screen.getByRole('button', { name: /Suiv\./i }));
    expect(screen.getByText(/Étape 3\/4 · Dossier complet/i)).toBeInTheDocument();

    // Clic Préc. -> Étape 2/4
    fireEvent.click(screen.getByRole('button', { name: /Préc\./i }));
    expect(screen.getByText(/Étape 2\/4 · Clôturer la demande/i)).toBeInTheDocument();

    // Clavier ArrowRight -> Étape 3/4
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Étape 3\/4 · Dossier complet/i)).toBeInTheDocument();

    // Clavier ArrowLeft -> Étape 2/4
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Étape 2\/4 · Clôturer la demande/i)).toBeInTheDocument();

    // Bouton Vue globale ferme le HUD
    fireEvent.click(screen.getByRole('button', { name: /Vue globale/i }));
    expect(screen.queryByText(/Règles Métier & RG/i)).not.toBeInTheDocument();

    // Réouvrir puis Escape ferme le HUD
    fireEvent.doubleClick(container.querySelector('[data-node-id="n-task-1"]')!);
    expect(screen.getByText(/Règles Métier & RG/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Règles Métier & RG/i)).not.toBeInTheDocument();
  });
});
