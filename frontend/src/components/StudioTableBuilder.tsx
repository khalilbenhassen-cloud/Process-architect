import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GitFork,
  CheckSquare,
  Play,
  CheckCircle2,
  Database,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  ProcessNode,
  ProcessEdge,
  BusinessRule,
  NodeType,
  BpmnTaskKind,
  BpmnGatewayKind,
} from '../types/process';
import {
  DurationUnit,
  splitDurationForInput,
  toDurationMinutes,
} from '../utils/durationFormat';
import {
  resolveBpmnTaskKind,
  resolveBpmnGatewayKind,
} from '../utils/bpmnTaskKind';

interface StudioTableBuilderProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  rules: BusinessRule[];
  onUpdateNode: (updated: ProcessNode) => void;
  onAddNodeWithEdge: (
    type: NodeType,
    connectFromNodeId?: string,
    edgeLabel?: string,
    branchType?: 'nominal' | 'exception'
  ) => string;
  onDeleteNode: (nodeId: string) => void;
  onSetEdgeConnection: (
    sourceId: string,
    branchType: 'nominal' | 'exception',
    targetId: string | null,
    customLabel?: string
  ) => void;
  onQuickCreateRuleForNode: (nodeId: string) => void;
  onGenerateDiagramOneClick: () => void;
  onSelectNodeInInspector: (nodeId: string) => void;
  activeNodeId?: string | null;
  onSelectRow?: (nodeId: string) => void;
}

const TYPE_META: Record<
  NodeType,
  { label: string; pillCls: string; icon: React.ReactNode }
> = {
  start: {
    label: 'Début',
    pillCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />,
  },
  task: {
    label: 'Tâche',
    pillCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <CheckSquare className="w-3 h-3 text-blue-600" />,
  },
  decision: {
    label: 'Décision ?',
    pillCls: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: <GitFork className="w-3 h-3 text-amber-700" />,
  },
  data: {
    label: 'Données',
    pillCls: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: <Database className="w-3 h-3 text-sky-600" />,
  },
  subprocess: {
    label: 'Sous-proc.',
    pillCls: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: <Layers className="w-3 h-3 text-violet-600" />,
  },
  end: {
    label: 'Fin',
    pillCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
  },
};

export function isExceptionEdgeLabel(label: string): boolean {
  const lower = (label || '').toLowerCase();
  if (lower.includes('sans opposition')) {
    return false;
  }
  return (
    lower.includes('incomplet') ||
    lower.includes('rejet') ||
    lower.includes('refus') ||
    lower === 'non' ||
    lower.startsWith('non ') ||
    lower.includes('inéligible') ||
    lower.includes('ineligible') ||
    lower.includes('opposition') ||
    lower.includes('expiré') ||
    lower.includes('expire') ||
    lower.includes('caduc') ||
    lower.includes('forclusion') ||
    lower.includes('supérieur') ||
    lower.includes('superieur') ||
    lower.includes('≥')
  );
}

const GENERIC_EXCEPTION_PRESETS: Array<{ value: string; label: string }> = [
  { value: 'Incomplet', label: 'INCOMPLET →' },
  { value: 'Délai expiré', label: 'DÉLAI EXPIRÉ →' },
  { value: 'Non / Rejet', label: 'REJET / NON →' },
  { value: 'Seuil dépassé / Escalade', label: 'SEUIL / ESCALADE →' },
];

function isRedExceptionLabel(rawLabel: string): boolean {
  const lower = (rawLabel || '').toLowerCase().trim();
  if (!lower) return false;
  if (!lower.includes('sans opposition') && lower.includes('opposition')) {
    return true;
  }
  return /rejet|refus|inéligible|ineligible|non[\s-]?couvert|exclu|irrecevable|déclin|declin|fraude|anomalie|^non\b/.test(
    lower
  );
}

function formatExceptionPillOption(rawLabel: string): string {
  const clean = (rawLabel || '').trim();
  if (!clean) return 'INCOMPLET →';
  const short = clean.length > 22 ? `${clean.slice(0, 20)}…` : clean;
  return `${short.toUpperCase()} →`;
}

type TableColKey =
  | 'num'
  | 'label'
  | 'type'
  | 'owner'
  | 'duration'
  | 'rule'
  | 'nominal'
  | 'exception'
  | 'actions';

const DEFAULT_COL_WIDTHS: Record<TableColKey, number> = {
  num: 42,
  label: 240,
  type: 108,
  owner: 175,
  duration: 112,
  rule: 114,
  nominal: 195,
  exception: 205,
  actions: 102,
};

const MIN_COL_WIDTHS: Record<TableColKey, number> = {
  num: 36,
  label: 150,
  type: 92,
  owner: 120,
  duration: 96,
  rule: 96,
  nominal: 140,
  exception: 140,
  actions: 92,
};

export const StudioTableBuilder: React.FC<StudioTableBuilderProps> = ({
  nodes,
  edges,
  rules,
  onUpdateNode,
  onAddNodeWithEdge,
  onDeleteNode,
  onSetEdgeConnection,
  onQuickCreateRuleForNode,
  onSelectNodeInInspector,
  activeNodeId,
  onSelectRow,
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [pendingDeleteNode, setPendingDeleteNode] = useState<ProcessNode | null>(
    null
  );
  const [editingExcNodeId, setEditingExcNodeId] = useState<string | null>(null);
  const [editingExcDraft, setEditingExcDraft] = useState<string>('');
  const [durationUnitByNodeId, setDurationUnitByNodeId] = useState<
    Record<string, DurationUnit>
  >({});
  const [colWidths, setColWidths] = useState<Record<TableColKey, number>>({
    ...DEFAULT_COL_WIDTHS,
  });
  const [resizingCol, setResizingCol] = useState<TableColKey | null>(null);
  const resizeStateRef = useRef<{
    col: TableColKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleStartColumnResize = useCallback(
    (col: TableColKey, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeStateRef.current = {
        col,
        startX: e.clientX,
        startWidth: colWidths[col],
      };
      setResizingCol(col);
    },
    [colWidths]
  );

  useEffect(() => {
    if (!resizingCol) return;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';

    const onMouseMove = (ev: MouseEvent) => {
      const st = resizeStateRef.current;
      if (!st) return;
      const delta = ev.clientX - st.startX;
      const nextWidth = Math.max(
        MIN_COL_WIDTHS[st.col],
        Math.min(560, Math.round(st.startWidth + delta))
      );
      setColWidths((prev) =>
        prev[st.col] === nextWidth ? prev : { ...prev, [st.col]: nextWidth }
      );
    };

    const onMouseUp = () => {
      resizeStateRef.current = null;
      setResizingCol(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.style.cursor = prevCursor;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingCol]);

  const totalTableWidth = (Object.values(colWidths) as number[]).reduce(
    (sum, w) => sum + w,
    0
  );

  const renderResizeHandle = (col: TableColKey) => (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Redimensionner la colonne ${col}`}
      onMouseDown={(e) => handleStartColumnResize(col, e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setColWidths((prev) => ({ ...prev, [col]: DEFAULT_COL_WIDTHS[col] }));
      }}
      title="Glisser pour élargir · Double-clic pour réinitialiser"
      className="group/resizer absolute top-0 right-0 h-full w-2.5 cursor-col-resize select-none z-10 flex items-center justify-center"
    >
      <span
        className={`h-4 w-[2px] rounded-full transition-colors ${
          resizingCol === col
            ? 'bg-[#007AFF] h-full'
            : 'bg-transparent group-hover/resizer:bg-[#007AFF]/55'
        }`}
      />
    </div>
  );

  const currentActiveRowId = activeNodeId !== undefined ? activeNodeId : selectedRowId;

  // Stable logical row order:
  // 1. 'start' first
  // 2. active steps ('task', 'decision', 'data', 'subprocess') in their stable creation/sequence order
  // 3. 'end' nodes grouped cleanly at the bottom
  const orderedNodes = [
    ...nodes.filter((n) => n.type === 'start'),
    ...nodes.filter((n) => n.type !== 'start' && n.type !== 'end'),
    ...nodes.filter((n) => n.type === 'end'),
  ];

  const rowNumberById = new Map<string, number>();
  orderedNodes.forEach((n, idx) => rowNumberById.set(n.id, idx + 1));

  // Resolve nominal and exception outgoing edges for each node
  const getOutgoingBranches = (node: ProcessNode) => {
    const outEdges = edges.filter((e) => e.sourceNodeId === node.id);
    if (outEdges.length === 0) {
      return { nominalEdge: null, exceptionEdge: null };
    }
    if (node.type !== 'decision') {
      return { nominalEdge: outEdges[0], exceptionEdge: null };
    }
    const exc = outEdges.find((e) => isExceptionEdgeLabel(e.label || ''));
    const nom = outEdges.find((e) => e.id !== exc?.id) || null;
    return {
      nominalEdge: nom,
      exceptionEdge: exc || (outEdges.length > 1 ? outEdges[1] : null),
    };
  };

  const lastNonEndNode =
    [...orderedNodes].reverse().find((n) => n.type !== 'end') ||
    orderedNodes[orderedNodes.length - 1];

  const selectedRowNode = selectedRowId
    ? orderedNodes.find((n) => n.id === selectedRowId) || null
    : null;

  return (
    <div
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && pendingDeleteNode) {
          e.preventDefault();
          setPendingDeleteNode(null);
          return;
        }
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRowNode) {
          e.preventDefault();
          setPendingDeleteNode(selectedRowNode);
        }
      }}
      className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] px-4 sm:px-6 pt-4 pb-28 select-none outline-none"
    >
      <div className="max-w-[1440px] mx-auto space-y-3.5">
        {/* 6-Column Apple Numbers × Linear Table (Zero Truncated Step Names) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="table-fixed border-collapse text-left"
              style={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
            >
              <colgroup>
                <col style={{ width: `${colWidths.num}px` }} />
                <col style={{ width: `${colWidths.label}px` }} />
                <col style={{ width: `${colWidths.type}px` }} />
                <col style={{ width: `${colWidths.owner}px` }} />
                <col style={{ width: `${colWidths.duration}px` }} />
                <col style={{ width: `${colWidths.rule}px` }} />
                <col style={{ width: `${colWidths.nominal}px` }} />
                <col style={{ width: `${colWidths.exception}px` }} />
                <col style={{ width: `${colWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="relative py-3 px-2 text-center">
                    N°
                    {renderResizeHandle('num')}
                  </th>
                  <th className="relative py-3 px-2.5">
                    Nom de l'Étape
                    {renderResizeHandle('label')}
                  </th>
                  <th className="relative py-3 px-2">
                    Type
                    {renderResizeHandle('type')}
                  </th>
                  <th className="relative py-3 px-2.5">
                    Responsable / Question
                    {renderResizeHandle('owner')}
                  </th>
                  <th className="relative py-3 px-2 text-center">
                    Durée
                    {renderResizeHandle('duration')}
                  </th>
                  <th className="relative py-3 px-2">
                    Règle (RG-*)
                    {renderResizeHandle('rule')}
                  </th>
                  <th className="relative py-3 px-2.5">
                    Étape Suivante (Flux Nominal)
                    {renderResizeHandle('nominal')}
                  </th>
                  <th className="relative py-3 px-2.5">
                    Branche d'Exception (Si Décision)
                    {renderResizeHandle('exception')}
                  </th>
                  <th className="relative py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orderedNodes.map((node, idx) => {
                  const meta = TYPE_META[node.type] || TYPE_META.task;
                  const { nominalEdge, exceptionEdge } = getOutgoingBranches(node);
                  const isDecision = node.type === 'decision';
                  const isEnd = node.type === 'end';
                  const isStart = node.type === 'start';
                  const firstRuleId = node.ruleIds?.[0] || '';

                  const excSelectValue =
                    (exceptionEdge?.label || '').trim() || 'Incomplet';
                  const isCustomExcValue = !GENERIC_EXCEPTION_PRESETS.some(
                    (p) => p.value === excSelectValue
                  );
                  const isRedExc = isRedExceptionLabel(excSelectValue);

                  return (
                    <tr
                      key={node.id}
                      onClick={() => {
                        setSelectedRowId(node.id);
                        if (onSelectRow) {
                          onSelectRow(node.id);
                        } else {
                          onSelectNodeInInspector(node.id);
                        }
                      }}
                      className={`group transition-colors ${
                        currentActiveRowId === node.id
                          ? 'bg-indigo-50/60 shadow-[inset_3px_0_0_#4f46e5]'
                          : isEnd
                          ? 'bg-slate-50/40 hover:bg-slate-50/90'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. N° */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. Nom de l'Étape (Single clean line, full width) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={node.label || ''}
                          onChange={(e) =>
                            onUpdateNode({
                              ...node,
                              label: e.target.value,
                            })
                          }
                          placeholder="Saisir le nom de l'étape..."
                          className="w-full font-bold text-[12.5px] text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#1F93FF] focus:bg-white rounded-lg px-2.5 py-1.5 outline-none transition"
                        />
                      </td>

                      {/* 3. Type (avec distinction BPMN 2.0 : User / Service / Manual / Business Rule Task) */}
                      <td className="py-2.5 px-2.5">
                        <div className="relative inline-flex items-center">
                          <select
                            value={
                              node.type === 'task'
                                ? `task:${resolveBpmnTaskKind(node)}`
                                : node.type === 'decision'
                                ? `decision:${resolveBpmnGatewayKind(node)}`
                                : node.type
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.startsWith('task:')) {
                                const kind = val.slice(5) as BpmnTaskKind;
                                onUpdateNode({
                                  ...node,
                                  type: 'task',
                                  taskKind: kind,
                                  gatewayKind: undefined,
                                  executionMode:
                                    kind === 'service'
                                      ? 'automated'
                                      : kind === 'manual'
                                      ? 'manual'
                                      : node.executionMode,
                                  ownerRole:
                                    node.ownerRole || 'Gestionnaire Métier',
                                });
                                return;
                              }
                              if (val.startsWith('decision:')) {
                                const gwKind = val.slice(9) as BpmnGatewayKind;
                                onUpdateNode({
                                  ...node,
                                  type: 'decision',
                                  taskKind: undefined,
                                  gatewayKind: gwKind,
                                  ownerRole:
                                    node.ownerRole || 'Documents complets ?',
                                });
                                return;
                              }
                              const newType = val as NodeType;
                              onUpdateNode({
                                ...node,
                                type: newType,
                                taskKind: undefined,
                                gatewayKind: undefined,
                                ownerRole: node.ownerRole || 'Système',
                              });
                            }}
                            aria-label="Type d'étape"
                            className={`appearance-none font-bold text-[11px] pl-2.5 pr-6 py-1 rounded-full border cursor-pointer outline-none transition ${meta.pillCls}`}
                          >
                            <option value="start">Début</option>
                            <option value="task:user">User Task</option>
                            <option value="task:service">Service Task</option>
                            <option value="task:manual">Manual Task</option>
                            <option value="task:business_rule">Rule Task</option>
                            <option value="decision:xor">Gateway XOR (×)</option>
                            <option value="decision:or">Gateway OR (○)</option>
                            <option value="decision:and">Gateway AND (+)</option>
                            <option value="decision:event_based">Gateway Événement (◎)</option>
                            <option value="data">Données</option>
                            <option value="subprocess">Sous-proc.</option>
                            <option value="end">Fin</option>
                          </select>
                          <span className="pointer-events-none absolute right-2 text-[9px] opacity-60">
                            ▼
                          </span>
                        </div>
                      </td>

                      {/* 4. Responsable (Rôle) ou Question courte */}
                      <td className="py-2.5 px-3">
                        {isEnd ? (
                          <span className="text-slate-300 px-2">—</span>
                        ) : (
                          <input
                            type="text"
                            value={node.ownerRole || ''}
                            onChange={(e) =>
                              onUpdateNode({
                                ...node,
                                ownerRole: e.target.value,
                              })
                            }
                            placeholder={
                              isDecision
                                ? 'Question courte (ex: Conforme ?)'
                                : 'Ex: Gestionnaire Back-Office'
                            }
                            className="w-full text-xs font-medium text-slate-700 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#1F93FF] focus:bg-white rounded-lg px-2 py-1.5 outline-none transition"
                          />
                        )}
                      </td>

                      {/* 4b. Durée (min / h / j) */}
                      <td className="py-2.5 px-1.5 text-center">
                        {isStart || isEnd ? (
                          <span className="text-slate-300">—</span>
                        ) : (() => {
                          const rawMinutes =
                            typeof node.estimatedDurationMinutes === 'number'
                              ? node.estimatedDurationMinutes
                              : 0;
                          const inferred = splitDurationForInput(rawMinutes);
                          const activeUnit =
                            durationUnitByNodeId[node.id] ?? inferred.unit;
                          const displayValue =
                            activeUnit === 'j'
                              ? Math.round(rawMinutes / 1440)
                              : activeUnit === 'h'
                              ? Math.round(rawMinutes / 60)
                              : rawMinutes;

                          return (
                            <div
                              className="inline-flex items-center justify-center bg-slate-50 hover:bg-white border border-slate-200/80 focus-within:border-[#1F93FF] focus-within:bg-white rounded-lg px-1.5 py-1 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={displayValue}
                                onChange={(e) => {
                                  const parsed = Math.max(
                                    0,
                                    parseInt(e.target.value, 10) || 0
                                  );
                                  onUpdateNode({
                                    ...node,
                                    estimatedDurationMinutes: toDurationMinutes(
                                      parsed,
                                      activeUnit
                                    ),
                                  });
                                }}
                                aria-label={`Durée pour ${node.label || 'cette étape'}`}
                                className="w-10 text-right text-xs font-semibold tabular-nums text-slate-800 bg-transparent outline-none"
                              />
                              <select
                                value={activeUnit}
                                onChange={(e) => {
                                  const nextUnit = e.target.value as DurationUnit;
                                  setDurationUnitByNodeId((prev) => ({
                                    ...prev,
                                    [node.id]: nextUnit,
                                  }));
                                  onUpdateNode({
                                    ...node,
                                    estimatedDurationMinutes: toDurationMinutes(
                                      displayValue,
                                      nextUnit
                                    ),
                                  });
                                }}
                                aria-label={`Unité de durée pour ${node.label || 'cette étape'}`}
                                className="ml-1 text-[10.5px] font-semibold text-slate-500 bg-transparent outline-none cursor-pointer hover:text-[#1F93FF]"
                              >
                                <option value="min">min</option>
                                <option value="h">h</option>
                                <option value="j">j</option>
                              </select>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 5. Règle Métier (RG-*) */}
                      <td className="py-2.5 px-2.5">
                        {isStart || isEnd ? (
                          <span className="text-slate-300 px-2">—</span>
                        ) : (
                          <select
                            value={firstRuleId}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__new__') {
                                onQuickCreateRuleForNode(node.id);
                                return;
                              }
                              onUpdateNode({
                                ...node,
                                ruleIds: val ? [val] : [],
                              });
                            }}
                            aria-label="Règle de gestion liée"
                            className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition ${
                              firstRuleId
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            <option value="">Aucune</option>
                            {rules.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.id}
                              </option>
                            ))}
                            <option value="__new__">+ Créer RG...</option>
                          </select>
                        )}
                      </td>

                      {/* 6. Étape Suivante (Flux Nominal) — Green pill ONLY on Decision rows */}
                      <td className="py-2.5 px-3">
                        {isEnd ? (
                          <span className="text-slate-300 px-2">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {isDecision && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white shadow-2xs shrink-0">
                                CONFORME / OUI →
                              </span>
                            )}
                            <select
                              value={nominalEdge?.targetNodeId || ''}
                              onChange={(e) => {
                                const targetId = e.target.value;
                                if (targetId === '__create_next__') {
                                  const newId = onAddNodeWithEdge(
                                    'task',
                                    node.id,
                                    isDecision ? 'Complet et conforme' : '',
                                    'nominal'
                                  );
                                  setSelectedRowId(newId);
                                  return;
                                }
                                onSetEdgeConnection(
                                  node.id,
                                  'nominal',
                                  targetId || null,
                                  isDecision
                                    ? nominalEdge?.label || 'Complet et conforme'
                                    : ''
                                );
                              }}
                              aria-label="Étape suivante nominale"
                              className={`w-full text-[11.5px] font-semibold rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer truncate transition ${
                                isDecision
                                  ? 'text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200'
                                  : 'text-slate-700 bg-slate-50/90 hover:bg-slate-100 border-slate-200/90'
                              }`}
                            >
                              <option value="">— Choisir l'étape suivante —</option>
                              {orderedNodes
                                .filter((n) => n.id !== node.id)
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {rowNumberById.get(n.id)}. {n.label}
                                  </option>
                                ))}
                              <option value="__create_next__">
                                + Créer nouvelle étape...
                              </option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* 7. Branche d'Exception (Uniquement sur les lignes Décision ?) */}
                      <td className="py-2.5 px-3">
                        {!isDecision ? (
                          <span className="text-slate-300 px-2">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {editingExcNodeId === node.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingExcDraft}
                                onChange={(e) => setEditingExcDraft(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => {
                                  const trimmed = editingExcDraft.trim();
                                  if (trimmed && exceptionEdge?.targetNodeId) {
                                    onSetEdgeConnection(
                                      node.id,
                                      'exception',
                                      exceptionEdge.targetNodeId,
                                      trimmed
                                    );
                                  }
                                  setEditingExcNodeId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.currentTarget as HTMLInputElement).blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingExcNodeId(null);
                                  }
                                }}
                                placeholder="Ex: > 3 000 €, Refus..."
                                aria-label="Condition d'exception personnalisée"
                                className="w-[118px] text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-amber-200 shrink-0"
                              />
                            ) : (
                              <select
                                value={excSelectValue}
                                onChange={(e) => {
                                  const newLbl = e.target.value;
                                  if (newLbl === '__custom_exc__') {
                                    setEditingExcNodeId(node.id);
                                    setEditingExcDraft(exceptionEdge?.label || '');
                                    return;
                                  }
                                  if (exceptionEdge?.targetNodeId) {
                                    onSetEdgeConnection(
                                      node.id,
                                      'exception',
                                      exceptionEdge.targetNodeId,
                                      newLbl
                                    );
                                  }
                                }}
                                aria-label="Condition d'exception"
                                title={excSelectValue}
                                className={`max-w-[126px] truncate text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full outline-none cursor-pointer shrink-0 shadow-2xs ${
                                  isRedExc
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {isCustomExcValue && (
                                  <option
                                    value={excSelectValue}
                                    className="bg-white text-slate-900"
                                  >
                                    {formatExceptionPillOption(excSelectValue)}
                                  </option>
                                )}
                                {GENERIC_EXCEPTION_PRESETS.map((preset) => (
                                  <option
                                    key={preset.value}
                                    value={preset.value}
                                    className="bg-white text-slate-900"
                                  >
                                    {preset.label}
                                  </option>
                                ))}
                                <option
                                  value="__custom_exc__"
                                  className="bg-white text-indigo-700 font-bold"
                                >
                                  ✎ Personnaliser…
                                </option>
                              </select>
                            )}

                            <select
                              value={exceptionEdge?.targetNodeId || ''}
                              onChange={(e) => {
                                const targetId = e.target.value;
                                if (targetId === '__create_exc__') {
                                  const newId = onAddNodeWithEdge(
                                    'task',
                                    node.id,
                                    excSelectValue,
                                    'exception'
                                  );
                                  setSelectedRowId(newId);
                                  return;
                                }
                                onSetEdgeConnection(
                                  node.id,
                                  'exception',
                                  targetId || null,
                                  exceptionEdge?.label || excSelectValue
                                );
                              }}
                              aria-label="Étape cible d'exception"
                              className={`w-full text-[11.5px] font-semibold rounded-lg px-2 py-1.5 border outline-none cursor-pointer truncate ${
                                exceptionEdge?.targetNodeId
                                  ? isRedExc
                                    ? 'bg-rose-50 text-rose-950 border-rose-200'
                                    : 'bg-amber-50 text-amber-950 border-amber-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              <option value="">— Aucune exception —</option>
                              {orderedNodes
                                .filter((n) => n.id !== node.id)
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {rowNumberById.get(n.id)}. {n.label}
                                  </option>
                                ))}
                              <option value="__create_exc__">
                                + Créer étape d'exception...
                              </option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* 8. Actions: Notion Side-Peek Ouvrir Button + Delete */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRowId(node.id);
                              onSelectNodeInInspector(node.id);
                            }}
                            className="apple-pressable inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold text-white bg-[#1F93FF] hover:bg-[#007BE5] shadow-2xs transition cursor-pointer"
                            title="Ouvrir la fiche complémentaire dans le volet latéral (Description, Application SI, Durée, I/O)"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Ouvrir</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteNode(node);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                            title={`Supprimer l'étape N°${idx + 1} (${node.label})`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Clean Bottom Quick-Add & Delete Row Bar */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newId = onAddNodeWithEdge(
                    'task',
                    lastNonEndNode?.id,
                    '',
                    'nominal'
                  );
                  setSelectedRowId(newId);
                }}
                className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/90 shadow-2xs text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#1F93FF]" />
                <span>Ajouter une étape (Tâche)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const newId = onAddNodeWithEdge(
                    'decision',
                    lastNonEndNode?.id,
                    '',
                    'nominal'
                  );
                  setSelectedRowId(newId);
                }}
                className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/90 text-xs font-bold transition cursor-pointer"
              >
                <GitFork className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Ajouter une Décision (Si / Alors)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const newId = onAddNodeWithEdge(
                    'end',
                    lastNonEndNode?.id,
                    '',
                    'nominal'
                  );
                  setSelectedRowId(newId);
                }}
                className="apple-pressable inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/90 text-xs font-bold transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Ajouter une Fin</span>
              </button>
            </div>

            {selectedRowNode && (
              <button
                type="button"
                onClick={() => setPendingDeleteNode(selectedRowNode)}
                className="apple-pressable inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  Supprimer la ligne N°{rowNumberById.get(selectedRowNode.id)} («{' '}
                  {selectedRowNode.label} »)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Apple HIG Confirmation Modal before deleting a step */}
      {pendingDeleteNode && (
        <div
          className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPendingDeleteNode(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-step-dialog-title"
            className="w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.22)] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3
                  id="delete-step-dialog-title"
                  className="text-sm font-semibold text-[#1D1D1F] tracking-tight"
                >
                  Supprimer l&apos;étape N°
                  {rowNumberById.get(pendingDeleteNode.id) ?? '?'} ?
                </h3>
                <p className="text-xs text-[#6E6E73] leading-relaxed">
                  L&apos;étape{' '}
                  <span className="font-semibold text-[#1D1D1F]">
                    « {pendingDeleteNode.label || 'Sans nom'} »
                  </span>{' '}
                  ainsi que ses liaisons associées seront retirées du processus.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteNode(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-[#F5F5F7] hover:bg-black/[0.08] border border-black/[0.06] transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = pendingDeleteNode.id;
                  setPendingDeleteNode(null);
                  if (selectedRowId === idToDelete) {
                    setSelectedRowId(null);
                  }
                  onDeleteNode(idToDelete);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#FF3B30] hover:bg-[#E03127] shadow-2xs transition cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
