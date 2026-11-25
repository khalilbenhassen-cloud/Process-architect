import { describe, it, expect } from 'vitest';
import { computeSwimlaneLayout } from './swimlaneLayout';
import { ProcessEdge, ProcessNode } from '../types/process';

function makeNode(
  id: string,
  type: ProcessNode['type'],
  label: string,
  ownerRole?: string
): ProcessNode {
  return {
    id,
    type,
    label,
    ownerRole,
    position: { x: 0, y: 0 },
    estimatedDurationMinutes: type === 'task' ? 15 : 0,
    executionMode: 'manual',
  };
}

describe('computeSwimlaneLayout — BPMN 2.0 Swimlanes', () => {
  it('groupe les étapes par acteur dans l’ordre du flux et garde les Fins dans le couloir de l’étape précédente', () => {
    const nodes: ProcessNode[] = [
      makeNode('s1', 'start', 'Dépôt dossier', 'Client / Conseiller Agence'),
      makeNode('t1', 'task', 'Contrôler KYC', 'Gestionnaire Crédit'),
      makeNode('d1', 'decision', 'Taux <= 35% ?', 'Comité Risque Crédit'),
      makeNode('t2', 'task', 'Éditer offre', 'Back-Office Prêts'),
      makeNode('e1', 'end', 'Offre signée', 'Système'),
      makeNode('e2', 'end', 'Dossier refusé', 'Système'),
    ];
    const edges: ProcessEdge[] = [
      { id: 'e-1', sourceNodeId: 's1', targetNodeId: 't1' },
      { id: 'e-2', sourceNodeId: 't1', targetNodeId: 'd1' },
      { id: 'e-3', sourceNodeId: 'd1', targetNodeId: 't2', label: 'Conforme' },
      { id: 'e-4', sourceNodeId: 't2', targetNodeId: 'e1' },
      { id: 'e-5', sourceNodeId: 'd1', targetNodeId: 'e2', label: 'Rejet' },
    ];

    const layout = computeSwimlaneLayout(nodes, edges);

    // 2 Pools distincts : Pool Externe (Client) + Pool Organisation (3 Lanes internes)
    expect(layout.pools.length).toBe(2);
    expect(layout.pools[0].isExternal).toBe(true);
    expect(layout.pools[0].lanes.map((l) => l.role)).toEqual([
      'Client / Conseiller Agence',
    ]);
    expect(layout.pools[1].isExternal).toBe(false);
    expect(layout.pools[1].lanes.map((l) => l.role)).toEqual([
      'Gestionnaire Crédit',
      'Comité Risque Crédit',
      'Back-Office Prêts',
    ]);
    // Espacement vertical visible entre le Pool Externe et le Pool Organisation
    expect(layout.pools[1].y).toBeGreaterThan(
      layout.pools[0].y + layout.pools[0].height
    );

    // 4 couloirs métiers (zéro couloir "Système" vide)
    expect(layout.lanes.map((l) => l.role)).toEqual([
      'Client / Conseiller Agence',
      'Gestionnaire Crédit',
      'Comité Risque Crédit',
      'Back-Office Prêts',
    ]);

    // e1 hérite du couloir de t2 (Back-Office Prêts) et e2 hérite de d1 (Comité Risque Crédit)
    expect(layout.nodeLaneIndex['e1']).toBe(layout.nodeLaneIndex['t2']);
    expect(layout.nodeLaneIndex['e2']).toBe(layout.nodeLaneIndex['d1']);

    // 3 transferts de responsabilité (s1->t1, t1->d1, d1->t2)
    expect(layout.handoffCount).toBe(3);

    // Progression stricte de gauche à droite
    expect(layout.nodePositions['s1'].x).toBeLessThan(layout.nodePositions['t1'].x);
    expect(layout.nodePositions['t1'].x).toBeLessThan(layout.nodePositions['d1'].x);
    expect(layout.nodePositions['d1'].x).toBeLessThan(layout.nodePositions['t2'].x);
    expect(layout.nodePositions['t2'].x).toBeLessThan(layout.nodePositions['e1'].x);
  });

  it('gère les boucles (cycles) sans blocage ni colonnes vides', () => {
    const nodes: ProcessNode[] = [
      makeNode('s1', 'start', 'Début', 'Client'),
      makeNode('t1', 'task', 'Vérifier pièces', 'Gestionnaire'),
      makeNode('d1', 'decision', 'Complet ?', 'Gestionnaire'),
      makeNode('t2', 'task', 'Relancer client', 'Client'),
      makeNode('e1', 'end', 'Clôturé'),
    ];
    const edges: ProcessEdge[] = [
      { id: 'e-1', sourceNodeId: 's1', targetNodeId: 't1' },
      { id: 'e-2', sourceNodeId: 't1', targetNodeId: 'd1' },
      { id: 'e-3', sourceNodeId: 'd1', targetNodeId: 't2', label: 'Incomplet' },
      { id: 'e-4', sourceNodeId: 't2', targetNodeId: 't1', label: 'Pièces reçues' },
      { id: 'e-5', sourceNodeId: 'd1', targetNodeId: 'e1', label: 'Complet' },
    ];

    const layout = computeSwimlaneLayout(nodes, edges);
    expect(layout.lanes.length).toBe(2);
    expect(layout.nodePositions['e1']).toBeDefined();
    expect(layout.totalWidth).toBeGreaterThan(800);
  });
});
