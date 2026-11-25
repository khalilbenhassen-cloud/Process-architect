import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  GitCompare,
  ArrowLeftRight,
  Clock,
  Cpu,
  ShieldCheck,
  Layers,
  Users,
  Monitor,
  Loader2,
  Eye,
  Download,
} from 'lucide-react';
import { Process, ProcessNode, ProcessSummary } from '../../types/process';
import * as api from '../../services/api';

interface ProcessCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  processes: ProcessSummary[];
  /** Optional custom loader for testing */
  loadProcess?: (processId: string) => Promise<Process>;
}

type CompareTab = 'overview' | 'steps' | 'rules' | 'org';

function normalizeKey(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function computeProcessMetrics(proc: Process | undefined) {
  if (!proc) {
    return {
      totalMinutes: 0,
      stepCount: 0,
      taskCount: 0,
      decisionCount: 0,
      automatedCount: 0,
      automationPct: 0,
      ruleCount: 0,
      testCount: 0,
      roles: [] as string[],
      apps: [] as string[],
    };
  }
  const activeNodes = (proc.nodes || []).filter(
    (n) => n.type !== 'start' && n.type !== 'end'
  );
  const taskNodes = activeNodes.filter((n) => n.type !== 'decision');
  const decisionNodes = activeNodes.filter((n) => n.type === 'decision');
  const totalMinutes = activeNodes.reduce(
    (sum, n) => sum + (n.estimatedDurationMinutes || 0),
    0
  );
  const automatedCount = activeNodes.filter(
    (n) => n.executionMode === 'automated' || n.executionMode === 'mixed'
  ).length;
  const automationPct =
    activeNodes.length > 0
      ? Math.round((automatedCount / activeNodes.length) * 100)
      : 0;

  const roles = Array.from(
    new Set(
      activeNodes
        .map((n) => (n.ownerRole || '').trim())
        .filter((r) => r.length > 0 && !r.endsWith('?'))
    )
  );
  const apps = Array.from(
    new Set(
      activeNodes
        .map((n) => (n.application || '').trim())
        .filter((a) => a.length > 0)
    )
  );

  return {
    totalMinutes,
    stepCount: (proc.nodes || []).length,
    taskCount: taskNodes.length,
    decisionCount: decisionNodes.length,
    automatedCount,
    automationPct,
    ruleCount: (proc.businessRules || []).length,
    testCount: (proc.testCases || []).length,
    roles,
    apps,
  };
}

function formatDelta(a: number, b: number, suffix = ''): string {
  const diff = b - a;
  if (diff === 0) return `0${suffix}`;
  return `${diff > 0 ? '+' : ''}${diff}${suffix}`;
}

function formatModeLabel(mode?: string): string {
  if (mode === 'automated') return 'Auto';
  if (mode === 'mixed') return 'Mixte';
  return 'Manuel';
}

function escapeXml(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type ExcelCell = { value: string | number; style?: string; type?: 'String' | 'Number' };

function buildWorksheetXml(
  sheetName: string,
  colWidths: number[],
  rows: ExcelCell[][]
): string {
  const safeName = escapeXml(sheetName.slice(0, 31));
  const colsXml = colWidths
    .map((w) => `<Column ss:AutoFitWidth="0" ss:Width="${w}"/>`)
    .join('');
  const rowsXml = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const type =
              cell.type || (typeof cell.value === 'number' ? 'Number' : 'String');
            const styleAttr = cell.style ? ` ss:StyleID="${cell.style}"` : '';
            return `<Cell${styleAttr}><Data ss:Type="${type}">${escapeXml(
              cell.value
            )}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');
  return `<Worksheet ss:Name="${safeName}"><Table>${colsXml}${rowsXml}</Table></Worksheet>`;
}

export function buildComparisonExcelXml(params: {
  projectName: string;
  procA: Process;
  procB: Process;
  metricsA: ReturnType<typeof computeProcessMetrics>;
  metricsB: ReturnType<typeof computeProcessMetrics>;
  durationDeltaPct: number;
  stepDiff: {
    added: ProcessNode[];
    removed: ProcessNode[];
    common: { a: ProcessNode; b: ProcessNode }[];
  };
  ruleDiff: {
    added: Process['businessRules'];
    removed: Process['businessRules'];
    common: Process['businessRules'];
  };
  orgDiff: {
    rolesAdded: string[];
    rolesRemoved: string[];
    rolesCommon: string[];
    appsAdded: string[];
    appsRemoved: string[];
    appsCommon: string[];
  };
}): string {
  const {
    projectName,
    procA,
    procB,
    metricsA,
    metricsB,
    durationDeltaPct,
    stepDiff,
    ruleDiff,
    orgDiff,
  } = params;

  const exportedAt = new Date().toLocaleString('fr-FR');
  const labelA = `${procA.name} (${procA.modelState.toUpperCase()} v${procA.version})`;
  const labelB = `${procB.name} (${procB.modelState.toUpperCase()} v${procB.version})`;

  // Sheet 1: Synthèse & Gains
  const sheet1 = buildWorksheetXml(
    'Synthèse & Gains',
    [240, 170, 170, 130],
    [
      [{ value: `Comparatif Processus — ${projectName}`, style: 'title' }],
      [{ value: `Exporté le ${exportedAt}`, style: 'muted' }],
      [
        { value: 'Référence (A)', style: 'header' },
        { value: labelA },
        { value: 'Cible (B)', style: 'header' },
        { value: labelB },
      ],
      [],
      [
        { value: 'Indicateur', style: 'header' },
        { value: 'Référence (A)', style: 'header' },
        { value: 'Cible (B)', style: 'header' },
        { value: 'Évolution', style: 'header' },
      ],
      [
        { value: 'Étapes totales' },
        { value: metricsA.stepCount },
        { value: metricsB.stepCount },
        { value: formatDelta(metricsA.stepCount, metricsB.stepCount), style: 'accent' },
      ],
      [
        { value: 'Tâches métier' },
        { value: metricsA.taskCount },
        { value: metricsB.taskCount },
        { value: formatDelta(metricsA.taskCount, metricsB.taskCount), style: 'accent' },
      ],
      [
        { value: 'Points de décision' },
        { value: metricsA.decisionCount },
        { value: metricsB.decisionCount },
        { value: formatDelta(metricsA.decisionCount, metricsB.decisionCount), style: 'accent' },
      ],
      [
        { value: 'Durée cumulée SLA (min)' },
        { value: metricsA.totalMinutes },
        { value: metricsB.totalMinutes },
        {
          value: `${formatDelta(metricsA.totalMinutes, metricsB.totalMinutes, ' min')} (${
            durationDeltaPct > 0 ? `+${durationDeltaPct}%` : `${durationDeltaPct}%`
          })`,
          style: durationDeltaPct <= 0 ? 'added' : 'removed',
        },
      ],
      [
        { value: "Taux d'automatisation (%)" },
        { value: `${metricsA.automationPct}%` },
        { value: `${metricsB.automationPct}%` },
        {
          value: formatDelta(metricsA.automationPct, metricsB.automationPct, ' pts'),
          style: metricsB.automationPct >= metricsA.automationPct ? 'added' : 'removed',
        },
      ],
      [
        { value: 'Étapes auto / mixtes' },
        { value: metricsA.automatedCount },
        { value: metricsB.automatedCount },
        { value: formatDelta(metricsA.automatedCount, metricsB.automatedCount), style: 'accent' },
      ],
      [
        { value: 'Règles métier (RG)' },
        { value: metricsA.ruleCount },
        { value: metricsB.ruleCount },
        { value: formatDelta(metricsA.ruleCount, metricsB.ruleCount), style: 'added' },
      ],
      [
        { value: 'Cas de test QA' },
        { value: metricsA.testCount },
        { value: metricsB.testCount },
        { value: formatDelta(metricsA.testCount, metricsB.testCount), style: 'added' },
      ],
      [
        { value: 'Acteurs / Rôles distincts' },
        { value: metricsA.roles.length },
        { value: metricsB.roles.length },
        { value: formatDelta(metricsA.roles.length, metricsB.roles.length) },
      ],
      [
        { value: 'Applications SI' },
        { value: metricsA.apps.length },
        { value: metricsB.apps.length },
        { value: formatDelta(metricsA.apps.length, metricsB.apps.length) },
      ],
    ]
  );

  // Sheet 2: Étapes
  const stepRows: ExcelCell[][] = [
    [
      { value: 'Statut', style: 'header' },
      { value: 'Libellé de l’étape', style: 'header' },
      { value: 'Type', style: 'header' },
      { value: 'Rôle métier', style: 'header' },
      { value: 'Application SI', style: 'header' },
      { value: 'Mode', style: 'header' },
      { value: 'Durée Réf. A (min)', style: 'header' },
      { value: 'Durée Cible B (min)', style: 'header' },
      { value: 'Écart (min)', style: 'header' },
    ],
    ...stepDiff.added.map((n) => [
      { value: 'Ajoutée (+)', style: 'added' },
      { value: n.label },
      { value: n.type === 'decision' ? 'Décision' : 'Tâche' },
      { value: n.ownerRole || 'Système' },
      { value: n.application || '—' },
      { value: formatModeLabel(n.executionMode) },
      { value: '—' },
      { value: n.estimatedDurationMinutes || 0 },
      { value: `+${n.estimatedDurationMinutes || 0}`, style: 'added' },
    ]),
    ...stepDiff.removed.map((n) => [
      { value: 'Supprimée (−)', style: 'removed' },
      { value: n.label },
      { value: n.type === 'decision' ? 'Décision' : 'Tâche' },
      { value: n.ownerRole || 'Système' },
      { value: n.application || '—' },
      { value: formatModeLabel(n.executionMode) },
      { value: n.estimatedDurationMinutes || 0 },
      { value: '—' },
      { value: `-${n.estimatedDurationMinutes || 0}`, style: 'removed' },
    ]),
    ...stepDiff.common.map(({ a, b }) => [
      { value: 'Conservée (=)', style: 'muted' },
      { value: b.label },
      { value: b.type === 'decision' ? 'Décision' : 'Tâche' },
      { value: b.ownerRole || 'Système' },
      { value: b.application || '—' },
      { value: `${formatModeLabel(a.executionMode)} → ${formatModeLabel(b.executionMode)}` },
      { value: a.estimatedDurationMinutes || 0 },
      { value: b.estimatedDurationMinutes || 0 },
      {
        value: formatDelta(
          a.estimatedDurationMinutes || 0,
          b.estimatedDurationMinutes || 0
        ),
      },
    ]),
  ];
  const sheet2 = buildWorksheetXml(
    'Étapes',
    [100, 230, 80, 160, 150, 95, 105, 110, 85],
    stepRows
  );

  // Sheet 3: Règles RG
  const ruleRows: ExcelCell[][] = [
    [
      { value: 'Statut', style: 'header' },
      { value: 'Code RG', style: 'header' },
      { value: 'Intitulé', style: 'header' },
      { value: 'Catégorie', style: 'header' },
      { value: 'Sévérité', style: 'header' },
      { value: 'Énoncé', style: 'header' },
    ],
    ...ruleDiff.added.map((r) => [
      { value: 'Ajoutée (+)', style: 'added' },
      { value: r.id, style: 'accent' },
      { value: r.title },
      { value: r.category },
      { value: r.severity },
      { value: r.statement },
    ]),
    ...ruleDiff.common.map((r) => [
      { value: 'Maintenue (=)', style: 'muted' },
      { value: r.id },
      { value: r.title },
      { value: r.category },
      { value: r.severity },
      { value: r.statement },
    ]),
    ...ruleDiff.removed.map((r) => [
      { value: 'Référence seule (−)', style: 'removed' },
      { value: r.id },
      { value: r.title },
      { value: r.category },
      { value: r.severity },
      { value: r.statement },
    ]),
  ];
  const sheet3 = buildWorksheetXml(
    'Règles RG',
    [115, 105, 220, 110, 80, 340],
    ruleRows
  );

  // Sheet 4: Acteurs & SI
  const orgRows: ExcelCell[][] = [
    [
      { value: 'Dimension', style: 'header' },
      { value: 'Statut', style: 'header' },
      { value: 'Nom', style: 'header' },
    ],
    ...orgDiff.rolesAdded.map((r) => [
      { value: 'Rôle métier' },
      { value: 'Ajouté (+)', style: 'added' },
      { value: r },
    ]),
    ...orgDiff.rolesRemoved.map((r) => [
      { value: 'Rôle métier' },
      { value: 'Supprimé (−)', style: 'removed' },
      { value: r },
    ]),
    ...orgDiff.rolesCommon.map((r) => [
      { value: 'Rôle métier' },
      { value: 'Commun (=)', style: 'muted' },
      { value: r },
    ]),
    ...orgDiff.appsAdded.map((a) => [
      { value: 'Application SI' },
      { value: 'Ajoutée (+)', style: 'added' },
      { value: a },
    ]),
    ...orgDiff.appsRemoved.map((a) => [
      { value: 'Application SI' },
      { value: 'Supprimée (−)', style: 'removed' },
      { value: a },
    ]),
    ...orgDiff.appsCommon.map((a) => [
      { value: 'Application SI' },
      { value: 'Commune (=)', style: 'muted' },
      { value: a },
    ]),
  ];
  const sheet4 = buildWorksheetXml('Acteurs & SI', [120, 115, 260], orgRows);

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1D1D1F"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="title">
      <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#1D1D1F"/>
    </Style>
    <Style ss:ID="header">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1D1D1F" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="accent">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#007AFF"/>
    </Style>
    <Style ss:ID="added">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1D8F3E"/>
      <Interior ss:Color="#ECFDF3" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="removed">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C41E1A"/>
      <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="muted">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#6E6E73"/>
    </Style>
  </Styles>
  ${sheet1}
  ${sheet2}
  ${sheet3}
  ${sheet4}
</Workbook>`;
}

export const ProcessCompareModal: React.FC<ProcessCompareModalProps> = ({
  isOpen,
  onClose,
  projectName,
  processes,
  loadProcess = api.fetchProcess,
}) => {
  // Smart default: put AS-IS on the left (Reference A) and TO-BE on the right (Target B)
  const defaultPair = useMemo(() => {
    const asIs = processes.find((p) => p.modelState === 'as_is');
    const toBe = processes.find((p) => p.modelState === 'to_be' && p.id !== asIs?.id);
    if (asIs && toBe) return [asIs.id, toBe.id] as const;
    return [processes[0]?.id || '', processes[1]?.id || processes[0]?.id || ''] as const;
  }, [processes]);

  const [procAId, setProcAId] = useState<string>(defaultPair[0]);
  const [procBId, setProcBId] = useState<string>(defaultPair[1]);
  const [activeTab, setActiveTab] = useState<CompareTab>('overview');
  const [cache, setCache] = useState<Record<string, Process>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const loadProcessRef = useRef(loadProcess);
  loadProcessRef.current = loadProcess;

  useEffect(() => {
    if (isOpen) {
      setProcAId(defaultPair[0]);
      setProcBId(defaultPair[1]);
      setActiveTab('overview');
    }
  }, [isOpen, defaultPair]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Fetch full process details on demand (without cancelling in-flight requests on state updates)
  useEffect(() => {
    if (!isOpen) return;
    const idsToLoad = Array.from(new Set([procAId, procBId])).filter(
      (id) => Boolean(id) && !cache[id] && !inFlightRef.current.has(id)
    );
    if (idsToLoad.length === 0) return;

    idsToLoad.forEach((id) => inFlightRef.current.add(id));
    setErrorMsg(null);
    setIsLoading(true);

    Promise.all(
      idsToLoad.map(async (id) => {
        const full = await loadProcessRef.current(id);
        return [id, full] as const;
      })
    )
      .then((entries) => {
        setCache((prev) => {
          const next = { ...prev };
          entries.forEach(([id, proc]) => {
            next[id] = proc;
          });
          return next;
        });
      })
      .catch(() => {
        setErrorMsg('Impossible de charger le détail complet des processus.');
      })
      .finally(() => {
        idsToLoad.forEach((id) => inFlightRef.current.delete(id));
        if (inFlightRef.current.size === 0) {
          setIsLoading(false);
        }
      });
  }, [isOpen, procAId, procBId, cache]);

  const procA = cache[procAId];
  const procB = cache[procBId];

  const metricsA = useMemo(() => computeProcessMetrics(procA), [procA]);
  const metricsB = useMemo(() => computeProcessMetrics(procB), [procB]);

  // Detailed Step Diff (Added / Removed / Common)
  const stepDiff = useMemo(() => {
    const nodesA = (procA?.nodes || []).filter((n) => n.type !== 'start' && n.type !== 'end');
    const nodesB = (procB?.nodes || []).filter((n) => n.type !== 'start' && n.type !== 'end');

    const mapA = new Map<string, ProcessNode>();
    nodesA.forEach((n) => mapA.set(normalizeKey(n.label), n));
    const mapB = new Map<string, ProcessNode>();
    nodesB.forEach((n) => mapB.set(normalizeKey(n.label), n));

    const added: ProcessNode[] = [];
    const common: { a: ProcessNode; b: ProcessNode }[] = [];
    const removed: ProcessNode[] = [];

    nodesB.forEach((nb) => {
      const k = normalizeKey(nb.label);
      const matchA = mapA.get(k);
      if (matchA) {
        common.push({ a: matchA, b: nb });
      } else {
        added.push(nb);
      }
    });

    nodesA.forEach((na) => {
      const k = normalizeKey(na.label);
      if (!mapB.has(k)) {
        removed.push(na);
      }
    });

    return { added, removed, common };
  }, [procA, procB]);

  // Detailed Business Rules Diff
  const ruleDiff = useMemo(() => {
    const rulesA = procA?.businessRules || [];
    const rulesB = procB?.businessRules || [];
    const idsA = new Set(rulesA.map((r) => r.id));
    const idsB = new Set(rulesB.map((r) => r.id));

    return {
      added: rulesB.filter((r) => !idsA.has(r.id)),
      removed: rulesA.filter((r) => !idsB.has(r.id)),
      common: rulesB.filter((r) => idsA.has(r.id)),
    };
  }, [procA, procB]);

  // Roles & Applications Diff
  const orgDiff = useMemo(() => {
    const setRolesA = new Set(metricsA.roles);
    const setRolesB = new Set(metricsB.roles);
    const setAppsA = new Set(metricsA.apps);
    const setAppsB = new Set(metricsB.apps);

    return {
      rolesAdded: metricsB.roles.filter((r) => !setRolesA.has(r)),
      rolesRemoved: metricsA.roles.filter((r) => !setRolesB.has(r)),
      rolesCommon: metricsB.roles.filter((r) => setRolesA.has(r)),
      appsAdded: metricsB.apps.filter((a) => !setAppsA.has(a)),
      appsRemoved: metricsA.apps.filter((a) => !setAppsB.has(a)),
      appsCommon: metricsB.apps.filter((a) => setAppsA.has(a)),
    };
  }, [metricsA, metricsB]);

  if (!isOpen) return null;

  const durationDeltaPct =
    metricsA.totalMinutes > 0
      ? Math.round(
          ((metricsB.totalMinutes - metricsA.totalMinutes) / metricsA.totalMinutes) * 100
        )
      : 0;

  const handleExportExcel = () => {
    if (!procA || !procB) return;
    const xml = buildComparisonExcelXml({
      projectName,
      procA,
      procB,
      metricsA,
      metricsB,
      durationDeltaPct,
      stepDiff,
      ruleDiff,
      orgDiff,
    });
    const blob = new Blob([xml], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const slug = (projectName || 'comparatif')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparatif-${slug || 'processus'}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Comparateur de processus en lecture seule"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[88vh] bg-[#F5F5F7] border border-black/[0.10] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden text-[#1D1D1F]"
      >
        {/* TOP HEADER */}
        <div className="px-5 py-4 bg-white/95 backdrop-blur-md border-b border-black/[0.07] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-black/[0.07] text-[#007AFF] flex items-center justify-center shrink-0">
              <GitCompare className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[15.5px] font-semibold tracking-tight text-[#1D1D1F] truncate">
                  Comparaison des processus
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[10.5px] font-semibold text-[#6E6E73]">
                  <Eye className="w-3 h-3" />
                  Lecture seule
                </span>
              </div>
              <p className="text-[12px] text-[#6E6E73] truncate">{projectName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le comparateur"
            className="w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-black/[0.08] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SELECTOR BAR (A vs B + Swap) */}
        <div className="px-5 py-3 bg-white border-b border-black/[0.06] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shrink-0">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1">
              Référence (A)
            </label>
            <select
              aria-label="Processus de référence A"
              value={procAId}
              onChange={(e) => setProcAId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-black/[0.09] bg-[#F5F5F7] text-[12.5px] font-semibold text-[#1D1D1F] outline-none focus:border-[#007AFF] cursor-pointer"
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.modelState.toUpperCase()} · v{p.version})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setProcAId(procBId);
              setProcBId(procAId);
            }}
            title="Inverser Référence et Cible"
            aria-label="Inverser Référence et Cible"
            className="self-center md:mt-4 px-2.5 py-1.5 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] inline-flex items-center gap-1 text-[11.5px] font-semibold transition cursor-pointer shrink-0"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Inverser</span>
          </button>

          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#007AFF] mb-1">
              Cible comparée (B)
            </label>
            <select
              aria-label="Processus cible B"
              value={procBId}
              onChange={(e) => setProcBId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#007AFF]/35 bg-white text-[12.5px] font-semibold text-[#1D1D1F] outline-none focus:border-[#007AFF] cursor-pointer"
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.modelState.toUpperCase()} · v{p.version})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* NAVIGATION TABS (macOS Segmented Control) */}
        <div className="px-5 py-2.5 bg-[#F5F5F7] border-b border-black/[0.06] flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="inline-flex items-center gap-1 bg-white p-0.5 rounded-xl border border-black/[0.07]">
            {(
              [
                ['overview', 'Synthèse & Gains'],
                ['steps', `Étapes (+${stepDiff.added.length} / −${stepDiff.removed.length})`],
                ['rules', `Règles RG (+${ruleDiff.added.length})`],
                ['org', 'Acteurs & SI'],
              ] as [CompareTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition cursor-pointer ${
                  activeTab === key
                    ? 'bg-[#007AFF] text-white shadow-2xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {procA && procB && (
            <span className="text-[11.5px] font-medium text-[#6E6E73]">
              {procA.modelState.toUpperCase()} v{procA.version} →{' '}
              <strong className="text-[#1D1D1F]">
                {procB.modelState.toUpperCase()} v{procB.version}
              </strong>
            </span>
          )}
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-[#6E6E73]">
              <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
              <span className="text-xs font-medium">
                Chargement et analyse comparative des processus...
              </span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-white border border-[#FF3B30]/35 text-xs text-[#C41E1A] font-medium">
              {errorMsg}
            </div>
          ) : (
            <>
              {/* TAB 1: SYNTHÈSE & GAINS */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* 4 KPI Impact Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* SLA Duration */}
                    <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#6E6E73] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
                          Durée SLA totale
                        </span>
                        {durationDeltaPct !== 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              durationDeltaPct < 0
                                ? 'bg-[#34C759]/12 text-[#1D8F3E]'
                                : 'bg-[#FF9500]/12 text-[#C96A00]'
                            }`}
                          >
                            {durationDeltaPct > 0 ? `+${durationDeltaPct}%` : `${durationDeltaPct}%`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-[#8E8E93] line-through">
                          {metricsA.totalMinutes}m
                        </span>
                        <span className="text-[20px] font-bold text-[#1D1D1F]">
                          {metricsB.totalMinutes}m
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6E6E73]">
                        Écart : {formatDelta(metricsA.totalMinutes, metricsB.totalMinutes, ' min')}
                      </div>
                    </div>

                    {/* Automation */}
                    <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#6E6E73] flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#007AFF]" />
                          Automatisation
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            metricsB.automationPct >= metricsA.automationPct
                              ? 'bg-[#34C759]/12 text-[#1D8F3E]'
                              : 'bg-[#FF9500]/12 text-[#C96A00]'
                          }`}
                        >
                          {formatDelta(metricsA.automationPct, metricsB.automationPct, ' pts')}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-[#8E8E93]">
                          {metricsA.automationPct}%
                        </span>
                        <span className="text-[#8E8E93]">→</span>
                        <span className="text-[20px] font-bold text-[#1D1D1F]">
                          {metricsB.automationPct}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6E6E73]">
                        {metricsB.automatedCount} étape(s) auto / mixte en cible
                      </div>
                    </div>

                    {/* Steps & Decisions */}
                    <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#6E6E73] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#007AFF]" />
                          Étapes &amp; Contrôles
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#007AFF]/10 text-[#007AFF]">
                          {formatDelta(metricsA.stepCount, metricsB.stepCount)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-[#8E8E93]">
                          {metricsA.stepCount}
                        </span>
                        <span className="text-[#8E8E93]">→</span>
                        <span className="text-[20px] font-bold text-[#1D1D1F]">
                          {metricsB.stepCount}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6E6E73]">
                        Décisions : {metricsA.decisionCount} → {metricsB.decisionCount}
                      </div>
                    </div>

                    {/* Rules & QA */}
                    <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#6E6E73] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
                          Règles RG &amp; Recette
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#34C759]/12 text-[#1D8F3E]">
                          {formatDelta(metricsA.ruleCount, metricsB.ruleCount, ' RG')}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-[#8E8E93]">
                          {metricsA.ruleCount} RG
                        </span>
                        <span className="text-[#8E8E93]">→</span>
                        <span className="text-[20px] font-bold text-[#1D1D1F]">
                          {metricsB.ruleCount} RG
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6E6E73]">
                        Cas de test QA : {metricsA.testCount} → {metricsB.testCount}
                      </div>
                    </div>
                  </div>

                  {/* Quick Executive Summary Table */}
                  <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 border-b border-black/[0.06] text-[12.5px] font-semibold text-[#1D1D1F]">
                      Tableau comparatif synthétique
                    </div>
                    <table className="w-full text-left border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-[#F5F5F7]/75 border-b border-black/[0.06] text-[10.5px] uppercase tracking-wider text-[#6E6E73]">
                          <th className="py-2.5 px-4">Indicateur</th>
                          <th className="py-2.5 px-4">Référence (A)</th>
                          <th className="py-2.5 px-4">Cible (B)</th>
                          <th className="py-2.5 px-4 text-right">Évolution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05]">
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-[#6E6E73]">Étapes totales</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsA.stepCount}</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsB.stepCount}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#007AFF]">
                            {formatDelta(metricsA.stepCount, metricsB.stepCount)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-[#6E6E73]">Points de décision</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsA.decisionCount}</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsB.decisionCount}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#007AFF]">
                            {formatDelta(metricsA.decisionCount, metricsB.decisionCount)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-[#6E6E73]">Durée cumulée SLA</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsA.totalMinutes} min</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsB.totalMinutes} min</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#1D8F3E]">
                            {formatDelta(metricsA.totalMinutes, metricsB.totalMinutes, ' min')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-[#6E6E73]">Règles métier (RG)</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsA.ruleCount}</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsB.ruleCount}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#1D8F3E]">
                            {formatDelta(metricsA.ruleCount, metricsB.ruleCount)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-[#6E6E73]">Acteurs / Rôles distincts</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsA.roles.length}</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsB.roles.length}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#6E6E73]">
                            {formatDelta(metricsA.roles.length, metricsB.roles.length)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-[#6E6E73]">Applications SI</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsA.apps.length}</td>
                          <td className="py-2.5 px-4 font-semibold">{metricsB.apps.length}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#6E6E73]">
                            {formatDelta(metricsA.apps.length, metricsB.apps.length)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: DIFF DES ÉTAPES */}
              {activeTab === 'steps' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Added in B */}
                  <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                      <span className="text-[12.5px] font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                        Ajoutées dans la cible ({stepDiff.added.length})
                      </span>
                    </div>
                    {stepDiff.added.length === 0 ? (
                      <p className="text-xs text-[#8E8E93] italic">Aucune nouvelle étape.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stepDiff.added.map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 rounded-xl bg-[#34C759]/[0.06] border border-[#34C759]/25 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-[12px] font-semibold text-[#1D1D1F] truncate">
                                + {n.label}
                              </div>
                              <div className="text-[11px] text-[#6E6E73] truncate">
                                {n.ownerRole || 'Système'} · {formatModeLabel(n.executionMode)}
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-[#1D8F3E] shrink-0">
                              {n.estimatedDurationMinutes || 0}m
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Removed from A */}
                  <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                      <span className="text-[12.5px] font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                        Supprimées / remplacées ({stepDiff.removed.length})
                      </span>
                    </div>
                    {stepDiff.removed.length === 0 ? (
                      <p className="text-xs text-[#8E8E93] italic">Aucune étape supprimée.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stepDiff.removed.map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 rounded-xl bg-[#FF3B30]/[0.05] border border-[#FF3B30]/20 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-[12px] font-semibold text-[#1D1D1F] truncate">
                                − {n.label}
                              </div>
                              <div className="text-[11px] text-[#6E6E73] truncate">
                                {n.ownerRole || 'Système'} · {formatModeLabel(n.executionMode)}
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-[#C41E1A] shrink-0">
                              {n.estimatedDurationMinutes || 0}m
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Common Steps */}
                  {stepDiff.common.length > 0 && (
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="text-[12.5px] font-semibold text-[#1D1D1F] border-b border-black/[0.06] pb-2">
                        Étapes communes conservées ({stepDiff.common.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {stepDiff.common.map(({ a, b }) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-[#F5F5F7]/75 border border-black/[0.06] flex items-center justify-between gap-2"
                          >
                            <span className="text-[12px] font-medium text-[#1D1D1F] truncate">
                              {b.label}
                            </span>
                            <span className="text-[11px] text-[#6E6E73] shrink-0">
                              {a.estimatedDurationMinutes || 0}m →{' '}
                              <strong className="text-[#1D1D1F]">
                                {b.estimatedDurationMinutes || 0}m
                              </strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DIFF DES RÈGLES MÉTIER */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2.5 shadow-2xs">
                    <div className="text-[12.5px] font-semibold text-[#1D1D1F] flex items-center gap-2 border-b border-black/[0.06] pb-2">
                      <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                      Nouvelles règles introduites en cible ({ruleDiff.added.length})
                    </div>
                    {ruleDiff.added.length === 0 ? (
                      <p className="text-xs text-[#8E8E93] italic">Aucune nouvelle règle RG.</p>
                    ) : (
                      <div className="space-y-2">
                        {ruleDiff.added.map((r) => (
                          <div
                            key={r.id}
                            className="p-3 rounded-xl bg-[#34C759]/[0.05] border border-[#34C759]/25 space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-black/[0.08] text-[#1D1D1F]">
                                {r.id}
                              </span>
                              <span className="text-[12.5px] font-semibold text-[#1D1D1F]">
                                {r.title}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-[#6E6E73]">{r.statement}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {ruleDiff.common.length > 0 && (
                    <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="text-[12.5px] font-semibold text-[#1D1D1F] border-b border-black/[0.06] pb-2">
                        Règles communes maintenues ({ruleDiff.common.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ruleDiff.common.map((r) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded-xl bg-[#F5F5F7]/75 border border-black/[0.06] flex items-center gap-2"
                          >
                            <span className="font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-white border border-black/[0.07]">
                              {r.id}
                            </span>
                            <span className="text-[12px] font-medium text-[#1D1D1F] truncate">
                              {r.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ruleDiff.removed.length > 0 && (
                    <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2 shadow-2xs">
                      <div className="text-[12.5px] font-semibold text-[#1D1D1F] flex items-center gap-2 border-b border-black/[0.06] pb-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                        Règles présentes uniquement en référence ({ruleDiff.removed.length})
                      </div>
                      <div className="space-y-1.5">
                        {ruleDiff.removed.map((r) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded-xl bg-[#FF3B30]/[0.05] border border-[#FF3B30]/20 flex items-center gap-2"
                          >
                            <span className="font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-white border border-black/[0.07]">
                              {r.id}
                            </span>
                            <span className="text-[12px] font-medium text-[#1D1D1F] truncate">
                              {r.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ACTEURS & APPLICATIONS SI */}
              {activeTab === 'org' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Roles */}
                  <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-3 shadow-2xs">
                    <div className="text-[12.5px] font-semibold text-[#1D1D1F] flex items-center gap-2 border-b border-black/[0.06] pb-2">
                      <Users className="w-4 h-4 text-[#007AFF]" />
                      Évolution des Rôles Métier
                    </div>
                    <div className="space-y-2 text-[12px]">
                      {orgDiff.rolesAdded.map((r) => (
                        <div key={r} className="flex items-center gap-2 text-[#1D8F3E] font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                          <span>+ {r}</span>
                        </div>
                      ))}
                      {orgDiff.rolesRemoved.map((r) => (
                        <div key={r} className="flex items-center gap-2 text-[#C41E1A] font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                          <span>− {r}</span>
                        </div>
                      ))}
                      {orgDiff.rolesCommon.map((r) => (
                        <div key={r} className="flex items-center gap-2 text-[#6E6E73]">
                          <span className="w-2 h-2 rounded-full bg-[#D1D1D6]" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IT Applications */}
                  <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-3 shadow-2xs">
                    <div className="text-[12.5px] font-semibold text-[#1D1D1F] flex items-center gap-2 border-b border-black/[0.06] pb-2">
                      <Monitor className="w-4 h-4 text-[#007AFF]" />
                      Évolution des Applications SI
                    </div>
                    <div className="space-y-2 text-[12px]">
                      {orgDiff.appsAdded.map((a) => (
                        <div key={a} className="flex items-center gap-2 text-[#1D8F3E] font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                          <span>+ {a}</span>
                        </div>
                      ))}
                      {orgDiff.appsRemoved.map((a) => (
                        <div key={a} className="flex items-center gap-2 text-[#C41E1A] font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                          <span>− {a}</span>
                        </div>
                      ))}
                      {orgDiff.appsCommon.map((a) => (
                        <div key={a} className="flex items-center gap-2 text-[#6E6E73]">
                          <span className="w-2 h-2 rounded-full bg-[#D1D1D6]" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-white/95 border-t border-black/[0.07] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            disabled={isLoading || !procA || !procB}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] disabled:opacity-45 text-white text-[12px] font-semibold transition cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Excel</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-white text-[12px] font-semibold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
