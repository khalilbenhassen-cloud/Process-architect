import { BpmnGatewayKind, BpmnTaskKind, ProcessNode } from '../types/process';

export const BPMN_GATEWAY_KIND_META: Record<
  BpmnGatewayKind,
  {
    label: string;
    shortLabel: string;
    symbol: string;
    description: string;
    bgStyle: string;
    iconColor: string;
    badgeCls: string;
  }
> = {
  xor: {
    label: 'Exclusive Gateway (XOR)',
    shortLabel: 'XOR',
    symbol: '×',
    description: 'Une seule branche possible selon la condition',
    bgStyle: 'rgba(255, 149, 0, 0.14)',
    iconColor: '#C96A00',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  or: {
    label: 'Inclusive Gateway (OR)',
    shortLabel: 'OR',
    symbol: '○',
    description: 'Une ou plusieurs branches possibles simultanément',
    bgStyle: 'rgba(0, 122, 255, 0.12)',
    iconColor: '#0062CC',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  and: {
    label: 'Parallel Gateway (AND)',
    shortLabel: 'AND',
    symbol: '+',
    description: 'Plusieurs branches exécutées en parallèle',
    bgStyle: 'rgba(52, 199, 89, 0.13)',
    iconColor: '#1E7E34',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  event_based: {
    label: 'Event-Based Gateway (Attente)',
    shortLabel: 'Événement',
    symbol: '◎',
    description: "Attente d'un événement externe (message reçu ou délai/timer)",
    bgStyle: 'rgba(175, 82, 222, 0.12)',
    iconColor: '#7E22CE',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export function resolveBpmnGatewayKind(
  node: Pick<ProcessNode, 'gatewayKind' | 'label'>
): BpmnGatewayKind {
  if (node.gatewayKind) return node.gatewayKind;
  const lower = (node.label || '').toLowerCase();
  if (/sous \d+ jours?|délai|delai|expir|timer|attente|reçues? sous|recues? sous/.test(lower)) {
    return 'event_based';
  }
  if (/parallèle|parallele|\band\b|simultané|simultane/.test(lower)) {
    return 'and';
  }
  if (/inclusif|inclusive|\bor\b/.test(lower)) {
    return 'or';
  }
  return 'xor';
}

export const BPMN_TASK_KIND_META: Record<
  BpmnTaskKind,
  {
    label: string;
    shortLabel: string;
    description: string;
    bgStyle: string;
    iconColor: string;
    badgeCls: string;
  }
> = {
  user: {
    label: 'User Task',
    shortLabel: 'User',
    description: 'Tâche réalisée par un utilisateur dans un outil',
    bgStyle: 'rgba(0, 122, 255, 0.11)',
    iconColor: '#0062CC',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  service: {
    label: 'Service Task',
    shortLabel: 'Service',
    description: 'Traitement automatisé par un système / API',
    bgStyle: 'rgba(88, 86, 214, 0.12)',
    iconColor: '#4F46E5',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  manual: {
    label: 'Manual Task',
    shortLabel: 'Manual',
    description: 'Tâche manuelle hors système (papier, courrier, appel)',
    bgStyle: 'rgba(255, 149, 0, 0.12)',
    iconColor: '#B45309',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  business_rule: {
    label: 'Business Rule Task',
    shortLabel: 'Règle',
    description: 'Application de règles métier / moteur de décision',
    bgStyle: 'rgba(52, 199, 89, 0.12)',
    iconColor: '#1E7E34',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

/**
 * Résout le type BPMN 2.0 d'une tâche (explicite ou inféré intelligemment).
 */
export function resolveBpmnTaskKind(node: Pick<ProcessNode, 'type' | 'taskKind' | 'executionMode' | 'label' | 'description' | 'ownerRole' | 'application' | 'ruleIds'>): BpmnTaskKind {
  if (node.taskKind) return node.taskKind;

  const text = `${node.label || ''} ${node.description || ''} ${node.ownerRole || ''} ${node.application || ''}`.toLowerCase();

  if (
    node.executionMode === 'automated' ||
    /automatique|automati|api|ocr|moteur|scoring|recommandé électronique|recommande electronique|courrier électronique|courrier electronique|email|e-mail|sms|notification|virement|sepa/.test(
      text
    )
  ) {
    return 'service';
  }

  if (
    (node.ruleIds && node.ruleIds.length > 0) &&
    /règle|regle|barème|bareme|seuil|éligibilité|eligibilite|calcul/.test(text)
  ) {
    return 'business_rule';
  }

  if (/papier|courrier|téléphone|telephone|appel|physique|guichet|agence/.test(text)) {
    return 'manual';
  }

  return 'user';
}
