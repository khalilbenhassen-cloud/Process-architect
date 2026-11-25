import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StudioProjectGallery,
  formatLastUpdatedLabel,
} from './StudioProjectGallery';
import { Category, ProcessSummary, Project } from '../types/process';

const CATEGORIES: Category[] = [
  { id: 'cat-moa', name: 'Projets de Transformation MOA', color: '#007AFF', createdAt: '' },
  { id: 'cat-ops', name: 'Opérations & Gestion Épargne', color: '#34C759', createdAt: '' },
];

const NOW = Date.now();
const TEN_MINUTES_AGO = new Date(NOW - 10 * 60_000).toISOString();
const THREE_DAYS_AGO = new Date(NOW - 3 * 24 * 3_600_000).toISOString();

const PROCESSES: ProcessSummary[] = [
  {
    id: 'demo-rachat-partiel',
    name: 'Demande de rachat partiel — TO-BE',
    description: 'Parcours épargne',
    lifecycleState: 'approved',
    modelState: 'to_be',
    version: '1.2.0',
    owner: 'MOA',
    nodeCount: 16,
    edgeCount: 17,
    ruleCount: 7,
    updatedAt: THREE_DAYS_AGO,
  },
  {
    id: 'demo-sinistre-auto',
    name: 'Sinistre Auto — TO-BE',
    description: 'Parcours IARD',
    lifecycleState: 'approved',
    modelState: 'to_be',
    version: '1.1.0',
    owner: 'IARD',
    nodeCount: 11,
    edgeCount: 11,
    ruleCount: 5,
    updatedAt: TEN_MINUTES_AGO,
  },
];

const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Demande de Rachat Partiel',
    description: 'Projet pilote épargne retraite.',
    categoryId: 'cat-moa',
    status: 'active',
    tags: [],
    processIds: ['demo-rachat-partiel'],
    memberIds: [],
    createdAt: THREE_DAYS_AGO,
    updatedAt: THREE_DAYS_AGO,
  },
  {
    id: 'proj-2',
    name: 'Sinistre Auto — Indemnisation Digitale',
    description: 'Parcours digital sinistres auto.',
    categoryId: 'cat-ops',
    status: 'active',
    tags: [],
    processIds: ['demo-sinistre-auto'],
    memberIds: [],
    createdAt: THREE_DAYS_AGO,
    updatedAt: THREE_DAYS_AGO,
  },
];

describe('StudioProjectGallery — Tri par dernière mise à jour & format < 24h / >= 24h', () => {
  it('supprime le mini-diagramme, trie par dernière mise à jour, affiche relatif < 24h et fixe >= 24h', () => {
    const onOpenProjectProcess = vi.fn();
    const onGoToProjectsManager = vi.fn();

    const { container } = render(
      <StudioProjectGallery
        projects={PROJECTS}
        processes={PROCESSES}
        categories={CATEGORIES}
        onOpenProjectProcess={onOpenProjectProcess}
        onGoToProjectsManager={onGoToProjectsManager}
      />
    );

    // Aucun mini-diagramme BPMN SVG (viewBox="0 0 280 74") ne doit être présent
    expect(container.querySelector('svg[viewBox="0 0 280 74"]')).toBeNull();

    // proj-2 a un processus mis à jour il y a 10 min -> doit apparaître AVANT proj-1 (3 jours)
    const cards = container.querySelectorAll('[data-testid^="studio-project-card-"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('data-testid')).toBe('studio-project-card-proj-2');
    expect(cards[1].getAttribute('data-testid')).toBe('studio-project-card-proj-1');

    // proj-2 affiche un format relatif ("Il y a 10 min")
    expect(cards[0].textContent).toContain('Il y a 10 min');
    // proj-1 (> 24h) affiche une date/heure fixe contenant "·" (et pas "Il y a")
    expect(cards[1].textContent).not.toContain('Il y a');
    expect(cards[1].textContent).toMatch(/Mis à jour · .+ · \d{2}:\d{2}/);

    // Filtrer par catégorie Opérations
    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }));
    fireEvent.click(screen.getByRole('button', { name: /Opérations & Gestion Épargne/i }));
    expect(screen.queryByText('Demande de Rachat Partiel')).not.toBeInTheDocument();
    expect(screen.getByText('Sinistre Auto — Indemnisation Digitale')).toBeInTheDocument();

    // Cliquer sur le processus TO-BE de Sinistre Auto -> appelle onOpenProjectProcess('proj-2', 'demo-sinistre-auto')
    fireEvent.click(screen.getByRole('button', { name: /TO-BE · Sinistre Auto/i }));
    expect(onOpenProjectProcess).toHaveBeenCalledWith('proj-2', 'demo-sinistre-auto');
  });

  it('formate correctement en relatif sous 24h puis en date/heure fixe à partir de 24h', () => {
    const baseNow = new Date('2026-11-22T17:00:00Z').getTime();

    expect(formatLastUpdatedLabel(baseNow - 20_000, baseNow).label).toBe('À l’instant');
    expect(formatLastUpdatedLabel(baseNow - 15 * 60_000, baseNow).label).toBe('Il y a 15 min');
    expect(formatLastUpdatedLabel(baseNow - 5 * 3_600_000, baseNow).label).toBe('Il y a 5 h');

    const over24h = formatLastUpdatedLabel(baseNow - 25 * 3_600_000, baseNow);
    expect(over24h.label).not.toContain('Il y a');
    expect(over24h.label).toContain('·');
  });
});
