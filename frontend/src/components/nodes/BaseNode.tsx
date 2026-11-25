import React from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import {
  AlertCircle,
  AlertTriangle,
  Plus,
  GitFork,
  Copy,
  Trash2,
  FileText,
  FileCheck,
  CheckSquare,
  Mail,
  Phone,
  FolderX,
  Database,
  Layers,
} from 'lucide-react';
import { ProcessNode, NodeType } from '../../types/process';

export interface CustomNodeData extends ProcessNode {
  isSimulatedActive?: boolean;
  hasFinding?: 'error' | 'warning' | 'suggestion';
  onQuickAddAfter?: (sourceId: string, type: NodeType) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

interface BaseNodeProps {
  data: CustomNodeData;
  selected?: boolean;
  icon?: React.ReactNode;
  headerBg?: string;
  accentBorderClass?: string;
  iconContainerClass?: string;
  badgeLabel?: string;
  badgeBg?: string;
  badgeColor?: string;
  hasTargetHandle?: boolean;
  hasSourceHandle?: boolean;
  shapeClass?: string;
  variant?: 'default' | 'terminal' | 'decision' | 'start' | 'end';
}

function formatCompactRuleBadge(ruleId: string): string {
  const clean = (ruleId || '').trim();
  const match = clean.match(/^RG-[A-Za-z]+-(\d+)$/i);
  if (match) {
    return `RG-${match[1]}`;
  }
  return clean.length > 7 ? clean.slice(0, 7) : clean;
}

function resolveCardVisuals(
  type: NodeType,
  label: string,
  variant: string
): { squareBg: string; iconNode: React.ReactNode } {
  const lower = (label || '').toLowerCase();

  if (variant === 'decision' || type === 'decision') {
    return {
      squareBg: 'bg-amber-500 text-white shadow-[0_3px_10px_-2px_rgba(245,158,11,0.45)]',
      iconNode: <span className="text-[17px] font-extrabold leading-none select-none">?</span>,
    };
  }

  if (type === 'data') {
    return {
      squareBg: 'bg-sky-500 text-white shadow-[0_3px_10px_-2px_rgba(14,165,233,0.4)]',
      iconNode: <Database className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  if (type === 'subprocess') {
    return {
      squareBg: 'bg-violet-600 text-white shadow-[0_3px_10px_-2px_rgba(124,58,237,0.4)]',
      iconNode: <Layers className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  // Semantic task colors & icons (Proposition 3: Apple × Linear)
  if (
    lower.includes('rejet') ||
    lower.includes('refus') ||
    lower.includes('opposition') ||
    lower.includes('anomalie')
  ) {
    return {
      squareBg: 'bg-rose-600 text-white shadow-[0_3px_10px_-2px_rgba(225,29,72,0.4)]',
      iconNode: <AlertTriangle className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  if (lower.includes('clôtur') || lower.includes('clotur') || lower.includes('forclusion') || lower.includes('caduc')) {
    return {
      squareBg: 'bg-rose-600 text-white shadow-[0_3px_10px_-2px_rgba(225,29,72,0.4)]',
      iconNode: <FolderX className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  if (
    lower.includes('demander') ||
    lower.includes('relance') ||
    lower.includes('complément') ||
    lower.includes('complement') ||
    lower.includes('notifier')
  ) {
    return {
      squareBg: 'bg-amber-500 text-white shadow-[0_3px_10px_-2px_rgba(245,158,11,0.45)]',
      iconNode: <Mail className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  if (lower.includes('suivi') || lower.includes('appel') || lower.includes('contact')) {
    return {
      squareBg: 'bg-amber-500 text-white shadow-[0_3px_10px_-2px_rgba(245,158,11,0.45)]',
      iconNode: <Phone className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  if (
    lower.includes('réception') ||
    lower.includes('reception') ||
    lower.includes('dépôt') ||
    lower.includes('depot')
  ) {
    return {
      squareBg: 'bg-emerald-500 text-white shadow-[0_3px_10px_-2px_rgba(16,185,129,0.45)]',
      iconNode: <FileText className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  if (
    lower.includes('valid') ||
    lower.includes('ordonnanc') ||
    lower.includes('virement') ||
    lower.includes('émission') ||
    lower.includes('emission') ||
    lower.includes('offre')
  ) {
    return {
      squareBg: 'bg-emerald-500 text-white shadow-[0_3px_10px_-2px_rgba(16,185,129,0.45)]',
      iconNode: <CheckSquare className="w-4 h-4 stroke-[2.2]" />,
    };
  }

  return {
    squareBg: 'bg-blue-600 text-white shadow-[0_3px_10px_-2px_rgba(37,99,235,0.4)]',
    iconNode: <FileCheck className="w-4 h-4 stroke-[2.2]" />,
  };
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  data,
  selected,
  hasTargetHandle = true,
  hasSourceHandle = true,
  variant = 'default',
}) => {
  const isSimulated = data.isSimulatedActive;
  const finding = data.hasFinding;
  const ruleIds = data.ruleIds || [];

  // Contextual NodeToolbar shown above the selected node
  const renderNodeToolbar = () => (
    <NodeToolbar isVisible={Boolean(selected)} position={Position.Top} offset={10}>
      <div className="flex items-center gap-1 bg-slate-900/95 text-white backdrop-blur-md px-2 py-1 rounded-xl shadow-xl border border-slate-700/80 text-[11px] select-none">
        {hasSourceHandle && data.onQuickAddAfter && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onQuickAddAfter?.(data.id, 'task');
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-600 text-slate-100 hover:text-white font-medium transition"
              title="Insérer et relier automatiquement une activité à la suite"
            >
              <Plus className="w-3 h-3 text-indigo-400" />
              <span>Activité</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onQuickAddAfter?.(data.id, 'decision');
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-600 text-slate-100 hover:text-white font-medium transition"
              title="Insérer et relier automatiquement une décision à la suite"
            >
              <GitFork className="w-3 h-3 text-amber-400" />
              <span>Décision</span>
            </button>
            <div className="h-3.5 w-px bg-slate-700 mx-0.5" />
          </>
        )}

        {data.onDuplicateNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDuplicateNode?.(data.id);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Dupliquer cette étape"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}

        {data.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteNode?.(data.id);
            }}
            className="p-1.5 rounded-lg hover:bg-rose-600/90 text-rose-300 hover:text-white transition"
            title="Supprimer cette étape"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </NodeToolbar>
  );

  // 1. START NODE — Proposition 3 Glowing Green Pill Capsule
  if (variant === 'start' || data.type === 'start') {
    const rawStartLabel = (data.label || 'DÉBUT DU PROCESSUS').trim();
    const displayStart =
      rawStartLabel.toLowerCase().startsWith('réception') ||
      rawStartLabel.toLowerCase().startsWith('point de départ')
        ? 'DÉBUT DU PROCESSUS'
        : rawStartLabel.toUpperCase();

    return (
      <div
        title={rawStartLabel}
        className={`relative rounded-full bg-gradient-to-b from-emerald-400 to-emerald-500 text-white px-6 py-3 min-w-[138px] max-w-[185px] text-center select-none transition-all duration-150 border-2 ${
          selected
            ? 'border-indigo-600 ring-4 ring-indigo-500/25 shadow-[0_10px_28px_-4px_rgba(16,185,129,0.65)] scale-[1.02]'
            : isSimulated
            ? 'border-white ring-4 ring-emerald-400/40 shadow-[0_10px_28px_-4px_rgba(16,185,129,0.7)]'
            : 'border-emerald-300/80 shadow-[0_8px_22px_-4px_rgba(16,185,129,0.55)] hover:shadow-[0_10px_26px_-3px_rgba(16,185,129,0.65)]'
        }`}
      >
        {renderNodeToolbar()}
        <div className="text-[11px] font-extrabold uppercase tracking-wider leading-tight line-clamp-2 drop-shadow-2xs">
          {displayStart}
        </div>

        {hasSourceHandle && (
          <Handle
            type="source"
            position={Position.Right}
            className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white hover:!scale-125 !-right-1.5 transition-transform"
          />
        )}
      </div>
    );
  }

  // 2. END NODE — Proposition 3 Compact Colored Square + Clean Bottom Caption
  if (variant === 'end' || data.type === 'end') {
    const rawEndLabel = (data.label || 'Fin').trim();
    const lowerEnd = rawEndLabel.toLowerCase();

    let squareColor =
      'bg-emerald-500 shadow-[0_6px_16px_-2px_rgba(16,185,129,0.45)]';
    if (
      lowerEnd.includes('rejet') ||
      lowerEnd.includes('refus') ||
      lowerEnd.includes('échec') ||
      lowerEnd.includes('erreur')
    ) {
      squareColor = 'bg-rose-600 shadow-[0_6px_16px_-2px_rgba(225,29,72,0.45)]';
    } else if (
      lowerEnd.includes('caduc') ||
      lowerEnd.includes('forclusion') ||
      lowerEnd.includes('incomplet') ||
      lowerEnd.includes('complété') ||
      lowerEnd.includes('attente')
    ) {
      squareColor = 'bg-amber-500 shadow-[0_6px_16px_-2px_rgba(245,158,11,0.45)]';
    }

    const cleanCaption = rawEndLabel
      .replace(/^Fin\s*[—\-:]\s*/i, '')
      .trim();

    return (
      <div
        title={rawEndLabel}
        className="relative flex flex-col items-center select-none group"
      >
        {renderNodeToolbar()}

        <div
          className={`relative w-9 h-9 rounded-xl border-2 border-white transition-all duration-150 ${squareColor} ${
            selected
              ? 'ring-4 ring-indigo-500/30 scale-105'
              : isSimulated
              ? 'ring-4 ring-emerald-400/40 scale-105'
              : 'group-hover:scale-105'
          }`}
        >
          {hasTargetHandle && (
            <Handle
              type="target"
              position={Position.Left}
              className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white !-left-1.5"
            />
          )}
        </div>

        <div className="mt-1.5 text-[11px] font-bold text-slate-800 text-center leading-tight max-w-[125px] line-clamp-2">
          {cleanCaption || rawEndLabel}
        </div>
      </div>
    );
  }

  // 3. COMPACT HORIZONTAL APPLE × LINEAR CARD (Task, Decision, Data, Subprocess)
  let borderClasses = 'border-slate-200/90 hover:border-slate-300';
  let shadowClass =
    'shadow-[0_6px_20px_-4px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_24px_-4px_rgba(15,23,42,0.12)]';

  if (selected) {
    borderClasses = 'border-indigo-600 ring-4 ring-indigo-500/15';
    shadowClass = 'shadow-[0_12px_28px_-6px_rgba(79,70,229,0.22)]';
  } else if (isSimulated) {
    borderClasses = 'border-emerald-500 ring-4 ring-emerald-400/25';
    shadowClass = 'shadow-[0_10px_25px_-4px_rgba(16,185,129,0.25)]';
  } else if (finding === 'error') {
    borderClasses = 'border-rose-500 ring-3 ring-rose-400/20';
  } else if (finding === 'warning') {
    borderClasses = 'border-amber-500 ring-3 ring-amber-400/20';
  }

  const { squareBg, iconNode } = resolveCardVisuals(
    data.type,
    data.label || '',
    variant
  );

  const subtitle =
    data.ownerRole ||
    data.application ||
    (variant === 'decision' ? 'Vérification métier' : 'Équipe Projet');

  return (
    <div
      className={`relative w-[244px] bg-white rounded-2xl border ${borderClasses} ${shadowClass} transition-all duration-150 text-left select-none px-3.5 py-3 flex items-center gap-3`}
    >
      {renderNodeToolbar()}

      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white hover:!bg-indigo-600 hover:!scale-125 !-left-1.5 transition-all"
        />
      )}

      {/* Finding Floating Indicator */}
      {finding && (
        <div
          className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10 ${
            finding === 'error' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
          }`}
          title={
            finding === 'error'
              ? 'Erreur de validation détectée'
              : 'Avertissement détecté'
          }
        >
          {finding === 'error' ? (
            <AlertCircle className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
        </div>
      )}

      {/* Colored Left Icon Square */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${squareBg}`}
      >
        {iconNode}
      </div>

      {/* 2-Line Compact Content + Right Rule Badge */}
      <div className="min-w-0 flex-1">
        <div
          className="font-bold text-[12.5px] text-slate-900 leading-tight truncate"
          title={data.label}
        >
          {data.label || 'Sans libellé'}
        </div>

        <div className="flex items-center justify-between gap-1.5 mt-1">
          <span
            className="text-[11px] text-slate-500 font-medium truncate"
            title={subtitle}
          >
            {subtitle}
          </span>

          {ruleIds.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/90 text-[9.5px] font-bold font-mono shrink-0 leading-none"
              title={`Règles liées : ${ruleIds.join(', ')}`}
            >
              {formatCompactRuleBadge(ruleIds[0])}
            </span>
          )}
        </div>
      </div>

      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className={`!w-2.5 !h-2.5 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-all ${
            variant === 'decision'
              ? '!bg-amber-500 hover:!bg-amber-600'
              : '!bg-slate-400 hover:!bg-indigo-600'
          }`}
        />
      )}
    </div>
  );
};



