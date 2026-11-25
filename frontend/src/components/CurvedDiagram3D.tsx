import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  RotateCcw,
  Plus,
  ArrowUpRight,
  Paperclip,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  FileText,
  FileCheck,
  CheckSquare,
  Mail,
  Phone,
  FolderX,
  Database,
  Layers,
  Rows3,
  User,
  Cog,
  Hand,
  Table2,
  Camera,
  X,
  Sparkles,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  ProcessNode,
  ProcessEdge,
  BusinessRule,
  NodeType,
  ExecutionMode,
  BpmnTaskKind,
  BpmnGatewayKind,
} from '../types/process';
import { loadAttachedFilesMap } from './modals/DataDocumentsModal';
import { DiagramCaptureModal } from './modals/DiagramCaptureModal';
import { computeSwimlaneLayout } from '../utils/swimlaneLayout';
import {
  BPMN_TASK_KIND_META,
  BPMN_GATEWAY_KIND_META,
  resolveBpmnTaskKind,
  resolveBpmnGatewayKind,
} from '../utils/bpmnTaskKind';

interface CurvedDiagram3DProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  rules: BusinessRule[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNode: (updated: ProcessNode) => void;
  onAddNodeWithEdge: (
    type: NodeType,
    connectFromNodeId?: string,
    edgeLabel?: string,
    branchType?: 'nominal' | 'exception'
  ) => string;
  onDeleteNode: (nodeId: string) => void;
  onQuickCreateRuleForNode: (nodeId: string) => void;
  onOpenRulesCatalog: () => void;
  onOpenDataDocumentsForStep: (nodeId: string) => void;
  onAutoLayout?: () => void;
  onOpenExportModal?: () => void;
  /** Increment this counter from parent (e.g. Table "Ouvrir" button) to trigger HUD zoom on selectedNodeId */
  externalZoomTrigger?: number;
  /** Increment this counter from parent (e.g. Navbar FitView) to reset camera */
  externalFitTrigger?: number;
  /** Hide the internal top toolbar when embedded in Audit / Simulate panes that have their own header */
  hideSubHeader?: boolean;
  /** Read-only map mode (Audit / Simulate / Recette): disables radial action wheel, 4 HUD edit windows & inline editing */
  readOnly?: boolean;
  /** Audit mode: highlight nodes with severity badges ('error' | 'warning' | 'suggestion') */
  auditSeverityByNodeId?: Record<string, 'error' | 'warning' | 'suggestion'>;
  /** Simulate mode: highlight traversed nodes and dim non-traversed branches */
  simulatedNodeIds?: Set<string>;
  /** Simulate mode: highlight traversed edges in Apple Green */
  simulatedEdgeIds?: Set<string>;
  /** Switch to the dedicated Animated Finance Flow Diagram */
  onSwitchToAnimatedDiagram?: () => void;
}

const ZOOM_HUD_THRESHOLD = 165;
const ZOOM_HUD_TARGET = 220;

function formatCompactRuleBadge(ruleId: string): string {
  const clean = (ruleId || '').trim();
  const match = clean.match(/^RG-[A-Za-z]+-(\d+)$/i);
  if (match) return `RG-${match[1]}`;
  return clean.length > 8 ? clean.slice(0, 8) : clean;
}

function renderBpmnTaskIcon(kind: BpmnTaskKind, cls = 'w-4 h-4 stroke-[2]'): React.ReactNode {
  if (kind === 'service') return <Cog className={cls} />;
  if (kind === 'manual') return <Hand className={cls} />;
  if (kind === 'business_rule') return <Table2 className={cls} />;
  return <User className={cls} />;
}

function resolveCardVisuals(
  node: ProcessNode
): {
  bgStyle: string;
  iconColor: string;
  iconNode: React.ReactNode;
  taskKind?: BpmnTaskKind;
  gatewayKind?: BpmnGatewayKind;
} {
  const { type, label } = node;
  const lower = (label || '').toLowerCase();

  if (type === 'decision') {
    const gwKind = resolveBpmnGatewayKind(node);
    const gwMeta = BPMN_GATEWAY_KIND_META[gwKind];
    return {
      bgStyle: gwMeta.bgStyle,
      iconColor: gwMeta.iconColor,
      gatewayKind: gwKind,
      iconNode: (
        <span className="-rotate-45 text-[17px] font-extrabold leading-none inline-block">
          {gwMeta.symbol}
        </span>
      ),
    };
  }
  if (type === 'data') {
    return {
      bgStyle: '#F5F5F7',
      iconColor: '#1D1D1F',
      iconNode: <Database className="w-4 h-4 stroke-[2]" />,
    };
  }
  if (type === 'subprocess') {
    return {
      bgStyle: '#F5F5F7',
      iconColor: '#1D1D1F',
      iconNode: <Layers className="w-4 h-4 stroke-[2]" />,
    };
  }
  if (type === 'task') {
    const kind = resolveBpmnTaskKind(node);
    const meta = BPMN_TASK_KIND_META[kind];
    return {
      bgStyle: meta.bgStyle,
      iconColor: meta.iconColor,
      iconNode: renderBpmnTaskIcon(kind),
      taskKind: kind,
    };
  }
  if (
    lower.includes('rejet') ||
    lower.includes('refus') ||
    lower.includes('opposition') ||
    lower.includes('anomalie')
  ) {
    return {
      bgStyle: 'rgba(255, 59, 48, 0.10)',
      iconColor: '#C41E1A',
      iconNode: <AlertTriangle className="w-4 h-4 stroke-[2]" />,
    };
  }
  if (
    lower.includes('clôtur') ||
    lower.includes('clotur') ||
    lower.includes('forclusion') ||
    lower.includes('caduc')
  ) {
    return {
      bgStyle: 'rgba(255, 59, 48, 0.10)',
      iconColor: '#C41E1A',
      iconNode: <FolderX className="w-4 h-4 stroke-[2]" />,
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
      bgStyle: '#F5F5F7',
      iconColor: '#1D1D1F',
      iconNode: <Mail className="w-4 h-4 stroke-[2]" />,
    };
  }
  if (lower.includes('suivi') || lower.includes('appel') || lower.includes('contact')) {
    return {
      bgStyle: '#F5F5F7',
      iconColor: '#1D1D1F',
      iconNode: <Phone className="w-4 h-4 stroke-[2]" />,
    };
  }
  if (
    lower.includes('réception') ||
    lower.includes('reception') ||
    lower.includes('dépôt') ||
    lower.includes('depot')
  ) {
    return {
      bgStyle: '#F5F5F7',
      iconColor: '#1D1D1F',
      iconNode: <FileText className="w-4 h-4 stroke-[2]" />,
    };
  }
  if (
    lower.includes('valid') ||
    lower.includes('ordonnanc') ||
    lower.includes('virement') ||
    lower.includes('émission') ||
    lower.includes('emission')
  ) {
    return {
      bgStyle: '#F5F5F7',
      iconColor: '#1D1D1F',
      iconNode: <CheckSquare className="w-4 h-4 stroke-[2]" />,
    };
  }
  return {
    bgStyle: '#F5F5F7',
    iconColor: '#1D1D1F',
    iconNode: <FileCheck className="w-4 h-4 stroke-[2]" />,
  };
}

function truncateCleanLabel(text: string, maxLen = 26): string {
  const s = text.trim();
  if (s.length <= maxLen) return s.toUpperCase();
  const cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 10 ? cut.slice(0, lastSpace) : cut).trim()}…`.toUpperCase();
}

function resolveEdgeVisual(
  rawLabel: string | undefined,
  isFromDecision: boolean
): { color: string; pillText?: string; dotColor?: string } {
  const clean = (rawLabel || '').trim();
  const lower = clean.toLowerCase();
  const appleLineGray = '#AEAEB2';

  if (!isFromDecision || !clean) {
    return { color: appleLineGray, pillText: undefined, dotColor: undefined };
  }

  const hasOppRej = !lower.includes('sans opposition') && lower.includes('opposition');
  if (
    lower.includes('rejet') ||
    lower.includes('refus') ||
    lower.includes('inéligible') ||
    lower.includes('ineligible') ||
    hasOppRej ||
    lower === 'non' ||
    lower.startsWith('non ')
  ) {
    const txt =
      lower.includes('inéligible') || hasOppRej || lower.includes('rejet')
        ? 'REJET'
        : lower.includes('refus') || lower.includes('non')
        ? 'NON'
        : truncateCleanLabel(clean, 24);
    return { color: appleLineGray, pillText: txt, dotColor: '#FF3B30' };
  }

  if (
    lower.includes('incomplet') ||
    lower.includes('expiré') ||
    lower.includes('expire') ||
    lower.includes('caduc') ||
    lower.includes('forclusion') ||
    lower.includes('supérieur') ||
    lower.includes('superieur') ||
    lower.includes('>=') ||
    lower.includes('≥') ||
    lower.includes('attente')
  ) {
    const amountMatch = clean.match(/(\d[\d\s\u00A0]*)\s*€/);
    const amountLabel = amountMatch
      ? `≥ ${amountMatch[1].replace(/\s+/g, ' ').trim()} €`
      : null;
    const txt = lower.includes('incomplet')
      ? 'INCOMPLET'
      : lower.includes('expiré') || lower.includes('expire')
      ? 'EXPIRÉ'
      : amountLabel
      ? amountLabel
      : truncateCleanLabel(clean, 26);
    return { color: appleLineGray, pillText: txt, dotColor: '#FF9500' };
  }

  const lowerAmountMatch = clean.match(/(\d[\d\s\u00A0]*)\s*€/);
  const txt =
    (lower.includes('inférieur') || lower.includes('inferieur') || lower.includes('<')) &&
    lowerAmountMatch
      ? `< ${lowerAmountMatch[1].replace(/\s+/g, ' ').trim()} €`
      : lower.includes('conforme') || lower.includes('complet')
      ? 'CONFORME'
      : lower.includes('éligible') ||
        lower.includes('eligible') ||
        lower.includes('oui') ||
        lower.includes('valide')
      ? 'OUI'
      : lower.includes('reçues') || lower.includes('recues')
      ? 'REÇUES'
      : truncateCleanLabel(clean, 26);
  return { color: appleLineGray, pillText: txt, dotColor: '#34C759' };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildAnnularSectorPath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polarToCartesian(cx, cy, rOut, endDeg);
  const p2 = polarToCartesian(cx, cy, rOut, startDeg);
  const p3 = polarToCartesian(cx, cy, rIn, startDeg);
  const p4 = polarToCartesian(cx, cy, rIn, endDeg);
  return `M ${p1.x} ${p1.y} A ${rOut} ${rOut} 0 0 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rIn} ${rIn} 0 0 1 ${p4.x} ${p4.y} Z`;
}

export const CurvedDiagram3D: React.FC<CurvedDiagram3DProps> = ({
  nodes,
  edges,
  rules,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  onAddNodeWithEdge,
  onDeleteNode,
  onQuickCreateRuleForNode,
  onOpenRulesCatalog,
  onOpenDataDocumentsForStep,
  onAutoLayout,
  externalZoomTrigger = 0,
  externalFitTrigger = 0,
  hideSubHeader = false,
  readOnly = false,
  auditSeverityByNodeId,
  simulatedNodeIds,
  simulatedEdgeIds,
  onSwitchToAnimatedDiagram,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 1100, h: 680 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureResult, setCaptureResult] = useState<{
    dataUrl: string;
    fileName: string;
    modeLabel: string;
    dimensions: { width: number; height: number };
  } | null>(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && rootRef.current) {
        await rootRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if fullscreen is blocked by browser policy
    }
  }, []);

  // Strict user requirement: The circle ONLY appears when the user presses on a step
  const [circleOpenForId, setCircleOpenForId] = useState<string | null>(null);
  const [ringSubMenu, setRingSubMenu] = useState<'branch' | 'role' | 'rg' | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);

  // Camera pan, 3D curvature toggle, Swimlanes toggle (OFF by default), free visual zoom vs HUD inspection zoom
  const [isCurved, setIsCurved] = useState<boolean>(false);
  const [isSwimlanes, setIsSwimlanes] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);
  const [zoomHudMode, setZoomHudMode] = useState<boolean>(false);
  const [isHudForceOpen, setIsHudForceOpen] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; px: number; py: number }>({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
  });

  // Attached files map from DataDocumentsModal localStorage
  const [attachedFilesCountByNode, setAttachedFilesCountByNode] = useState<Record<string, number>>(
    {}
  );
  const [newInputText, setNewInputText] = useState('');

  const refreshAttachedFiles = useCallback(() => {
    const map = loadAttachedFilesMap();
    const counts: Record<string, number> = {};
    nodes.forEach((n) => {
      let total = 0;
      const seenKeys = new Set<string>();
      (n.inputs || []).forEach((inp) => {
        const scopedKey = `${n.id}::input::${inp}`;
        if (Array.isArray(map[scopedKey]) && !seenKeys.has(scopedKey)) {
          total += map[scopedKey].length;
          seenKeys.add(scopedKey);
        } else if (Array.isArray(map[inp]) && !seenKeys.has(`plain::${inp}`)) {
          total += map[inp].length;
          seenKeys.add(`plain::${inp}`);
        }
      });
      (n.outputs || []).forEach((outp) => {
        const scopedKey = `${n.id}::output::${outp}`;
        if (Array.isArray(map[scopedKey]) && !seenKeys.has(scopedKey)) {
          total += map[scopedKey].length;
          seenKeys.add(scopedKey);
        } else if (Array.isArray(map[outp]) && !seenKeys.has(`plain::${outp}`)) {
          total += map[outp].length;
          seenKeys.add(`plain::${outp}`);
        }
      });
      if (Array.isArray(map[n.id])) {
        total += map[n.id].length;
      }
      counts[n.id] = total;
    });
    setAttachedFilesCountByNode(counts);
  }, [nodes]);

  useEffect(() => {
    refreshAttachedFiles();
    window.addEventListener('pa-attached-files-updated', refreshAttachedFiles);
    window.addEventListener('storage', refreshAttachedFiles);
    return () => {
      window.removeEventListener('pa-attached-files-updated', refreshAttachedFiles);
      window.removeEventListener('storage', refreshAttachedFiles);
    };
  }, [refreshAttachedFiles]);

  // Measure container dynamically (handles Split 50/50 mode vs Full Diagram mode seamlessly)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      setStageSize({ w: el.clientWidth || 900, h: el.clientHeight || 620 });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isCompactSplit = stageSize.w < 960;
  const isHudOpen =
    !readOnly &&
    Boolean(selectedNodeId) &&
    (isHudForceOpen || (zoomHudMode && zoom >= ZOOM_HUD_THRESHOLD));

  // BPMN 2.0 Swimlanes layout (computed dynamically when isSwimlanes is active)
  const swimlaneLayout = useMemo(
    () => (isSwimlanes ? computeSwimlaneLayout(nodes, edges) : null),
    [isSwimlanes, nodes, edges]
  );

  // Graph bounding box & base fit scale so the entire curved wall or swimlanes fits comfortably at Zoom 100%
  const graphBounds = useMemo(() => {
    if (swimlaneLayout) {
      return {
        minX: 0,
        maxX: swimlaneLayout.totalWidth,
        minY: 0,
        maxY: swimlaneLayout.totalHeight,
        midX: swimlaneLayout.totalWidth / 2,
        midY: swimlaneLayout.totalHeight / 2,
        spanX: Math.max(600, swimlaneLayout.totalWidth),
        spanY: Math.max(360, swimlaneLayout.totalHeight),
      };
    }
    if (nodes.length === 0) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 600, midX: 500, midY: 300, spanX: 1000, spanY: 600 };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodes.forEach((n) => {
      const isTerm = n.type === 'start' || n.type === 'end';
      const w = isTerm ? 54 : 244;
      const h = isTerm ? 54 : 88;
      if (n.position.x - (isTerm ? 64 : 0) < minX) minX = n.position.x - (isTerm ? 64 : 0);
      if (n.position.x + w + (isTerm ? 64 : 0) > maxX) maxX = n.position.x + w + (isTerm ? 64 : 0);
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.y + h + (isTerm ? 44 : 0) > maxY) maxY = n.position.y + h + (isTerm ? 44 : 0);
    });
    const spanX = Math.max(600, maxX - minX);
    const spanY = Math.max(360, maxY - minY);
    return {
      minX,
      maxX,
      minY,
      maxY,
      midX: (minX + maxX) / 2,
      midY: (minY + maxY) / 2,
      spanX,
      spanY,
    };
  }, [nodes, swimlaneLayout]);

  const baseFitScale = useMemo(() => {
    const fitW = (stageSize.w * 0.94) / (graphBounds.spanX + 80);
    const fitH = (stageSize.h * 0.84) / (graphBounds.spanY + 130);
    return Math.max(0.38, Math.min(0.95, Math.min(fitW, fitH)));
  }, [stageSize.w, stageSize.h, graphBounds.spanX, graphBounds.spanY]);

  const handleCaptureDiagram = useCallback(async () => {
    if (!worldRef.current || isCapturing) return;
    setIsCapturing(true);
    setCircleOpenForId(null);
    setIsHudForceOpen(false);
    setRingSubMenu(null);

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    let clipper: HTMLDivElement | null = null;
    try {
      const pad = 72;
      const exportW = Math.max(
        600,
        Math.ceil(graphBounds.maxX - graphBounds.minX + pad * 2)
      );
      const exportH = Math.max(
        360,
        Math.ceil(graphBounds.maxY - graphBounds.minY + pad * 2)
      );
      const shiftX = Math.round(-graphBounds.minX + pad);
      const shiftY = Math.round(-graphBounds.minY + pad);
      const pixelRatio = exportW > 3200 ? 1.5 : 2;

      // Invisible 0x0 viewport clipper so the captured host itself stays at (0, 0) with zero off-screen offset!
      clipper = document.createElement('div');
      clipper.style.position = 'fixed';
      clipper.style.left = '0px';
      clipper.style.top = '0px';
      clipper.style.width = '0px';
      clipper.style.height = '0px';
      clipper.style.overflow = 'hidden';
      clipper.style.pointerEvents = 'none';
      clipper.style.zIndex = '-1';

      const host = document.createElement('div');
      host.style.position = 'relative';
      host.style.left = '0px';
      host.style.top = '0px';
      host.style.width = `${exportW}px`;
      host.style.height = `${exportH}px`;
      host.style.backgroundColor = '#FFFFFF';
      host.style.overflow = 'hidden';

      const worldClone = worldRef.current.cloneNode(true) as HTMLDivElement;
      worldClone.style.position = 'absolute';
      worldClone.style.left = `${shiftX}px`;
      worldClone.style.top = `${shiftY}px`;
      worldClone.style.width = '0px';
      worldClone.style.height = '0px';
      worldClone.style.transform = 'none';
      worldClone.style.transition = 'none';

      host.appendChild(worldClone);
      clipper.appendChild(host);
      document.body.appendChild(clipper);

      const dataUrl = await toPng(host, {
        pixelRatio,
        width: exportW,
        height: exportH,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });

      const modeLabel = isSwimlanes
        ? 'BPMN Swimlanes'
        : isCurved
        ? 'Spatial 3D'
        : 'Diagramme BPMN';
      const modeSlug = isSwimlanes
        ? 'swimlanes'
        : isCurved
        ? 'spatial3d'
        : 'bpmn';

      setCaptureResult({
        dataUrl,
        fileName: `diagramme_${modeSlug}_${new Date().toISOString().slice(0, 10)}.png`,
        modeLabel,
        dimensions: {
          width: Math.round(exportW * pixelRatio),
          height: Math.round(exportH * pixelRatio),
        },
      });
    } catch (err) {
      console.error('Diagram capture failed:', err);
    } finally {
      if (clipper && clipper.parentNode) {
        clipper.parentNode.removeChild(clipper);
      }
      setIsCapturing(false);
    }
  }, [graphBounds, isCapturing, isCurved, isSwimlanes]);

  //Respond to external triggers (Table "Ouvrir" button or Navbar "FitView")
  useEffect(() => {
    if (readOnly) return;
    if (externalZoomTrigger > 0 && selectedNodeId) {
      setCircleOpenForId(selectedNodeId);
      setRingSubMenu(null);
      setPan({ x: 0, y: 0 });
      setIsHudForceOpen(true);
      setZoom(ZOOM_HUD_TARGET);
    }
  }, [externalZoomTrigger, selectedNodeId, readOnly]);

  useEffect(() => {
    if (externalFitTrigger > 0) {
      setPan({ x: 0, y: 0 });
      setZoom(100);
      setIsHudForceOpen(false);
      setRingSubMenu(null);
    }
  }, [externalFitTrigger]);

  // Keep circle & HUD closed if readOnly, or if selectedNodeId was cleared externally or deleted
  useEffect(() => {
    if (readOnly || !selectedNodeId) {
      setCircleOpenForId(null);
      setIsHudForceOpen(false);
      setRingSubMenu(null);
    } else if (circleOpenForId && circleOpenForId !== selectedNodeId) {
      setCircleOpenForId(selectedNodeId);
      setRingSubMenu(null);
    }
  }, [selectedNodeId, circleOpenForId, readOnly]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const selectedIndex = useMemo(
    () => (selectedNodeId ? nodes.findIndex((n) => n.id === selectedNodeId) : -1),
    [nodes, selectedNodeId]
  );

  const totalDurationMinutes = useMemo(
    () => nodes.reduce((acc, n) => acc + (n.estimatedDurationMinutes || 0), 0),
    [nodes]
  );

  const availableRoles = useMemo(() => {
    const preset = [
      'Gestionnaire Back-Office',
      'Gestionnaire Sinistres & Épargne',
      'Système de notification',
      'Moteur de calcul fiscal',
      'Responsable Conformité',
    ];
    const fromNodes = nodes
      .map((n) => (n.ownerRole || '').trim())
      .filter((r) => r.length > 0 && !r.endsWith('?'));
    return Array.from(new Set([...fromNodes, ...preset])).slice(0, 7);
  }, [nodes]);

  // Center of the concave 3D panoramic curve (NO wall borders — floating curved surface in space!)
  const curveFocusX = useMemo(() => {
    if (isHudOpen && selectedNode) {
      const w = selectedNode.type === 'start' || selectedNode.type === 'end' ? 188 : 244;
      return selectedNode.position.x + w / 2;
    }
    const effectiveScale = baseFitScale * (zoom / 100);
    return graphBounds.midX - pan.x / Math.max(0.25, effectiveScale);
  }, [isHudOpen, zoom, selectedNode, graphBounds.midX, pan.x, baseFitScale]);

  // Logical step numbering: 01, 02, 03... along the nominal path, and 02.a, 02.b / 04.a / 06.a on branches
  const stepCodeByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    if (nodes.length === 0) return map;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const outBySrc = new Map<string, ProcessEdge[]>();
    nodes.forEach((n) => outBySrc.set(n.id, []));
    edges.forEach((e) => {
      if (outBySrc.has(e.sourceNodeId) && nodeMap.has(e.targetNodeId)) {
        outBySrc.get(e.sourceNodeId)!.push(e);
      }
    });

    const startNode = nodes.find((n) => n.type === 'start') || nodes[0];
    const nominalDecisions: { code: string; outs: ProcessEdge[] }[] = [];
    let mainCounter = 1;
    let curr: ProcessNode | undefined = startNode;
    const visited = new Set<string>();

    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      const outs: ProcessEdge[] = outBySrc.get(curr.id) || [];
      if (curr.type !== 'start' && curr.type !== 'end') {
        const code = String(mainCounter++).padStart(2, '0');
        map.set(curr.id, code);
        if (outs.length > 1) {
          nominalDecisions.push({ code, outs: outs.slice(1) });
        }
      }
      curr = outs[0] ? nodeMap.get(outs[0].targetNodeId) : undefined;
    }

    const letters = 'abcdefghijklmnopqrstuvwxyz';
    nominalDecisions.forEach(({ code, outs }) => {
      let subIdx = 0;
      const queue = outs.map((e) => e.targetNodeId);
      while (queue.length > 0) {
        const nid = queue.shift()!;
        if (visited.has(nid)) continue;
        visited.add(nid);
        const nObj = nodeMap.get(nid);
        if (!nObj) continue;
        if (nObj.type !== 'start' && nObj.type !== 'end') {
          const suffix = letters[subIdx] || String(subIdx + 1);
          map.set(nid, `${code}.${suffix}`);
          subIdx += 1;
        }
        (outBySrc.get(nid) || []).forEach((ne) => {
          if (!visited.has(ne.targetNodeId)) {
            queue.push(ne.targetNodeId);
          }
        });
      }
    });

    nodes.forEach((n) => {
      if (n.type !== 'start' && n.type !== 'end' && !map.has(n.id)) {
        map.set(n.id, String(mainCounter++).padStart(2, '0'));
      }
    });

    return map;
  }, [nodes, edges]);

  // Compute 3D coordinates for every node (flat 3D plane by default; concave panoramic arc when isCurved is enabled)
  const curvedGeometryByNode = useMemo(() => {
    const R = isCompactSplit ? 1450 : 1850; // Concave panoramic cylinder radius
    const maxAngleRad = 0.62; // ~35.5° max inward wing angle so cards stay crisp and legible
    const map = new Map<
      string,
      {
        cx: number;
        cy: number;
        cz: number;
        alphaRad: number;
        alphaDeg: number;
        w: number;
        h: number;
      }
    >();

    nodes.forEach((n) => {
      const isTerm = n.type === 'start' || n.type === 'end';
      const w = isTerm ? 54 : 244;
      const h = isTerm ? 54 : 88;
      const effPos = swimlaneLayout?.nodePositions[n.id] || n.position;
      const rawCenterX = effPos.x + w / 2;
      const rawCenterY = effPos.y + h / 2;

      if (!isCurved || isSwimlanes) {
        map.set(n.id, {
          cx: rawCenterX,
          cy: rawCenterY,
          cz: 0,
          alphaRad: 0,
          alphaDeg: 0,
          w,
          h,
        });
        return;
      }

      const rawTheta = (rawCenterX - curveFocusX) / R;
      const theta = Math.max(-maxAngleRad, Math.min(maxAngleRad, rawTheta));
      // Flatten curvature slightly when deeply zoomed in HUD mode on the selected node so center card faces 0°
      const zoomFlatten = isHudOpen ? 0.55 : 1.0;
      const effTheta = theta * zoomFlatten;

      const curvedCenterX = curveFocusX + R * Math.sin(effTheta);
      // Concave wall: left & right wings curve FORWARD (+Z) toward the viewer!
      const curvedCenterZ = R * (1 - Math.cos(effTheta)) * 1.35;
      // CSS 3D right-handed rotateY: alpha = -effTheta makes left wing (+deg) & right wing (-deg) face inward toward viewer
      const alphaRad = -effTheta;
      const alphaDeg = (alphaRad * 180) / Math.PI;

      map.set(n.id, {
        cx: curvedCenterX,
        cy: rawCenterY,
        cz: curvedCenterZ,
        alphaRad,
        alphaDeg,
        w,
        h,
      });
    });

    return map;
  }, [nodes, curveFocusX, isCompactSplit, isHudOpen, isCurved, isSwimlanes, swimlaneLayout]);

  // Navigate to previous / next step while staying in Zoom HUD mode (Improvement A3.1)
  const navigateStep = useCallback(
    (delta: number) => {
      if (nodes.length === 0) return;
      const curIdx = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIdx = (curIdx + delta + nodes.length) % nodes.length;
      const target = nodes[nextIdx];
      onSelectNode(target.id);
      setCircleOpenForId(target.id);
      setRingSubMenu(null);
      setInlineEditId(null);
      setPan({ x: 0, y: 0 });
    },
    [nodes, selectedIndex, onSelectNode]
  );

  // Keyboard shortcuts: ArrowLeft / ArrowRight in HUD Zoom mode, Escape to close HUD / Circle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (isHudOpen) {
          setIsHudForceOpen(false);
          setZoom(100);
          setPan({ x: 0, y: 0 });
          setRingSubMenu(null);
        } else {
          setCircleOpenForId(null);
          setRingSubMenu(null);
          onSelectNode(null);
        }
      } else if (isHudOpen && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateStep(1);
      } else if (isHudOpen && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateStep(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isHudOpen, navigateStep, onSelectNode]);

  // Helper: find node closest in 2D world space to a given client (screen) point
  const findNearestNodeToClientPoint = useCallback(
    (clientX: number, clientY: number, domTarget?: EventTarget | null): ProcessNode | null => {
      if (nodes.length === 0) return null;
      const hoveredEl = (domTarget as HTMLElement | null)?.closest?.('[data-node-id]');
      const hoveredId = hoveredEl?.getAttribute('data-node-id');
      if (hoveredId) {
        const exact = nodes.find((n) => n.id === hoveredId);
        if (exact) return exact;
      }

      const el = stageRef.current;
      if (!el) return nodes[0];
      const rect = el.getBoundingClientRect();
      const currentScale = Math.max(0.2, baseFitScale * (zoom / 100));
      const mx = clientX - (rect.left + rect.width / 2);
      const my = clientY - (rect.top + rect.height / 2);
      const approxWorldX = graphBounds.midX + (mx - pan.x) / currentScale;
      const approxWorldY = graphBounds.midY + (my - pan.y) / currentScale;

      let best = nodes[0];
      let bestDist = Infinity;
      nodes.forEach((n) => {
        const geo = curvedGeometryByNode.get(n.id);
        const isTerm = n.type === 'start' || n.type === 'end';
        const cx = geo ? geo.cx : n.position.x + (isTerm ? 76 : 118);
        const cy = geo ? geo.cy : n.position.y + (isTerm ? 27 : 40);
        const d = Math.hypot(cx - approxWorldX, cy - approxWorldY);
        if (d < bestDist) {
          bestDist = d;
          best = n;
        }
      });
      return best;
    },
    [
      nodes,
      curvedGeometryByNode,
      baseFitScale,
      zoom,
      graphBounds.midX,
      graphBounds.midY,
      pan.x,
      pan.y,
    ]
  );

  // Strict Dual Zoom behavior:
  // - When "Zoom Infos" button is OFF (zoomHudMode === false):
  //     Zooming (wheel / touchpad / slider) ONLY magnifies visually (50% -> 280%) centered on cursor.
  //     Zoom Info NEVER opens from zooming — ONLY from double-clicking an element!
  // - When "Zoom Infos" button is ON (zoomHudMode === true, blue button):
  //     Zooming onto an element locks onto the element under cursor and opens Zoom Info (Circle + HUD)!
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow normal scrolling inside HUD scrollable lists if any
      if ((e.target as HTMLElement)?.closest('.hud-scroll-area')) return;
      e.preventDefault();

      const stepDelta = e.deltaY < 0 ? 18 : -18;
      const nextZoom = Math.max(50, Math.min(280, zoom + stepDelta));
      if (nextZoom === zoom) return;

      // If HUD was opened via double-click while "Zoom Infos" is OFF, allow scrolling out to exit HUD
      if (isHudForceOpen && !zoomHudMode) {
        if (e.deltaY > 0 && nextZoom < ZOOM_HUD_THRESHOLD) {
          setIsHudForceOpen(false);
          setPan({ x: 0, y: 0 });
        }
        setZoom(nextZoom);
        return;
      }

      // Mode A: "Zoom Infos" button is ACTIVE (blue) -> zooming onto an element opens Zoom Info where the user zooms!
      if (zoomHudMode) {
        if (!isHudOpen) {
          if (stepDelta > 0) {
            const targetNode = findNearestNodeToClientPoint(
              e.clientX,
              e.clientY,
              e.target
            );
            if (nextZoom >= ZOOM_HUD_THRESHOLD && targetNode) {
              onSelectNode(targetNode.id);
              setCircleOpenForId(targetNode.id);
              setPan({ x: 0, y: 0 });
              setZoom(nextZoom);
              return;
            }
          }
          // Below threshold: smooth cursor-centered approach toward the element being zoomed
          const rect = el.getBoundingClientRect();
          const mx = e.clientX - (rect.left + rect.width / 2);
          const my = e.clientY - (rect.top + rect.height / 2);
          const ratio = nextZoom / zoom;
          setPan((prevPan) => ({
            x: mx - (mx - prevPan.x) * ratio,
            y: my - (my - prevPan.y) * ratio,
          }));
          setZoom(nextZoom);
          return;
        }

        // Already inside HUD in zoomHudMode: zooming below threshold returns to global view
        if (stepDelta < 0 && nextZoom < ZOOM_HUD_THRESHOLD) {
          setIsHudForceOpen(false);
          setPan({ x: 0, y: 0 });
        }
        setZoom(nextZoom);
        return;
      }

      // Mode B: "Zoom Infos" button is DEACTIVATED -> 100% pure visual zoom centered on cursor (NEVER opens HUD/circle!)
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - (rect.left + rect.width / 2);
      const my = e.clientY - (rect.top + rect.height / 2);
      const ratio = nextZoom / zoom;
      setPan((prevPan) => ({
        x: mx - (mx - prevPan.x) * ratio,
        y: my - (my - prevPan.y) * ratio,
      }));
      setZoom(nextZoom);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [
    zoom,
    zoomHudMode,
    isHudOpen,
    isHudForceOpen,
    findNearestNodeToClientPoint,
    onSelectNode,
  ]);

  // Drag-to-pan on empty background
  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.curved-node-card') ||
      (e.target as HTMLElement).closest('.scifi-hud-panel') ||
      (e.target as HTMLElement).closest('.hud-bottom-pill') ||
      (e.target as HTMLElement).closest('.radial-command-ring')
    ) {
      return;
    }
    setIsDraggingStage(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };

  useEffect(() => {
    if (!isDraggingStage) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({ x: dragStartRef.current.px + dx, y: dragStartRef.current.py + dy });
    };
    const onUp = () => setIsDraggingStage(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingStage]);

  const handleStageClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.curved-node-card') ||
      (e.target as HTMLElement).closest('.scifi-hud-panel') ||
      (e.target as HTMLElement).closest('.hud-bottom-pill') ||
      (e.target as HTMLElement).closest('.radial-command-ring')
    ) {
      return;
    }
    // Clicking empty space hides the circle (and exits HUD zoom if open)
    setRingSubMenu(null);
    setInlineEditId(null);
    if (isHudOpen) {
      setIsHudForceOpen(false);
      setZoom(100);
      setPan({ x: 0, y: 0 });
    } else {
      setCircleOpenForId(null);
      onSelectNode(null);
    }
  };

  // Single click on step -> ONLY shows the 6-sector Radial Circle around that step (disabled in readOnly mode)
  const handleCardClick = (e: React.MouseEvent, node: ProcessNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    if (readOnly) return;
    setCircleOpenForId(node.id);
    setRingSubMenu(null);
  };

  // Double click on step -> Toggles Focus HUD Zoom (Circle + 4 HUD info windows) on that step (disabled in readOnly mode)
  const handleCardDoubleClick = (e: React.MouseEvent, node: ProcessNode) => {
    e.stopPropagation();
    if (readOnly) return;
    onSelectNode(node.id);
    setCircleOpenForId(node.id);
    setRingSubMenu(null);
    setInlineEditId(null);
    setPan({ x: 0, y: 0 });
    if (isHudOpen && selectedNodeId === node.id) {
      setIsHudForceOpen(false);
      setZoom(100);
    } else {
      setIsHudForceOpen(true);
      setZoom(ZOOM_HUD_TARGET);
    }
  };

  // World camera transform:
  // - Flat mode (!isCurved): Pure 2D integer-pixel translate + scale (NO rotateX / scale3d / preserve-3d)
  //   so Chromium/Edge always renders native HiDPI vector-sharp fonts at every zoom level!
  // - Curved mode (isCurved): Full 3D panoramic perspective camera.
  const worldTransformStyle = useMemo(() => {
    if (isHudOpen && selectedNode) {
      const scale =
        (isCompactSplit ? 0.78 : 0.94) *
        (Math.max(ZOOM_HUD_THRESHOLD, zoom) / ZOOM_HUD_TARGET);
      const geo = curvedGeometryByNode.get(selectedNode.id);
      const targetX = geo ? geo.cx : selectedNode.position.x + 122;
      const targetY = geo ? geo.cy : selectedNode.position.y + 44;
      const offsetX = -targetX * scale + pan.x;
      const offsetY = -targetY * scale + pan.y;
      if (!isCurved) {
        return `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px) scale(${scale})`;
      }
      const tiltX = Math.max(3, 12 - (Math.max(135, zoom) - 135) * 0.08);
      return `translate3d(${offsetX}px, ${offsetY}px, 0px) rotateX(${tiltX}deg) scale3d(${scale}, ${scale}, ${scale})`;
    }

    const scale = baseFitScale * (zoom / 100);
    const offsetX = -graphBounds.midX * scale + pan.x;
    const offsetY = -graphBounds.midY * scale + pan.y;
    if (!isCurved) {
      return `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px) scale(${scale})`;
    }
    return `translate3d(${offsetX}px, ${offsetY}px, 0px) rotateX(11deg) scale3d(${scale}, ${scale}, ${scale})`;
  }, [
    isHudOpen,
    isCurved,
    zoom,
    isCompactSplit,
    baseFitScale,
    selectedNode,
    curvedGeometryByNode,
    pan.x,
    pan.y,
    graphBounds.midX,
    graphBounds.midY,
  ]);

  // ==================== 6-SECTOR RADIAL COMMAND ACTIONS ====================
  const handleSectorAddTask = (node: ProcessNode) => {
    if (node.type === 'decision') {
      setRingSubMenu((prev) => (prev === 'branch' ? null : 'branch'));
      return;
    }
    const newId = onAddNodeWithEdge('task', node.id, undefined, 'nominal');
    setCircleOpenForId(newId);
    setRingSubMenu(null);
    setInlineEditId(newId);
  };

  const handleSectorAddDecision = (node: ProcessNode) => {
    const newId = onAddNodeWithEdge('decision', node.id, undefined, 'nominal');
    setCircleOpenForId(newId);
    setRingSubMenu(null);
    setInlineEditId(newId);
  };

  const handleSectorEditLabel = (node: ProcessNode) => {
    setRingSubMenu(null);
    if (isHudOpen) {
      const el = document.getElementById('hud-title-input');
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
      return;
    }
    setInlineEditId(node.id);
  };

  const handleToggleRuleOnNode = (targetNode: ProcessNode, ruleId: string) => {
    const current = targetNode.ruleIds || [];
    const next = current.includes(ruleId)
      ? current.filter((id) => id !== ruleId)
      : [...current, ruleId];
    onUpdateNode({ ...targetNode, ruleIds: next });
  };

  const handleToggleRuleOnSelected = (ruleId: string) => {
    if (!selectedNode) return;
    handleToggleRuleOnNode(selectedNode, ruleId);
  };

  // Compute step compliance percentage for HUD Window 1
  const selectedComplianceScore = useMemo(() => {
    if (!selectedNode) return 100;
    let pts = 0;
    if ((selectedNode.label || '').trim().length > 2) pts += 25;
    if ((selectedNode.ownerRole || '').trim().length > 1) pts += 20;
    if ((selectedNode.application || '').trim().length > 1) pts += 20;
    if ((selectedNode.ruleIds?.length || 0) > 0 || selectedNode.type === 'start' || selectedNode.type === 'end') pts += 20;
    if ((selectedNode.inputs?.length || 0) > 0 || (attachedFilesCountByNode[selectedNode.id] || 0) > 0) pts += 15;
    return pts;
  }, [selectedNode, attachedFilesCountByNode]);

  // Render the approved White 6-Sector Radial Command Circle
  const renderRadialCircle = (node: ProcessNode) => {
    const cx = 192;
    const cy = 192;
    const rIn = 112;
    const rOut = 168;

    const sectors = [
      {
        id: 'add_task',
        a1: -30,
        a2: 30,
        ico: '+',
        l1: 'Tâche suivante',
        l2: '',
        active: ringSubMenu === 'branch',
        danger: false,
        onClick: () => handleSectorAddTask(node),
      },
      {
        id: 'add_dec',
        a1: 30,
        a2: 90,
        ico: '◇',
        l1: 'Insérer',
        l2: 'décision',
        active: false,
        danger: false,
        onClick: () => handleSectorAddDecision(node),
      },
      {
        id: 'edit_lbl',
        a1: 90,
        a2: 150,
        ico: '✎',
        l1: 'Modifier',
        l2: 'libellé',
        active: false,
        danger: false,
        onClick: () => handleSectorEditLabel(node),
      },
      {
        id: 'role',
        a1: 150,
        a2: 210,
        ico: '⇄',
        l1: 'Changer rôle',
        l2: '',
        active: ringSubMenu === 'role',
        danger: false,
        onClick: () => setRingSubMenu((p) => (p === 'role' ? null : 'role')),
      },
      {
        id: 'rg',
        a1: 210,
        a2: 270,
        ico: '§',
        l1: 'Lier règle',
        l2: 'RG',
        active: ringSubMenu === 'rg',
        danger: false,
        onClick: () => setRingSubMenu((p) => (p === 'rg' ? null : 'rg')),
      },
      {
        id: 'del',
        a1: 270,
        a2: 330,
        ico: '✕',
        l1: 'Supprimer',
        l2: '',
        active: false,
        danger: true,
        onClick: () => {
          setCircleOpenForId(null);
          setRingSubMenu(null);
          if (isHudOpen) {
            setIsHudForceOpen(false);
            setZoom(100);
          }
          onDeleteNode(node.id);
        },
      },
    ];

    return (
      <div
        className="radial-command-ring pointer-events-none"
        style={{
          position: 'absolute',
          width: 384,
          height: 384,
          left: '50%',
          top: '50%',
          transform: isCurved
            ? 'translate(-50%, -50%) translateZ(26px)'
            : 'translate(-50%, -50%)',
          zIndex: 80,
        }}
      >
        <svg
          width="384"
          height="384"
          viewBox="0 0 384 384"
          className="overflow-visible drop-shadow-[0_16px_32px_rgba(79,70,229,0.20)]"
        >
          {/* Subtle Sci-Fi concentric calibration rings */}
          <circle
            cx={cx}
            cy={cy}
            r={181}
            fill="none"
            stroke="rgba(79, 70, 229, 0.28)"
            strokeWidth="1.4"
            strokeDasharray="28 12 5 12"
          />
          <circle
            cx={cx}
            cy={cy}
            r={187}
            fill="none"
            stroke="rgba(37, 99, 235, 0.18)"
            strokeWidth="3.5"
            strokeDasharray="2 10"
          />
          <circle
            cx={cx}
            cy={cy}
            r={105}
            fill="none"
            stroke="rgba(79, 70, 229, 0.42)"
            strokeWidth="1.6"
            strokeDasharray="16 8"
          />

          {sectors.map((sec) => {
            const d = buildAnnularSectorPath(cx, cy, rIn, rOut, sec.a1, sec.a2);
            const mid = polarToCartesian(cx, cy, (rIn + rOut) / 2, (sec.a1 + sec.a2) / 2);
            const fillCls = sec.active
              ? '#4f46e5'
              : 'rgba(255, 255, 255, 0.97)';
            const textFill = sec.active ? '#ffffff' : '#0f172a';
            return (
              <g
                key={sec.id}
                role="button"
                aria-label={`${sec.l1}${sec.l2 ? ` ${sec.l2}` : ''}`}
                data-testid={`radial-sector-${sec.id}`}
                className="pointer-events-auto cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  sec.onClick();
                }}
              >
                <path
                  d={d}
                  fill={fillCls}
                  stroke={sec.active ? '#4338ca' : '#cbd5e1'}
                  strokeWidth="1.3"
                  className={
                    sec.active
                      ? 'transition-colors'
                      : sec.danger
                      ? 'hover:fill-rose-50 hover:stroke-rose-400 transition-colors'
                      : 'hover:fill-indigo-50 hover:stroke-indigo-400 transition-colors'
                  }
                />
                <text
                  x={mid.x}
                  y={mid.y - (sec.l2 ? 7 : 2)}
                  textAnchor="middle"
                  fill={textFill}
                  fontSize="15.5"
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {sec.ico}
                </text>
                <text
                  x={mid.x}
                  y={mid.y + (sec.l2 ? 7 : 12)}
                  textAnchor="middle"
                  fill={textFill}
                  fontSize="10.5"
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {sec.l1}
                </text>
                {sec.l2 && (
                  <text
                    x={mid.x}
                    y={mid.y + 19}
                    textAnchor="middle"
                    fill={textFill}
                    fontSize="10.5"
                    fontWeight="600"
                    className="pointer-events-none select-none"
                  >
                    {sec.l2}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Improvement A3.4: Decision Nominal vs Exception quick branch selector */}
        {ringSubMenu === 'branch' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute left-1/2 -top-7 -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-2xl border border-white/15 flex items-center gap-2 whitespace-nowrap z-90"
          >
            <span className="text-[11px] font-semibold text-slate-300 px-1">Voie à créer :</span>
            <button
              type="button"
              onClick={() => {
                const nid = onAddNodeWithEdge('task', node.id, 'Complet et conforme', 'nominal');
                setCircleOpenForId(nid);
                setRingSubMenu(null);
                setInlineEditId(nid);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition"
            >
              Nominale (Conforme / Oui)
            </button>
            <button
              type="button"
              onClick={() => {
                const nid = onAddNodeWithEdge('task', node.id, 'Incomplet', 'exception');
                setCircleOpenForId(nid);
                setRingSubMenu(null);
                setInlineEditId(nid);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer transition"
            >
              Exception (Incomplet / Rejet)
            </button>
          </div>
        )}

        {/* Quick Role Sub-Popover */}
        {ringSubMenu === 'role' && (
          <div
            onClick={(e) => e.stopPropagation()}
            data-testid="radial-submenu-role"
            className="pointer-events-auto absolute left-1/2 -bottom-16 -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-2 rounded-xl shadow-2xl border border-indigo-400/40 flex flex-wrap justify-center items-center gap-1.5 w-max max-w-[420px] z-90"
          >
            {availableRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  onUpdateNode({ ...node, ownerRole: r });
                  setRingSubMenu(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition ${
                  node.ownerRole === r
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white/10 hover:bg-white/20 text-slate-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Quick Business Rule (RG-*) Sub-Popover */}
        {ringSubMenu === 'rg' && (
          <div
            onClick={(e) => e.stopPropagation()}
            data-testid="radial-submenu-rg"
            className="pointer-events-auto absolute left-1/2 -bottom-16 -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-2 rounded-xl shadow-2xl border border-indigo-400/40 flex flex-wrap justify-center items-center gap-1.5 w-max max-w-[420px] z-90"
          >
            {rules.map((r) => {
              const linked = (node.ruleIds || []).includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleToggleRuleOnNode(node, r.id)}
                  title={r.title}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    linked
                      ? 'bg-[#007AFF] text-white ring-1 ring-blue-300'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200'
                  }`}
                >
                  {formatCompactRuleBadge(r.id)} {linked ? '✓' : ''}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                onQuickCreateRuleForNode(node.id);
                setRingSubMenu(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition"
            >
              + Nouvelle RG
            </button>
          </div>
        )}
      </div>
    );
  };

  // Compute callout elbow lines connecting center ring to the 4 chamfered Sci-Fi HUD windows
  const hudLeaderPaths = useMemo(() => {
    const w = stageSize.w;
    const h = stageSize.h;
    const cx = w / 2;
    const cy = h / 2;
    const winW = isCompactSplit ? 228 : 284;
    const insetX = isCompactSplit ? 12 : 22;
    const leftEdgeX = insetX + winW;
    const rightEdgeX = w - insetX - winW;
    const ringAnchorOffset = isCompactSplit ? 105 : 138;

    const makeLine = (x1: number, y1: number, x2: number, y2: number) => {
      const elbowX = x1 + (x2 - x1) * 0.45;
      return { points: `${x1},${y1} ${elbowX},${y2} ${x2},${y2}`, x1, y1, x2, y2 };
    };

    return [
      makeLine(cx - ringAnchorOffset, cy - 72, leftEdgeX, 92),
      makeLine(cx - ringAnchorOffset, cy + 72, leftEdgeX, h - 155),
      makeLine(cx + ringAnchorOffset, cy - 72, rightEdgeX, 92),
      makeLine(cx + ringAnchorOffset, cy + 72, rightEdgeX, h - 155),
    ];
  }, [stageSize.w, stageSize.h, isCompactSplit]);

  const cardClipStyle: React.CSSProperties = {
    borderRadius: 16,
  };

  return (
    <div
      ref={rootRef}
      className="flex-1 h-full flex flex-col overflow-hidden select-none relative bg-[#F5F5F7]"
    >
      {/* Subtle Sub-Header Bar */}
      {!hideSubHeader && (
      <div className="h-11 px-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-[13.5px] text-slate-900 truncate">
            Diagramme BPMN
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onSwitchToAnimatedDiagram && (
            <button
              type="button"
              onClick={onSwitchToAnimatedDiagram}
              aria-pressed={false}
              title="Basculer vers le diagramme interactif à flux financiers animés"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer text-[#1F93FF] bg-[#EBF5FF] hover:bg-[#1F93FF] hover:text-white border-[#1F93FF]/25"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Flux animés</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600">
            <span>Zoom</span>
            <input
              type="range"
              min={50}
              max={280}
              value={zoom}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (zoomHudMode) {
                  if (v >= ZOOM_HUD_THRESHOLD && !isHudOpen) {
                    const el = stageRef.current;
                    const rect = el?.getBoundingClientRect();
                    const target =
                      (selectedNodeId && nodes.find((n) => n.id === selectedNodeId)) ||
                      (rect
                        ? findNearestNodeToClientPoint(
                            rect.left + rect.width / 2,
                            rect.top + rect.height / 2
                          )
                        : nodes[0]);
                    if (target) {
                      onSelectNode(target.id);
                      setCircleOpenForId(target.id);
                    }
                    setPan({ x: 0, y: 0 });
                  } else if (v < ZOOM_HUD_THRESHOLD) {
                    setIsHudForceOpen(false);
                  }
                }
                setZoom(v);
              }}
              className="w-20 accent-blue-600 cursor-pointer"
              aria-label="Niveau de zoom du diagramme 3D"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const nextMode = !zoomHudMode;
              setZoomHudMode(nextMode);
              if (nextMode) {
                // Mode is now armed in blue: if already zoomed >= threshold, focus nearest visible node cleanly
                if (zoom >= ZOOM_HUD_THRESHOLD) {
                  const el = stageRef.current;
                  const rect = el?.getBoundingClientRect();
                  const target =
                    (selectedNodeId && nodes.find((n) => n.id === selectedNodeId)) ||
                    (rect
                      ? findNearestNodeToClientPoint(
                          rect.left + rect.width / 2,
                          rect.top + rect.height / 2
                        )
                      : nodes[0]);
                  if (target) {
                    onSelectNode(target.id);
                    setCircleOpenForId(target.id);
                    setPan({ x: 0, y: 0 });
                  }
                }
              } else {
                // Disarming Zoom Infos: close any zoom-triggered HUD view
                if (isHudOpen) {
                  setIsHudForceOpen(false);
                  setPan({ x: 0, y: 0 });
                  setZoom(100);
                } else {
                  setIsHudForceOpen(false);
                }
              }
            }}
            aria-pressed={zoomHudMode}
            title={
              zoomHudMode
                ? 'Mode Zoom Infos activé (bleu) : zoomez sur un élément pour ouvrir ses infos HUD. Cliquez pour désactiver.'
                : 'Activer le mode Zoom Infos : une fois bleu, zoomer sur un élément affiche ses infos HUD (sinon uniquement par double-clic).'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              zoomHudMode
                ? 'bg-[#1F93FF] text-white border-[#1F93FF] shadow-xs hover:bg-[#007BE5]'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Maximize2 className="w-3 h-3 shrink-0" />
            <span>Zoom Infos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSwimlanes((prev) => {
                const next = !prev;
                if (next) setIsCurved(false);
                return next;
              });
              setPan({ x: 0, y: 0 });
              setZoom(100);
            }}
            aria-pressed={isSwimlanes}
            title={
              isSwimlanes
                ? 'Quitter la vue Swimlanes (revenir au diagramme libre)'
                : 'Afficher en couloirs BPMN 2.0 par acteur (Swimlanes)'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isSwimlanes
                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs hover:bg-[#0062CC]'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Rows3 className="w-3.5 h-3.5 shrink-0" />
            <span>Swimlanes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCurved((prev) => {
                const next = !prev;
                if (next) setIsSwimlanes(false);
                return next;
              });
            }}
            aria-pressed={isCurved}
            title={
              isCurved
                ? 'Désactiver la courbure (revenir en 3D plane)'
                : 'Activer la vue incurvée (3D Curved)'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isCurved
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs hover:bg-indigo-500'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0"
              aria-hidden="true"
            >
              <path
                d="M2 5.5C5.2 2.5 10.8 2.5 14 5.5M2 10.5C5.2 7.5 10.8 7.5 14 10.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <span>Curved</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsHudForceOpen(false);
              setPan({ x: 0, y: 0 });
              setZoom(100);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
            title="Réinitialiser le cadrage 3D (100%)"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">100%</span>
          </button>

          {onAutoLayout && (
            <button
              type="button"
              onClick={() => {
                onAutoLayout();
                setPan({ x: 0, y: 0 });
                setZoom(100);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
            >
              <span>Réorganiser</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCaptureDiagram}
            disabled={isCapturing}
            aria-label="Capturer le diagramme en haute définition"
            title="Capturer le diagramme complet en HD (Copier / Imprimer / PNG)"
            className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer ${
              isCapturing
                ? 'bg-[#007AFF] text-white border-[#007AFF] animate-pulse'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer ${
              isFullscreen
                ? 'bg-[#007AFF] text-white border-[#007AFF] hover:bg-[#0062CC]'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      )}

      {/* Borderless Open 3D Curved Stage (NO wall frame or borders!) */}
      <div
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onClick={handleStageClick}
        style={{
          perspective: isCurved ? (isCompactSplit ? '1150px' : '1450px') : 'none',
          background: 'linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)',
        }}
        className={`flex-1 w-full h-full relative overflow-hidden ${
          isDraggingStage ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Infinite Faded 3D Perspective Grid Floor (Always 3D via its own perspective!) */}
        <div
          className="pointer-events-none absolute inset-[-30%]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.045) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.045) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
            transform:
              'perspective(1450px) rotateX(56deg) translateY(130px) translateZ(-200px)',
            WebkitMaskImage:
              'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 72%)',
            maskImage:
              'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 72%)',
          }}
        />

        {/* Diagram World Origin at Viewport Center */}
        <div
          ref={worldRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: isCurved ? 'preserve-3d' : 'flat',
            transform: worldTransformStyle,
            transition: isDraggingStage
              ? 'none'
              : 'transform 0.38s cubic-bezier(0.2, 0.88, 0.25, 1)',
          }}
        >
          {/* BPMN 2.0 Swimlanes — Distinct External Pool(s) + Internal Organization Pool & Lanes */}
          {swimlaneLayout && (
            <div
              data-testid="bpmn-swimlanes-container"
              className="pointer-events-none absolute"
              style={{
                left: 0,
                top: 0,
                width: `${swimlaneLayout.totalWidth}px`,
                height: `${swimlaneLayout.totalHeight}px`,
                zIndex: 0,
              }}
            >
              {swimlaneLayout.pools.map((pool) => {
                const showPoolStrip = swimlaneLayout.pools.length > 1;
                const poolStripW = showPoolStrip ? 34 : 0;
                const laneHeaderW = swimlaneLayout.headerWidth - poolStripW;

                return (
                  <div
                    key={pool.id}
                    data-testid={`swimlane-pool-${pool.id}`}
                    className={`absolute left-0 right-0 rounded-2xl overflow-hidden flex ${
                      pool.isExternal
                        ? 'border border-[#007AFF]/25 bg-white/95 shadow-[0_6px_24px_rgba(0,122,255,0.06)]'
                        : 'border border-black/[0.09] bg-white/95 shadow-[0_8px_32px_rgba(15,23,42,0.05)]'
                    }`}
                    style={{
                      top: `${pool.y}px`,
                      height: `${pool.height}px`,
                    }}
                  >
                    {/* Vertical Pool Label Strip (BPMN 2.0 Pool header: Externe vs Organisation) */}
                    {showPoolStrip && (
                      <div
                        className={`shrink-0 border-r flex items-center justify-center ${
                          pool.isExternal
                            ? 'bg-[#007AFF]/[0.07] border-[#007AFF]/20 text-[#0062CC]'
                            : 'bg-[#F5F5F7] border-black/[0.08] text-[#6E6E73]'
                        }`}
                        style={{ width: `${poolStripW}px` }}
                      >
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                          }}
                        >
                          {pool.label}
                        </span>
                      </div>
                    )}

                    {/* Lanes stacked inside this Pool */}
                    <div className="flex-1 relative">
                      {pool.lanes.map((lane, localIdx) => (
                        <div
                          key={lane.id}
                          data-testid={`swimlane-band-${lane.index}`}
                          className={`absolute left-0 right-0 flex items-stretch ${
                            localIdx > 0 ? 'border-t border-black/[0.07]' : ''
                          }`}
                          style={{
                            top: `${lane.y - pool.y}px`,
                            height: `${lane.height}px`,
                            backgroundColor: pool.isExternal
                              ? '#FAFCFF'
                              : localIdx % 2 === 0
                              ? '#FFFFFF'
                              : '#F8FAFC',
                          }}
                        >
                          {/* Clean BPMN 2.0 Lane Header (actor name only, zero step counter) */}
                          <div
                            className="shrink-0 border-r border-black/[0.08] bg-white/90 px-4 py-3 flex items-center gap-3 relative"
                            style={{ width: `${laneHeaderW}px` }}
                          >
                            <span
                              className="w-1 self-stretch rounded-full shrink-0"
                              style={{ backgroundColor: lane.accentColor }}
                            />
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-bold text-[#1D1D1F] leading-snug break-words">
                                {lane.role}
                              </div>
                            </div>
                          </div>

                          {/* Subtle horizontal guide line through lane center */}
                          <div className="flex-1 relative">
                            <div
                              className="absolute left-0 right-0 border-t border-dashed border-black/[0.03]"
                              style={{ top: '50%' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3D Smart Zero-Collision Connectors with Continuous Directional Flow */}
          {edges.map((edge) => {
            const srcGeo = curvedGeometryByNode.get(edge.sourceNodeId);
            const tgtGeo = curvedGeometryByNode.get(edge.targetNodeId);
            const srcNode = nodes.find((n) => n.id === edge.sourceNodeId);
            if (!srcGeo || !tgtGeo || !srcNode) return null;

            const rawDx = tgtGeo.cx - srcGeo.cx;
            const dyRaw = tgtGeo.cy - srcGeo.cy;

            const isReturnLoop = rawDx < -40;
            const isLowerReturnLoop =
              isReturnLoop &&
              !swimlaneLayout &&
              srcGeo.cy > graphBounds.midY + 45 &&
              tgtGeo.cy > graphBounds.midY + 45;
            const isSwimlaneGutterRoute =
              Boolean(swimlaneLayout) &&
              !isReturnLoop &&
              Math.abs(dyRaw) > 55 &&
              rawDx > 40;
            const isSameColumnVertical =
              !isReturnLoop &&
              !isSwimlaneGutterRoute &&
              Math.abs(dyRaw) > 75 &&
              Math.abs(rawDx) <= 140;
            const isDecisionVertical =
              !isReturnLoop &&
              !isSwimlaneGutterRoute &&
              !isSameColumnVertical &&
              srcNode.type === 'decision' &&
              Math.abs(dyRaw) > 75;
            const isRejoinVertical =
              !isReturnLoop &&
              !isSwimlaneGutterRoute &&
              !isSameColumnVertical &&
              srcNode.type !== 'decision' &&
              Math.abs(dyRaw) > 75;

            // For Swimlanes with multiple outgoing branches from the same node in the same vertical direction,
            // assign each branch its own distinct vertical gutter track so lines & pills NEVER overlap!
            let gutterTrackIdx = 0;
            let sameDirCount = 1;
            if (isSwimlaneGutterRoute) {
              const sameDirSiblings = edges.filter((se) => {
                if (se.sourceNodeId !== edge.sourceNodeId) return false;
                const sg = curvedGeometryByNode.get(se.targetNodeId);
                if (!sg) return false;
                const sdy = sg.cy - srcGeo.cy;
                const sdx = sg.cx - srcGeo.cx;
                return sdx > 40 && Math.abs(sdy) > 55 && Math.sign(sdy) === Math.sign(dyRaw);
              });
              // Sort by vertical distance (closest lane gets inner track, farthest lane gets outer track)
              sameDirSiblings.sort((a, b) => {
                const ga = curvedGeometryByNode.get(a.targetNodeId);
                const gb = curvedGeometryByNode.get(b.targetNodeId);
                return Math.abs((ga?.cy ?? 0) - srcGeo.cy) - Math.abs((gb?.cy ?? 0) - srcGeo.cy);
              });
              sameDirCount = sameDirSiblings.length;
              gutterTrackIdx = Math.max(
                0,
                sameDirSiblings.findIndex((se) => se.id === edge.id)
              );
            }

            let x1: number, y1: number, z1: number;
            let x2: number, y2: number, z2: number;

            if (isReturnLoop) {
              if (swimlaneLayout) {
                // In Swimlanes: exit LEFT center of source into the empty column gutter so we NEVER cross cards stacked above!
                x1 = srcGeo.cx - srcGeo.w / 2;
                y1 = srcGeo.cy;
                z1 = srcGeo.cz;
                x2 = tgtGeo.cx;
                y2 = tgtGeo.cy - tgtGeo.h / 2;
                z2 = tgtGeo.cz;
              } else if (isLowerReturnLoop) {
                // Standard mode lower-row return loop (e.g. 06.b -> 04.a): exit BOTTOM center -> arch UNDER lower row -> enter BOTTOM center (zero crossing with upper vertical drops!)
                x1 = srcGeo.cx;
                y1 = srcGeo.cy + srcGeo.h / 2;
                z1 = srcGeo.cz;
                x2 = tgtGeo.cx;
                y2 = tgtGeo.cy + tgtGeo.h / 2;
                z2 = tgtGeo.cz;
              } else {
                // Standard mode: exit TOP center of source card -> arch above upper lane -> enter TOP center of target card
                x1 = srcGeo.cx;
                y1 = srcGeo.cy - srcGeo.h / 2;
                z1 = srcGeo.cz;
                x2 = tgtGeo.cx;
                y2 = tgtGeo.cy - tgtGeo.h / 2;
                z2 = tgtGeo.cz;
              }
            } else if (isSwimlaneGutterRoute) {
              // Clean BPMN 2.0 Swimlane Gutter Route: exit RIGHT side of source -> drop/rise in open column gutter -> enter LEFT side of target
              // Order exit ports by direction so inner-turn track never crosses outer-turn track!
              const dirSign = dyRaw >= 0 ? -1 : 1;
              const ySpreadOffset =
                sameDirCount > 1
                  ? dirSign * (gutterTrackIdx - (sameDirCount - 1) / 2) * 14
                  : 0;
              x1 = srcGeo.cx + (srcGeo.w / 2) * Math.cos(srcGeo.alphaRad);
              y1 = srcGeo.cy + ySpreadOffset;
              z1 = srcGeo.cz - (srcGeo.w / 2) * Math.sin(srcGeo.alphaRad);
              x2 = tgtGeo.cx - (tgtGeo.w / 2) * Math.cos(tgtGeo.alphaRad);
              y2 = tgtGeo.cy;
              z2 = tgtGeo.cz + (tgtGeo.w / 2) * Math.sin(tgtGeo.alphaRad);
            } else if (isSameColumnVertical) {
              // Same-column vertical rejoin (e.g. 04.a -> 05): clean orthogonal vertical Z-bend (zero diagonal slant!)
              x1 = srcGeo.cx;
              y1 = srcGeo.cy + (dyRaw >= 0 ? srcGeo.h / 2 : -srcGeo.h / 2);
              z1 = srcGeo.cz;
              x2 = tgtGeo.cx;
              y2 = tgtGeo.cy + (dyRaw >= 0 ? -tgtGeo.h / 2 : tgtGeo.h / 2);
              z2 = tgtGeo.cz;
            } else if (isDecisionVertical) {
              // Exit TOP or BOTTOM center of decision card -> enter LEFT center (or top/bottom if stacked) of target
              x1 = srcGeo.cx;
              y1 = srcGeo.cy + (dyRaw < 0 ? -srcGeo.h / 2 : srcGeo.h / 2);
              z1 = srcGeo.cz;

              const tgtLeftX = tgtGeo.cx - (tgtGeo.w / 2) * Math.cos(tgtGeo.alphaRad);
              if (tgtLeftX > x1 + 20) {
                x2 = tgtLeftX;
                y2 = tgtGeo.cy;
                z2 = tgtGeo.cz + (tgtGeo.w / 2) * Math.sin(tgtGeo.alphaRad);
              } else {
                x2 = tgtGeo.cx;
                y2 = tgtGeo.cy + (dyRaw < 0 ? tgtGeo.h / 2 : -tgtGeo.h / 2);
                z2 = tgtGeo.cz;
              }
            } else if (isRejoinVertical) {
              // Exit RIGHT center of branch card -> enter BOTTOM (if coming up) or TOP (if coming down) center of target card!
              x1 = srcGeo.cx + (srcGeo.w / 2) * Math.cos(srcGeo.alphaRad);
              y1 = srcGeo.cy;
              z1 = srcGeo.cz - (srcGeo.w / 2) * Math.sin(srcGeo.alphaRad);

              if (tgtGeo.cx > x1 + 20) {
                x2 = tgtGeo.cx;
                y2 = tgtGeo.cy + (dyRaw < 0 ? tgtGeo.h / 2 : -tgtGeo.h / 2);
                z2 = tgtGeo.cz;
              } else {
                x2 = tgtGeo.cx - (tgtGeo.w / 2) * Math.cos(tgtGeo.alphaRad);
                y2 = tgtGeo.cy;
                z2 = tgtGeo.cz + (tgtGeo.w / 2) * Math.sin(tgtGeo.alphaRad);
              }
            } else {
              // Nominal horizontal / slight slope: RIGHT center -> LEFT center
              x1 = srcGeo.cx + (srcGeo.w / 2) * Math.cos(srcGeo.alphaRad);
              y1 = srcGeo.cy;
              z1 = srcGeo.cz - (srcGeo.w / 2) * Math.sin(srcGeo.alphaRad);
              x2 = tgtGeo.cx - (tgtGeo.w / 2) * Math.cos(tgtGeo.alphaRad);
              y2 = tgtGeo.cy;
              z2 = tgtGeo.cz + (tgtGeo.w / 2) * Math.sin(tgtGeo.alphaRad);
            }

            const dX = x2 - x1;
            const dY = y2 - y1;
            const dZ = z2 - z1;
            const chordLenXZ = Math.max(12, Math.hypot(dX, dZ));
            const betaRad = Math.atan2(-dZ, dX);

            const { pillText, dotColor } = resolveEdgeVisual(
              edge.label,
              srcNode.type === 'decision'
            );

            let pathD: string;
            let arrowPoints: string;
            let pillX: number;
            let pillY: number;

            if (isReturnLoop) {
              if (swimlaneLayout) {
                const gutterStep = Math.min(36, Math.max(16, chordLenXZ * 0.15));
                const archY = Math.min(0, dY) - 34;
                const r = Math.min(14, gutterStep * 0.45, Math.abs(archY) * 0.35);
                pathD = `M 0 0 L ${gutterStep - r} 0 Q ${gutterStep} 0 ${gutterStep} ${-r} L ${gutterStep} ${
                  archY + r
                } Q ${gutterStep} ${archY} ${gutterStep + r} ${archY} L ${
                  chordLenXZ - r
                } ${archY} Q ${chordLenXZ} ${archY} ${chordLenXZ} ${
                  archY + r
                } L ${chordLenXZ} ${dY - 6}`;
                arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 5},${dY - 8.5} ${
                  chordLenXZ + 5
                },${dY - 8.5}`;
                pillX = gutterStep + (chordLenXZ - gutterStep) * 0.5;
                pillY = archY;
              } else if (isLowerReturnLoop) {
                const archY = Math.max(0, dY) + 56;
                const r = Math.min(16, chordLenXZ * 0.25);
                pathD = `M 0 0 L 0 ${archY - r} Q 0 ${archY} ${r} ${archY} L ${
                  chordLenXZ - r
                } ${archY} Q ${chordLenXZ} ${archY} ${chordLenXZ} ${
                  archY - r
                } L ${chordLenXZ} ${dY + 6}`;
                arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 5},${dY + 8.5} ${
                  chordLenXZ + 5
                },${dY + 8.5}`;
                pillX = chordLenXZ * 0.5;
                pillY = archY;
              } else {
                const archY = Math.min(0, dY) - 64;
                const r = Math.min(16, chordLenXZ * 0.25);
                pathD = `M 0 0 L 0 ${archY + r} Q 0 ${archY} ${r} ${archY} L ${
                  chordLenXZ - r
                } ${archY} Q ${chordLenXZ} ${archY} ${chordLenXZ} ${
                  archY + r
                } L ${chordLenXZ} ${dY - 6}`;
                arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 5},${dY - 8.5} ${
                  chordLenXZ + 5
                },${dY - 8.5}`;
                pillX = chordLenXZ * 0.5;
                pillY = archY;
              }
            } else if (isSwimlaneGutterRoute) {
              const signY = dY >= 0 ? 1 : -1;
              // Keep vertical drop strictly inside the open gutter between col(src) and col(src)+1,
              // offset slightly by source lane index so two gateways in the same column (e.g. 04 & 02.b) never share the same vertical trunk!
              const srcLaneOffset = ((swimlaneLayout?.nodeLaneIndex[edge.sourceNodeId] ?? 0) % 3) * 14;
              const maxGutter = Math.max(24, Math.min(98, chordLenXZ - 64));
              const gutterX = Math.min(
                maxGutter,
                22 + srcLaneOffset + gutterTrackIdx * 20
              );

              // Generic obstacle check: if another card/event sits on the horizontal approach inside the target lane
              // (e.g. 04 -> 04.a jumping past 02.c & End circle), route cleanly along the target lane's clear TOP gutter!
              const segMinX = Math.min(x1 + gutterX, x2) + 8;
              const segMaxX = Math.max(x1 + gutterX, x2) - 8;
              const targetLaneHasObstacle = Array.from(curvedGeometryByNode.entries()).some(
                ([nid, g]) => {
                  if (nid === edge.sourceNodeId || nid === edge.targetNodeId) return false;
                  const yOverlap = Math.abs(g.cy - y2) < g.h / 2 + 16;
                  const xOverlap = g.cx + g.w / 2 > segMinX && g.cx - g.w / 2 < segMaxX;
                  return yOverlap && xOverlap;
                }
              );

              if (targetLaneHasObstacle && chordLenXZ - gutterX > 64) {
                const detourY = dY - (tgtGeo.h / 2 + 22);
                const detourSign = detourY >= 0 ? 1 : -1;
                const rejoinX = chordLenXZ - 26;
                const r1 = Math.min(12, Math.abs(detourY) * 0.35, gutterX * 0.45);
                const r2 = Math.min(12, Math.abs(dY - detourY) * 0.4, 14);
                pathD = `M 0 0 L ${gutterX - r1} 0 Q ${gutterX} 0 ${gutterX} ${
                  detourSign * r1
                } L ${gutterX} ${detourY - detourSign * r1} Q ${gutterX} ${detourY} ${
                  gutterX + r1
                } ${detourY} L ${rejoinX - r2} ${detourY} Q ${rejoinX} ${detourY} ${rejoinX} ${
                  detourY + r2
                } L ${rejoinX} ${dY - r2} Q ${rejoinX} ${dY} ${rejoinX + r2} ${dY} L ${
                  chordLenXZ - 6
                } ${dY}`;
                arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 8.5},${dY - 4.8} ${
                  chordLenXZ - 8.5
                },${dY + 4.8}`;
                const horizSpan = Math.max(24, rejoinX - gutterX - 10);
                pillX = gutterX + Math.min(110, horizSpan * 0.35);
                pillY = detourY;
              } else {
                const r = Math.min(
                  14,
                  Math.abs(dY) * 0.35,
                  gutterX * 0.45,
                  Math.max(6, (chordLenXZ - gutterX) * 0.45)
                );
                pathD = `M 0 0 L ${gutterX - r} 0 Q ${gutterX} 0 ${gutterX} ${
                  signY * r
                } L ${gutterX} ${dY - signY * r} Q ${gutterX} ${dY} ${
                  gutterX + r
                } ${dY} L ${chordLenXZ - 6} ${dY}`;
                arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 8.5},${dY - 4.8} ${
                  chordLenXZ - 8.5
                },${dY + 4.8}`;
                // Always anchor decision pill in the target's own lane (y = dY) on the horizontal approach segment -> mathematically zero cross-lane overlap!
                const estPillHalfW = pillText ? Math.round((pillText.length * 5.6 + 22) / 2) : 0;
                const horizSpan = Math.max(24, chordLenXZ - gutterX - 10);
                const minClearPillX = gutterX + estPillHalfW + 12;
                const maxClearPillX = Math.max(minClearPillX, chordLenXZ - estPillHalfW - 14);
                pillX = Math.min(maxClearPillX, Math.max(minClearPillX, gutterX + Math.min(96, horizSpan * 0.45)));
                pillY = dY;
              }
            } else if (isSameColumnVertical) {
              const signY = dY >= 0 ? 1 : -1;
              const midY = dY * 0.5;
              if (Math.abs(dX) < 6) {
                pathD = `M 0 0 L 0 ${dY - signY * 6}`;
                arrowPoints = `0,${dY} -4.8,${dY - signY * 8.5} 4.8,${
                  dY - signY * 8.5
                }`;
                pillX = 0;
                pillY = midY;
              } else {
                const signX = dX >= 0 ? 1 : -1;
                const r = Math.min(12, Math.abs(dX) * 0.4, Math.abs(midY) * 0.4);
                pathD = `M 0 0 L 0 ${midY - signY * r} Q 0 ${midY} ${
                  signX * r
                } ${midY} L ${dX - signX * r} ${midY} Q ${dX} ${midY} ${dX} ${
                  midY + signY * r
                } L ${dX} ${dY - signY * 6}`;
                arrowPoints = `${dX},${dY} ${dX - 4.8},${dY - signY * 8.5} ${
                  dX + 4.8
                },${dY - signY * 8.5}`;
                pillX = dX * 0.5;
                pillY = midY;
              }
            } else if (isDecisionVertical && chordLenXZ > 20 && y2 === tgtGeo.cy) {
              const signY = dY >= 0 ? 1 : -1;
              const r = Math.min(16, Math.abs(dY) * 0.35, chordLenXZ * 0.45);
              pathD = `M 0 0 L 0 ${dY - signY * r} Q 0 ${dY} ${r} ${dY} L ${
                chordLenXZ - 6
              } ${dY}`;
              arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 8.5},${dY - 4.8} ${
                chordLenXZ - 8.5
              },${dY + 4.8}`;
              pillX = 0;
              pillY = dY * 0.52;
            } else if (isRejoinVertical && x2 === tgtGeo.cx) {
              const signY = dY >= 0 ? 1 : -1;
              const r = Math.min(16, Math.abs(dY) * 0.35, chordLenXZ * 0.45);
              pathD = `M 0 0 L ${chordLenXZ - r} 0 Q ${chordLenXZ} 0 ${chordLenXZ} ${
                signY * r
              } L ${chordLenXZ} ${dY - signY * 6}`;
              arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 4.8},${
                dY - signY * 8.5
              } ${chordLenXZ + 4.8},${dY - signY * 8.5}`;
              pillX = chordLenXZ;
              pillY = dY * 0.5;
            } else {
              const c1x = chordLenXZ * 0.42;
              const c2x = chordLenXZ * 0.58;
              pathD = `M 0 0 C ${c1x} 0, ${c2x} ${dY}, ${chordLenXZ - 6} ${dY}`;
              arrowPoints = `${chordLenXZ},${dY} ${chordLenXZ - 8.5},${dY - 4.8} ${
                chordLenXZ - 8.5
              },${dY + 4.8}`;
              pillX = chordLenXZ * 0.5;
              pillY = dY * 0.5;
            }

            const pillW = pillText ? Math.round(pillText.length * 5.6 + 22) : 0;

            const isSimMode = Boolean(simulatedNodeIds && simulatedNodeIds.size > 0);
            const isSimEdge = isSimMode && (
              simulatedEdgeIds
                ? simulatedEdgeIds.has(edge.id)
                : Boolean(simulatedNodeIds?.has(edge.sourceNodeId) && simulatedNodeIds?.has(edge.targetNodeId))
            );

            // BPMN 2.0 Connector Semantics:
            // - Sequence Flow (default): solid line + filled arrowhead
            // - Message Flow (crosses between distinct Pools, e.g. External Client <-> Organization): dashed line + open start circle + open arrowhead
            // - Association (connected to Data node): dotted line
            const tgtNode = nodes.find((n) => n.id === edge.targetNodeId);
            const srcLaneIdx = swimlaneLayout?.nodeLaneIndex[edge.sourceNodeId];
            const tgtLaneIdx = swimlaneLayout?.nodeLaneIndex[edge.targetNodeId];
            const srcPoolId =
              srcLaneIdx !== undefined ? swimlaneLayout?.lanes[srcLaneIdx]?.poolId : undefined;
            const tgtPoolId =
              tgtLaneIdx !== undefined ? swimlaneLayout?.lanes[tgtLaneIdx]?.poolId : undefined;
            const isMessageFlow = Boolean(
              srcPoolId && tgtPoolId && srcPoolId !== tgtPoolId
            );
            const isAssociation =
              !isMessageFlow && (srcNode.type === 'data' || tgtNode?.type === 'data');

            const effectiveEdgeColor = isSimEdge
              ? '#34C759'
              : isMessageFlow
              ? '#007AFF'
              : '#64748B';

            const dimmedInHud =
              isHudOpen &&
              edge.sourceNodeId !== selectedNodeId &&
              edge.targetNodeId !== selectedNodeId;
            const edgeOpacity = dimmedInHud
              ? 0.22
              : isSimMode && !isSimEdge
              ? 0.28
              : 1;

            return (
              <svg
                key={edge.id}
                width={chordLenXZ}
                height={20}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  overflow: 'visible',
                  pointerEvents: 'none',
                  transformOrigin: '0 0',
                  transform:
                    !isCurved && Math.abs(betaRad) < 0.001
                      ? `translate(${Math.round(x1)}px, ${Math.round(y1)}px)`
                      : !isCurved && Math.abs(Math.abs(betaRad) - Math.PI) < 0.001
                      ? `translate(${Math.round(x1)}px, ${Math.round(y1)}px) scaleX(-1)`
                      : `translate3d(${x1}px, ${y1}px, ${z1}px) rotateY(${betaRad}rad)`,
                  opacity: edgeOpacity,
                  transition: isDraggingStage
                    ? 'opacity 0.28s ease'
                    : 'transform 0.36s cubic-bezier(0.2, 0.88, 0.25, 1), opacity 0.28s ease',
                }}
              >
                <path
                  d={pathD}
                  stroke={effectiveEdgeColor}
                  strokeOpacity={isSimEdge ? 0.22 : 0.08}
                  strokeWidth={isSimEdge ? 7 : 5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={pathD}
                  stroke={effectiveEdgeColor}
                  strokeWidth={isSimEdge ? 2.6 : 2}
                  strokeDasharray={
                    isMessageFlow ? '6 4' : isAssociation ? '2.5 4' : undefined
                  }
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {isMessageFlow && (
                  <circle
                    cx={0}
                    cy={0}
                    r={4}
                    fill="#FFFFFF"
                    stroke={effectiveEdgeColor}
                    strokeWidth={1.8}
                  />
                )}
                {!isAssociation && (
                  <polygon
                    points={arrowPoints}
                    fill={isMessageFlow ? '#FFFFFF' : effectiveEdgeColor}
                    stroke={isMessageFlow ? effectiveEdgeColor : undefined}
                    strokeWidth={isMessageFlow ? 1.7 : undefined}
                    strokeLinejoin="round"
                  />
                )}
                {pillText && (
                  <g
                    transform={
                      Math.abs(betaRad) > Math.PI / 2
                        ? `translate(${pillX}, ${pillY}) scale(-1, 1) translate(${-pillX}, ${-pillY})`
                        : undefined
                    }
                  >
                    <rect
                      x={pillX - pillW / 2}
                      y={pillY - 10}
                      width={pillW}
                      height={20}
                      rx={10}
                      fill="#FFFFFF"
                      stroke="rgba(0, 0, 0, 0.10)"
                      strokeWidth={1}
                    />
                    <circle
                      cx={pillX - pillW / 2 + 10}
                      cy={pillY}
                      r={3.2}
                      fill={dotColor || '#8E8E93'}
                    />
                    <text
                      x={pillX + 5}
                      y={pillY + 3.4}
                      textAnchor="middle"
                      fill="#1D1D1F"
                      fontSize="9.2"
                      fontWeight="700"
                      letterSpacing="0.03em"
                    >
                      {pillText}
                    </text>
                  </g>
                )}
              </svg>
            );
          })}

          {/* 3D Nodes Floating Along the Borderless Curved Wall */}
          {nodes.map((node, idx) => {
            const geo = curvedGeometryByNode.get(node.id);
            if (!geo) return null;

            const isSelected = node.id === selectedNodeId;
            const showCircle = circleOpenForId === node.id && inlineEditId !== node.id;
            const isSimMode = Boolean(simulatedNodeIds && simulatedNodeIds.size > 0);
            const isSimActive = isSimMode && Boolean(simulatedNodeIds?.has(node.id));
            const auditSeverity = auditSeverityByNodeId?.[node.id];
            const dimmed = (isHudOpen && !isSelected) || (isSimMode && !isSimActive && !isSelected);

            const isStart = node.type === 'start';
            const isEnd = node.type === 'end';
            const lowerLabel = (node.label || '').toLowerCase();
            const isRejEnd =
              isEnd &&
              (lowerLabel.includes('rejet') ||
                lowerLabel.includes('refus') ||
                lowerLabel.includes('non couvert') ||
                lowerLabel.includes('caduc') ||
                lowerLabel.includes('sans suite'));

            const { bgStyle, iconColor, iconNode, taskKind, gatewayKind } =
              resolveCardVisuals(node);
            const taskKindMeta = taskKind ? BPMN_TASK_KIND_META[taskKind] : null;
            const gatewayKindMeta = gatewayKind
              ? BPMN_GATEWAY_KIND_META[gatewayKind]
              : null;
            const firstRule = node.ruleIds?.[0];

            const stepCode = stepCodeByNodeId.get(node.id);
            const morphKey = isStart
              ? 'morph-step-start'
              : isEnd
              ? isRejEnd
                ? `morph-step-end-rej-${idx}`
                : 'morph-step-end-ok'
              : stepCode
              ? `morph-step-${stepCode.replace(/[^a-zA-Z0-9]/g, '-')}`
              : undefined;

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onClick={(e) => handleCardClick(e, node)}
                onDoubleClick={(e) => handleCardDoubleClick(e, node)}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: geo.w,
                  minHeight: geo.h,
                  ...(morphKey && !isHudOpen
                    ? ({ viewTransitionName: morphKey } as React.CSSProperties)
                    : {}),
                  transformStyle: isCurved ? 'preserve-3d' : 'flat',
                  transform: isCurved
                    ? `translate3d(${geo.cx - geo.w / 2}px, ${
                        geo.cy - geo.h / 2
                      }px, ${geo.cz + (isSelected ? 18 : 0)}px) rotateY(${geo.alphaDeg}deg)`
                    : `translate(${Math.round(geo.cx - geo.w / 2)}px, ${Math.round(
                        geo.cy - geo.h / 2
                      )}px)`,
                  opacity: dimmed ? 0.25 : 1,
                  zIndex: isSelected ? 60 : 20,
                  transition: isDraggingStage
                    ? 'opacity 0.28s ease, box-shadow 0.22s ease, border-color 0.2s ease'
                    : 'transform 0.36s cubic-bezier(0.2, 0.88, 0.25, 1), opacity 0.28s ease, box-shadow 0.22s ease, border-color 0.2s ease',
                }}
                className="curved-node-card cursor-pointer"
              >
                {/* Subtle Apple Blue Floor Halo when selected */}
                {isSelected && (
                  <div
                    className="pointer-events-none"
                    style={{
                      position: 'absolute',
                      width: 240,
                      height: 80,
                      left: '50%',
                      bottom: -40,
                      transform: 'translateX(-50%) rotateX(68deg)',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(0,122,255,0.18) 0%, rgba(0,122,255,0.06) 55%, transparent 78%)',
                      border: '1.5px solid rgba(0, 122, 255, 0.25)',
                    }}
                  />
                )}

                {/* Audit Severity Floating Pill (in Auditer mode) */}
                {auditSeverity && (
                  <div
                    className={`pointer-events-none absolute -top-2.5 right-3 z-30 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-white/95 backdrop-blur-md shadow-sm border ${
                      auditSeverity === 'error'
                        ? 'text-[#C41E1A] border-[#FF3B30]/40'
                        : auditSeverity === 'warning'
                        ? 'text-[#C96A00] border-[#FF9500]/45'
                        : 'text-[#007AFF] border-[#007AFF]/35'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        auditSeverity === 'error'
                          ? 'bg-[#FF3B30]'
                          : auditSeverity === 'warning'
                          ? 'bg-[#FF9500]'
                          : 'bg-[#007AFF]'
                      }`}
                    />
                    <span>
                      {auditSeverity === 'error'
                        ? 'Bloquant'
                        : auditSeverity === 'warning'
                        ? 'Majeur'
                        : 'Mineur'}
                    </span>
                  </div>
                )}

                {/* Approved 6-Sector Radial Command Circle (ONLY when step is pressed!) */}
                {showCircle && renderRadialCircle(node)}

                {/* BPMN 2.0 Start Event (thin border circle) & End Event (thick border circle) vs Frosted Activity / Gateway Cards */}
                {isStart || isEnd ? (
                  <div className="relative flex flex-col items-center justify-center w-[54px] h-[54px]">
                    <div
                      title={
                        isStart
                          ? `Événement de début (BPMN 2.0) — ${node.label}`
                          : `Événement de fin (BPMN 2.0) — ${node.label}`
                      }
                      className={`w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center transition-all ${
                        isStart
                          ? 'border-[2px] border-[#22A06B] shadow-[0_4px_14px_rgba(34,160,107,0.14)]'
                          : isRejEnd
                          ? 'border-[4.5px] border-[#E5484D] shadow-[0_4px_14px_rgba(229,72,77,0.16)]'
                          : 'border-[4.5px] border-[#22A06B] shadow-[0_4px_14px_rgba(34,160,107,0.16)]'
                      } ${
                        isSelected
                          ? 'ring-4 ring-[#007AFF]/25 !border-[#007AFF] shadow-[0_10px_28px_rgba(0,122,255,0.22)]'
                          : isSimActive
                          ? isRejEnd
                            ? 'ring-4 ring-[#FF3B30]/25 !border-[#FF3B30]'
                            : 'ring-4 ring-[#34C759]/25 !border-[#34C759]'
                          : ''
                      }`}
                    />

                    {/* Crisp BPMN 2.0 Event Label below the circle */}
                    <div className="absolute top-[58px] left-1/2 -translate-x-1/2 w-[176px] text-center">
                      {inlineEditId === node.id ? (
                        <input
                          autoFocus
                          value={node.label}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdateNode({ ...node, label: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setInlineEditId(null);
                            }
                          }}
                          onBlur={() => setInlineEditId(null)}
                          className="w-full text-[11px] font-semibold text-[#1D1D1F] bg-white border-2 border-[#007AFF] rounded-lg px-2 py-0.5 outline-none text-center shadow-sm"
                        />
                      ) : (
                        <span
                          title={node.label}
                          className="inline-block px-1.5 py-0.5 rounded-md bg-white/85 backdrop-blur-xs text-[11px] font-semibold text-[#1D1D1F] leading-[1.24] line-clamp-2"
                        >
                          {node.label}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative w-full min-h-[90px] rounded-2xl px-3.5 pt-3 pb-2.5 flex items-center gap-3 bg-white/95 backdrop-blur-md transition-all ${
                      isSelected
                        ? 'border-2 border-[#007AFF] shadow-[0_0_0_4px_rgba(0,122,255,0.16),0_12px_28px_rgba(0,122,255,0.14)]'
                        : auditSeverity === 'error'
                        ? 'border-2 border-[#FF3B30]/75 shadow-[0_0_0_4px_rgba(255,59,48,0.10),0_10px_24px_rgba(255,59,48,0.08)]'
                        : auditSeverity === 'warning'
                        ? 'border-2 border-[#FF9500]/75 shadow-[0_0_0_4px_rgba(255,149,0,0.10),0_10px_24px_rgba(255,149,0,0.08)]'
                        : auditSeverity === 'suggestion'
                        ? 'border-2 border-[#007AFF]/55 shadow-[0_0_0_4px_rgba(0,122,255,0.08),0_10px_24px_rgba(0,122,255,0.06)]'
                        : isSimActive
                        ? 'border-2 border-[#34C759]/80 shadow-[0_0_0_4px_rgba(52,199,89,0.12),0_10px_24px_rgba(52,199,89,0.08)]'
                        : node.type === 'decision'
                        ? 'border border-[#FF9500]/45 hover:border-[#FF9500]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.04),0_10px_24px_rgba(0,0,0,0.05)]'
                        : 'border border-black/[0.08] hover:border-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.04),0_10px_24px_rgba(0,0,0,0.05)]'
                    }`}
                  >
                    {/* Compact BPMN 2.0 Kind Micro-Badge in top-right corner (keeps bottom row 100% free for full actor name) */}
                    {(taskKindMeta || gatewayKindMeta) && (
                      <span
                        title={
                          taskKindMeta
                            ? `${taskKindMeta.label} — ${taskKindMeta.description}`
                            : gatewayKindMeta
                            ? `${gatewayKindMeta.label} — ${gatewayKindMeta.description}`
                            : undefined
                        }
                        className={`absolute top-1.5 right-2 text-[8.5px] font-bold px-1.5 py-0.2 rounded border leading-tight ${
                          (taskKindMeta || gatewayKindMeta)!.badgeCls
                        }`}
                      >
                        {(taskKindMeta || gatewayKindMeta)!.shortLabel}
                      </span>
                    )}

                    <div
                      style={{ background: bgStyle, color: iconColor }}
                      title={
                        taskKindMeta
                          ? `${taskKindMeta.label} — ${taskKindMeta.description}`
                          : gatewayKindMeta
                          ? `${gatewayKindMeta.label} — ${gatewayKindMeta.description}`
                          : undefined
                      }
                      className={`flex items-center justify-center shrink-0 border border-black/[0.05] ${
                        node.type === 'decision'
                          ? 'w-8 h-8 rounded-lg rotate-45 mx-0.5'
                          : 'w-9 h-9 rounded-xl'
                      }`}
                    >
                      {iconNode}
                    </div>

                    <div className="flex-1 min-w-0">
                      {inlineEditId === node.id ? (
                        <input
                          autoFocus
                          value={node.label}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdateNode({ ...node, label: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setInlineEditId(null);
                            }
                          }}
                          onBlur={() => setInlineEditId(null)}
                          className="w-full text-[12px] font-semibold text-[#1D1D1F] bg-white border-2 border-[#007AFF] rounded-lg px-2 py-0.5 outline-none"
                        />
                      ) : (
                        <div
                          className="text-[12px] leading-[1.28] font-semibold text-[#1D1D1F] line-clamp-2"
                          title={node.label}
                        >
                          <span
                            className={`font-bold ${
                              isSelected
                                ? 'text-[#007AFF]'
                                : node.type === 'decision'
                                ? 'text-[#C96A00]'
                                : 'text-[#6E6E73]'
                            }`}
                          >
                            {stepCodeByNodeId.get(node.id) ||
                              String(idx + 1).padStart(2, '0')}
                          </span>{' '}
                          · {node.label}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1.5 mt-1.5">
                        <span
                          title={node.ownerRole || 'Non assigné'}
                          className="text-[10.5px] text-[#6E6E73] font-medium truncate"
                        >
                          {node.ownerRole || 'Non assigné'}
                        </span>
                        {firstRule && (
                          <span className="text-[9.5px] font-semibold text-[#6E6E73] bg-[#F5F5F7] border border-black/[0.06] px-1.5 py-0.2 rounded shrink-0">
                            {formatCompactRuleBadge(firstRule)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* =====================================================================
            4 CHAMFERED SCI-FI HUD INFO WINDOWS (Unfold on Double-Click OR Zoom >= 165%)
            ===================================================================== */}
        {isHudOpen && selectedNode && (
          <div className="pointer-events-none absolute inset-0 z-70 animate-fadeIn">
            {/* Precision Callout Leader Lines */}
            <svg className="pointer-events-none absolute inset-0 w-full h-full">
              {hudLeaderPaths.map((ln, i) => (
                <g key={i}>
                  <polyline
                    points={ln.points}
                    fill="none"
                    stroke="#007AFF"
                    strokeWidth="1.5"
                    strokeOpacity="0.55"
                  />
                  <circle cx={ln.x1} cy={ln.y1} r="3.5" fill="#007AFF" />
                  <circle cx={ln.x2} cy={ln.y2} r="3" fill="#007AFF" />
                </g>
              ))}
            </svg>

            {/* WINDOW 1 (TOP-LEFT): RÈGLES MÉTIER & CONFORMITÉ */}
            <div
              style={{
                ...cardClipStyle,
                top: 16,
                left: isCompactSplit ? 12 : 22,
                width: isCompactSplit ? 228 : 284,
              }}
              className="scifi-hud-panel pointer-events-auto absolute rounded-2xl bg-white/95 backdrop-blur-xl border border-indigo-200/95 p-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.10),0_2px_8px_rgba(79,70,229,0.08)]"
            >
              <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5 mb-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Règles Métier &amp; RG
                </span>
                <span className="text-[9.5px] font-extrabold bg-[#EBF5FF] text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded">
                  {(selectedNode.ruleIds || []).filter((rid) => rules.some((r) => r.id === rid)).length} liée(s)
                </span>
              </div>

              <div className="hud-scroll-area max-h-[86px] overflow-y-auto space-y-1 mb-2 pr-0.5">
                {rules.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Aucune règle au catalogue.</p>
                ) : (
                  rules.map((r) => {
                    const active = (selectedNode.ruleIds || []).includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleRuleOnSelected(r.id)}
                        className={`w-full text-left px-2 py-1 rounded-md border text-[11px] flex items-center justify-between gap-1 cursor-pointer transition ${
                          active
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                            : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <span className="truncate">
                          {formatCompactRuleBadge(r.id)} · {r.title}
                        </span>
                        <span className="text-[10px] shrink-0">{active ? '✓' : '+'}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Sci-Fi Compliance Bar */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                <span>Complétude fiche</span>
                <span className="text-emerald-600">{selectedComplianceScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  style={{ width: `${selectedComplianceScore}%` }}
                  className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onQuickCreateRuleForNode(selectedNode.id)}
                  className="flex-1 py-1 px-2 rounded-md bg-[#EBF5FF] hover:bg-[#DDF0FF] text-[#007AFF] text-[10.5px] font-bold cursor-pointer transition"
                >
                  + Nouvelle règle
                </button>
                <button
                  type="button"
                  onClick={onOpenRulesCatalog}
                  className="py-1 px-2 rounded-md border border-slate-200 hover:border-indigo-300 text-slate-700 text-[10.5px] font-semibold inline-flex items-center gap-0.5 cursor-pointer transition"
                >
                  <span>Catalogue</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* WINDOW 2 (BOTTOM-LEFT): TÉLÉMÉTRIE DURÉE & MODE D'EXÉCUTION */}
            <div
              style={{
                ...cardClipStyle,
                bottom: 92,
                left: isCompactSplit ? 12 : 22,
                width: isCompactSplit ? 228 : 284,
              }}
              className="scifi-hud-panel pointer-events-auto absolute rounded-2xl bg-white/95 backdrop-blur-xl border border-indigo-200/95 p-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.10),0_2px_8px_rgba(79,70,229,0.08)]"
            >
              <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5 mb-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-700">
                  ▸ Télémétrie SLA &amp; Durée
                </span>
                <span className="text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {totalDurationMinutes > 0
                    ? `${Math.round(
                        ((selectedNode.estimatedDurationMinutes || 0) /
                          totalDurationMinutes) *
                          100
                      )}% du flux`
                    : 'Nominal'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <svg width="72" height="72" viewBox="0 0 84 84" className="shrink-0">
                  <circle
                    cx="42"
                    cy="42"
                    r="34"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="7"
                    strokeDasharray="160 60"
                    transform="rotate(135 42 42)"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="42"
                    cy="42"
                    r="34"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="7"
                    strokeDasharray={`${Math.min(
                      160,
                      Math.max(18, (selectedNode.estimatedDurationMinutes || 0) * 3.2)
                    )} 180`}
                    transform="rotate(135 42 42)"
                    strokeLinecap="round"
                  />
                  <text
                    x="42"
                    y="45"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#0f172a"
                  >
                    {selectedNode.estimatedDurationMinutes || 0}m
                  </text>
                  <text
                    x="42"
                    y="57"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="700"
                    fill="#64748b"
                  >
                    DURÉE
                  </text>
                </svg>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Durée estimée (min)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={selectedNode.estimatedDurationMinutes ?? 0}
                      onChange={(e) =>
                        onUpdateNode({
                          ...selectedNode,
                          estimatedDurationMinutes: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full border border-slate-300 focus:border-indigo-500 rounded-md px-2 py-1 text-xs font-bold text-slate-900 bg-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ['manual', 'Manuel'],
                        ['automated', 'Auto'],
                        ['mixed', 'Mixte'],
                      ] as [ExecutionMode, string][]
                    ).map(([modeVal, lbl]) => (
                      <button
                        key={modeVal}
                        type="button"
                        onClick={() =>
                          onUpdateNode({ ...selectedNode, executionMode: modeVal })
                        }
                        className={`py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                          selectedNode.executionMode === modeVal
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedNode.type === 'task' && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Type de tâche BPMN 2.0
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      ['user', 'service', 'manual', 'business_rule'] as BpmnTaskKind[]
                    ).map((kind) => {
                      const activeKind = resolveBpmnTaskKind(selectedNode) === kind;
                      const meta = BPMN_TASK_KIND_META[kind];
                      return (
                        <button
                          key={kind}
                          type="button"
                          title={`${meta.label} — ${meta.description}`}
                          onClick={() =>
                            onUpdateNode({
                              ...selectedNode,
                              taskKind: kind,
                              executionMode:
                                kind === 'service'
                                  ? 'automated'
                                  : kind === 'manual'
                                  ? 'manual'
                                  : selectedNode.executionMode,
                            })
                          }
                          className={`py-1 px-1 rounded text-[9.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition border ${
                            activeKind
                              ? 'bg-[#007AFF] text-white border-[#007AFF]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {renderBpmnTaskIcon(kind, 'w-3 h-3 shrink-0')}
                          <span className="truncate">{meta.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedNode.type === 'decision' && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Passerelle BPMN 2.0 (Gateway)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(['xor', 'or', 'and', 'event_based'] as BpmnGatewayKind[]).map((gwKind) => {
                      const activeGw = resolveBpmnGatewayKind(selectedNode) === gwKind;
                      const meta = BPMN_GATEWAY_KIND_META[gwKind];
                      return (
                        <button
                          key={gwKind}
                          type="button"
                          title={`${meta.label} — ${meta.description}`}
                          onClick={() =>
                            onUpdateNode({
                              ...selectedNode,
                              gatewayKind: gwKind,
                            })
                          }
                          className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition border ${
                            activeGw
                              ? 'bg-[#007AFF] text-white border-[#007AFF]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-[12px] leading-none">{meta.symbol}</span>
                          <span>{meta.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                ...cardClipStyle,
                top: 16,
                right: isCompactSplit ? 12 : 22,
                width: isCompactSplit ? 228 : 284,
              }}
              className="scifi-hud-panel pointer-events-auto absolute rounded-2xl bg-white/95 backdrop-blur-xl border border-indigo-200/95 p-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.10),0_2px_8px_rgba(79,70,229,0.08)]"
            >
              <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5 mb-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-700">
                  ▸ Données &amp; Documents
                </span>
                <span className="text-[9.5px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                  {(selectedNode.inputs?.length || 0) +
                    (attachedFilesCountByNode[selectedNode.id] || 0)}{' '}
                  élém.
                </span>
              </div>

              <div className="hud-scroll-area max-h-[72px] overflow-y-auto space-y-1 mb-2 pr-0.5">
                {(selectedNode.inputs || []).map((inp, i) => (
                  <div
                    key={`${inp}-${i}`}
                    className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200/90 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    <span className="truncate">• {inp}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (selectedNode.inputs || []).filter((_, idx) => idx !== i);
                        onUpdateNode({ ...selectedNode, inputs: next });
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(selectedNode.inputs || []).length === 0 && (
                  <p className="text-[10.5px] text-slate-400 italic">
                    Aucune donnée d&apos;entrée listée.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 mb-2">
                <input
                  type="text"
                  value={newInputText}
                  onChange={(e) => setNewInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newInputText.trim()) {
                      onUpdateNode({
                        ...selectedNode,
                        inputs: [...(selectedNode.inputs || []), newInputText.trim()],
                      });
                      setNewInputText('');
                    }
                  }}
                  placeholder="Ajouter donnée (ex: RIB)..."
                  className="flex-1 min-w-0 border border-slate-300 focus:border-indigo-500 rounded-md px-2 py-1 text-[11px] bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newInputText.trim()) return;
                    onUpdateNode({
                      ...selectedNode,
                      inputs: [...(selectedNode.inputs || []), newInputText.trim()],
                    });
                    setNewInputText('');
                  }}
                  className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                  title="Ajouter la donnée"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenDataDocumentsForStep(selectedNode.id)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>
                  Données &amp; documents ({attachedFilesCountByNode[selectedNode.id] || 0})
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* WINDOW 4 (BOTTOM-RIGHT): ACTEUR, SI & LIBELLÉ SYNCHRONISÉ */}
            <div
              style={{
                ...cardClipStyle,
                bottom: 92,
                right: isCompactSplit ? 12 : 22,
                width: isCompactSplit ? 228 : 284,
              }}
              className="scifi-hud-panel pointer-events-auto absolute rounded-2xl bg-white/95 backdrop-blur-xl border border-indigo-200/95 p-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.10),0_2px_8px_rgba(79,70,229,0.08)]"
            >
              <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5 mb-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-700">
                  ▸ Acteur &amp; Système SI
                </span>
                <span className="text-[9.5px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                  SYNC TABLEAU
                </span>
              </div>

              <div className="space-y-1.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Libellé de l&apos;étape
                  </label>
                  <input
                    id="hud-title-input"
                    type="text"
                    value={selectedNode.label || ''}
                    onChange={(e) =>
                      onUpdateNode({ ...selectedNode, label: e.target.value })
                    }
                    className="w-full border border-slate-300 focus:border-indigo-500 rounded-md px-2 py-1 text-[11.5px] font-bold text-slate-900 bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Responsable Métier
                  </label>
                  <input
                    type="text"
                    list="pa-hud-roles-list"
                    value={selectedNode.ownerRole || ''}
                    onChange={(e) =>
                      onUpdateNode({ ...selectedNode, ownerRole: e.target.value })
                    }
                    className="w-full border border-slate-300 focus:border-indigo-500 rounded-md px-2 py-1 text-[11.5px] font-semibold text-slate-800 bg-white outline-none"
                  />
                  <datalist id="pa-hud-roles-list">
                    {availableRoles.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Application SI
                  </label>
                  <input
                    type="text"
                    value={selectedNode.application || ''}
                    onChange={(e) =>
                      onUpdateNode({ ...selectedNode, application: e.target.value })
                    }
                    placeholder="Ex: Core Assurance / GED..."
                    className="w-full border border-slate-300 focus:border-indigo-500 rounded-md px-2 py-1 text-[11.5px] font-medium text-slate-800 bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Navigation & Context Pill: Top-center in HUD mode (zero overlap with MacDock or bottom radial sector) */}
        <div
          className={`hud-bottom-pill absolute z-50 bg-white/95 backdrop-blur-md border border-[#007AFF]/25 shadow-lg rounded-full px-3.5 py-1.5 flex items-center gap-2.5 text-[11.5px] font-semibold text-slate-700 whitespace-nowrap ${
            isHudOpen
              ? 'top-3 left-1/2 -translate-x-1/2'
              : 'bottom-4 right-4'
          }`}
        >
          {isHudOpen && selectedNode ? (
            <>
              <button
                type="button"
                onClick={() => navigateStep(-1)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-[#007AFF]/10 text-[#007AFF] font-bold cursor-pointer transition"
                title="Étape précédente (Flèche gauche)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Préc.</span>
              </button>
              <span className="text-slate-800 font-bold max-w-[180px] sm:max-w-[260px] truncate">
                Étape {selectedIndex + 1}/{nodes.length} · {selectedNode.label}
              </span>
              <button
                type="button"
                onClick={() => navigateStep(1)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-[#007AFF]/10 text-[#007AFF] font-bold cursor-pointer transition"
                title="Étape suivante (Flèche droite)"
              >
                <span>Suiv.</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-slate-200" />
              <button
                type="button"
                onClick={() => {
                  setIsHudForceOpen(false);
                  setZoom(100);
                  setPan({ x: 0, y: 0 });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold cursor-pointer transition"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Vue globale</span>
              </button>
            </>
          ) : readOnly ? (
            <span className="text-slate-500 hidden sm:inline">
              Lecture seule · Glisser pour déplacer · Molette pour zoomer
            </span>
          ) : (
            <>
              <span className="text-slate-600 hidden sm:inline">
                {zoomHudMode ? (
                  <>
                    <strong className="text-[#1F93FF]">Zoom Infos actif</strong> : zoomez sur un élément pour ouvrir ses infos HUD
                  </>
                ) : (
                  <>
                    Zoom = <strong>Lecture claire</strong> · Clic ={' '}
                    <strong>Cercle d&apos;actions</strong> · Double-clic ={' '}
                    <strong>Infos HUD</strong>
                  </>
                )}
              </span>
              {selectedNode && (
                <button
                  type="button"
                  onClick={() => {
                    setCircleOpenForId(selectedNode.id);
                    setPan({ x: 0, y: 0 });
                    setIsHudForceOpen(true);
                    setZoom(ZOOM_HUD_TARGET);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Ouvrir HUD</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <DiagramCaptureModal
        isOpen={Boolean(captureResult)}
        onClose={() => setCaptureResult(null)}
        dataUrl={captureResult?.dataUrl || null}
        fileName={captureResult?.fileName || 'diagramme.png'}
        modeLabel={captureResult?.modeLabel || 'Diagramme BPMN'}
        dimensions={captureResult?.dimensions || null}
      />
    </div>
  );
};
