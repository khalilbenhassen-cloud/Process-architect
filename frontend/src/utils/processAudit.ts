import { ProcessEdge, ProcessNode } from '../types/process';

/**
 * Détecte les étapes sensibles / de contrôle qui doivent obligatoirement
 * référencer une règle de gestion (RG-*) pour la traçabilité et l'audit.
 */
export function isSensitiveControlStep(label: string): boolean {
  const lower = (label || '').toLowerCase();
  return (
    lower.includes('forclusion') ||
    lower.includes('clôtur') ||
    lower.includes('clotur') ||
    lower.includes('rejet') ||
    lower.includes('virement') ||
    lower.includes('validation') ||
    lower.includes('contrôl') ||
    lower.includes('control') ||
    lower.includes('kyc')
  );
}

/**
 * Source de vérité unique pour la sévérité d'audit par nœud
 * (partagée entre le panneau Auditer à gauche et la Carte des constats à droite).
 */
export function computeAuditSeverityByNode(
  nodes: ProcessNode[],
  edges: ProcessEdge[]
): Record<string, 'error' | 'warning' | 'suggestion'> {
  const map: Record<string, 'error' | 'warning' | 'suggestion'> = {};

  nodes.forEach((n) => {
    if (n.type === 'start' || n.type === 'end') return;

    const hasRules = Boolean(n.ruleIds && n.ruleIds.length > 0);
    if (!hasRules && isSensitiveControlStep(n.label)) {
      map[n.id] = 'error';
      return;
    }

    if (n.type === 'decision') {
      const outs = edges.filter((e) => e.sourceNodeId === n.id);
      if (outs.length < 2 || outs.some((e) => !e.label?.trim())) {
        map[n.id] = 'warning';
        return;
      }
    }

    if (!n.ownerRole || !n.ownerRole.trim()) {
      map[n.id] = 'warning';
      return;
    }

    if (
      n.type === 'task' &&
      (!n.estimatedDurationMinutes || n.estimatedDurationMinutes <= 0)
    ) {
      map[n.id] = 'suggestion';
    }
  });

  return map;
}
