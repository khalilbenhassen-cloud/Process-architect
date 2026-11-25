import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AnimatedFinanceDiagram,
  computeEdgeRouteAndLabel,
  computeIsometricLayout,
  inferFinanceFlowType,
  inferIsometricStationKind,
} from './AnimatedFinanceDiagram';
import { ProcessEdge, ProcessNode } from '../types/process';

const NODES: ProcessNode[] = [
  {
    id: 'n-start',
    type: 'start',
    label: 'Portail Client — Demande Rachat',
    position: { x: 0, y: 0 },
    estimatedDurationMinutes: 2,
    executionMode: 'manual',
  },
  {
    id: 'n-kyc',
    type: 'decision',
    label: 'Contrôle Conformité LCB-FT ?',
    position: { x: 250, y: 0 },
    ownerRole: 'Conformité',
    application: 'Moteur LCB-FT',
    estimatedDurationMinutes: 25,
    executionMode: 'manual',
  },
  {
    id: 'n-pay',
    type: 'end',
    label: 'Trésorerie — Virement SEPA',
    position: { x: 500, y: -80 },
    ownerRole: 'Trésorerie',
    application: 'Core Banking',
    estimatedDurationMinutes: 5,
    executionMode: 'automated',
  },
  {
    id: 'n-reject',
    type: 'task',
    label: 'Escalade / Rejet Dossier',
    position: { x: 500, y: 80 },
    estimatedDurationMinutes: 10,
    executionMode: 'manual',
  },
];

const EDGES: ProcessEdge[] = [
  { id: 'e-1', sourceNodeId: 'n-start', targetNodeId: 'n-kyc' },
  { id: 'e-2', sourceNodeId: 'n-kyc', targetNodeId: 'n-pay', label: 'Conforme' },
  { id: 'e-3', sourceNodeId: 'n-kyc', targetNodeId: 'n-reject', label: 'Non conforme' },
];

describe('AnimatedFinanceDiagram — Visualisation pure plein écran', () => {
  it('déduit automatiquement la station isométrique et le type de flux animé', () => {
    expect(inferIsometricStationKind(NODES[0])).toBe('portal');
    expect(inferIsometricStationKind(NODES[1])).toBe('shield');
    expect(inferIsometricStationKind(NODES[2])).toBe('vault');

    expect(inferFinanceFlowType(EDGES[0], NODES[0], NODES[1])).toBe('gestionnaire');
    expect(inferFinanceFlowType(EDGES[1], NODES[1], NODES[2])).toBe('virement');
    expect(inferFinanceFlowType(EDGES[2], NODES[1], NODES[3])).toBe('alerte');
  });

  it('affiche la scène animée épurée sans panneaux latéraux ni ruban de phases, avec Pause et retour Spatial 3D', () => {
    const onSwitchToSpatial3D = vi.fn();

    const { container } = render(
      <AnimatedFinanceDiagram
        nodes={NODES}
        edges={EDGES}
        rules={[]}
        onSwitchToSpatial3D={onSwitchToSpatial3D}
      />
    );

    expect(screen.getByText('Visualisation Flux Financiers Animés')).toBeInTheDocument();
    expect(screen.getByText(/Durée totale · 42 min/i)).toBeInTheDocument();
    expect(screen.getByText(/25 min · Goulot/i)).toBeInTheDocument();

    // Aucun panneau latéral, aucune palette gauche, aucun ruban de phases
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.queryByText('Personnaliser le flux')).not.toBeInTheDocument();
    expect(screen.queryByText('Rejouer')).not.toBeInTheDocument();

    // Animations actives (bonhomme qui marche + pièces € + animateMotion)
    expect(container.querySelector('.iso-walk-bob')).not.toBeNull();
    expect(container.querySelector('.iso-coin-spin')).not.toBeNull();
    expect(container.querySelectorAll('animateMotion').length).toBe(3);

    // Pause arrête les animateMotion et ajoute .iso-paused
    fireEvent.click(screen.getByRole('button', { name: /Mettre en pause les animations/i }));
    expect(container.querySelectorAll('animateMotion').length).toBe(0);
    expect(screen.getByTestId('animated-finance-diagram').className).toContain('iso-paused');

    // Mode Plein écran (activation + sortie via bouton)
    fireEvent.click(screen.getByRole('button', { name: /Afficher en plein écran/i }));
    expect(screen.getByTestId('animated-finance-diagram').className).toContain('fixed inset-0');
    fireEvent.click(screen.getByRole('button', { name: /Quitter le plein écran/i }));
    expect(screen.getByTestId('animated-finance-diagram').className).not.toContain('fixed inset-0');

    // Revenir au Spatial 3D
    fireEvent.click(screen.getByRole('button', { name: /Flux animés/i }));
    expect(onSwitchToSpatial3D).toHaveBeenCalledTimes(1);
  });

  it('gère les boucles de retour sans colonne vide ni chevauchement entre stations', () => {
    const cyclicNodes: ProcessNode[] = [
      { id: 'start', type: 'start', label: 'Réception', position: { x: 0, y: 0 }, estimatedDurationMinutes: 2, executionMode: 'manual' },
      { id: 'check', type: 'task', label: 'Contrôler pièces', position: { x: 0, y: 0 }, estimatedDurationMinutes: 10, executionMode: 'manual' },
      { id: 'dec', type: 'decision', label: 'Dossier complet ?', position: { x: 0, y: 0 }, estimatedDurationMinutes: 5, executionMode: 'manual' },
      { id: 'ask', type: 'task', label: 'Demander pièces', position: { x: 0, y: 0 }, estimatedDurationMinutes: 8, executionMode: 'manual' },
      { id: 'wait', type: 'decision', label: 'Reçues sous 30j ?', position: { x: 0, y: 0 }, estimatedDurationMinutes: 5, executionMode: 'manual' },
      { id: 'close-exp', type: 'end', label: 'Clôturer forclusion', position: { x: 0, y: 0 }, estimatedDurationMinutes: 3, executionMode: 'manual' },
      { id: 'pay', type: 'end', label: 'Virement SEPA', position: { x: 0, y: 0 }, estimatedDurationMinutes: 5, executionMode: 'automated' },
    ];
    const cyclicEdges: ProcessEdge[] = [
      { id: 'e1', sourceNodeId: 'start', targetNodeId: 'check' },
      { id: 'e2', sourceNodeId: 'check', targetNodeId: 'dec' },
      { id: 'e3', sourceNodeId: 'dec', targetNodeId: 'ask', label: 'Incomplet' },
      { id: 'e4', sourceNodeId: 'ask', targetNodeId: 'wait' },
      { id: 'e5', sourceNodeId: 'wait', targetNodeId: 'check', label: 'Pièces reçues' },
      { id: 'e6', sourceNodeId: 'wait', targetNodeId: 'close-exp', label: 'Expiré' },
      { id: 'e7', sourceNodeId: 'dec', targetNodeId: 'pay', label: 'Complet' },
    ];

    const layout = computeIsometricLayout(cyclicNodes, cyclicEdges);

    expect(layout['check'].x - layout['start'].x).toBe(300);

    const ids = Object.keys(layout);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = layout[ids[i]];
        const b = layout[ids[j]];
        const overlaps =
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('contourne automatiquement les stations intermédiaires sur les liens longs et évite toute superposition d’étiquette', () => {
    const src = { x: 80, y: 180, w: 148, h: 166 };
    const midObstacle = { x: 380, y: 180, w: 148, h: 166 };
    const tgt = { x: 680, y: 180, w: 148, h: 166 };

    const route = computeEdgeRouteAndLabel(
      src,
      tgt,
      [src, midObstacle, tgt],
      'Indemnisation directe (OK)'
    );

    const lx1 = route.labelPoint.x - route.pillW / 2;
    const lx2 = route.labelPoint.x + route.pillW / 2;
    const ly1 = route.labelPoint.y - 10;
    const ly2 = route.labelPoint.y + 10;

    // L'étiquette ne doit JAMAIS chevaucher la station intermédiaire (ni sa pilule basse Goulot)
    const hitsObstacle =
      lx1 < midObstacle.x + midObstacle.w + 8 &&
      lx2 > midObstacle.x - 8 &&
      ly1 < midObstacle.y + midObstacle.h + 18 &&
      ly2 > midObstacle.y - 10;

    expect(hitsObstacle).toBe(false);
  });
});
