import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { AnalysisDrawer } from '../components/AnalysisDrawer';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { Process, ValidationResult, SimulationResult, BusinessRule } from '../types/process';

const MOCK_PROCESS: Process = {
  id: 'test-process',
  name: 'Processus Test Retraite',
  lifecycleState: 'draft',
  modelState: 'to_be',
  version: '1.0.0',
  owner: 'MOA Test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Début',
      position: { x: 0, y: 0 },
      estimatedDurationMinutes: 0,
      executionMode: 'automated'
    },
    {
      id: 'dec1',
      type: 'decision',
      label: 'Contrôle OK ?',
      position: { x: 200, y: 0 },
      estimatedDurationMinutes: 0,
      executionMode: 'manual'
    },
    {
      id: 'end',
      type: 'end',
      label: 'Fin',
      position: { x: 400, y: 0 },
      estimatedDurationMinutes: 0,
      executionMode: 'automated'
    }
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'start', targetNodeId: 'dec1', label: 'avancer' },
    { id: 'e2', sourceNodeId: 'dec1', targetNodeId: 'end', label: 'Oui' }
  ],
  businessRules: [
    {
      id: 'RG-TEST-01',
      title: 'Vérification identité',
      statement: 'La pièce doit être valide.',
      category: 'data_quality',
      severity: 'high',
      sourceType: 'fictional_assumption',
      active: true
    }
  ],
  requirements: [],
  testCases: []
};

const MOCK_VALIDATION: ValidationResult = {
  valid: true,
  summary: {
    errors: 0,
    warnings: 1,
    suggestions: 0,
    totalFindings: 1
  },
  findings: [
    {
      code: 'DECISION_BRANCH_COUNT',
      severity: 'warning',
      message: 'Attention branche unique sur décision',
      nodeId: 'dec1'
    }
  ]
};

const MOCK_SIMULATION: SimulationResult = {
  status: 'completed',
  path: ['start', 'dec1', 'end'],
  totalEstimatedMinutes: 15,
  manualStepCount: 1,
  stopReason: 'Nœud Fin atteint avec succès.',
  branchChoices: [{ nodeId: 'dec1', label: 'Oui' }],
  pathNodes: [
    { id: 'start', label: 'Début', type: 'start', executionMode: 'automated', duration: 0 },
    { id: 'dec1', label: 'Contrôle OK ?', type: 'decision', executionMode: 'manual', duration: 0 },
    { id: 'end', label: 'Fin', type: 'end', executionMode: 'automated', duration: 0 }
  ]
};

describe('AnalysisDrawer Component', () => {
  it('renders validation tab correctly with findings', () => {
    const onRunValidation = vi.fn();
    render(
      <AnalysisDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="validation"
        onTabChange={vi.fn()}
        process={MOCK_PROCESS}
        validation={MOCK_VALIDATION}
        onRunValidation={onRunValidation}
        simulation={null}
        onRunSimulation={vi.fn()}
        onClearSimulation={vi.fn()}
        testCases={[]}
        onGenerateTestCases={vi.fn()}
        traceability={null}
        onFetchTraceability={vi.fn()}
        analytics={null}
        onFetchAnalytics={vi.fn()}
        onFocusElement={vi.fn()}
      />
    );

    expect(screen.getByText('Analyser le processus')).toBeInTheDocument();
    expect(screen.getByText('Modèle intègre et valide')).toBeInTheDocument();
    expect(screen.getByText('Attention branche unique sur décision')).toBeInTheDocument();
  });

  it('renders simulation tab and displays total duration and steps', () => {
    render(
      <AnalysisDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="simulation"
        onTabChange={vi.fn()}
        process={MOCK_PROCESS}
        validation={null}
        onRunValidation={vi.fn()}
        simulation={MOCK_SIMULATION}
        onRunSimulation={vi.fn()}
        onClearSimulation={vi.fn()}
        testCases={[]}
        onGenerateTestCases={vi.fn()}
        traceability={null}
        onFetchTraceability={vi.fn()}
        analytics={null}
        onFetchAnalytics={vi.fn()}
        onFocusElement={vi.fn()}
      />
    );

    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('Nœud Fin atteint avec succès.')).toBeInTheDocument();
    expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
  });
});

describe('Navbar Component', () => {
  it('renders brand title, save status and action buttons', () => {
    render(
      <Navbar
        currentProcess={MOCK_PROCESS}
        hasUnsavedChanges={false}
        isSaving={false}
        saveError={null}
        onSave={vi.fn()}
        onOpenList={vi.fn()}
        onNewProcess={vi.fn()}
        onDuplicate={vi.fn()}
        onOpenExportImport={vi.fn()}
        onToggleDrawer={vi.fn()}
        drawerOpen={false}
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        onFitView={vi.fn()}
        validationSummary={{ errors: 0, warnings: 1, suggestions: 0, totalFindings: 1 }}
      />
    );

    expect(screen.getByText('Process Architect')).toBeInTheDocument();
    expect(screen.getByText('Processus Test Retraite')).toBeInTheDocument();
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
    expect(screen.getByText('Nouveau')).toBeInTheDocument();
    expect(screen.getByText('Ouvrir')).toBeInTheDocument();
    expect(screen.getByText('Atelier MOA')).toBeInTheDocument();
  });

  it('displays unsaved changes and error states accurately', () => {
    const { rerender } = render(
      <Navbar
        currentProcess={MOCK_PROCESS}
        hasUnsavedChanges={true}
        isSaving={false}
        saveError={null}
        onSave={vi.fn()}
        onOpenList={vi.fn()}
        onNewProcess={vi.fn()}
        onDuplicate={vi.fn()}
        onOpenExportImport={vi.fn()}
        onToggleDrawer={vi.fn()}
        drawerOpen={false}
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        onFitView={vi.fn()}
      />
    );

    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();

    rerender(
      <Navbar
        currentProcess={MOCK_PROCESS}
        hasUnsavedChanges={false}
        isSaving={false}
        saveError="Erreur de connexion"
        onSave={vi.fn()}
        onOpenList={vi.fn()}
        onNewProcess={vi.fn()}
        onDuplicate={vi.fn()}
        onOpenExportImport={vi.fn()}
        onToggleDrawer={vi.fn()}
        drawerOpen={false}
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        onFitView={vi.fn()}
      />
    );

    expect(screen.getByText("Échec de l'enregistrement")).toBeInTheDocument();
    expect(screen.getByText('Réessayer')).toBeInTheDocument();
  });
});

describe('Sidebar Component', () => {
  it('opens on Steps by default and allows click-to-add', () => {
    const onAddNode = vi.fn();
    render(
      <Sidebar
        isOpen={true}
        onClose={vi.fn()}
        onAddNode={onAddNode}
        rules={MOCK_PROCESS.businessRules}
        nodes={MOCK_PROCESS.nodes}
        onAddRule={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
      />
    );

    expect(screen.getByText('Étapes')).toBeInTheDocument();
    expect(screen.getByText('Activité / Tâche')).toBeInTheDocument();
    expect(screen.getByText('Point de décision')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Activité / Tâche'));
    expect(onAddNode).toHaveBeenCalledWith('task');
  });

  it('allows switching to Rules tab with search and collapsed details', () => {
    render(
      <Sidebar
        isOpen={true}
        onClose={vi.fn()}
        onAddNode={vi.fn()}
        rules={MOCK_PROCESS.businessRules}
        nodes={MOCK_PROCESS.nodes}
        onAddRule={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Règles métier'));
    expect(screen.getByText('RG-TEST-01')).toBeInTheDocument();
    expect(screen.getByText('Vérification identité')).toBeInTheDocument();
    // Long statement is initially collapsed
    expect(screen.queryByText('« La pièce doit être valide. »')).not.toBeInTheDocument();
  });
});

describe('PropertiesPanel Component', () => {
  it('renders structured collapsible sections for a selected node', () => {
    const onUpdateNode = vi.fn();
    render(
      <PropertiesPanel
        selectedNode={MOCK_PROCESS.nodes[1]}
        selectedEdge={null}
        rules={MOCK_PROCESS.businessRules}
        onUpdateNode={onUpdateNode}
        onUpdateEdge={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteEdge={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('1. Général')).toBeInTheDocument();
    expect(screen.getByText('2. Responsabilité & Système')).toBeInTheDocument();
    expect(screen.getByText('3. Temps & Délais')).toBeInTheDocument();
    expect(screen.getByText('4. Règles de gestion')).toBeInTheDocument();
    expect(screen.getByText('5. Données (Entrées / Sorties)')).toBeInTheDocument();
    expect(screen.getByText('6. Contrôles opérationnels')).toBeInTheDocument();
    expect(screen.getByText('7. Avancé & Identifiants')).toBeInTheDocument();

    // General section is open by default
    expect(screen.getByDisplayValue('Contrôle OK ?')).toBeInTheDocument();
  });
});
