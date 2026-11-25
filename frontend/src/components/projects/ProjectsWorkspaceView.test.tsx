import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectsWorkspaceView } from './ProjectsWorkspaceView';
import {
  ApprovalGate,
  Category,
  Collaborator,
  ProcessSummary,
  Project,
  TagItem,
} from '../../types/process';

afterEach(() => {
  vi.restoreAllMocks();
});

const CATEGORIES: Category[] = [
  { id: 'cat-moa', name: 'Projets de Transformation MOA', color: '#007AFF', createdAt: '' },
  { id: 'cat-conf', name: 'Conformité & Contrôle Interne', color: '#AF52DE', createdAt: '' },
];

const TAGS: TagItem[] = [
  { id: 'tag-1', name: 'prioritaire', color: '#FF3B30', scope: 'global', createdAt: '' },
  { id: 'tag-2', name: 'conformite-lcbft', color: '#34C759', scope: 'global', createdAt: '' },
];

const COLLABORATORS: Collaborator[] = [
  {
    id: 'c-1',
    name: 'Khalil Benhassen',
    email: 'khalil@example.com',
    roleTitle: 'Lead MOA',
    avatarInitials: 'KB',
    avatarColor: '#007AFF',
    isAi: false,
    status: 'online',
    teamIds: [],
    createdAt: '',
  },
  {
    id: 'c-2',
    name: 'Claire Dubois',
    email: 'claire@example.com',
    roleTitle: 'Conformité',
    avatarInitials: 'CD',
    avatarColor: '#AF52DE',
    isAi: false,
    status: 'online',
    teamIds: [],
    createdAt: '',
  },
];

const PROCESSES: ProcessSummary[] = [
  {
    id: 'proc-tobe',
    name: 'Demande de rachat partiel — TO-BE',
    domain: 'Épargne',
    modelState: 'to_be',
    version: '1.2.0',
    nodeCount: 16,
    edgeCount: 17,
    ruleCount: 7,
    updatedAt: '',
  },
  {
    id: 'proc-asis',
    name: 'Demande de rachat partiel — AS-IS',
    domain: 'Épargne',
    modelState: 'as_is',
    version: '1.0.0',
    nodeCount: 10,
    edgeCount: 9,
    ruleCount: 3,
    updatedAt: '',
  },
];

const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Demande de Rachat Partiel',
    description: 'Projet pilote de dématérialisation.',
    categoryId: 'cat-moa',
    status: 'active',
    tags: ['prioritaire', 'conformite-lcbft'],
    processIds: ['proc-tobe', 'proc-asis'],
    memberIds: ['c-1'],
    createdAt: '',
    updatedAt: '',
  },
];

const APPROVALS: ApprovalGate[] = [
  {
    id: 'ap-1',
    projectId: 'proj-1',
    processId: 'proc-tobe',
    label: 'Validation Métier & Parcours Back-Office',
    status: 'approved',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'ap-2',
    projectId: 'proj-1',
    processId: 'proc-tobe',
    label: 'Homologation Recette QA',
    status: 'pending',
    createdAt: '',
    updatedAt: '',
  },
];

function renderProjects(overrides?: Partial<React.ComponentProps<typeof ProjectsWorkspaceView>>) {
  const props: React.ComponentProps<typeof ProjectsWorkspaceView> = {
    projects: PROJECTS,
    processes: PROCESSES,
    categories: CATEGORIES,
    tags: TAGS,
    collaborators: COLLABORATORS,
    approvals: APPROVALS,
    selectedProjectId: 'proj-1',
    onSelectProject: vi.fn(),
    onCreateProject: vi.fn().mockResolvedValue(undefined),
    onUpdateProject: vi.fn().mockResolvedValue(undefined),
    onDeleteProject: vi.fn().mockResolvedValue(undefined),
    onCreateCategory: vi.fn().mockResolvedValue(undefined),
    onDeleteCategory: vi.fn().mockResolvedValue(undefined),
    onCreateTag: vi.fn().mockResolvedValue(undefined),
    onDeleteTag: vi.fn().mockResolvedValue(undefined),
    onOpenProcessInStudio: vi.fn(),
    onOpenNewProcessModal: vi.fn(),
    onOpenProjectConversation: vi.fn(),
    onOpenScheduleMeeting: vi.fn(),
    onResetWorkspaceBlank: vi.fn().mockResolvedValue(undefined),
    onResetWorkspaceDemo: vi.fn().mockResolvedValue(undefined),
    onCreateApproval: vi.fn().mockResolvedValue(undefined),
    onToggleApproval: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const utils = render(<ProjectsWorkspaceView {...props} />);
  return { ...utils, props };
}

describe('ProjectsWorkspaceView — Écran Projets Apple HIG', () => {
  it('affiche les projets en mode minimalisé par défaut puis les déplie au clic (vrais membres + filtres)', () => {
    renderProjects();

    // Par défaut minimalisé : nom + statut visibles, détails masqués
    expect(screen.getByText('Demande de Rachat Partiel')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.queryByText('Khalil Benhassen')).not.toBeInTheDocument();

    // Clic sur le projet -> déplie la carte complète
    fireEvent.click(screen.getByText('Demande de Rachat Partiel'));
    expect(screen.getByText('Khalil Benhassen')).toBeInTheDocument();
    expect(screen.queryByText('Claire Dubois')).not.toBeInTheDocument();

    // Recherche filtrante
    const searchInput = screen.getByPlaceholderText(/Rechercher un projet/i);
    fireEvent.change(searchInput, { target: { value: 'inexistant' } });
    expect(screen.getByText(/Aucun projet ne correspond/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Réinitialiser les filtres/i }));
    expect(screen.getByText('Demande de Rachat Partiel')).toBeInTheDocument();
  });

  it('permet de créer et modifier un projet avec tags, statut, processus et membres', async () => {
    const { props } = renderProjects();

    // Déplier puis Modifier le projet existant
    fireEvent.click(screen.getByText('Demande de Rachat Partiel'));
    fireEvent.click(screen.getByLabelText('Modifier Demande de Rachat Partiel'));
    const nameInput = screen.getByDisplayValue('Demande de Rachat Partiel');
    fireEvent.change(nameInput, { target: { value: 'Rachat Partiel V2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(props.onUpdateProject).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        name: 'Rachat Partiel V2',
        tags: ['prioritaire', 'conformite-lcbft'],
        memberIds: ['c-1'],
      })
    );
  });

  it('demande confirmation avant de supprimer un projet', () => {
    const { props } = renderProjects();

    fireEvent.click(screen.getByText('Demande de Rachat Partiel'));
    fireEvent.click(screen.getByLabelText('Supprimer Demande de Rachat Partiel'));
    expect(screen.getByRole('dialog', { name: /Supprimer ce projet/i })).toBeInTheDocument();

    // Annuler -> ne supprime pas
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onDeleteProject).not.toHaveBeenCalled();

    // Confirmer -> supprime
    fireEvent.click(screen.getByLabelText('Supprimer Demande de Rachat Partiel'));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le projet' }));
    expect(props.onDeleteProject).toHaveBeenCalledWith('proj-1');
  });

  it('permet de détacher un processus avec confirmation et de basculer / créer un jalon d’approbation', () => {
    const { props } = renderProjects();

    fireEvent.click(screen.getByText('Demande de Rachat Partiel'));
    // Détacher proc-asis -> demande confirmation
    fireEvent.click(screen.getByLabelText('Détacher Demande de rachat partiel — AS-IS'));
    expect(screen.getByRole('dialog', { name: /Retirer ce processus du projet/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer du projet' }));
    expect(props.onUpdateProject).toHaveBeenCalledWith('proj-1', {
      processIds: ['proc-tobe'],
    });

    // Basculer un jalon d'approbation
    fireEvent.click(screen.getByRole('button', { name: /Homologation Recette QA/i }));
    expect(props.onToggleApproval).toHaveBeenCalledWith(APPROVALS[1]);

    // Créer un nouveau jalon
    fireEvent.click(screen.getByRole('button', { name: '+ Jalon' }));
    const jalonInput = screen.getByPlaceholderText(/Nom du jalon/i);
    fireEvent.change(jalonInput, { target: { value: 'Visa RSSI' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(props.onCreateApproval).toHaveBeenCalledWith('proj-1', 'proc-tobe', 'Visa RSSI');
  });

  it('ouvre la fenêtre flottante de comparaison en lecture seule depuis la carte Projet', () => {
    renderProjects();

    fireEvent.click(screen.getByText('Demande de Rachat Partiel'));
    fireEvent.click(screen.getByRole('button', { name: /Comparer/i }));
    expect(screen.getByRole('dialog', { name: /Comparateur de processus/i })).toBeInTheDocument();
    expect(screen.getByText('Lecture seule')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Fermer le comparateur'));
    expect(
      screen.queryByRole('dialog', { name: /Comparateur de processus/i })
    ).not.toBeInTheDocument();
  });

  it('filtre correctement en multisélection sur les catégories (masque les projets hors catégorie)', () => {
    const secondProject: Project = {
      ...PROJECTS[0],
      id: 'proj-2',
      name: 'Contrôle Interne LCB-FT',
      categoryId: 'cat-conf',
      tags: ['conformite-lcbft'],
    };
    renderProjects({ projects: [PROJECTS[0], secondProject] });

    // Ouvrir le menu Filtres
    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }));

    // Cocher uniquement cat-conf -> proj-1 (cat-moa) doit disparaître, proj-2 reste
    fireEvent.click(screen.getByRole('button', { name: /Conformité & Contrôle Interne/i }));
    expect(screen.queryByText('Demande de Rachat Partiel')).not.toBeInTheDocument();
    expect(screen.getByText('Contrôle Interne LCB-FT')).toBeInTheDocument();

    // Cocher aussi cat-moa -> les 2 projets apparaissent
    fireEvent.click(screen.getByRole('button', { name: /Projets de Transformation MOA/i }));
    expect(screen.getByText('Demande de Rachat Partiel')).toBeInTheDocument();
    expect(screen.getByText('Contrôle Interne LCB-FT')).toBeInTheDocument();
  });

  it('expose Restaurer la démo et Espace vierge dans le menu Options', () => {
    const { props } = renderProjects();

    fireEvent.click(screen.getByLabelText("Options de l'espace"));
    fireEvent.click(screen.getByRole('button', { name: /Restaurer la démo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurer' }));
    expect(props.onResetWorkspaceDemo).toHaveBeenCalledTimes(1);
  });
});
