import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';
import {
  Map as MapIcon,
  Sparkles,
  CheckSquare,
  GitFork,
  Database,
  CheckCircle2,
  ShieldCheck,
  Play,
  Maximize2,
  MessageSquare,
  FolderKanban,
  Calendar,
  BookOpen,
  FlaskConical,
  Bot,
  Table2,
  Workflow,
  Plus,
} from 'lucide-react';
import {
  Process,
  ProcessNode,
  ProcessEdge,
  BusinessRule,
  NodeType,
  ValidationResult,
  SimulationResult,
  AnalyticsResult,
  TraceabilityResult,
  TestCase,
  Category,
  TagItem,
  Project,
  Team,
  Collaborator,
  ApprovalGate,
  Conversation,
  Meeting,
  ProcessSummary,
  ProcessVersionSummary,
} from './types/process';
import * as api from './services/api';
import { nodeTypes } from './components/nodes/nodeTypes';
import { Navbar, StudioWorkbenchTab } from './components/Navbar';
import { AuthLoginScreen } from './components/AuthLoginScreen';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StudioTableBuilder } from './components/StudioTableBuilder';
import { CurvedDiagram3D } from './components/CurvedDiagram3D';
import { AnimatedFinanceDiagram } from './components/AnimatedFinanceDiagram';
import { StudioProjectGallery } from './components/StudioProjectGallery';
import { runMorphTransition } from './utils/morphTransition';
import {
  AuditWorkbenchPanel,
  SimulateWorkbenchPanel,
  RecetteWorkbenchPanel,
} from './components/StudioWorkbenchViews';
import { AnalysisDrawer } from './components/AnalysisDrawer';
import { ProcessListModal } from './components/modals/ProcessListModal';
import { NewProcessModal } from './components/modals/NewProcessModal';
import { ImportExportModal } from './components/modals/ImportExportModal';
import { PublishVersionModal } from './components/modals/PublishVersionModal';
import { VersionHistoryModal } from './components/modals/VersionHistoryModal';
import { RuleModal } from './components/modals/RuleModal';
import { RulesCatalogModal } from './components/modals/RulesCatalogModal';
import { DataDocumentsModal } from './components/modals/DataDocumentsModal';
import { ConversationSidebarFilter } from './components/layout/AppSidebar';
import { ConversationList } from './components/conversations/ConversationList';
import { ConversationThread } from './components/conversations/ConversationThread';
import { ConversationDetailsPanel } from './components/conversations/ConversationDetailsPanel';
import { AIAgentBuilderModal } from './components/modals/AIAgentBuilderModal';
import { MeetingSchedulerModal } from './components/modals/MeetingSchedulerModal';
import { AgendaView } from './components/agenda/AgendaView';
import { ProjectsWorkspaceView } from './components/projects/ProjectsWorkspaceView';
import { TeamsDirectoryView } from './components/teams/TeamsDirectoryView';
import { SettingsAndTagsView } from './components/settings/SettingsAndTagsView';
import { MacAppTargetId } from './components/launchpad/MacAppIcon';
import { MacTopBar } from './components/launchpad/MacTopBar';
import { MacLaunchpadView } from './components/launchpad/MacLaunchpadView';
import { MacDock } from './components/launchpad/MacDock';
import { computeAuditSeverityByNode } from './utils/processAudit';

// Helper to style React Flow edges with Proposition 3 (Apple × Linear) orthogonal routing & solid semantic pills
function buildStyledEdge(
  e: { id: string; source: string; target: string; label?: string },
  sourceNode?: { position: { x: number; y: number }; type?: string },
  targetNode?: { position: { x: number; y: number } }
): Edge {
  const rawLabel = (e.label || '').trim();
  const lower = rawLabel.toLowerCase();
  const isFromDecision = sourceNode?.type === 'decision';

  let strokeColor = '#94a3b8';
  let textFill = '#ffffff';
  let bgFill = '#22c55e';
  let bgStroke = '#16a34a';
  let displayLabel: string | undefined = undefined;

  if (isFromDecision && rawLabel) {
    const hasOppositionRejection =
      !lower.includes('sans opposition') && lower.includes('opposition');

    // 1. Rejection / Negative branch -> Solid Red Pill
    if (
      lower.includes('rejet') ||
      lower.includes('refus') ||
      lower.includes('inéligible') ||
      lower.includes('ineligible') ||
      hasOppositionRejection ||
      lower === 'non' ||
      lower.startsWith('non ')
    ) {
      bgFill = '#dc2626';
      bgStroke = '#b91c1c';
      textFill = '#ffffff';
      if (lower.includes('inéligible') || hasOppositionRejection || lower.includes('rejet')) {
        displayLabel = 'REJET';
      } else if (lower.includes('refus') || lower.includes('non')) {
        displayLabel = 'NON';
      } else {
        displayLabel = rawLabel.toUpperCase();
      }
    }
    // 2. Incomplete / Delay / Escalation branch -> Solid Amber Pill
    else if (
      lower.includes('incomplet') ||
      lower.includes('expiré') ||
      lower.includes('expire') ||
      lower.includes('caduc') ||
      lower.includes('forclusion') ||
      lower.includes('supérieur') ||
      lower.includes('superieur') ||
      lower.includes('attente')
    ) {
      bgFill = '#d97706';
      bgStroke = '#b45309';
      textFill = '#ffffff';
      if (lower.includes('incomplet')) {
        displayLabel = 'INCOMPLET';
      } else if (lower.includes('expiré') || lower.includes('expire')) {
        displayLabel = 'EXPIRÉ';
      } else if (lower.includes('supérieur') || lower.includes('superieur')) {
        displayLabel = '≥ 50K€';
      } else {
        displayLabel = rawLabel.toUpperCase();
      }
    }
    // 3. Nominal / Positive branch -> Solid Green Pill
    else {
      bgFill = '#22c55e';
      bgStroke = '#16a34a';
      textFill = '#ffffff';
      if (lower.includes('conforme') || lower.includes('complet')) {
        displayLabel = 'CONFORME';
      } else if (
        lower.includes('éligible') ||
        lower.includes('eligible') ||
        lower.includes('oui') ||
        lower.includes('valide')
      ) {
        displayLabel = 'OUI';
      } else if (lower.includes('inférieur') || lower.includes('inferieur')) {
        displayLabel = 'OUI';
      } else if (lower.includes('reçues') || lower.includes('recues')) {
        displayLabel = 'REÇUES';
      } else {
        displayLabel =
          rawLabel.length > 14 ? rawLabel.slice(0, 14).toUpperCase() : rawLabel.toUpperCase();
      }
    }
  }

  let sourceHandle: string | undefined = undefined;
  if (sourceNode && targetNode && sourceNode.type === 'decision') {
    const dy = targetNode.position.y - sourceNode.position.y;
    if (dy > 80) {
      sourceHandle = 'bottom';
    } else if (dy < -80) {
      sourceHandle = 'top';
    }
  }

  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle,
    type: 'smoothstep',
    label: displayLabel,
    data: { rawLabel },
    animated: false,
    className: '',
    style: { stroke: strokeColor, strokeWidth: 1.8 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: strokeColor,
    },
    labelStyle: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.04em',
      fill: textFill,
    },
    labelBgStyle: {
      fill: bgFill,
      stroke: bgStroke,
      strokeWidth: 1,
      fillOpacity: 1,
    },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 999,
  };
}

const DEMO_PROPOSITION3_COORDS: Record<string, { x: number; y: number }> = {
  node_start: { x: 60, y: 315 },
  node_controle_pieces: { x: 300, y: 300 },
  node_dec_complet: { x: 600, y: 300 },
  node_relance_pieces: { x: 760, y: 82 },
  node_dec_delai: { x: 1060, y: 82 },
  node_cloture_caduc: { x: 1380, y: 82 },
  node_end_caduc: { x: 1680, y: 97 },
  node_verif_eligibilite: { x: 936, y: 300 },
  node_dec_eligible: { x: 1236, y: 300 },
  node_rejet_motif: { x: 1396, y: 518 },
  node_end_rejet: { x: 1696, y: 533 },
  node_calcul_fiscal: { x: 1556, y: 300 },
  node_dec_seuil: { x: 1856, y: 300 },
  node_double_validation: { x: 2016, y: 518 },
  node_dec_validation: { x: 2336, y: 518 },
  node_ordonnancement: { x: 2656, y: 300 },
  node_end_succes: { x: 2956, y: 315 },
};

// Deterministic Proposition 3 auto-layout: Straight horizontal nominal line + 90° upper/lower exception lanes
function computeAutoLayoutPositions(
  nodes: { id: string; type?: string; position: { x: number; y: number } }[],
  edges: { source: string; target: string; label?: string }[]
): Record<string, { x: number; y: number }> {
  const isDemo =
    nodes.some((n) => n.id === 'node_controle_pieces') &&
    nodes.some((n) => n.id === 'node_dec_complet');
  const result: Record<string, { x: number; y: number }> = {};

  if (isDemo) {
    // 1. Place canonical demo nodes at their Proposition 3 coordinates
    nodes.forEach((n) => {
      if (DEMO_PROPOSITION3_COORDS[n.id]) {
        result[n.id] = { ...DEMO_PROPOSITION3_COORDS[n.id] };
      }
    });

    // 2. Place any newly added / custom nodes relative to their connected source node
    const customNodes = nodes.filter((n) => !DEMO_PROPOSITION3_COORDS[n.id]);
    customNodes.forEach((n, idx) => {
      const inEdge = edges.find((e) => e.target === n.id);
      const srcPos = inEdge ? result[inEdge.source] : undefined;
      if (srcPos) {
        const lbl = (inEdge?.label || '').toLowerCase();
        const isWarning =
          lbl.includes('incomplet') ||
          lbl.includes('relance') ||
          lbl.includes('attente') ||
          lbl.includes('expiré');
        const isNegative =
          lbl.includes('rejet') ||
          lbl.includes('refus') ||
          lbl.includes('non') ||
          lbl.includes('inéligible') ||
          (!lbl.includes('sans opposition') && lbl.includes('opposition')) ||
          lbl.includes('supérieur');

        const baseY = isWarning
          ? 80
          : isNegative
          ? 520
          : srcPos.y === 308
          ? 300
          : srcPos.y;
        const targetY = n.type === 'end' ? baseY + 4 : baseY;
        const targetX = srcPos.x + 320;

        // Shift any existing downstream nodes on the same lane right by +320 so there is zero overlap
        Object.keys(result).forEach((existingId) => {
          const pos = result[existingId];
          if (
            existingId !== n.id &&
            Math.abs(pos.y - baseY) <= 25 &&
            pos.x >= targetX - 40
          ) {
            result[existingId] = { x: pos.x + 320, y: pos.y };
          }
        });

        result[n.id] = { x: targetX, y: targetY };
      } else {
        const maxNonEndX = Math.max(
          2460,
          ...nodes
            .filter((item) => item.id !== n.id && item.type !== 'end' && result[item.id])
            .map((item) => result[item.id].x)
        );
        const targetX = maxNonEndX + 320 + idx * 320;
        const targetY = n.type === 'end' ? 304 : 300;
        result[n.id] = { x: targetX, y: targetY };
      }
    });
    return result;
  }

  const outgoing: Record<string, { target: string; label: string }[]> = {};
  const inDegree: Record<string, number> = {};
  nodes.forEach((n) => {
    outgoing[n.id] = [];
    inDegree[n.id] = 0;
  });
  edges.forEach((e) => {
    if (outgoing[e.source] && inDegree[e.target] !== undefined) {
      outgoing[e.source].push({ target: e.target, label: (e.label || '').toLowerCase() });
      inDegree[e.target] += 1;
    }
  });

  // Assign each node to a lane: 0 = center nominal (y=300), -1 = upper branch (y=80), +1 = lower branch (y=520)
  const ranks: Record<string, number> = {};
  const lanes: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: string[] = [];

  const startNodes = nodes.filter((n) => n.type === 'start' || inDegree[n.id] === 0);
  if (startNodes.length > 0) {
    startNodes.forEach((n, idx) => {
      ranks[n.id] = 0;
      lanes[n.id] = idx === 0 ? 0 : idx % 2 === 1 ? -1 : 1;
      visited.add(n.id);
      queue.push(n.id);
    });
  } else if (nodes.length > 0) {
    ranks[nodes[0].id] = 0;
    lanes[nodes[0].id] = 0;
    visited.add(nodes[0].id);
    queue.push(nodes[0].id);
  }

  let decisionBranchToggle = -1;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = ranks[curr] ?? 0;
    const currLane = lanes[curr] ?? 0;
    const outs = outgoing[curr] || [];

    outs.forEach((edgeObj, idx) => {
      const next = edgeObj.target;
      if (visited.has(next)) return;
      visited.add(next);
      ranks[next] = currRank + 1;

      const lbl = edgeObj.label;
      if (outs.length === 1) {
        lanes[next] = currLane;
      } else {
        // Multi-branch decision: keep positive branch on current lane, send exceptions to top (-1) or bottom (+1)
        const isNegative =
          lbl.includes('rejet') ||
          lbl.includes('refus') ||
          lbl.includes('non') ||
          lbl.includes('inéligible') ||
          (!lbl.includes('sans opposition') && lbl.includes('opposition'));
        const isWarning =
          lbl.includes('incomplet') ||
          lbl.includes('relance') ||
          lbl.includes('attente') ||
          lbl.includes('expiré');

        if (isWarning) {
          lanes[next] = -1;
        } else if (isNegative) {
          lanes[next] = 1;
        } else if (idx === 0) {
          lanes[next] = currLane;
        } else {
          lanes[next] = decisionBranchToggle;
          decisionBranchToggle = decisionBranchToggle === -1 ? 1 : -1;
        }
      }
      queue.push(next);
    });
  }

  nodes.forEach((n, i) => {
    if (ranks[n.id] === undefined) {
      ranks[n.id] = i;
      lanes[n.id] = 0;
    }
  });

  // Push any convergent main-axis node to the right of side-branch predecessors (excluding return loops to early ranks)
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    edges.forEach((e) => {
      const sr = ranks[e.source];
      const tr = ranks[e.target];
      if (sr === undefined || tr === undefined) return;
      const isForwardMainRejoin =
        lanes[e.target] === 0 && lanes[e.source] !== 0 && sr - tr <= 2 && tr <= sr;
      const isMainCollision =
        lanes[e.target] === 0 && lanes[e.source] === 0 && tr === sr;
      if (isForwardMainRejoin || isMainCollision) {
        ranks[e.target] = sr + 1;
        changed = true;
      }
    });
    if (!changed) break;
  }

  // Resolve collisions if two nodes share the exact same (rank, lane)
  const occupied = new Set<string>();
  nodes.forEach((n) => {
    let r = ranks[n.id];
    let l = lanes[n.id];
    while (occupied.has(`${r}:${l}`)) {
      r += 1;
    }
    occupied.add(`${r}:${l}`);
    const baseY = l === 0 ? 300 : l < 0 ? 80 : 520;
    const yAdjust = n.type === 'start' ? 8 : n.type === 'end' ? 4 : 0;
    result[n.id] = {
      x: 60 + r * 375,
      y: baseY + yAdjust,
    };
  });

  return result;
}

const FlowCanvas: React.FC = () => {
  const { fitView, setCenter } = useReactFlow();

  // Global SaaS Workspace Navigation State (Opens on macOS Central Launchpad by default)
  const [activeSection, setActiveSection] = useState<MacAppTargetId>('launchpad');
  const [conversationFilter, setConversationFilter] = useState<ConversationSidebarFilter>({
    mode: 'all',
  });

  // SaaS B2B Entities State
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<Collaborator | null>(null);
  const [activeCollaborator, setActiveCollaborator] = useState<Collaborator | null>(null);
  const [approvals, setApprovals] = useState<ApprovalGate[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Global SaaS Modals State
  const [isAgentBuilderOpen, setIsAgentBuilderOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<Collaborator | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  // Studio Core State
  const [currentProcess, setCurrentProcess] = useState<Process | null>(null);
  const [processesList, setProcessesList] = useState<ProcessSummary[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Studio Layout Panels State
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('validation');
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [studioMode, setStudioMode] = useState<'table' | 'split' | 'diagram'>('split');
  const [diagramStyle, setDiagramStyle] = useState<'spatial3d' | 'animated_finance'>('spatial3d');
  const [studioShowGallery, setStudioShowGallery] = useState<boolean>(false);
  const [activeMorphProjectId, setActiveMorphProjectId] = useState<string | null>(null);

  const handleNavigateSection = useCallback((target: MacAppTargetId) => {
    if (target === 'studio') {
      setStudioShowGallery(true);
    }
    setActiveSection(target);
  }, []);
  const [workbenchTab, setWorkbenchTab] = useState<StudioWorkbenchTab>('model');
  const [auditFilterTab, setAuditFilterTab] = useState<'all' | 'bloquant' | 'conformite'>('all');
  const [simDecisions, setSimDecisions] = useState<Record<string, string>>({});
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [diagram3dZoomTrigger, setDiagram3dZoomTrigger] = useState(0);
  const [diagram3dFitTrigger, setDiagram3dFitTrigger] = useState(0);

  // Studio Modals state
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [currentProcessVersions, setCurrentProcessVersions] = useState<ProcessVersionSummary[]>([]);
  const [publishModalMode, setPublishModalMode] = useState<'close_draft' | 'save_published' | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isPublishingVersion, setIsPublishingVersion] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isRulesCatalogOpen, setIsRulesCatalogOpen] = useState(false);
  const [isDataDocumentsOpen, setIsDataDocumentsOpen] = useState(false);
  const [dataDocsInitialStepId, setDataDocsInitialStepId] = useState<string | null>(null);
  const [ruleToEdit, setRuleToEdit] = useState<BusinessRule | null>(null);
  const [pendingRuleTargetNodeId, setPendingRuleTargetNodeId] = useState<string | null>(null);

  // Analysis results
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [traceabilityResult, setTraceabilityResult] = useState<TraceabilityResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);

  // React Flow Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Studio Undo / Redo History Stack (tracks nodes + edges edits per active process)
  const historyPastRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const historyFutureRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const lastHistorySnapRef = useRef<{
    processId: string;
    key: string;
    nodes: Node[];
    edges: Edge[];
  } | null>(null);
  const isRestoringHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const serializeGraphSnapshot = useCallback((ns: Node[], es: Edge[]) => {
    const compactNodes = ns.map((n) => ({
      id: n.id,
      type: n.type,
      x: Math.round(n.position?.x || 0),
      y: Math.round(n.position?.y || 0),
      label: n.data?.label,
      ownerRole: n.data?.ownerRole,
      application: n.data?.application,
      duration: n.data?.estimatedDurationMinutes,
      mode: n.data?.executionMode,
      rules: n.data?.ruleIds,
      desc: n.data?.description,
    }));
    const compactEdges = es.map((e) => ({
      id: e.id,
      s: e.source,
      t: e.target,
      l: e.label,
    }));
    return JSON.stringify({ n: compactNodes, e: compactEdges });
  }, []);

  useEffect(() => {
    const pid = currentProcess?.id;
    if (!pid) return;
    const key = serializeGraphSnapshot(nodes, edges);
    const prev = lastHistorySnapRef.current;

    if (!prev || prev.processId !== pid) {
      historyPastRef.current = [];
      historyFutureRef.current = [];
      lastHistorySnapRef.current = { processId: pid, key, nodes, edges };
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      lastHistorySnapRef.current = { processId: pid, key, nodes, edges };
      return;
    }

    if (prev.key !== key) {
      historyPastRef.current = [
        ...historyPastRef.current.slice(-49),
        { nodes: prev.nodes, edges: prev.edges },
      ];
      historyFutureRef.current = [];
      lastHistorySnapRef.current = { processId: pid, key, nodes, edges };
      setCanUndo(historyPastRef.current.length > 0);
      setCanRedo(false);
    }
  }, [currentProcess?.id, nodes, edges, serializeGraphSnapshot]);

  const handleUndo = useCallback(() => {
    if (historyPastRef.current.length === 0 || !lastHistorySnapRef.current) return;
    const previous = historyPastRef.current[historyPastRef.current.length - 1];
    historyPastRef.current = historyPastRef.current.slice(0, -1);
    historyFutureRef.current = [
      ...historyFutureRef.current,
      {
        nodes: lastHistorySnapRef.current.nodes,
        edges: lastHistorySnapRef.current.edges,
      },
    ];
    isRestoringHistoryRef.current = true;
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHasUnsavedChanges(true);
    setCanUndo(historyPastRef.current.length > 0);
    setCanRedo(historyFutureRef.current.length > 0);
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyFutureRef.current.length === 0 || !lastHistorySnapRef.current) return;
    const next = historyFutureRef.current[historyFutureRef.current.length - 1];
    historyFutureRef.current = historyFutureRef.current.slice(0, -1);
    historyPastRef.current = [
      ...historyPastRef.current,
      {
        nodes: lastHistorySnapRef.current.nodes,
        edges: lastHistorySnapRef.current.edges,
      },
    ];
    isRestoringHistoryRef.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    setHasUnsavedChanges(true);
    setCanUndo(historyPastRef.current.length > 0);
    setCanRedo(historyFutureRef.current.length > 0);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeSection !== 'studio' || studioShowGallery) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (historyPastRef.current.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        if (historyFutureRef.current.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSection, studioShowGallery, handleUndo, handleRedo]);

  // Load all SaaS B2B data
  const refreshSaaSEntities = useCallback(async () => {
    try {
      const [cats, tgs, projs, tms, collabs, apps, convs, meets, procs] = await Promise.all([
        api.fetchCategories(),
        api.fetchTags(),
        api.fetchProjects(),
        api.fetchTeams(),
        api.fetchCollaborators(),
        api.fetchApprovals(),
        api.fetchConversations(),
        api.fetchMeetings(),
        api.fetchProcesses(),
      ]);
      const normalizedCollabs = collabs.map((c) => {
        if (!c.isAi) return c;
        const cleanName = c.name.replace(/^[^\p{L}\p{N}]+/gu, '').trim() || c.name;
        const cleanRole = (c.roleTitle || '').replace(/Notes Privées/gi, 'Synthèses');
        const cleanPrompt = (c.systemPrompt || '')
          .replace(
            /extrais les décisions clés sous forme de Note Privée/gi,
            "extrais les décisions clés et points d'action"
          )
          .replace(/Note Privée/gi, 'Synthèse');
        return {
          ...c,
          name: cleanName,
          roleTitle: cleanRole,
          systemPrompt: cleanPrompt,
        };
      });

      setCategories(cats);
      setTags(tgs);
      setProjects(projs);
      setTeams(tms);
      setCollaborators(normalizedCollabs);
      setApprovals(apps);
      setConversations(convs);
      setMeetings(meets);
      setProcessesList(procs);

      const humans = normalizedCollabs.filter((c) => !c.isAi);
      if (humans.length > 0) {
        setActiveCollaborator((prev) =>
          prev ? normalizedCollabs.find((c) => c.id === prev.id) || prev : humans[0]
        );
      }
      if (convs.length > 0) {
        setSelectedConversationId((prev) =>
          prev && convs.some((c) => c.id === prev) ? prev : convs[0].id
        );
      }
      if (projs.length > 0) {
        setSelectedProjectId((prev) => prev || projs[0].id);
      }
    } catch (err) {
      console.error('Failed to load SaaS entities:', err);
    }
  }, []);

  // Load process by ID into Studio
  const loadProcessById = useCallback(
    async (id: string, focusNodeId?: string) => {
      try {
        const p = await api.fetchProcess(id);
        setCurrentProcess(p);
        api
          .fetchProcessVersions(id)
          .then(setCurrentProcessVersions)
          .catch(() => setCurrentProcessVersions([]));
        setTestCases(p.testCases || []);
        setHasUnsavedChanges(false);
        setSaveError(null);
        setValidationResult(null);
        setSimulationResult(null);
        setTraceabilityResult(null);
        setAnalyticsResult(null);
        setSelectedNodeId(focusNodeId || null);
        setSelectedEdgeId(null);
        setInspectorOpen(Boolean(focusNodeId));

        const isDemoProcess =
          p.nodes.some((n) => n.id === 'node_controle_pieces') &&
          p.nodes.some((n) => n.id === 'node_dec_complet');

        const computedPositions = isDemoProcess
          ? computeAutoLayoutPositions(
              p.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position || { x: 100, y: 100 },
              })),
              p.edges.map((e) => ({
                source: e.sourceNodeId,
                target: e.targetNodeId,
                label: e.label || undefined,
              }))
            )
          : {};

        const rawRfNodes: Node[] = p.nodes.map((n) => {
          const pos =
            isDemoProcess && computedPositions[n.id]
              ? { ...computedPositions[n.id] }
              : n.position || { x: 100, y: 100 };
          return {
            id: n.id,
            type: n.type,
            position: pos,
            data: {
              ...n,
              position: pos,
              isSimulatedActive: false,
              hasFinding: undefined,
            },
          };
        });

        // Sort canonical demo nodes into their 1..13 sequence while keeping any user-added steps in their exact saved sequence before 'end' nodes
        const startNodes = rawRfNodes.filter((n) => n.type === 'start');
        const middleNodes = rawRfNodes
          .filter((n) => n.type !== 'start' && n.type !== 'end')
          .sort((a, b) => {
            const aIsDemo = Boolean(DEMO_PROPOSITION3_COORDS[a.id]);
            const bIsDemo = Boolean(DEMO_PROPOSITION3_COORDS[b.id]);
            if (aIsDemo && bIsDemo) {
              const ax = a.position?.x ?? 0;
              const bx = b.position?.x ?? 0;
              if (Math.abs(ax - bx) > 40) return ax - bx;
              return (a.position?.y ?? 0) - (b.position?.y ?? 0);
            }
            return 0;
          });
        const endNodes = rawRfNodes.filter((n) => n.type === 'end');
        const rfNodes: Node[] = [...startNodes, ...middleNodes, ...endNodes];

        const nodeMap = new Map(rfNodes.map((n) => [n.id, n]));
        const rfEdges: Edge[] = p.edges.map((e) =>
          buildStyledEdge(
            {
              id: e.id,
              source: e.sourceNodeId,
              target: e.targetNodeId,
              label: e.label || undefined,
            },
            nodeMap.get(e.sourceNodeId),
            nodeMap.get(e.targetNodeId)
          )
        );

        runMorphTransition(() => {
          setNodes(rfNodes);
          setEdges(rfEdges);
        });

        setTimeout(() => {
          if (focusNodeId) {
            const target = rfNodes.find((n) => n.id === focusNodeId);
            if (target) {
              setCenter(target.position.x + 110, target.position.y + 45, {
                zoom: 1.15,
                duration: 600,
              });
              return;
            }
          }
          fitView({ padding: 0.22, duration: 400 });
        }, 120);
      } catch (err: any) {
        console.error('Failed to load process', err);
        setSaveError('Impossible de charger le processus sélectionné.');
      }
    },
    [fitView, setCenter, setNodes, setEdges]
  );

  // Initial load on startup
  useEffect(() => {
    refreshSaaSEntities();
  }, [refreshSaaSEntities]);

  // Active Project & Project-Scoped Processes (Option 1: each project has its own processes)
  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const projectScopedProcesses = useMemo(() => {
    if (!selectedProjectId) return processesList;
    const explicitIds = activeProject?.processIds || [];
    const fromExplicit = explicitIds
      .map((id) => processesList.find((p) => p.id === id))
      .filter((p): p is ProcessSummary => Boolean(p));
    const fromProjectId = processesList.filter(
      (p) =>
        p.projectId === selectedProjectId &&
        !explicitIds.includes(p.id) &&
        !p.name.includes('(Copie)')
    );
    return [...fromExplicit, ...fromProjectId];
  }, [selectedProjectId, activeProject, processesList]);

  // Synchronize currentProcess automatically whenever the active project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    if (projectScopedProcesses.length > 0) {
      const currentBelongsToProject =
        currentProcess &&
        projectScopedProcesses.some((p) => p.id === currentProcess.id);
      if (!currentBelongsToProject) {
        loadProcessById(projectScopedProcesses[0].id);
      }
    } else if (currentProcess !== null) {
      setCurrentProcess(null);
      setNodes([]);
      setEdges([]);
      setTestCases([]);
    }
  }, [
    selectedProjectId,
    projectScopedProcesses,
    currentProcess,
    loadProcessById,
    setNodes,
    setEdges,
  ]);

  const projectScopedCurrentProcess = useMemo(() => {
    if (!currentProcess || !selectedProjectId) return null;
    return projectScopedProcesses.some((p) => p.id === currentProcess.id)
      ? currentProcess
      : null;
  }, [currentProcess, selectedProjectId, projectScopedProcesses]);

  // Jump from Conversation or Project to a specific Studio Process & Node
  const handleJumpToStudioNode = useCallback(
    async (processId: string | null | undefined, nodeId?: string) => {
      setStudioShowGallery(false);
      setActiveSection('studio');
      const targetId =
        processId ||
        projectScopedCurrentProcess?.id ||
        projectScopedProcesses[0]?.id;
      if (targetId) {
        await loadProcessById(targetId, nodeId);
      }
    },
    [projectScopedCurrentProcess, projectScopedProcesses, loadProcessById]
  );

  // Ensure a concrete project is always selected on Conversations so each project has strictly its own exchanges
  useEffect(() => {
    if (activeSection === 'conversations' && !selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [activeSection, selectedProjectId, projects]);

  // Conversations scoped strictly to the active Project (Option A: each project has its own conversations)
  const projectScopedConversations = useMemo(() => {
    const effectiveProjectId = selectedProjectId || projects[0]?.id || null;
    if (!effectiveProjectId) return conversations;
    return conversations.filter((c) => c.projectId === effectiveProjectId);
  }, [conversations, selectedProjectId, projects]);

  // Synchronize selectedConversationId whenever the active project changes
  useEffect(() => {
    if (
      projectScopedConversations.length > 0 &&
      !projectScopedConversations.some((c) => c.id === selectedConversationId)
    ) {
      setSelectedConversationId(projectScopedConversations[0].id);
    } else if (projectScopedConversations.length === 0 && selectedConversationId !== null) {
      setSelectedConversationId(null);
    }
  }, [projectScopedConversations, selectedConversationId]);

  // Start or open direct conversation with an AI Collaborator Agent or Human Collaborator (scoped to active project)
  const handleDirectChatWithCollaborator = useCallback(
    async (target: Collaborator) => {
      setActiveSection('conversations');
      setConversationFilter({ mode: 'all' });

      const existing = projectScopedConversations.find(
        (c) =>
          (target.isAi &&
            c.conversationType === 'direct_ai' &&
            (c.assigneeId === target.id || c.participantIds.includes(target.id))) ||
          (!target.isAi &&
            c.conversationType === 'direct_human' &&
            c.participantIds.includes(target.id))
      );

      if (existing) {
        setSelectedConversationId(existing.id);
        return;
      }

      const created = await api.createConversation({
        title: target.isAi
          ? `${target.name} — Session directe (@${target.handle})`
          : target.name,
        conversationType: target.isAi ? 'direct_ai' : 'direct_human',
        projectId: selectedProjectId,
        processId: currentProcess?.id || null,
        assigneeId: target.id,
        participantIds: [
          ...(activeCollaborator ? [activeCollaborator.id] : []),
          target.id,
        ],
        tags: [],
        initialMessage: target.isAi
          ? `Bonjour @${target.handle}, peux-tu analyser notre processus en cours ?`
          : undefined,
        senderId: activeCollaborator?.id || 'collab-user-main',
      });
      await refreshSaaSEntities();
      setSelectedConversationId(created.id);
    },
    [
      projectScopedConversations,
      selectedProjectId,
      currentProcess,
      activeCollaborator,
      refreshSaaSEntities,
    ]
  );

  // Selected Conversation object (strictly within the active project)
  const selectedConversation = useMemo(
    () => projectScopedConversations.find((c) => c.id === selectedConversationId) || null,
    [projectScopedConversations, selectedConversationId]
  );

  // Auto-Layout handler (✨ Réorganiser)
  const handleAutoLayout = useCallback(() => {
    const newPositions = computeAutoLayoutPositions(
      nodes.map((n) => ({ id: n.id, type: n.type, position: n.position })),
      edges.map((e) => ({
        source: e.source,
        target: e.target,
        label:
          (e.data as any)?.rawLabel ??
          (typeof e.label === 'string' ? e.label : undefined),
      }))
    );

    const updatedNodes = nodes.map((n) => {
      const pos = newPositions[n.id] || n.position;
      return {
        ...n,
        position: pos,
        data: {
          ...n.data,
          position: pos,
        },
      };
    });

    const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));
    const updatedEdges = edges.map((e) =>
      buildStyledEdge(
        {
          id: e.id,
          source: e.source,
          target: e.target,
          label:
            (e.data as any)?.rawLabel ??
            (typeof e.label === 'string' ? e.label : undefined),
        },
        nodeMap.get(e.source),
        nodeMap.get(e.target)
      )
    );

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setHasUnsavedChanges(true);
    setTimeout(() => fitView({ padding: 0.22, duration: 500 }), 60);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const handleNodesChangeWrapped = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      const isMeaningful = changes.some(
        (c: any) => c.type !== 'select' && c.type !== 'dimensions'
      );
      if (isMeaningful) {
        setHasUnsavedChanges(true);
      }
    },
    [onNodesChange]
  );

  const handleEdgesChangeWrapped = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      const isMeaningful = changes.some((c: any) => c.type !== 'select');
      if (isMeaningful) {
        setHasUnsavedChanges(true);
      }
    },
    [onEdgesChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdgeId = `edge-${Date.now()}`;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const newRfEdge: Edge = buildStyledEdge(
        {
          id: newEdgeId,
          source: connection.source,
          target: connection.target,
          label: '',
        },
        sourceNode,
        targetNode
      );
      setEdges((eds) => addEdge(newRfEdge, eds));
      setSelectedEdgeId(newEdgeId);
      setSelectedNodeId(null);
      setInspectorOpen(true);
      setHasUnsavedChanges(true);
    },
    [nodes, setEdges]
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !currentProcess) return null;
    const rfNode = nodes.find((n) => n.id === selectedNodeId);
    if (!rfNode) return null;
    return {
      ...(rfNode.data as unknown as ProcessNode),
      id: rfNode.id,
      position: rfNode.position,
    };
  }, [selectedNodeId, currentProcess, nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    const rfEdge = edges.find((e) => e.id === selectedEdgeId);
    if (!rfEdge) return null;
    return {
      id: rfEdge.id,
      sourceNodeId: rfEdge.source,
      targetNodeId: rfEdge.target,
      label:
        (rfEdge.data as any)?.rawLabel ??
        (typeof rfEdge.label === 'string' ? rfEdge.label : ''),
    };
  }, [selectedEdgeId, edges]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setInspectorOpen(true);
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setInspectorOpen(true);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = `node-${Date.now()}`;
      const labels: Record<NodeType, string> = {
        start: 'Point de départ',
        task: 'Nouvelle activité',
        decision: 'Point de décision',
        data: 'Données / I-O',
        subprocess: 'Sous-processus',
        end: 'Fin de parcours',
      };

      const newNodeData: ProcessNode = {
        id,
        type,
        label: labels[type] || 'Nouvelle étape',
        position: { x: 250 + Math.random() * 80, y: 180 + Math.random() * 80 },
        description: '',
        ownerRole: type === 'task' ? 'Responsable Étape' : '',
        application: '',
        estimatedDurationMinutes: type === 'task' ? 10 : 0,
        executionMode: type === 'task' ? 'manual' : 'automated',
        inputs: [],
        outputs: [],
        controls: [],
        ruleIds: [],
      };

      const newRfNode: Node = {
        id,
        type,
        position: newNodeData.position,
        data: { ...newNodeData },
      };

      setNodes((nds) => [...nds, newRfNode]);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      setInspectorOpen(true);
      setHasUnsavedChanges(true);
    },
    [setNodes]
  );

  const handleQuickAddAfter = useCallback(
    (sourceId: string, type: NodeType) => {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) return;

      const newNodeId = `node-${Date.now()}`;
      const labels: Record<NodeType, string> = {
        start: 'Point de départ',
        task: 'Activité suivante',
        decision: 'Contrôle / Décision',
        data: 'Données / I-O',
        subprocess: 'Sous-processus',
        end: 'Fin de parcours',
      };

      const newPos = {
        x: sourceNode.position.x + 320,
        y: sourceNode.position.y,
      };

      const newNodeData: ProcessNode = {
        id: newNodeId,
        type,
        label: labels[type] || 'Nouvelle étape',
        position: newPos,
        description: '',
        ownerRole: type === 'task' ? 'Équipe Projet' : '',
        application: '',
        estimatedDurationMinutes: type === 'task' ? 10 : 0,
        executionMode: type === 'task' ? 'manual' : 'automated',
        inputs: [],
        outputs: [],
        controls: [],
        ruleIds: [],
      };

      const newRfNode: Node = {
        id: newNodeId,
        type,
        position: newPos,
        data: { ...newNodeData },
      };

      const newEdgeId = `edge-${Date.now()}`;
      const newRfEdge: Edge = buildStyledEdge(
        {
          id: newEdgeId,
          source: sourceId,
          target: newNodeId,
          label: sourceNode.type === 'decision' ? 'Oui / Valide' : 'Suivant',
        },
        sourceNode,
        newRfNode
      );

      setNodes((nds) => [...nds, newRfNode]);
      setEdges((eds) => [...eds, newRfEdge]);
      setSelectedNodeId(newNodeId);
      setSelectedEdgeId(null);
      setInspectorOpen(true);
      setHasUnsavedChanges(true);
    },
    [nodes, setNodes, setEdges]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const orig = nodes.find((n) => n.id === nodeId);
      if (!orig) return;

      const newId = `node-${Date.now()}`;
      const origData = orig.data as unknown as ProcessNode;
      const newPos = {
        x: orig.position.x + 60,
        y: orig.position.y + 90,
      };

      const duplicatedData: ProcessNode = {
        ...origData,
        id: newId,
        label: `${origData.label} (Copie)`,
        position: newPos,
      };

      const newRfNode: Node = {
        id: newId,
        type: orig.type,
        position: newPos,
        data: { ...duplicatedData },
      };

      setNodes((nds) => [...nds, newRfNode]);
      setSelectedNodeId(newId);
      setSelectedEdgeId(null);
      setInspectorOpen(true);
      setHasUnsavedChanges(true);
    },
    [nodes, setNodes]
  );

  const handleUpdateNode = (updated: ProcessNode) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === updated.id) {
          return {
            ...n,
            type: updated.type,
            data: {
              ...n.data,
              ...updated,
            },
          };
        }
        return n;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleUpdateEdge = (updated: ProcessEdge) => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === updated.id) {
          return buildStyledEdge(
            {
              id: e.id,
              source: e.source,
              target: e.target,
              label: updated.label || undefined,
            },
            nodeMap.get(e.source),
            nodeMap.get(e.target)
          );
        }
        return e;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const remainingNodes = nodes.filter((n) => n.id !== nodeId);
      const inEdges = edges.filter((e) => e.target === nodeId);
      const outEdges = edges.filter((e) => e.source === nodeId);
      const remainingEdges = edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );

      // If the deleted node was in the middle of a chain (A -> deleted -> B), automatically bridge A -> B
      if (inEdges.length > 0 && outEdges.length > 0) {
        const primaryOutTargetId = outEdges[0].target;
        const targetNode = remainingNodes.find((n) => n.id === primaryOutTargetId);
        inEdges.forEach((inE) => {
          if (
            inE.source !== primaryOutTargetId &&
            !remainingEdges.some(
              (e) => e.source === inE.source && e.target === primaryOutTargetId
            )
          ) {
            const srcNode = remainingNodes.find((n) => n.id === inE.source);
            const bridgedLabel =
              (inE.data as any)?.rawLabel ??
              (typeof inE.label === 'string' ? inE.label : 'Suivant');
            remainingEdges.push(
              buildStyledEdge(
                {
                  id: `edge-bridge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  source: inE.source,
                  target: primaryOutTargetId,
                  label: bridgedLabel,
                },
                srcNode,
                targetNode
              )
            );
          }
        });
      }

      // Recompute clean layout positions so downstream nodes shift back cleanly
      const newPositions = computeAutoLayoutPositions(
        remainingNodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
        })),
        remainingEdges.map((e) => ({
          source: e.source,
          target: e.target,
          label:
            (e.data as any)?.rawLabel ??
            (typeof e.label === 'string' ? e.label : undefined),
        }))
      );

      const repositionedNodes = remainingNodes.map((n) => {
        const pos = newPositions[n.id] || n.position;
        return {
          ...n,
          position: pos,
          data: {
            ...n.data,
            position: pos,
          },
        };
      });

      const nodeMap = new Map(repositionedNodes.map((n) => [n.id, n]));
      const restyledEdges = remainingEdges.map((e) =>
        buildStyledEdge(
          {
            id: e.id,
            source: e.source,
            target: e.target,
            label:
              (e.data as any)?.rawLabel ??
              (typeof e.label === 'string' ? e.label : undefined),
          },
          nodeMap.get(e.source),
          nodeMap.get(e.target)
        )
      );

      setNodes(repositionedNodes);
      setEdges(restyledEdges);
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
      setHasUnsavedChanges(true);
    },
    [nodes, edges, setNodes, setEdges]
  );

  const handleDeleteEdge = (edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
  };

  const buildLiveProcessPayload = (): Process | null => {
    if (!currentProcess) return null;
    const domainNodes: ProcessNode[] = nodes.map((n) => ({
      ...(n.data as unknown as ProcessNode),
      id: n.id,
      type: n.type as NodeType,
      position: n.position,
    }));

    const domainEdges: ProcessEdge[] = edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      label:
        (e.data as any)?.rawLabel ??
        (typeof e.label === 'string' ? e.label : ''),
    }));

    return {
      ...currentProcess,
      nodes: domainNodes,
      edges: domainEdges,
      testCases,
    };
  };

  const handleSave = async () => {
    const toSave = buildLiveProcessPayload();
    if (!toSave) return;
    try {
      setIsSaving(true);
      setSaveError(null);

      const saved = await api.updateProcess(toSave);
      setCurrentProcess(saved);
      setProcessesList((prev) =>
        prev.map((item) =>
          item.id === saved.id
            ? {
                ...item,
                name: saved.name,
                nodeCount: saved.nodes.length,
                edgeCount: saved.edges.length,
                ruleCount: saved.businessRules.length,
                updatedAt: saved.updatedAt || new Date().toISOString(),
              }
            : item
        )
      );
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Save failed', err);
      setSaveError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistrer l'avancement : si le processus est déjà publié (v1, v2…) et modifié,
  // ouvre la boîte de choix « Mettre à jour vX » vs « Passer en v(X+1) ».
  const handleSaveOrChooseVersion = () => {
    if (!currentProcess) return;
    if (currentProcess.lifecycleState === 'approved' && hasUnsavedChanges) {
      setPublishModalMode('save_published');
      return;
    }
    handleSave();
  };

  const handleOpenPublishModal = () => {
    if (!currentProcess) return;
    if (currentProcess.lifecycleState === 'approved') {
      setPublishModalMode('save_published');
    } else {
      setPublishModalMode('close_draft');
    }
  };

  const handlePublishVersionConfirm = async (
    mode: 'publish_current' | 'update_current' | 'new_version',
    note: string
  ) => {
    const livePayload = buildLiveProcessPayload();
    if (!livePayload) return;
    try {
      setIsPublishingVersion(true);
      setSaveError(null);
      const res = await api.publishProcessVersion(livePayload.id, {
        mode,
        note,
        publishedBy: activeCollaborator?.name || livePayload.owner || 'MOA Process',
        process: livePayload,
      });
      setCurrentProcess(res.process);
      setCurrentProcessVersions(res.versions || []);
      setProcessesList((prev) =>
        prev.map((item) =>
          item.id === res.process.id
            ? {
                ...item,
                name: res.process.name,
                version: res.process.version,
                lifecycleState: res.process.lifecycleState,
                nodeCount: res.process.nodes.length,
                edgeCount: res.process.edges.length,
                ruleCount: res.process.businessRules.length,
                updatedAt: res.process.updatedAt || new Date().toISOString(),
                publishedVersions: res.versions || [],
              }
            : item
        )
      );
      setHasUnsavedChanges(false);
      setPublishModalMode(null);
      api.fetchProcesses().then(setProcessesList).catch(() => {});
    } catch (err: any) {
      console.error('Publish version failed', err);
      setSaveError(err.message || 'Erreur lors de la publication de version.');
    } finally {
      setIsPublishingVersion(false);
    }
  };

  const handleRestoreProcessVersion = async (
    processId: string,
    versionId: string
  ) => {
    try {
      await api.restoreProcessVersion(processId, versionId);
      await loadProcessById(processId);
      setStudioShowGallery(false);
      setActiveSection('studio');
      api.fetchProcesses().then(setProcessesList).catch(() => {});
    } catch (err: any) {
      console.error('Restore version failed', err);
      setSaveError(err.message || 'Erreur lors de la restauration de version.');
    }
  };

  const handleRunValidation = async () => {
    if (!currentProcess) return;
    await handleSave();
    try {
      const res = await api.validateProcess(currentProcess.id);
      setValidationResult(res);

      const findingsByNode: Record<string, 'error' | 'warning' | 'suggestion'> = {};
      res.findings.forEach((f) => {
        if (f.nodeId) {
          if (!findingsByNode[f.nodeId] || f.severity === 'error') {
            findingsByNode[f.nodeId] = f.severity;
          }
        }
      });

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            hasFinding: findingsByNode[n.id],
          },
        }))
      );
    } catch (err) {
      alert('Erreur de validation : ' + err);
    }
  };

  const handleRunSimulation = async (decisions: Record<string, string>) => {
    if (!currentProcess) return;
    await handleSave();
    try {
      const sim = await api.simulateProcess(currentProcess.id, decisions);
      setSimulationResult(sim);

      const pathSet = new Set(sim.path);
      const edgePairs = new Set<string>();
      for (let i = 0; i < sim.path.length - 1; i++) {
        edgePairs.add(`${sim.path[i]}->${sim.path[i + 1]}`);
      }

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isSimulatedActive: pathSet.has(n.id),
          },
        }))
      );

      setEdges((eds) =>
        eds.map((e) => {
          const isEdgeInPath = edgePairs.has(`${e.source}->${e.target}`);
          return {
            ...e,
            className: isEdgeInPath ? 'edge-simulated' : '',
            animated: isEdgeInPath,
          };
        })
      );
    } catch (err) {
      alert('Erreur de simulation : ' + err);
    }
  };

  const handleClearSimulation = () => {
    setSimulationResult(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isSimulatedActive: false,
        },
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        className: '',
        animated: false,
      }))
    );
  };

  const handleGenerateTestCases = async () => {
    if (!currentProcess) return;
    await handleSave();
    try {
      const res = await api.generateTestCases(currentProcess.id);
      setTestCases(res.cases);
      setHasUnsavedChanges(true);
    } catch (err) {
      alert('Erreur de génération des tests : ' + err);
    }
  };

  const handleFetchTraceability = async () => {
    if (!currentProcess) return;
    try {
      const res = await api.fetchTraceability(currentProcess.id);
      setTraceabilityResult(res);
    } catch (err) {
      alert('Erreur traçabilité : ' + err);
    }
  };

  const handleFetchAnalytics = async () => {
    if (!currentProcess) return;
    try {
      const res = await api.fetchAnalytics(currentProcess.id);
      setAnalyticsResult(res);
    } catch (err) {
      alert('Erreur analyse : ' + err);
    }
  };

  const handleFocusElement = (id: string, type: 'node' | 'edge') => {
    if (type === 'node') {
      const targetNode = nodes.find((n) => n.id === id);
      if (targetNode) {
        setSelectedNodeId(id);
        setSelectedEdgeId(null);
        setInspectorOpen(true);
        setCenter(targetNode.position.x + 110, targetNode.position.y + 45, {
          zoom: 1.15,
          duration: 600,
        });
      }
    } else {
      setSelectedEdgeId(id);
      setSelectedNodeId(null);
      setInspectorOpen(true);
    }
  };

  const handleSaveRule = (rule: BusinessRule) => {
    if (!currentProcess) return;
    const exists = currentProcess.businessRules.some((r) => r.id === rule.id);
    const updatedRules = exists
      ? currentProcess.businessRules.map((r) => (r.id === rule.id ? rule : r))
      : [...currentProcess.businessRules, rule];

    setCurrentProcess({
      ...currentProcess,
      businessRules: updatedRules,
    });
    if (pendingRuleTargetNodeId) {
      const targetId = pendingRuleTargetNodeId;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === targetId
            ? {
                ...n,
                data: {
                  ...n.data,
                  ruleIds: Array.from(
                    new Set([...((n.data?.ruleIds as string[]) || []), rule.id])
                  ),
                },
              }
            : n
        )
      );
      setPendingRuleTargetNodeId(null);
    }
    setHasUnsavedChanges(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!currentProcess) return;
    const updatedRules = currentProcess.businessRules.filter((r) => r.id !== ruleId);
    setCurrentProcess({
      ...currentProcess,
      businessRules: updatedRules,
    });
    // Also remove the deleted rule ID from every step's ruleIds so counts stay exact
    setNodes((nds) =>
      nds.map((n) => {
        const existingIds = (n.data?.ruleIds as string[]) || [];
        if (!existingIds.includes(ruleId)) return n;
        return {
          ...n,
          data: {
            ...n.data,
            ruleIds: existingIds.filter((rid) => rid !== ruleId),
          },
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleDuplicate = async () => {
    if (!currentProcess) return;
    try {
      const duplicated = await api.duplicateProcess(currentProcess.id);
      const list = await api.fetchProcesses();
      setProcessesList(list);
      loadProcessById(duplicated.id);
    } catch (err) {
      alert('Erreur de duplication : ' + err);
    }
  };

  const handleFitView = () => {
    setDiagram3dFitTrigger((c) => c + 1);
    fitView({ padding: 0.22, duration: 500 });
  };

  // Bidirectional Table <-> Diagram state projections
  const domainNodesForTable = useMemo<ProcessNode[]>(
    () =>
      nodes.map((n) => ({
        ...(n.data as unknown as ProcessNode),
        id: n.id,
        type: (n.type as NodeType) || 'task',
        position: n.position,
      })),
    [nodes]
  );

  const domainEdgesForTable = useMemo<ProcessEdge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        label:
          (e.data as any)?.rawLabel ??
          (typeof e.label === 'string' ? e.label : ''),
      })),
    [edges]
  );

  // Deterministic simulated path (node IDs + edge IDs) for 'simulate' workbench tab
  const { simulatedPathNodeIds, simulatedPathEdgeIds } = useMemo(() => {
    const startNode =
      domainNodesForTable.find((n) => n.type === 'start') || domainNodesForTable[0];
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    if (!startNode) {
      return { simulatedPathNodeIds: visitedNodes, simulatedPathEdgeIds: visitedEdges };
    }
    let current: ProcessNode | undefined = startNode;
    let guard = 0;

    while (current && !visitedNodes.has(current.id) && guard < 40) {
      guard += 1;
      visitedNodes.add(current.id);
      if (current.type === 'end') break;
      const outEdges = domainEdgesForTable.filter(
        (e) => e.sourceNodeId === current!.id
      );
      if (outEdges.length === 0) break;
      let chosenEdge = outEdges[0];
      if (current.type === 'decision') {
        const chosenBranch = simDecisions[current.id];
        if (chosenBranch) {
          chosenEdge =
            outEdges.find(
              (e) => e.id === chosenBranch || (e.label || 'Branche') === chosenBranch
            ) || outEdges[0];
        } else {
          chosenEdge =
            outEdges.find((e) => {
              const l = (e.label || '').toLowerCase();
              return (
                l.includes('oui') ||
                l.includes('conforme') ||
                l.includes('sans opposition') ||
                l.includes('inférieur') ||
                l.includes('<')
              );
            }) || outEdges[0];
        }
      }
      visitedEdges.add(chosenEdge.id);
      current = domainNodesForTable.find((n) => n.id === chosenEdge.targetNodeId);
    }
    return { simulatedPathNodeIds: visitedNodes, simulatedPathEdgeIds: visitedEdges };
  }, [domainNodesForTable, domainEdgesForTable, simDecisions]);

  // Deterministic audit findings by node ID for 'audit' workbench tab (single source of truth with AuditWorkbenchPanel)
  const auditFindingsByNode = useMemo(
    () => computeAuditSeverityByNode(domainNodesForTable, domainEdgesForTable),
    [domainNodesForTable, domainEdgesForTable]
  );

  const filteredAuditFindingsByNode = useMemo(() => {
    if (auditFilterTab === 'all') return auditFindingsByNode;
    const out: Record<string, 'error' | 'warning' | 'suggestion'> = {};
    Object.entries(auditFindingsByNode).forEach(([nid, sev]) => {
      if (auditFilterTab === 'bloquant' && sev === 'error') {
        out[nid] = sev;
      } else if (auditFilterTab === 'conformite' && (sev === 'error' || sev === 'warning')) {
        out[nid] = sev;
      }
    });
    return out;
  }, [auditFindingsByNode, auditFilterTab]);

  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => {
        const isSimActive =
          workbenchTab === 'simulate'
            ? simulatedPathNodeIds.has(n.id)
            : workbenchTab === 'recette' && selectedTestCase
            ? selectedTestCase.sourceNodeIds.includes(n.id)
            : Boolean(n.data.isSimulatedActive);

        const findingBadge =
          workbenchTab === 'audit'
            ? auditFindingsByNode[n.id]
            : (n.data.hasFinding as 'error' | 'warning' | 'suggestion' | undefined);

        return {
          ...n,
          data: {
            ...n.data,
            isSimulatedActive: isSimActive,
            hasFinding: findingBadge,
            onQuickAddAfter: handleQuickAddAfter,
            onDuplicateNode: handleDuplicateNode,
            onDeleteNode: handleDeleteNode,
          },
        };
      }),
    [
      nodes,
      workbenchTab,
      simulatedPathNodeIds,
      selectedTestCase,
      auditFindingsByNode,
      handleQuickAddAfter,
      handleDuplicateNode,
      handleDeleteNode,
    ]
  );

  const handleAddNodeFromTable = useCallback(
    (
      type: NodeType,
      connectFromNodeId?: string,
      edgeLabel?: string,
      branchType: 'nominal' | 'exception' = 'nominal'
    ): string => {
      const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const labels: Record<NodeType, string> = {
        start: 'Réception de la demande',
        task: 'Nouvelle étape métier',
        decision: 'Contrôle de conformité ?',
        data: 'Synchronisation des données',
        subprocess: 'Sous-processus métier',
        end: 'Fin — Traitement terminé',
      };

      const sourceNode = connectFromNodeId
        ? nodes.find((n) => n.id === connectFromNodeId)
        : [...nodes].reverse().find((n) => n.type !== 'end') ||
          nodes[nodes.length - 1];

      const newPos = sourceNode
        ? {
            x: sourceNode.position.x + 320,
            y:
              edgeLabel && edgeLabel.toLowerCase().includes('incomplet')
                ? 80
                : edgeLabel &&
                  (edgeLabel.toLowerCase().includes('rejet') ||
                    edgeLabel.toLowerCase().includes('non'))
                ? 520
                : sourceNode.position.y,
          }
        : { x: 310, y: 300 };

      const newNodeData: ProcessNode = {
        id,
        type,
        label: labels[type] || 'Nouvelle étape',
        position: newPos,
        description: `Exécution et contrôle de l'étape « ${labels[type]} ».`,
        ownerRole:
          type === 'task' || type === 'decision'
            ? 'Gestionnaire Métier'
            : 'Système',
        application:
          type === 'task' || type === 'decision'
            ? 'Portail Métier / GED'
            : 'Système Central',
        estimatedDurationMinutes: type === 'task' ? 15 : 0,
        executionMode: type === 'task' || type === 'decision' ? 'manual' : 'automated',
        inputs: type === 'task' ? ['Dossier entrant'] : [],
        outputs: type === 'task' ? ['Dossier validé'] : [],
        controls: type === 'task' ? ['Vérification de conformité'] : [],
        ruleIds:
          currentProcess?.businessRules?.[0]?.id &&
          (type === 'task' || type === 'decision')
            ? [currentProcess.businessRules[0].id]
            : [],
      };

      const newRfNode: Node = {
        id,
        type,
        position: newPos,
        data: { ...newNodeData },
      };

      // Insert the new node in logical order (before 'end' nodes if non-end)
      let nextNodes: Node[];
      if (type === 'end') {
        nextNodes = [...nodes, newRfNode];
      } else {
        const firstEndIdx = nodes.findIndex((n) => n.type === 'end');
        if (firstEndIdx !== -1) {
          nextNodes = [
            ...nodes.slice(0, firstEndIdx),
            newRfNode,
            ...nodes.slice(firstEndIdx),
          ];
        } else {
          nextNodes = [...nodes, newRfNode];
        }
      }

      let nextEdges = [...edges];
      if (connectFromNodeId && sourceNode) {
        const isExc = (lbl: string) => {
          const l = (lbl || '').toLowerCase();
          if (l.includes('sans opposition')) return false;
          return (
            l.includes('incomplet') ||
            l.includes('rejet') ||
            l.includes('refus') ||
            l === 'non' ||
            l.startsWith('non ') ||
            l.includes('inéligible') ||
            l.includes('opposition') ||
            l.includes('expiré') ||
            l.includes('caduc') ||
            l.includes('supérieur')
          );
        };

        const outEdges = nextEdges.filter((e) => e.source === connectFromNodeId);
        let existingBranchEdge: Edge | undefined;
        if (sourceNode.type !== 'decision') {
          existingBranchEdge = outEdges[0];
        } else {
          const excEdge = outEdges.find((e) =>
            isExc((e.data as any)?.rawLabel ?? (e.label as string) ?? '')
          );
          const nomEdge = outEdges.find((e) => e.id !== excEdge?.id);
          existingBranchEdge = branchType === 'exception' ? excEdge : nomEdge;
        }

        const defaultLbl =
          edgeLabel !== undefined && edgeLabel !== ''
            ? edgeLabel
            : branchType === 'exception'
            ? 'Incomplet'
            : sourceNode.type === 'decision'
            ? 'Complet et conforme'
            : 'Suivant';

        const newRfEdge = buildStyledEdge(
          {
            id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            source: connectFromNodeId,
            target: id,
            label: defaultLbl,
          },
          sourceNode,
          newRfNode
        );

        if (existingBranchEdge) {
          const oldTargetId = existingBranchEdge.target;
          const oldTargetNode = nextNodes.find((n) => n.id === oldTargetId);
          // Replace the existing branch edge with sourceNode -> newRfNode
          nextEdges = nextEdges.map((e) =>
            e.id === existingBranchEdge!.id ? newRfEdge : e
          );
          // If splicing a non-end step before an existing target (such as 'Fin — Rachat exécuté'), connect newRfNode -> oldTargetNode
          if (type !== 'end' && oldTargetNode && oldTargetId !== id) {
            const forwardEdge = buildStyledEdge(
              {
                id: `edge-${Date.now()}-fwd-${Math.floor(Math.random() * 1000)}`,
                source: id,
                target: oldTargetId,
                label: type === 'decision' ? 'Complet et conforme' : 'Suivant',
              },
              newRfNode,
              oldTargetNode
            );
            nextEdges.push(forwardEdge);
          }
        } else {
          nextEdges.push(newRfEdge);
        }
      }

      // Immediately compute updated layout positions so Diagram is 100% synced even without clicking 'Générer le Diagramme'
      const newPositions = computeAutoLayoutPositions(
        nextNodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
        })),
        nextEdges.map((e) => ({
          source: e.source,
          target: e.target,
          label:
            (e.data as any)?.rawLabel ??
            (typeof e.label === 'string' ? e.label : undefined),
        }))
      );

      const positionedNodes = nextNodes.map((n) => {
        const pos = newPositions[n.id] || n.position;
        return {
          ...n,
          position: pos,
          data: {
            ...n.data,
            position: pos,
          },
        };
      });

      const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));
      const restyledEdges = nextEdges.map((e) =>
        buildStyledEdge(
          {
            id: e.id,
            source: e.source,
            target: e.target,
            label:
              (e.data as any)?.rawLabel ??
              (typeof e.label === 'string' ? e.label : undefined),
          },
          nodeMap.get(e.source),
          nodeMap.get(e.target)
        )
      );

      setNodes(positionedNodes);
      setEdges(restyledEdges);
      setSelectedNodeId(id);
      setHasUnsavedChanges(true);
      return id;
    },
    [nodes, edges, currentProcess, setNodes, setEdges]
  );

  const handleSetEdgeConnectionFromTable = useCallback(
    (
      sourceId: string,
      branchType: 'nominal' | 'exception',
      targetId: string | null,
      customLabel?: string
    ) => {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const sourceNode = nodeMap.get(sourceId);

      setEdges((eds) => {
        const outEdges = eds.filter((e) => e.source === sourceId);
        const isExc = (lbl: string) => {
          const l = (lbl || '').toLowerCase();
          if (l.includes('sans opposition')) return false;
          return (
            l.includes('incomplet') ||
            l.includes('rejet') ||
            l.includes('refus') ||
            l === 'non' ||
            l.startsWith('non ') ||
            l.includes('inéligible') ||
            l.includes('opposition') ||
            l.includes('expiré') ||
            l.includes('caduc') ||
            l.includes('supérieur')
          );
        };

        let existingEdge: Edge | undefined;
        if (sourceNode?.type !== 'decision') {
          existingEdge = branchType === 'nominal' ? outEdges[0] : outEdges[1];
        } else {
          const excEdge = outEdges.find((e) =>
            isExc((e.data as any)?.rawLabel ?? (e.label as string) ?? '')
          );
          const nomEdge = outEdges.find((e) => e.id !== excEdge?.id);
          existingEdge = branchType === 'nominal' ? nomEdge : excEdge;
        }

        let nextEdges: Edge[];
        if (!targetId) {
          nextEdges = existingEdge ? eds.filter((e) => e.id !== existingEdge!.id) : eds;
        } else {
          const targetNode = nodeMap.get(targetId);
          const labelToUse =
            customLabel ||
            (branchType === 'exception'
              ? 'Incomplet'
              : sourceNode?.type === 'decision'
              ? 'Complet et conforme'
              : 'Suivant');

          if (existingEdge) {
            nextEdges = eds.map((e) =>
              e.id === existingEdge!.id
                ? buildStyledEdge(
                    {
                      id: e.id,
                      source: sourceId,
                      target: targetId,
                      label: labelToUse,
                    },
                    sourceNode,
                    targetNode
                  )
                : e
            );
          } else {
            const newEdge = buildStyledEdge(
              {
                id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                source: sourceId,
                target: targetId,
                label: labelToUse,
              },
              sourceNode,
              targetNode
            );
            nextEdges = [...eds, newEdge];
          }
        }

        // Automatically re-layout nodes left-to-right so Spatial 3D always matches the logical flow
        const newPositions = computeAutoLayoutPositions(
          nodes.map((n) => ({ id: n.id, type: n.type, position: n.position })),
          nextEdges.map((e) => ({
            source: e.source,
            target: e.target,
            label:
              (e.data as any)?.rawLabel ??
              (typeof e.label === 'string' ? e.label : undefined),
          }))
        );
        setNodes((nds) =>
          nds.map((n) => (newPositions[n.id] ? { ...n, position: newPositions[n.id] } : n))
        );

        return nextEdges;
      });
      setHasUnsavedChanges(true);
    },
    [nodes, setEdges, setNodes]
  );

  // Real-time synchronization & auto-save of Table <-> Diagram changes to currentProcess and Backend API
  useEffect(() => {
    if (!currentProcess || !hasUnsavedChanges) return;
    const timer = setTimeout(async () => {
      try {
        const domainNodes: ProcessNode[] = nodes.map((n) => ({
          ...(n.data as unknown as ProcessNode),
          id: n.id,
          type: (n.type as NodeType) || 'task',
          position: n.position,
        }));
        const domainEdges: ProcessEdge[] = edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          label:
            (e.data as any)?.rawLabel ??
            (typeof e.label === 'string' ? e.label : ''),
        }));
        const toSave: Process = {
          ...currentProcess,
          nodes: domainNodes,
          edges: domainEdges,
          testCases,
        };
        const saved = await api.updateProcess(toSave);
        setCurrentProcess(saved);
        setProcessesList((prev) =>
          prev.map((item) =>
            item.id === saved.id
              ? {
                  ...item,
                  name: saved.name,
                  nodeCount: saved.nodes.length,
                  edgeCount: saved.edges.length,
                  ruleCount: saved.businessRules.length,
                  updatedAt: saved.updatedAt || new Date().toISOString(),
                }
              : item
          )
        );
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes, edges, testCases, currentProcess, hasUnsavedChanges]);

  const handleQuickCreateRuleForNode = useCallback(
    (nodeId: string) => {
      if (!currentProcess) return;
      setRuleToEdit(null);
      setPendingRuleTargetNodeId(nodeId);
      setIsRuleModalOpen(true);
    },
    [currentProcess]
  );

  // 1-Click Magic Button: Auto-completes mandatory fields, connects unlinked sequential rows, computes Proposition 3 layout, and switches to Diagram view
  const handleGenerateDiagramOneClick = useCallback(() => {
    const defaultRuleId = currentProcess?.businessRules?.[0]?.id;

    // 1. Auto-fill all mandatory fields on every node so PropertiesPanel & Audit have 100% complete data
    const enrichedNodes = nodes.map((n) => {
      const d = (n.data || {}) as unknown as ProcessNode;
      const type = (n.type as NodeType) || d.type || 'task';
      const label = (d.label || '').trim() || 'Étape métier';

      const ownerRole =
        (d.ownerRole || '').trim() ||
        (type === 'decision'
          ? 'Documents conformes ?'
          : type === 'start' || type === 'end'
          ? 'Système'
          : 'Gestionnaire Métier');

      const application =
        (d.application || '').trim() ||
        (type === 'start'
          ? 'Portail Web Client'
          : type === 'end'
          ? 'Système Central'
          : 'Outil de Gestion / GED');

      const description =
        (d.description || '').trim() ||
        `Exécution, contrôle et traçabilité de l'étape « ${label} » par ${ownerRole}.`;

      const executionMode =
        d.executionMode ||
        (type === 'start' || type === 'end' ? 'automated' : 'manual');

      const estimatedDurationMinutes =
        d.estimatedDurationMinutes && d.estimatedDurationMinutes > 0
          ? d.estimatedDurationMinutes
          : type === 'task'
          ? 15
          : 0;

      const inputs =
        d.inputs && d.inputs.length > 0
          ? d.inputs
          : type === 'end'
          ? ['Dossier validé']
          : ['Données du dossier'];

      const outputs =
        d.outputs && d.outputs.length > 0
          ? d.outputs
          : type === 'end'
          ? []
          : ['Statut étape validé'];

      const controls =
        d.controls && d.controls.length > 0
          ? d.controls
          : type === 'task' || type === 'decision'
          ? ['Contrôle de conformité']
          : [];

      const ruleIds =
        d.ruleIds && d.ruleIds.length > 0
          ? d.ruleIds
          : defaultRuleId && (type === 'task' || type === 'decision')
          ? [defaultRuleId]
          : [];

      return {
        ...n,
        type,
        data: {
          ...d,
          id: n.id,
          type,
          label,
          ownerRole,
          application,
          description,
          executionMode,
          estimatedDurationMinutes,
          inputs,
          outputs,
          controls,
          ruleIds,
        },
      };
    });

    // 2. Ensure sequential nodes without outgoing edges are automatically linked
    const currentEdges = [...edges];
    const hasOutgoing = new Set(currentEdges.map((e) => e.source));
    for (let i = 0; i < enrichedNodes.length - 1; i++) {
      const curr = enrichedNodes[i];
      const next = enrichedNodes[i + 1];
      if (curr.type !== 'end' && !hasOutgoing.has(curr.id)) {
        currentEdges.push(
          buildStyledEdge(
            {
              id: `edge-auto-${curr.id}-${next.id}`,
              source: curr.id,
              target: next.id,
              label:
                curr.type === 'decision' ? 'Complet et conforme' : 'Suivant',
            },
            curr,
            next
          )
        );
        hasOutgoing.add(curr.id);
      }
    }

    // 3. Compute Proposition 3 3-lane auto-layout
    const newPositions = computeAutoLayoutPositions(
      enrichedNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
      })),
      currentEdges.map((e) => ({
        source: e.source,
        target: e.target,
        label:
          (e.data as any)?.rawLabel ??
          (typeof e.label === 'string' ? e.label : undefined),
      }))
    );

    const positionedNodes = enrichedNodes.map((n) => {
      const pos = newPositions[n.id] || n.position;
      return {
        ...n,
        position: pos,
        data: {
          ...n.data,
          position: pos,
        },
      };
    });

    const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));
    const styledEdges = currentEdges.map((e) =>
      buildStyledEdge(
        {
          id: e.id,
          source: e.source,
          target: e.target,
          label:
            (e.data as any)?.rawLabel ??
            (typeof e.label === 'string' ? e.label : undefined),
        },
        nodeMap.get(e.source),
        nodeMap.get(e.target)
      )
    );

    setNodes(positionedNodes);
    setEdges(styledEdges);
    setHasUnsavedChanges(true);
    setStudioMode('diagram');
    setTimeout(() => fitView({ padding: 0.22, duration: 500 }), 100);
  }, [nodes, edges, currentProcess, setNodes, setEdges, fitView]);

  // Current project linked to currentProcess
  const linkedProjectForStudio = useMemo(() => {
    if (!currentProcess) return projects[0] || null;
    return (
      projects.find(
        (p) =>
          p.id === currentProcess.projectId || p.processIds.includes(currentProcess.id)
      ) ||
      projects[0] ||
      null
    );
  }, [currentProcess, projects]);

  // Collaborators strictly scoped to the active project's assigned members (humans + AI agents)
  const projectScopedCollaborators = useMemo(() => {
    if (!selectedProjectId) return collaborators;
    const activeProj = projects.find((p) => p.id === selectedProjectId);
    if (!activeProj || !activeProj.memberIds || activeProj.memberIds.length === 0) {
      return collaborators;
    }
    const allowedIds = new Set<string>(activeProj.memberIds);
    if (activeCollaborator?.id) {
      allowedIds.add(activeCollaborator.id);
    }
    return collaborators.filter((c) => allowedIds.has(c.id));
  }, [selectedProjectId, projects, collaborators, activeCollaborator]);

  const projectScopedSelectedConversation = useMemo(() => {
    if (!selectedConversation) return null;
    if (!selectedProjectId) return selectedConversation;
    const activeProj = projects.find((p) => p.id === selectedProjectId);
    if (!activeProj || !activeProj.memberIds || activeProj.memberIds.length === 0) {
      return selectedConversation;
    }
    const allowedIds = new Set<string>(activeProj.memberIds);
    if (activeCollaborator?.id) allowedIds.add(activeCollaborator.id);
    return {
      ...selectedConversation,
      participantIds: (selectedConversation.participantIds || []).filter((id) =>
        allowedIds.has(id)
      ),
    };
  }, [selectedConversation, selectedProjectId, projects, activeCollaborator]);

  useEffect(() => {
    let cancelled = false;
    api
      .fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (user) {
          setAuthenticatedUser(user);
          setActiveCollaborator(user);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await api.logoutUser();
    setAuthenticatedUser(null);
    setActiveCollaborator(null);
    setActiveSection('launchpad');
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen w-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-[13px] font-medium text-[#6E6E73]">
          Vérification de la session...
        </div>
      </div>
    );
  }

  if (!authenticatedUser) {
    return (
      <AuthLoginScreen
        onAuthenticated={(user) => {
          setAuthenticatedUser(user);
          setActiveCollaborator(user);
          refreshSaaSEntities();
        }}
      />
    );
  }

  return (
    <div
      style={
        activeSection === 'launchpad'
          ? {
              background: `
                radial-gradient(600px 420px at 12% 18%, rgba(90,200,250,.28), transparent 70%),
                radial-gradient(700px 500px at 88% 12%, rgba(175,82,222,.20), transparent 70%),
                radial-gradient(700px 520px at 70% 95%, rgba(52,199,89,.16), transparent 70%),
                radial-gradient(600px 460px at 20% 92%, rgba(255,159,10,.14), transparent 70%),
                #F5F5F8
              `,
            }
          : undefined
      }
      className="flex flex-col h-full w-full bg-[#FAFAFA] overflow-hidden font-sans text-[#1C2024] relative"
    >
      {/* Slim macOS Top Menu Bar (Hidden in Studio where the 2-Bar Studio Header takes over) */}
      {activeSection !== 'studio' && (
        <MacTopBar
          activeTarget={activeSection}
          onSelectTarget={handleNavigateSection}
          projects={projects}
          processes={projectScopedProcesses}
          selectedProjectId={selectedProjectId}
          currentProcessId={projectScopedCurrentProcess?.id}
          onSelectProject={(pid) => setSelectedProjectId(pid)}
          onSelectProcess={(procId) => loadProcessById(procId)}
          activeCollaborator={activeCollaborator}
          collaborators={collaborators}
          onSwitchActiveCollaborator={setActiveCollaborator}
          onUpdateCollaboratorStatus={async (collabId, status) => {
            const updated = await api.updateCollaborator(collabId, {
              presenceStatus: status,
            });
            setActiveCollaborator(updated);
            await refreshSaaSEntities();
          }}
          onOpenMeetingModal={() => setIsMeetingModalOpen(true)}
          onOpenNewAgentModal={() => {
            setAgentToEdit(null);
            setIsAgentBuilderOpen(true);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Main Exclusive Workspace Area (100% Width — Zero Permanent Left Sidebar) */}
      <div className="flex-1 w-full flex overflow-hidden min-h-0 relative">
        {/* HOME SCREEN: macOS LAUNCHPAD (7 Large Square Illustrated Icons) */}
        {activeSection === 'launchpad' && (
          <MacLaunchpadView
            onSelectCategory={(catId) => handleNavigateSection(catId)}
            activeCollaborator={activeCollaborator}
            collaborators={collaborators}
            conversations={projectScopedConversations}
            projects={projects}
            meetings={meetings}
            currentProcess={projectScopedCurrentProcess}
            onStartDirectAgentChat={handleDirectChatWithCollaborator}
          />
        )}

        {/* CATEGORY 1: CONVERSATIONS & NOTES (3-Column Chatwoot Workspace — 100% Width) */}
        {activeSection === 'conversations' && (
          <div className="flex flex-1 h-full overflow-hidden apple-workspace-enter">
            {/* Column 1: ConversationList (320px) */}
            <ConversationList
              conversations={projectScopedConversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={async (cid) => {
                setSelectedConversationId(cid);
                const conv = projectScopedConversations.find((c) => c.id === cid);
                if (conv && conv.unreadCount > 0) {
                  await api.updateConversation(cid, { unreadCount: 0 });
                  await refreshSaaSEntities();
                }
              }}
              activeCollaborator={activeCollaborator}
              collaborators={projectScopedCollaborators}
              projects={projects}
              processes={projectScopedProcesses}
              tags={tags}
              sidebarFilter={conversationFilter}
              onClearSidebarFilter={() => setConversationFilter({ mode: 'all' })}
              onCreateConversation={async (payload) => {
                const created = await api.createConversation({
                  ...payload,
                  projectId: payload.projectId || selectedProjectId,
                  processId:
                    payload.processId || projectScopedCurrentProcess?.id || null,
                  senderId: activeCollaborator?.id || 'collab-user-main',
                });
                await refreshSaaSEntities();
                setSelectedConversationId(created.id);
              }}
              onDirectChatWithAgent={handleDirectChatWithCollaborator}
              onOpenAgentBuilder={(ag) => {
                setAgentToEdit(ag || null);
                setIsAgentBuilderOpen(true);
              }}
              onDeleteConversation={async (convId) => {
                await api.deleteConversation(convId);
                await refreshSaaSEntities();
              }}
              onToggleConversationStatus={async (convId, newStatus) => {
                await api.updateConversation(convId, { status: newStatus });
                await refreshSaaSEntities();
              }}
              onUpdateUnreadCount={async (convId, unreadCount) => {
                await api.updateConversation(convId, { unreadCount });
                await refreshSaaSEntities();
              }}
            />

            {/* Column 2: ConversationThread (flex-1) */}
            <ConversationThread
              conversation={projectScopedSelectedConversation}
              activeCollaborator={activeCollaborator}
              collaborators={projectScopedCollaborators}
              currentProcess={projectScopedCurrentProcess}
              projects={projects}
              detailsOpen={detailsPanelOpen}
              onToggleDetails={() => setDetailsPanelOpen((v) => !v)}
              onSendMessage={async ({
                content,
                isPrivateNote,
                linkedNodeIds,
                linkedRuleIds,
                actionPayload,
              }) => {
                if (!selectedConversation) return;
                await api.postConversationMessage(selectedConversation.id, {
                  senderId: activeCollaborator?.id || 'collab-user-main',
                  content,
                  isPrivateNote,
                  linkedNodeIds,
                  linkedRuleIds,
                  actionPayload,
                });
                await refreshSaaSEntities();
              }}
              onToggleStatus={async (convId, newStatus) => {
                await api.updateConversation(convId, { status: newStatus });
                await refreshSaaSEntities();
              }}
              onApplyAgentAction={async (messageId) => {
                if (!selectedConversation) return;
                const res = await api.applyConversationAgentAction(
                  selectedConversation.id,
                  {
                    messageId,
                    processId:
                      selectedConversation.processId ||
                      projectScopedCurrentProcess?.id ||
                      null,
                    projectId: selectedConversation.projectId || selectedProjectId,
                  }
                );
                await refreshSaaSEntities();
                if (res.processId) {
                  await loadProcessById(res.processId);
                }
              }}
              onOpenScheduleMeetingModal={() => setIsMeetingModalOpen(true)}
              onJumpToStudioNode={handleJumpToStudioNode}
              onOpenAgentBuilder={(ag) => {
                setAgentToEdit(ag);
                setIsAgentBuilderOpen(true);
              }}
              onUpdateParticipants={async (convId, participantIds) => {
                await api.updateConversation(convId, { participantIds });
                await refreshSaaSEntities();
              }}
            />

            {/* Column 3: ConversationDetailsPanel (290px, collapsible) */}
            {detailsPanelOpen && (
              <ConversationDetailsPanel
                conversation={projectScopedSelectedConversation}
                activeCollaborator={activeCollaborator}
                collaborators={projectScopedCollaborators}
                teams={teams}
                tags={tags}
                projects={projects}
                processes={projectScopedProcesses}
                currentProcess={projectScopedCurrentProcess}
                approvals={approvals}
                meetings={meetings}
                onUpdateConversation={async (convId, payload) => {
                  await api.updateConversation(convId, payload);
                  await refreshSaaSEntities();
                }}
                onUpdateApproval={async (approvalId, status) => {
                  await api.updateApprovalGate(approvalId, { status });
                  await refreshSaaSEntities();
                }}
                onCreateApproval={async (label, reviewerId) => {
                  const reviewer = collaborators.find((c) => c.id === reviewerId);
                  await api.createApprovalGate({
                    projectId: selectedConversation?.projectId || selectedProjectId,
                    processId:
                      selectedConversation?.processId ||
                      currentProcess?.id ||
                      'demo-rachat-partiel',
                    label,
                    reviewerId,
                    reviewerName: reviewer?.name || 'Approbateur',
                  });
                  await refreshSaaSEntities();
                }}
                onOpenScheduleMeetingModal={() => setIsMeetingModalOpen(true)}
                onJumpToStudioNode={handleJumpToStudioNode}
                onOpenAgentBuilder={(ag) => {
                  setAgentToEdit(ag);
                  setIsAgentBuilderOpen(true);
                }}
              />
            )}
          </div>
        )}

        {/* CATEGORY 2: AGENTS IA COLLABORATEURS (5 Default Agents + Custom Agent Builder) */}
        {activeSection === 'ai_agents' && (
          <TeamsDirectoryView
            mode="ai_only"
            collaborators={collaborators}
            teams={teams}
            onOpenAgentBuilder={(agent) => {
              setAgentToEdit(agent || null);
              setIsAgentBuilderOpen(true);
            }}
            onDirectChatWithCollaborator={handleDirectChatWithCollaborator}
            onCreateHumanCollaborator={async (payload) => {
              await api.createCollaborator({
                ...payload,
                isAi: false,
                presenceStatus: 'online',
              });
              await refreshSaaSEntities();
            }}
            onDeleteCollaborator={async (collabId) => {
              await api.deleteCollaborator(collabId);
              await refreshSaaSEntities();
            }}
            onCreateTeam={async (name, color, description) => {
              await api.createTeam({ name, color, description });
              await refreshSaaSEntities();
            }}
            onDeleteTeam={async (teamId) => {
              await api.deleteTeam(teamId);
              await refreshSaaSEntities();
            }}
          />
        )}

        {/* CATEGORY 3: STUDIO BPMN, RÈGLES MÉTIER (RG-*) & RECETTE QA */}
        {activeSection === 'studio' && studioShowGallery && (
          <StudioProjectGallery
            projects={projects}
            processes={processesList}
            categories={categories}
            activeMorphProjectId={activeMorphProjectId}
            onOpenProjectProcess={(projId, procId) => {
              setActiveMorphProjectId(projId);
              runMorphTransition(() => {
                setSelectedProjectId(projId);
                setStudioShowGallery(false);
              });
              if (procId) {
                loadProcessById(procId);
              } else {
                setCurrentProcess(null);
                setNodes([]);
                setEdges([]);
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setHasUnsavedChanges(false);
              }
            }}
            onGoToProjectsManager={() => setActiveSection('projects')}
          />
        )}

        {activeSection === 'studio' && !studioShowGallery && (
          <div
            style={{ viewTransitionName: 'studio-morph-shell' } as React.CSSProperties}
            className="flex flex-col flex-1 h-full overflow-hidden apple-workspace-enter"
          >
            {/* Top 2-Row Studio Header (Target Design) */}
            <Navbar
              currentProcess={projectScopedCurrentProcess}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={(pid) => {
                setSelectedProjectId(pid);
                if (!pid) return;
                const targetProj = projects.find((p) => p.id === pid);
                const procsForProj = processesList.filter(
                  (pr) =>
                    pr.projectId === pid ||
                    (targetProj?.processIds || []).includes(pr.id)
                );
                const firstProc =
                  procsForProj.find((p) => p.modelState === 'to_be') ||
                  procsForProj[0] ||
                  null;
                if (firstProc) {
                  loadProcessById(firstProc.id);
                } else {
                  setCurrentProcess(null);
                  setNodes([]);
                  setEdges([]);
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                  setHasUnsavedChanges(false);
                }
              }}
              processes={projectScopedProcesses}
              onSelectProcess={(procId) => loadProcessById(procId)}
              onBackToLaunchpad={() => setActiveSection('launchpad')}
              onOpenStudioGallery={() => {
                setActiveMorphProjectId(selectedProjectId || projects[0]?.id || null);
                runMorphTransition(() => {
                  setStudioShowGallery(true);
                });
              }}
              collaborators={collaborators}
              activeCollaborator={activeCollaborator}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
              saveError={saveError}
              onSave={handleSaveOrChooseVersion}
              publishedVersionCount={currentProcessVersions.length}
              onOpenPublishModal={handleOpenPublishModal}
              onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
              onOpenList={() => {
                api.fetchProcesses().then(setProcessesList);
                setIsListModalOpen(true);
              }}
              onNewProcess={() => setIsNewModalOpen(true)}
              onDuplicate={handleDuplicate}
              onOpenExportImport={() => setIsExportImportOpen(true)}
              onToggleDrawer={(tab) => {
                if (tab) {
                  if (isDrawerOpen && activeDrawerTab === tab) {
                    setIsDrawerOpen(false);
                  } else {
                    setActiveDrawerTab(tab);
                    setIsDrawerOpen(true);
                  }
                } else {
                  setIsDrawerOpen(!isDrawerOpen);
                }
              }}
              drawerOpen={isDrawerOpen}
              activeDrawerTab={activeDrawerTab}
              rulesCount={currentProcess?.businessRules?.length || 0}
              onOpenRulesCatalog={() => setIsRulesCatalogOpen(true)}
              onOpenDataDocuments={() => setIsDataDocumentsOpen(true)}
              onFitView={handleFitView}
              onAutoLayout={handleAutoLayout}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              searchNodes={domainNodesForTable}
              onSelectSearchNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setSelectedEdgeId(null);
              }}
              validationSummary={validationResult?.summary}
              studioMode={studioMode}
              onChangeStudioMode={(mode) => {
                setStudioMode(mode);
                if (mode === 'split') {
                  setDiagramStyle('spatial3d');
                }
                if (mode === 'diagram' || mode === 'split') {
                  setTimeout(() => fitView({ padding: 0.22, duration: 400 }), 80);
                }
              }}
              workbenchTab={workbenchTab}
              onChangeWorkbenchTab={(tab) => {
                setWorkbenchTab(tab);
                setTimeout(() => fitView({ padding: 0.22, duration: 400 }), 80);
              }}
              onRunValidation={handleRunValidation}
            />

            {/* Main Immersive Studio Workspace */}
            <div className="flex flex-1 overflow-hidden relative">
              {/* Central Studio Workspace (Modéliser | Auditer | Simuler | Recette) */}
              <main
                className="flex-1 h-full relative bg-[#f8fafc] transition-all duration-150 flex flex-col overflow-hidden"
                role="region"
                aria-label="Canevas de modélisation visuelle du processus"
              >
                {!projectScopedCurrentProcess ? (
                  <div className="flex-1 h-full flex items-center justify-center p-6 bg-gradient-to-b from-[#F5F5F7] to-white">
                    <div className="max-w-md w-full bg-white/95 backdrop-blur-md border border-black/[0.08] rounded-2xl p-8 text-center shadow-[0_8px_28px_rgba(0,0,0,0.05)] space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center mx-auto">
                        <Workflow className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-[16px] font-semibold tracking-tight text-[#1D1D1F]">
                          Aucun processus dans ce projet
                        </h2>
                        <p className="text-[12.5px] text-[#6E6E73] leading-relaxed">
                          Le projet{' '}
                          <strong className="text-[#1D1D1F]">
                            {projects.find((p) => p.id === selectedProjectId)?.name || 'sélectionné'}
                          </strong>{' '}
                          ne contient encore aucun processus. Créez le premier pour démarrer la modélisation.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMorphProjectId(selectedProjectId || projects[0]?.id || null);
                            runMorphTransition(() => {
                              setStudioShowGallery(true);
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[12.5px] font-semibold transition cursor-pointer"
                        >
                          Retour aux projets
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsNewModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12.5px] font-semibold shadow-2xs transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Créer le premier processus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {workbenchTab === 'model' && studioMode === 'table' && (
                  <StudioTableBuilder
                    nodes={domainNodesForTable}
                    edges={domainEdgesForTable}
                    rules={currentProcess?.businessRules || []}
                    onUpdateNode={handleUpdateNode}
                    onAddNodeWithEdge={handleAddNodeFromTable}
                    onDeleteNode={handleDeleteNode}
                    onSetEdgeConnection={handleSetEdgeConnectionFromTable}
                    onQuickCreateRuleForNode={(nodeId) => {
                      setRuleToEdit(null);
                      setPendingRuleTargetNodeId(nodeId);
                      setIsRuleModalOpen(true);
                    }}
                    onGenerateDiagramOneClick={handleGenerateDiagramOneClick}
                    activeNodeId={selectedNodeId}
                    onSelectRow={(nodeId) => {
                      setSelectedNodeId(nodeId);
                      setSelectedEdgeId(null);
                    }}
                    onSelectNodeInInspector={(nodeId) => {
                      setSelectedNodeId(nodeId);
                      setSelectedEdgeId(null);
                      setStudioMode('split');
                      setDiagram3dZoomTrigger((c) => c + 1);
                    }}
                  />
                )}

                {workbenchTab === 'model' && studioMode === 'split' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full overflow-hidden divide-x divide-slate-200/90">
                    {/* Left Pane: Real-Time Table Builder */}
                    <div className="h-full overflow-hidden flex flex-col bg-white">
                      <StudioTableBuilder
                        nodes={domainNodesForTable}
                        edges={domainEdgesForTable}
                        rules={currentProcess?.businessRules || []}
                        onUpdateNode={handleUpdateNode}
                        onAddNodeWithEdge={handleAddNodeFromTable}
                        onDeleteNode={handleDeleteNode}
                        onSetEdgeConnection={handleSetEdgeConnectionFromTable}
                        onQuickCreateRuleForNode={(nodeId) => {
                          setRuleToEdit(null);
                          setPendingRuleTargetNodeId(nodeId);
                          setIsRuleModalOpen(true);
                        }}
                        onGenerateDiagramOneClick={handleGenerateDiagramOneClick}
                        activeNodeId={selectedNodeId}
                        onSelectRow={(nodeId) => {
                          setSelectedNodeId(nodeId);
                          setSelectedEdgeId(null);
                        }}
                        onSelectNodeInInspector={(nodeId) => {
                          setSelectedNodeId(nodeId);
                          setSelectedEdgeId(null);
                          setDiagram3dZoomTrigger((c) => c + 1);
                        }}
                      />
                    </div>

                    {/* Right Pane: Real-Time Synchronized Diagram (Spatial 3D or Animated Finance Flows) */}
                    <div className="h-full overflow-hidden flex flex-col bg-[#F8FAFC]">
                      {diagramStyle === 'animated_finance' ? (
                        <AnimatedFinanceDiagram
                          nodes={domainNodesForTable}
                          edges={domainEdgesForTable}
                          rules={currentProcess?.businessRules || []}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(nid) => {
                            setSelectedNodeId(nid);
                            setSelectedEdgeId(null);
                          }}
                          onUpdateNode={handleUpdateNode}
                          onAddNodeWithEdge={handleAddNodeFromTable}
                          onDeleteNode={handleDeleteNode}
                          onConnectNodes={(source, target) =>
                            onConnect({
                              source,
                              target,
                              sourceHandle: null,
                              targetHandle: null,
                            })
                          }
                          onSwitchToSpatial3D={() => setDiagramStyle('spatial3d')}
                        />
                      ) : (
                        <CurvedDiagram3D
                          nodes={domainNodesForTable}
                          edges={domainEdgesForTable}
                          rules={currentProcess?.businessRules || []}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(nid) => {
                            setSelectedNodeId(nid);
                            setSelectedEdgeId(null);
                          }}
                          onUpdateNode={handleUpdateNode}
                          onAddNodeWithEdge={handleAddNodeFromTable}
                          onDeleteNode={handleDeleteNode}
                          onQuickCreateRuleForNode={handleQuickCreateRuleForNode}
                          onOpenRulesCatalog={() => setIsRulesCatalogOpen(true)}
                          onOpenDataDocumentsForStep={(nodeId) => {
                            setDataDocsInitialStepId(nodeId);
                            setIsDataDocumentsOpen(true);
                          }}
                          onAutoLayout={handleAutoLayout}
                          onOpenExportModal={() => setIsExportImportOpen(true)}
                          externalZoomTrigger={diagram3dZoomTrigger}
                          externalFitTrigger={diagram3dFitTrigger}
                          onSwitchToAnimatedDiagram={() => setDiagramStyle('animated_finance')}
                        />
                      )}
                    </div>
                  </div>
                )}

                {workbenchTab === 'model' && studioMode === 'diagram' && (
                  diagramStyle === 'animated_finance' ? (
                    <AnimatedFinanceDiagram
                      nodes={domainNodesForTable}
                      edges={domainEdgesForTable}
                      rules={currentProcess?.businessRules || []}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={(nid) => {
                        setSelectedNodeId(nid);
                        setSelectedEdgeId(null);
                      }}
                      onUpdateNode={handleUpdateNode}
                      onAddNodeWithEdge={handleAddNodeFromTable}
                      onDeleteNode={handleDeleteNode}
                      onConnectNodes={(source, target) =>
                        onConnect({
                          source,
                          target,
                          sourceHandle: null,
                          targetHandle: null,
                        })
                      }
                      onSwitchToSpatial3D={() => setDiagramStyle('spatial3d')}
                    />
                  ) : (
                    <CurvedDiagram3D
                      nodes={domainNodesForTable}
                      edges={domainEdgesForTable}
                      rules={currentProcess?.businessRules || []}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={(nid) => {
                        setSelectedNodeId(nid);
                        setSelectedEdgeId(null);
                      }}
                      onUpdateNode={handleUpdateNode}
                      onAddNodeWithEdge={handleAddNodeFromTable}
                      onDeleteNode={handleDeleteNode}
                      onQuickCreateRuleForNode={handleQuickCreateRuleForNode}
                      onOpenRulesCatalog={() => setIsRulesCatalogOpen(true)}
                      onOpenDataDocumentsForStep={(nodeId) => {
                        setDataDocsInitialStepId(nodeId);
                        setIsDataDocumentsOpen(true);
                      }}
                      onAutoLayout={handleAutoLayout}
                      onOpenExportModal={() => setIsExportImportOpen(true)}
                      externalZoomTrigger={diagram3dZoomTrigger}
                      externalFitTrigger={diagram3dFitTrigger}
                      onSwitchToAnimatedDiagram={() => setDiagramStyle('animated_finance')}
                    />
                  )
                )}

                {/* WORKBENCH TAB 2: AUDITER (Split 50/50 Apple macOS HIG + CurvedDiagram3D) */}
                {workbenchTab === 'audit' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full overflow-hidden divide-x divide-black/[0.07]">
                    {/* Left Pane: Score qualité + Constats actionnables en 1 clic */}
                    <AuditWorkbenchPanel
                      nodes={domainNodesForTable}
                      edges={domainEdgesForTable}
                      rules={currentProcess?.businessRules || []}
                      validation={validationResult}
                      selectedFindingNodeId={selectedNodeId}
                      onSelectFindingNode={(nodeId: string | null) => {
                        setSelectedNodeId(nodeId);
                        setSelectedEdgeId(null);
                      }}
                      onUpdateNode={handleUpdateNode}
                      onOpenInspectorForNode={(nodeId: string) => {
                        setSelectedNodeId(nodeId);
                        setSelectedEdgeId(null);
                        setDiagram3dZoomTrigger((n) => n + 1);
                      }}
                      onRunValidation={handleRunValidation}
                    />

                    {/* Right Pane: Carte des constats + Diagramme Apple HIG */}
                    <div className="h-full overflow-hidden flex flex-col bg-[#F5F5F7]">
                      <div className="h-12 px-4 border-b border-black/[0.07] bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[13.5px] text-[#1D1D1F] tracking-tight truncate">
                            Carte des constats
                          </span>
                          <span className="text-xs text-[#6E6E73] truncate hidden xl:inline">
                            Les étapes concernées sont mises en évidence
                          </span>
                        </div>
                        <div className="flex items-center bg-[#F5F5F7] p-0.5 rounded-lg border border-black/[0.06]">
                          <button
                            type="button"
                            onClick={() => setAuditFilterTab('all')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                              auditFilterTab === 'all'
                                ? 'bg-white text-[#1D1D1F] shadow-xs'
                                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                          >
                            Tous
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuditFilterTab('bloquant')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                              auditFilterTab === 'bloquant'
                                ? 'bg-white text-[#1D1D1F] shadow-xs'
                                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                          >
                            Bloquants
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuditFilterTab('conformite')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                              auditFilterTab === 'conformite'
                                ? 'bg-white text-[#1D1D1F] shadow-xs'
                                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                          >
                            Conformité
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
                        <CurvedDiagram3D
                          nodes={domainNodesForTable}
                          edges={domainEdgesForTable}
                          rules={currentProcess?.businessRules || []}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(nid) => {
                            setSelectedNodeId(nid);
                            setSelectedEdgeId(null);
                          }}
                          onUpdateNode={handleUpdateNode}
                          onAddNodeWithEdge={handleAddNodeFromTable}
                          onDeleteNode={handleDeleteNode}
                          onQuickCreateRuleForNode={handleQuickCreateRuleForNode}
                          onOpenRulesCatalog={() => setIsRulesCatalogOpen(true)}
                          onOpenDataDocumentsForStep={(nodeId) => {
                            setDataDocsInitialStepId(nodeId);
                            setIsDataDocumentsOpen(true);
                          }}
                          onAutoLayout={handleAutoLayout}
                          externalZoomTrigger={diagram3dZoomTrigger}
                          externalFitTrigger={diagram3dFitTrigger}
                          hideSubHeader
                          readOnly
                          auditSeverityByNodeId={filteredAuditFindingsByNode}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* WORKBENCH TAB 3: SIMULER (Split 50/50 Apple macOS HIG + CurvedDiagram3D) */}
                {workbenchTab === 'simulate' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full overflow-hidden divide-x divide-black/[0.07]">
                    <SimulateWorkbenchPanel
                      nodes={domainNodesForTable}
                      edges={domainEdgesForTable}
                      rules={currentProcess?.businessRules || []}
                      decisions={simDecisions}
                      onChangeDecision={(decNodeId: string, branchLabel: string) =>
                        setSimDecisions((prev) => ({ ...prev, [decNodeId]: branchLabel }))
                      }
                      onApplyPresetScenario={(presetDecisions: Record<string, string>) =>
                        setSimDecisions(presetDecisions)
                      }
                      onSelectNode={(nodeId: string) => {
                        setSelectedNodeId(nodeId);
                        setSelectedEdgeId(null);
                      }}
                      simulatedNodeIds={Array.from(simulatedPathNodeIds)}
                    />

                    {/* Right Pane: Carte du parcours simulé + Diagramme Apple HIG */}
                    <div className="h-full overflow-hidden flex flex-col bg-[#F5F5F7]">
                      <div className="h-12 px-4 border-b border-black/[0.07] bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[13.5px] text-[#1D1D1F] tracking-tight truncate">
                            Carte du parcours simulé
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#1D1D1F] font-semibold bg-white border border-black/[0.08] px-2.5 py-0.5 rounded-full shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                            {simulatedPathNodeIds.size} étapes traversées
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDiagram3dFitTrigger((n) => n + 1)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-black/[0.09] shadow-2xs transition cursor-pointer"
                        >
                          <span>Centrer le parcours</span>
                        </button>
                      </div>

                      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
                        <CurvedDiagram3D
                          nodes={domainNodesForTable}
                          edges={domainEdgesForTable}
                          rules={currentProcess?.businessRules || []}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(nid) => {
                            setSelectedNodeId(nid);
                            setSelectedEdgeId(null);
                          }}
                          onUpdateNode={handleUpdateNode}
                          onAddNodeWithEdge={handleAddNodeFromTable}
                          onDeleteNode={handleDeleteNode}
                          onQuickCreateRuleForNode={handleQuickCreateRuleForNode}
                          onOpenRulesCatalog={() => setIsRulesCatalogOpen(true)}
                          onOpenDataDocumentsForStep={(nodeId) => {
                            setDataDocsInitialStepId(nodeId);
                            setIsDataDocumentsOpen(true);
                          }}
                          onAutoLayout={handleAutoLayout}
                          externalZoomTrigger={diagram3dZoomTrigger}
                          externalFitTrigger={diagram3dFitTrigger}
                          hideSubHeader
                          readOnly
                          simulatedNodeIds={simulatedPathNodeIds}
                          simulatedEdgeIds={simulatedPathEdgeIds}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* WORKBENCH TAB 4: RECETTE (Split 50/50 Apple macOS HIG + CurvedDiagram3D) */}
                {workbenchTab === 'recette' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-full overflow-hidden divide-x divide-black/[0.07]">
                    <RecetteWorkbenchPanel
                      nodes={domainNodesForTable}
                      edges={domainEdgesForTable}
                      rules={currentProcess?.businessRules || []}
                      testCases={testCases}
                      onSelectTestCase={(tc: TestCase | null) =>
                        setSelectedTestCase((prev) =>
                          prev && tc && prev.id === tc.id ? null : tc
                        )
                      }
                      selectedTestCaseId={selectedTestCase?.id || null}
                      onOpenExportModal={() => setIsExportImportOpen(true)}
                    />

                    {/* Right Pane: Carte de couverture de recette + Diagramme Apple HIG */}
                    <div className="h-full overflow-hidden flex flex-col bg-[#F5F5F7]">
                      <div className="h-12 px-4 border-b border-black/[0.07] bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[13.5px] text-[#1D1D1F] tracking-tight truncate">
                            Carte de couverture de recette
                          </span>
                          <span className="text-xs text-[#6E6E73] truncate hidden xl:inline">
                            {selectedTestCase
                              ? `Scénario : ${selectedTestCase.title}`
                              : 'Cliquez sur une fiche de test pour illuminer son parcours'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDiagram3dFitTrigger((n) => n + 1)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-black/[0.09] shadow-2xs transition cursor-pointer"
                        >
                          <span>Ajuster la vue</span>
                        </button>
                      </div>

                      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
                        <CurvedDiagram3D
                          nodes={domainNodesForTable}
                          edges={domainEdgesForTable}
                          rules={currentProcess?.businessRules || []}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(nid) => {
                            setSelectedNodeId(nid);
                            setSelectedEdgeId(null);
                          }}
                          onUpdateNode={handleUpdateNode}
                          onAddNodeWithEdge={handleAddNodeFromTable}
                          onDeleteNode={handleDeleteNode}
                          onQuickCreateRuleForNode={handleQuickCreateRuleForNode}
                          onOpenRulesCatalog={() => setIsRulesCatalogOpen(true)}
                          onOpenDataDocumentsForStep={(nodeId) => {
                            setDataDocsInitialStepId(nodeId);
                            setIsDataDocumentsOpen(true);
                          }}
                          onAutoLayout={handleAutoLayout}
                          externalZoomTrigger={diagram3dZoomTrigger}
                          externalFitTrigger={diagram3dFitTrigger}
                          hideSubHeader
                          readOnly
                          simulatedNodeIds={
                            selectedTestCase && selectedTestCase.sourceNodeIds.length > 0
                              ? new Set(selectedTestCase.sourceNodeIds)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
                  </>
                )}
              </main>

              {/* Right Side Peek Drawer (Disabled in Modéliser 3D where Circle + HUD Windows handle all editing) */}
              {inspectorOpen && workbenchTab !== 'model' && (
                <PropertiesPanel
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  rules={currentProcess?.businessRules || []}
                  onUpdateNode={handleUpdateNode}
                  onUpdateEdge={handleUpdateEdge}
                  onDeleteNode={handleDeleteNode}
                  onDeleteEdge={handleDeleteEdge}
                  onClose={() => {
                    setInspectorOpen(false);
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                  }}
                  stepNumber={
                    selectedNode
                      ? domainNodesForTable.findIndex((n) => n.id === selectedNode.id) + 1
                      : undefined
                  }
                  onOpenDataDocumentsForStep={(nodeId) => {
                    setDataDocsInitialStepId(nodeId);
                    setIsDataDocumentsOpen(true);
                  }}
                />
              )}
            </div>

            {/* Bottom Collapsible Analysis & QA Workbench Drawer */}
            {currentProcess && (
              <AnalysisDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                activeTab={activeDrawerTab}
                onTabChange={setActiveDrawerTab}
                process={currentProcess}
                validation={validationResult}
                onRunValidation={handleRunValidation}
                simulation={simulationResult}
                onRunSimulation={handleRunSimulation}
                onClearSimulation={handleClearSimulation}
                testCases={testCases}
                onGenerateTestCases={handleGenerateTestCases}
                traceability={traceabilityResult}
                onFetchTraceability={handleFetchTraceability}
                analytics={analyticsResult}
                onFetchAnalytics={handleFetchAnalytics}
                onFocusElement={handleFocusElement}
              />
            )}
          </div>
        )}

        {/* CATEGORY 4: PROJETS & JALONS D'APPROBATION */}
        {activeSection === 'projects' && (
          <ProjectsWorkspaceView
            projects={projects}
            processes={processesList}
            categories={categories}
            tags={tags}
            collaborators={collaborators}
            approvals={approvals}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={async (payload) => {
              const { initialApprovals, ...projectPayload } = payload;
              const created = await api.createProject({
                ...projectPayload,
                ownerId: activeCollaborator?.id || null,
                ownerName: activeCollaborator?.name || 'Khalil Benhassen',
              });
              if (initialApprovals && initialApprovals.length > 0) {
                const targetProcessId =
                  created.processIds[0] || currentProcess?.id || 'demo-rachat-partiel';
                await Promise.all(
                  initialApprovals.map((label) =>
                    api.createApprovalGate({
                      projectId: created.id,
                      processId: targetProcessId,
                      label,
                      reviewerId: activeCollaborator?.id || null,
                      reviewerName: activeCollaborator?.name || 'Khalil Benhassen',
                    })
                  )
                );
              }
              const createdConv = await api.createConversation({
                title: `Fil Projet — ${created.name}`,
                conversationType: 'project_thread',
                projectId: created.id,
                processId: created.processIds[0] || currentProcess?.id || null,
                assigneeId: activeCollaborator?.id || null,
                participantIds:
                  created.memberIds && created.memberIds.length > 0
                    ? Array.from(
                        new Set([
                          ...created.memberIds,
                          ...(activeCollaborator?.id ? [activeCollaborator.id] : []),
                        ])
                      )
                    : collaborators.map((c) => c.id),
                tags: created.tags,
                initialMessage: `Nouvel espace d'échange ouvert pour le projet **${created.name}**.`,
                senderId: activeCollaborator?.id || 'collab-user-main',
              });
              await refreshSaaSEntities();
              setSelectedProjectId(created.id);
              setSelectedConversationId(createdConv.id);
            }}
            onUpdateProject={async (projId, payload) => {
              await api.updateProject(projId, payload);
              await refreshSaaSEntities();
            }}
            onDeleteProject={async (projId) => {
              await api.deleteProject(projId);
              await refreshSaaSEntities();
            }}
            onCreateCategory={async (name, color) => {
              await api.createCategory({ name, color });
              await refreshSaaSEntities();
            }}
            onDeleteCategory={async (catId) => {
              await api.deleteCategory(catId);
              await refreshSaaSEntities();
            }}
            onCreateTag={async (name, color) => {
              await api.createTag({ name, color, scope: 'global' });
              await refreshSaaSEntities();
            }}
            onDeleteTag={async (tagId) => {
              await api.deleteTag(tagId);
              await refreshSaaSEntities();
            }}
            onOpenProcessInStudio={(procId) => {
              loadProcessById(procId);
              setStudioShowGallery(false);
              setActiveSection('studio');
            }}
            onRestoreProcessVersionInStudio={(procId, versionId) => {
              handleRestoreProcessVersion(procId, versionId);
            }}
            onOpenNewProcessModal={() => setIsNewModalOpen(true)}
            onOpenProjectConversation={async (proj) => {
              setSelectedProjectId(proj.id);
              setActiveSection('conversations');
              const existing = conversations.find((c) => c.projectId === proj.id);
              if (existing) {
                setSelectedConversationId(existing.id);
              } else {
                const created = await api.createConversation({
                  title: `Fil Projet — ${proj.name}`,
                  conversationType: 'project_thread',
                  projectId: proj.id,
                  processId: proj.processIds[0] || currentProcess?.id || null,
                  assigneeId: activeCollaborator?.id || null,
                  participantIds:
                    proj.memberIds && proj.memberIds.length > 0
                      ? Array.from(
                          new Set([
                            ...proj.memberIds,
                            ...(activeCollaborator?.id ? [activeCollaborator.id] : []),
                          ])
                        )
                      : collaborators.map((c) => c.id),
                  tags: proj.tags,
                  initialMessage: `Espace d'échange ouvert pour le projet ${proj.name}.`,
                  senderId: activeCollaborator?.id || 'collab-user-main',
                });
                await refreshSaaSEntities();
                setSelectedConversationId(created.id);
              }
            }}
            onOpenScheduleMeeting={(projId) => {
              if (projId) setSelectedProjectId(projId);
              setIsMeetingModalOpen(true);
            }}
            onResetWorkspaceBlank={async () => {
              await api.resetWorkspaceBlank();
              await refreshSaaSEntities();
            }}
            onResetWorkspaceDemo={async () => {
              await api.resetWorkspaceDemo();
              await refreshSaaSEntities();
            }}
            onCreateApproval={async (projectId, processId, label) => {
              await api.createApprovalGate({
                projectId,
                processId,
                label,
                reviewerId: activeCollaborator?.id || null,
                reviewerName: activeCollaborator?.name || 'Khalil Benhassen',
              });
              await refreshSaaSEntities();
            }}
            onToggleApproval={async (approval) => {
              const nextStatus = approval.status === 'approved' ? 'pending' : 'approved';
              await api.updateApprovalGate(approval.id, {
                status: nextStatus,
              });
              await refreshSaaSEntities();
            }}
          />
        )}

        {/* CATEGORY 5: AGENDA & MICROSOFT OUTLOOK */}
        {activeSection === 'agenda' && (
          <AgendaView
            meetings={meetings}
            projects={projects}
            processes={processesList}
            collaborators={collaborators}
            onOpenScheduleModal={() => setIsMeetingModalOpen(true)}
            onSyncOutlook={async (meetingId) => {
              await api.syncMeetingOutlook(meetingId);
              await refreshSaaSEntities();
            }}
            onDeleteMeeting={async (meetingId) => {
              await api.deleteMeeting(meetingId);
              await refreshSaaSEntities();
            }}
            onOpenConversation={(convId) => {
              const targetConv = conversations.find((c) => c.id === convId);
              if (targetConv?.projectId) {
                setSelectedProjectId(targetConv.projectId);
              }
              setSelectedConversationId(convId);
              setActiveSection('conversations');
            }}
            onOpenProcessInStudio={(procId) => {
              loadProcessById(procId);
              setStudioShowGallery(false);
              setActiveSection('studio');
            }}
            onDirectChatWithSecretary={() => {
              const sec = collaborators.find((c) => c.id === 'agent-secretaire');
              if (sec) handleDirectChatWithCollaborator(sec);
            }}
          />
        )}

        {/* CATEGORY 6: ÉQUIPES & INTERVENANTS HUMAINS */}
        {activeSection === 'teams' && (
          <TeamsDirectoryView
            mode="humans_only"
            collaborators={collaborators}
            teams={teams}
            projects={projects}
            onOpenAgentBuilder={(agent) => {
              setAgentToEdit(agent || null);
              setIsAgentBuilderOpen(true);
            }}
            onDirectChatWithCollaborator={handleDirectChatWithCollaborator}
            onCreateHumanCollaborator={async (payload) => {
              await api.createCollaborator({
                ...payload,
                isAi: false,
                presenceStatus: 'online',
              });
              await refreshSaaSEntities();
            }}
            onUpdateCollaboratorTeam={async (collabId, teamId) => {
              await api.updateCollaborator(collabId, { teamId });
              await refreshSaaSEntities();
            }}
            onAssignTeamToProject={async (_teamId, projectId, memberIds) => {
              const targetProj = projects.find((p) => p.id === projectId);
              if (!targetProj) return;
              const mergedMembers = Array.from(
                new Set([...(targetProj.memberIds || []), ...memberIds])
              );
              await api.updateProject(projectId, { memberIds: mergedMembers });
              await refreshSaaSEntities();
            }}
            onDeleteCollaborator={async (collabId) => {
              await api.deleteCollaborator(collabId);
              await refreshSaaSEntities();
            }}
            onCreateTeam={async (name, color, description) => {
              await api.createTeam({ name, color, description });
              await refreshSaaSEntities();
            }}
            onDeleteTeam={async (teamId) => {
              await api.deleteTeam(teamId);
              await refreshSaaSEntities();
            }}
          />
        )}

        {/* CATEGORY 7: PARAMÈTRES, CATÉGORIES & TAGS */}
        {activeSection === 'settings' && (
          <SettingsAndTagsView
            categories={categories}
            tags={tags}
            onCreateCategory={async (name, color) => {
              await api.createCategory({ name, color });
              await refreshSaaSEntities();
            }}
            onDeleteCategory={async (catId) => {
              await api.deleteCategory(catId);
              await refreshSaaSEntities();
            }}
            onCreateTag={async (name, color) => {
              await api.createTag({ name, color, scope: 'global' });
              await refreshSaaSEntities();
            }}
            onDeleteTag={async (tagId) => {
              await api.deleteTag(tagId);
              await refreshSaaSEntities();
            }}
            onResetWorkspaceBlank={async () => {
              await api.resetWorkspaceBlank();
              await refreshSaaSEntities();
            }}
          />
        )}
      </div>

      {/* FLOATING BOTTOM CENTER macOS DOCK */}
      <MacDock
        activeTarget={activeSection}
        onSelectTarget={handleNavigateSection}
        unreadConversationsCount={projectScopedConversations.reduce(
          (acc, c) => acc + (c.unreadCount || 0),
          0
        )}
        aiAgentsCount={collaborators.filter((c) => c.isAi).length}
        rulesCount={currentProcess?.businessRules?.length || 0}
        projectsCount={projects.length}
        meetingsCount={meetings.length}
        humanCollaboratorsCount={collaborators.filter((c) => !c.isAi).length}
      />

      {/* Global & Studio Modals */}
      <ProcessListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        processes={processesList}
        currentProcessId={currentProcess?.id}
        onSelectProcess={(id) => {
          loadProcessById(id);
          setIsListModalOpen(false);
        }}
        onDeleteProcess={async (id) => {
          await api.deleteProcess(id);
          const list = await api.fetchProcesses();
          setProcessesList(list);
          if (currentProcess?.id === id && list.length > 0) {
            loadProcessById(list[0].id);
          }
        }}
      />

      <NewProcessModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={async (data) => {
          const created = await api.createProcess({
            ...data,
            projectId: selectedProjectId,
          });
          // Automatically inherit existing business rules from sibling processes in the same project
          if (selectedProjectId) {
            try {
              const siblings = processesList.filter(
                (p) => p.projectId === selectedProjectId && p.id !== created.id && p.ruleCount > 0
              );
              if (siblings.length > 0) {
                const siblingDetails = await Promise.all(
                  siblings.map((s) => api.fetchProcess(s.id).catch(() => null))
                );
                const seen = new Set<string>(
                  (created.businessRules || []).map((r) => r.id)
                );
                const inherited = [...(created.businessRules || [])];
                siblingDetails.forEach((proc) => {
                  (proc?.businessRules || []).forEach((rule) => {
                    if (!seen.has(rule.id)) {
                      seen.add(rule.id);
                      inherited.push(rule);
                    }
                  });
                });
                if (inherited.length > (created.businessRules || []).length) {
                  await api.updateProcess({
                    ...created,
                    businessRules: inherited,
                  });
                }
              }
            } catch (err) {
              console.warn('Could not inherit project business rules:', err);
            }
          }
          await refreshSaaSEntities();
          loadProcessById(created.id);
          setStudioShowGallery(false);
          setActiveSection('studio');
        }}
      />

      {currentProcess && (
        <ImportExportModal
          isOpen={isExportImportOpen}
          onClose={() => setIsExportImportOpen(false)}
          process={currentProcess}
          onProcessImported={(imported) => {
            refreshSaaSEntities();
            loadProcessById(imported.id);
          }}
        />
      )}

      {currentProcess && publishModalMode && (
        <PublishVersionModal
          isOpen={Boolean(publishModalMode)}
          onClose={() => setPublishModalMode(null)}
          processName={currentProcess.name}
          currentVersion={currentProcess.version || '1.0.0'}
          dialogMode={publishModalMode}
          isSubmitting={isPublishingVersion}
          onConfirm={handlePublishVersionConfirm}
        />
      )}

      {currentProcess && (
        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          processName={currentProcess.name}
          currentVersion={currentProcess.version || '1.0.0'}
          versions={currentProcessVersions}
          onRestoreVersion={(verId) =>
            handleRestoreProcessVersion(currentProcess.id, verId)
          }
        />
      )}

      <RulesCatalogModal
        isOpen={isRulesCatalogOpen}
        onClose={() => setIsRulesCatalogOpen(false)}
        rules={currentProcess?.businessRules || []}
        nodes={domainNodesForTable}
        canImportProjectRules={Boolean(
          currentProcess &&
            selectedProjectId &&
            processesList.some(
              (p) =>
                p.projectId === selectedProjectId &&
                p.id !== currentProcess.id &&
                p.ruleCount > 0
            )
        )}
        onImportProjectRules={async () => {
          if (!currentProcess || !selectedProjectId) return 0;
          const siblings = processesList.filter(
            (p) =>
              p.projectId === selectedProjectId &&
              p.id !== currentProcess.id &&
              p.ruleCount > 0
          );
          if (siblings.length === 0) return 0;
          const siblingDetails = await Promise.all(
            siblings.map((s) => api.fetchProcess(s.id).catch(() => null))
          );
          const existingIds = new Set(
            (currentProcess.businessRules || []).map((r) => r.id)
          );
          const merged = [...(currentProcess.businessRules || [])];
          let addedCount = 0;
          siblingDetails.forEach((proc) => {
            (proc?.businessRules || []).forEach((rule) => {
              if (!existingIds.has(rule.id)) {
                existingIds.add(rule.id);
                merged.push(rule);
                addedCount += 1;
              }
            });
          });
          if (addedCount > 0) {
            setCurrentProcess((prev) =>
              prev ? { ...prev, businessRules: merged } : prev
            );
            setHasUnsavedChanges(true);
          }
          return addedCount;
        }}
        onAddRule={() => {
          setRuleToEdit(null);
          setIsRuleModalOpen(true);
        }}
        onEditRule={(rule) => {
          setRuleToEdit(rule);
          setIsRuleModalOpen(true);
        }}
        onDeleteRule={handleDeleteRule}
      />

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setPendingRuleTargetNodeId(null);
        }}
        onSaveRule={handleSaveRule}
        ruleToEdit={ruleToEdit}
      />

      <DataDocumentsModal
        isOpen={isDataDocumentsOpen}
        onClose={() => {
          setIsDataDocumentsOpen(false);
          setDataDocsInitialStepId(null);
        }}
        nodes={domainNodesForTable}
        onUpdateNode={handleUpdateNode}
        onSelectNodeInInspector={(nodeId) => {
          setSelectedNodeId(nodeId);
          setSelectedEdgeId(null);
          if (workbenchTab === 'model') {
            if (studioMode === 'table') setStudioMode('split');
            setDiagram3dZoomTrigger((c) => c + 1);
          } else {
            setInspectorOpen(true);
          }
        }}
        initialStepId={dataDocsInitialStepId}
      />

      <AIAgentBuilderModal
        isOpen={isAgentBuilderOpen}
        onClose={() => {
          setIsAgentBuilderOpen(false);
          setAgentToEdit(null);
        }}
        agentToEdit={agentToEdit}
        teams={teams}
        onSaveAgent={async (payload) => {
          if (payload.id) {
            await api.updateCollaborator(payload.id, payload);
          } else {
            await api.createCollaborator({
              ...payload,
              isAi: true,
              presenceStatus: 'online',
            });
          }
          await refreshSaaSEntities();
        }}
        onDeleteAgent={async (agentId) => {
          await api.deleteCollaborator(agentId);
          await refreshSaaSEntities();
        }}
      />

      <MeetingSchedulerModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        projects={projects}
        processes={processesList}
        collaborators={collaborators}
        activeCollaborator={activeCollaborator}
        activeConversation={
          activeSection === 'conversations' ? selectedConversation : null
        }
        defaultProjectId={selectedProjectId}
        defaultProcessId={currentProcess?.id || null}
        onScheduleMeeting={async (payload) => {
          await api.createMeeting(payload);
          await refreshSaaSEntities();
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
