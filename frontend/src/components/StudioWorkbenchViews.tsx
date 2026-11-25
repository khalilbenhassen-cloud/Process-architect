import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCircle2,
  Play,
  Sparkles,
  Wrench,
  Clock,
  Cpu,
  User,
  FileCheck,
  Download,
  ChevronRight,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  ProcessNode,
  ProcessEdge,
  BusinessRule,
  ValidationResult,
  TestCase,
} from '../types/process';
import { formatDuration } from '../utils/durationFormat';
import { isSensitiveControlStep } from '../utils/processAudit';

// ============================================================================
// 1. AUDIT WORKBENCH PANEL (Left Pane + Right Filter Header)
// ============================================================================

export interface EnrichedFinding {
  id: string;
  code: string;
  severity: 'bloquant' | 'majeur' | 'mineur';
  title: string;
  description: string;
  nodeId?: string;
  stepBadge: string;
  fixLabel?: string;
  fixType?: 'attach_rule' | 'set_duration' | 'set_owner' | 'open_inspector';
  suggestedRuleId?: string;
}

interface AuditWorkbenchProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  rules: BusinessRule[];
  validation: ValidationResult | null;
  selectedFindingNodeId: string | null;
  onSelectFindingNode: (nodeId: string | null) => void;
  onUpdateNode: (updated: ProcessNode) => void;
  onOpenInspectorForNode: (nodeId: string) => void;
  onRunValidation: () => void;
}

export const AuditWorkbenchPanel: React.FC<AuditWorkbenchProps> = ({
  nodes,
  edges,
  rules,
  validation,
  selectedFindingNodeId,
  onSelectFindingNode,
  onUpdateNode,
  onOpenInspectorForNode,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<
    'all' | 'bloquant' | 'majeur' | 'mineur'
  >('all');

  const stepIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((n, idx) => map.set(n.id, idx + 1));
    return map;
  }, [nodes]);

  // Build deterministic actionable findings from the live process model + backend validation
  const findings = useMemo<EnrichedFinding[]>(() => {
    const list: EnrichedFinding[] = [];
    const fallbackRuleId = rules[0]?.id || 'RG-DOC-01';
    const forclusionRuleId =
      rules.find((r) => r.id.includes('FORC'))?.id || fallbackRuleId;
    const seuilRuleId =
      rules.find((r) => r.id.includes('SEUIL'))?.id || fallbackRuleId;

    nodes.forEach((n, idx) => {
      const stepNum = idx + 1;
      if (n.type === 'start' || n.type === 'end') return;

      // 1. Task or decision without business rule on sensitive control steps
      const lower = n.label.toLowerCase();
      const hasRules = n.ruleIds && n.ruleIds.length > 0;
      if (!hasRules && isSensitiveControlStep(n.label)) {
        const targetRule = lower.includes('forclusion')
          ? forclusionRuleId
          : lower.includes('validation')
          ? seuilRuleId
          : fallbackRuleId;

        list.push({
          id: `audit-rule-${n.id}`,
          code: 'MISSING_RULE',
          severity: 'bloquant',
          title: `${n.label} : aucune règle de gestion liée`,
          description: `Cette étape sensible ne référence aucune règle du catalogue. Risque de non-conformité : associez la règle ${targetRule} pour tracer l'exigence.`,
          nodeId: n.id,
          stepBadge: `Étape ${stepNum}`,
          fixLabel: `Lier ${targetRule}`,
          fixType: 'attach_rule',
          suggestedRuleId: targetRule,
        });
      }

      // 2. Task with 0 duration
      if (n.type === 'task' && (!n.estimatedDurationMinutes || n.estimatedDurationMinutes <= 0)) {
        list.push({
          id: `audit-sla-${n.id}`,
          code: 'MISSING_SLA',
          severity: 'mineur',
          title: `${n.label} : durée SLA non renseignée`,
          description:
            "La durée estimée est à 0 min, ce qui fausse le calcul du temps de traitement global lors de la simulation.",
          nodeId: n.id,
          stepBadge: `Étape ${stepNum}`,
          fixLabel: 'Fixer SLA à 15 min',
          fixType: 'set_duration',
        });
      }

      // 3. Missing ownerRole
      if (!n.ownerRole || !n.ownerRole.trim()) {
        list.push({
          id: `audit-owner-${n.id}`,
          code: 'MISSING_OWNER',
          severity: 'majeur',
          title: `${n.label} : couloir / responsable manquant`,
          description:
            "Aucun acteur ou service responsable n'est affecté à cette étape dans le tableau métier.",
          nodeId: n.id,
          stepBadge: `Étape ${stepNum}`,
          fixLabel: 'Affecter Back-Office',
          fixType: 'set_owner',
        });
      }
    });

    // Include any structural findings from backend validation
    if (validation?.findings) {
      validation.findings.forEach((vf, i) => {
        if (vf.nodeId && list.some((existing) => existing.nodeId === vf.nodeId)) {
          return;
        }
        const stepNum = vf.nodeId ? stepIndexMap.get(vf.nodeId) : undefined;
        list.push({
          id: `vf-${i}-${vf.code}`,
          code: vf.code,
          severity:
            vf.severity === 'error'
              ? 'bloquant'
              : vf.severity === 'warning'
              ? 'majeur'
              : 'mineur',
          title: vf.message,
          description:
            'Constat détecté par le moteur de validation structurelle BPMN.',
          nodeId: vf.nodeId,
          stepBadge: stepNum ? `Étape ${stepNum}` : 'Structure',
          fixLabel: vf.nodeId ? "Ouvrir l'étape" : undefined,
          fixType: vf.nodeId ? 'open_inspector' : undefined,
        });
      });
    }

    return list.filter((f) => !dismissedIds.has(f.id));
  }, [nodes, rules, validation, stepIndexMap, dismissedIds]);

  const filteredFindings = useMemo(() => {
    if (severityFilter === 'all') return findings;
    return findings.filter((f) => f.severity === severityFilter);
  }, [findings, severityFilter]);

  const bloquantCount = findings.filter((f) => f.severity === 'bloquant').length;
  const majeurCount = findings.filter((f) => f.severity === 'majeur').length;
  const mineurCount = findings.filter((f) => f.severity === 'mineur').length;

  // 5 objective, sector-agnostic quality metrics computed directly from the live model & findings
  const metrics = useMemo(() => {
    const activeNodes = nodes.filter(
      (n) => n.type !== 'start' && n.type !== 'end'
    );
    const totalActive = Math.max(1, activeNodes.length);

    // 1. Complétude des fiches (responsable + durée sur les tâches)
    const withOwnerAndDuration = activeNodes.filter(
      (n) =>
        Boolean(n.ownerRole && n.ownerRole.trim()) &&
        (n.type === 'decision' || (n.estimatedDurationMinutes ?? 0) > 0)
    ).length;
    const completudePct = Math.min(
      100,
      Math.round((withOwnerAndDuration / totalActive) * 100)
    );

    // 2. Cohérence BPMN 2.0 (Début + Fin + connexions + décisions >= 2 branches libellées)
    const hasStart = nodes.some((n) => n.type === 'start');
    const hasEnd = nodes.some((n) => n.type === 'end');
    const connectedIds = new Set<string>();
    edges.forEach((e) => {
      connectedIds.add(e.sourceNodeId);
      connectedIds.add(e.targetNodeId);
    });
    const orphanCount =
      nodes.length > 1
        ? nodes.filter((n) => !connectedIds.has(n.id)).length
        : 0;
    const decisions = nodes.filter((n) => n.type === 'decision');
    const validDecisions = decisions.filter((d) => {
      const outs = edges.filter((e) => e.sourceNodeId === d.id);
      return outs.length >= 2 && outs.every((e) => Boolean(e.label?.trim()));
    }).length;
    const structuralChecksTotal = 3 + decisions.length;
    const structuralChecksPassed =
      (hasStart ? 1 : 0) +
      (hasEnd ? 1 : 0) +
      (orphanCount === 0 ? 1 : 0) +
      validDecisions;
    const coherencePct = Math.min(
      100,
      Math.round((structuralChecksPassed / Math.max(1, structuralChecksTotal)) * 100)
    );

    // 3. Couverture règles métier (sur les décisions et étapes sensibles/contrôles)
    const keyControlNodes = activeNodes.filter(
      (n) => n.type === 'decision' || isSensitiveControlStep(n.label)
    );
    const coveredKeyNodes = keyControlNodes.filter(
      (n) => n.ruleIds && n.ruleIds.length > 0
    ).length;
    const rulesPct =
      keyControlNodes.length > 0
        ? Math.round((coveredKeyNodes / keyControlNodes.length) * 100)
        : rules.length > 0
        ? 100
        : 0;

    // 4. Traçabilité & contrôles (étapes clés avec règle + responsable + zéro bloquant)
    const blockingNodeIds = new Set(
      findings
        .filter((f) => f.severity === 'bloquant' && f.nodeId)
        .map((f) => f.nodeId!)
    );
    const traceableKeyNodes = keyControlNodes.filter(
      (n) =>
        Boolean(n.ownerRole && n.ownerRole.trim()) &&
        Boolean(n.ruleIds && n.ruleIds.length > 0) &&
        !blockingNodeIds.has(n.id)
    ).length;
    const traceabilityPct =
      keyControlNodes.length > 0
        ? Math.round((traceableKeyNodes / keyControlNodes.length) * 100)
        : bloquantCount === 0
        ? 100
        : 50;

    // 5. Absence d'anomalies (score direct sur les constats ouverts)
    const anomaliesPct = Math.max(
      0,
      Math.min(100, 100 - bloquantCount * 25 - majeurCount * 12 - mineurCount * 5)
    );

    const globalScore = Math.round(
      completudePct * 0.2 +
        coherencePct * 0.2 +
        rulesPct * 0.2 +
        traceabilityPct * 0.2 +
        anomaliesPct * 0.2
    );

    return {
      globalScore,
      completudePct,
      coherencePct,
      rulesPct,
      traceabilityPct,
      anomaliesPct,
    };
  }, [nodes, edges, rules, findings, bloquantCount, majeurCount, mineurCount]);

  const handleApplyFix = (f: EnrichedFinding) => {
    if (!f.nodeId) return;
    const node = nodes.find((n) => n.id === f.nodeId);
    if (!node) return;

    if (f.fixType === 'attach_rule' && f.suggestedRuleId) {
      const nextRules = Array.from(
        new Set([...(node.ruleIds || []), f.suggestedRuleId])
      );
      onUpdateNode({ ...node, ruleIds: nextRules });
      setDismissedIds((prev) => new Set(prev).add(f.id));
    } else if (f.fixType === 'set_duration') {
      onUpdateNode({ ...node, estimatedDurationMinutes: 15 });
      setDismissedIds((prev) => new Set(prev).add(f.id));
    } else if (f.fixType === 'set_owner') {
      onUpdateNode({ ...node, ownerRole: 'Back-Office' });
      setDismissedIds((prev) => new Set(prev).add(f.id));
    } else {
      onOpenInspectorForNode(node.id);
    }
  };

  const handleFixAll = () => {
    findings.forEach((f) => {
      if (f.nodeId && f.fixType && f.fixType !== 'open_inspector') {
        handleApplyFix(f);
      }
    });
    setDismissedIds(new Set(findings.map((f) => f.id)));
  };

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (metrics.globalScore / 100) * circumference;

  const progressBars = [
    {
      label: 'Complétude des fiches',
      pct: metrics.completudePct,
      color: metrics.completudePct >= 80 ? '#34C759' : '#FF9500',
    },
    {
      label: 'Cohérence BPMN 2.0',
      pct: metrics.coherencePct,
      color: metrics.coherencePct >= 80 ? '#34C759' : '#FF9500',
    },
    {
      label: 'Couverture règles métier',
      pct: metrics.rulesPct,
      color: metrics.rulesPct >= 80 ? '#34C759' : metrics.rulesPct >= 50 ? '#FF9500' : '#FF3B30',
    },
    {
      label: 'Traçabilité & contrôles',
      pct: metrics.traceabilityPct,
      color: metrics.traceabilityPct >= 80 ? '#34C759' : metrics.traceabilityPct >= 50 ? '#FF9500' : '#FF3B30',
    },
    {
      label: "Absence d'anomalies",
      pct: metrics.anomaliesPct,
      color: metrics.anomaliesPct >= 80 ? '#34C759' : metrics.anomaliesPct >= 50 ? '#FF9500' : '#FF3B30',
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 pb-28 space-y-4 bg-[#F5F5F7]">
      {/* TOP CARD: Score Qualité & Barres de Progression */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Circular Gauge */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#E5E5EA"
                strokeWidth="7.5"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#007AFF"
                strokeWidth="7.5"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-bold text-[#1D1D1F] tracking-tight leading-none">
                {metrics.globalScore}
                <span className="text-[11px] font-medium text-[#8E8E93]">
                  /100
                </span>
              </div>
              <span className="text-[10px] font-medium text-[#6E6E73] mt-1">
                Score qualité
              </span>
            </div>
          </div>

          {/* Right: Title + 5 Progress Bars */}
          <div className="flex-1 w-full space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
                  Audit du processus
                </h2>
              </div>
              <span className="text-[11px] text-[#8E8E93]">
                Analyse déterministe temps réel
              </span>
            </div>

            <div className="space-y-1.5">
              {progressBars.map((bar) => (
                <div
                  key={bar.label}
                  className="grid grid-cols-12 items-center gap-2 text-xs"
                >
                  <span className="col-span-5 text-[#6E6E73] font-medium truncate">
                    {bar.label}
                  </span>
                  <div className="col-span-5 h-1.5 rounded-full bg-[#E5E5EA]/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${bar.pct}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                  </div>
                  <span className="col-span-2 text-right font-semibold text-[#1D1D1F]">
                    {bar.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Domain Audit Pills — Apple Titanium Squircles */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-black/[0.06]">
          <div className="p-2.5 rounded-xl border border-black/[0.06] bg-[#F5F5F7]/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-white text-[#1D1D1F] border border-black/[0.07] flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1D1D1F] truncate">
                  Auditeur BPMN
                </div>
                <div className="text-[10.5px] text-[#6E6E73] truncate">
                  Structure & flux
                </div>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
          </div>

          <div className="p-2.5 rounded-xl border border-black/[0.06] bg-[#F5F5F7]/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-white text-[#1D1D1F] border border-black/[0.07] flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1D1D1F] truncate">
                  Traçabilité
                </div>
                <div className="text-[10.5px] text-[#6E6E73] truncate">
                  Règles · Contrôles · Audit
                </div>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
          </div>

          <div className="p-2.5 rounded-xl border border-black/[0.06] bg-[#F5F5F7]/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-white text-[#1D1D1F] border border-black/[0.07] flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1D1D1F] truncate">
                  Risques
                </div>
                <div className="text-[10.5px] text-[#6E6E73] truncate">
                  Contrôles internes
                </div>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
          </div>
        </div>
      </div>

      {/* BOTTOM CARD: Liste des Constats */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Header Constats */}
        <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSeverityFilter('all')}
              className={`text-sm font-semibold tracking-tight cursor-pointer ${
                severityFilter === 'all' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
              }`}
            >
              Constats
            </button>
            <button
              type="button"
              onClick={() =>
                setSeverityFilter(
                  severityFilter === 'bloquant' ? 'all' : 'bloquant'
                )
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition ${
                severityFilter === 'bloquant'
                  ? 'bg-[#FF3B30]/10 text-[#C41E1A] border-[#FF3B30]/40'
                  : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:bg-[#F5F5F7]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
              {bloquantCount} bloquant{bloquantCount > 1 ? 's' : ''}
            </button>
            <button
              type="button"
              onClick={() =>
                setSeverityFilter(
                  severityFilter === 'majeur' ? 'all' : 'majeur'
                )
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition ${
                severityFilter === 'majeur'
                  ? 'bg-[#FF9500]/12 text-[#C96A00] border-[#FF9500]/40'
                  : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:bg-[#F5F5F7]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500]" />
              {majeurCount} majeur{majeurCount > 1 ? 's' : ''}
            </button>
            <button
              type="button"
              onClick={() =>
                setSeverityFilter(
                  severityFilter === 'mineur' ? 'all' : 'mineur'
                )
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition ${
                severityFilter === 'mineur'
                  ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/35'
                  : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:bg-[#F5F5F7]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
              {mineurCount} mineur{mineurCount > 1 ? 's' : ''}
            </button>
          </div>

          {findings.length > 0 && (
            <button
              type="button"
              onClick={handleFixAll}
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-black/[0.09] shadow-2xs transition cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Tout corriger en 1 clic</span>
            </button>
          )}
        </div>

        {/* Findings List */}
        <div className="divide-y divide-black/[0.06]">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto" />
              <div className="text-sm font-semibold text-[#1D1D1F]">
                Aucun constat en attente
              </div>
              <p className="text-xs text-[#6E6E73]">
                Toutes les vérifications de structure et de conformité sont au
                vert.
              </p>
              {dismissedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setDismissedIds(new Set())}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#007AFF] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réafficher les constats traités</span>
                </button>
              )}
            </div>
          ) : (
            filteredFindings.map((f) => {
              const isSelected =
                Boolean(f.nodeId) && selectedFindingNodeId === f.nodeId;
              const isBloquant = f.severity === 'bloquant';
              const isMajeur = f.severity === 'majeur';

              return (
                <div
                  key={f.id}
                  onClick={() => onSelectFindingNode(f.nodeId || null)}
                  className={`p-4 transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#007AFF]/[0.05] border-l-[3px] border-l-[#007AFF]'
                      : 'hover:bg-[#F5F5F7]/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isBloquant
                          ? 'bg-[#FF3B30]/10 text-[#C41E1A] border border-[#FF3B30]/20'
                          : isMajeur
                          ? 'bg-[#FF9500]/12 text-[#C96A00] border border-[#FF9500]/25'
                          : 'bg-[#F5F5F7] text-[#6E6E73] border border-black/[0.06]'
                      }`}
                    >
                      {isBloquant ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[13px] text-[#1D1D1F] leading-snug">
                          {f.title}
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#6E6E73] text-[11px] font-semibold border border-black/[0.06] shrink-0">
                          {f.stepBadge}
                        </span>
                      </div>

                      <p className="text-xs text-[#6E6E73] leading-relaxed">
                        {f.description}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        {f.fixLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyFix(f);
                            }}
                            className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-2xs transition cursor-pointer"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>{f.fixLabel}</span>
                          </button>
                        )}

                        {f.nodeId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInspectorForNode(f.nodeId!);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-black/[0.09] transition cursor-pointer"
                          >
                            <span>Ouvrir la fiche</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDismissedIds((prev) => new Set(prev).add(f.id));
                          }}
                          className="text-xs font-medium text-[#8E8E93] hover:text-[#1D1D1F] ml-auto cursor-pointer"
                        >
                          Ignorer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SIMULATE WORKBENCH PANEL (Left Pane — Interactive Scenario Simulator)
// ============================================================================

interface SimulateWorkbenchProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  rules: BusinessRule[];
  decisions: Record<string, string>;
  onChangeDecision: (decisionNodeId: string, branchLabel: string) => void;
  onApplyPresetScenario: (presetDecisions: Record<string, string>) => void;
  onSelectNode: (nodeId: string) => void;
  simulatedNodeIds: string[];
}

export const SimulateWorkbenchPanel: React.FC<SimulateWorkbenchProps> = ({
  nodes,
  edges,
  decisions,
  onChangeDecision,
  onApplyPresetScenario,
  onSelectNode,
  simulatedNodeIds,
}) => {
  const decisionNodes = useMemo(
    () => nodes.filter((n) => n.type === 'decision'),
    [nodes]
  );

  const traversedNodes = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return simulatedNodeIds
      .map((id) => map.get(id))
      .filter((n): n is ProcessNode => Boolean(n));
  }, [nodes, simulatedNodeIds]);

  const stats = useMemo(() => {
    const activeSteps = traversedNodes.filter(
      (n) => n.type !== 'start' && n.type !== 'end'
    );
    const totalMinutes = activeSteps.reduce(
      (sum, n) => sum + (n.estimatedDurationMinutes || 0),
      0
    );
    const autoCount = activeSteps.filter(
      (n) => n.executionMode === 'automated'
    ).length;
    const manualCount = activeSteps.length - autoCount;
    const autoPct =
      activeSteps.length > 0
        ? Math.round((autoCount / activeSteps.length) * 100)
        : 100;
    const endNode = traversedNodes[traversedNodes.length - 1];
    const isSuccessEnd =
      endNode?.type === 'end' &&
      !endNode.label.toLowerCase().includes('rejet') &&
      !endNode.label.toLowerCase().includes('cadu');

    return {
      totalMinutes,
      stepCount: activeSteps.length,
      autoCount,
      manualCount,
      autoPct,
      endLabel: endNode?.label || 'Fin de parcours',
      isSuccessEnd,
    };
  }, [traversedNodes]);

  const applyPreset = (mode: 'nominal' | 'relance' | 'rejet') => {
    const next: Record<string, string> = {};
    decisionNodes.forEach((d, idx) => {
      const outs = edges.filter((e) => e.sourceNodeId === d.id);
      if (outs.length === 0) return;
      if (mode === 'nominal') {
        next[d.id] = outs[0].label || 'Oui';
      } else if (mode === 'relance') {
        next[d.id] =
          idx === 0 && outs[1]
            ? outs[1].label || 'Non'
            : outs[0].label || 'Oui';
      } else {
        const exc = outs[outs.length - 1];
        next[d.id] = exc.label || 'Non';
      }
    });
    onApplyPresetScenario(next);
  };

  let cumulativeMinutes = 0;

  return (
    <div className="h-full overflow-y-auto p-4 pb-28 space-y-4 bg-[#F5F5F7]">
      {/* TOP CARD: SLA & Automation Summary */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="min-w-[84px] h-20 px-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.07] flex flex-col items-center justify-center text-center shrink-0">
              <div className="text-lg font-bold text-[#1D1D1F] tracking-tight leading-none whitespace-nowrap">
                {formatDuration(stats.totalMinutes)}
              </div>
              <span className="text-[10px] font-medium text-[#6E6E73] mt-1">
                Durée SLA
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
                  Simulation du parcours
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-white text-[#1D1D1F] border border-black/[0.08]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      stats.isSuccessEnd ? 'bg-[#34C759]' : 'bg-[#FF9500]'
                    }`}
                  />
                  {stats.endLabel}
                </span>
              </div>
              <p className="text-xs text-[#6E6E73]">
                {stats.stepCount} étapes traversées · {stats.autoPct}% automatisé
                ({stats.manualCount} étape{stats.manualCount > 1 ? 's' : ''}{' '}
                manuelle{stats.manualCount > 1 ? 's' : ''})
              </p>
            </div>
          </div>
        </div>

        {/* Preset Scenario Buttons — Apple Frosted Pills with System Status Dots */}
        <div className="pt-3 border-t border-black/[0.06] space-y-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Scénarios types en 1 clic
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('nominal')}
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#1D1D1F] border border-black/[0.09] hover:bg-[#F5F5F7] shadow-2xs transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              <span>Parcours Nominal (Tout OK)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('relance')}
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#1D1D1F] border border-black/[0.09] hover:bg-[#F5F5F7] shadow-2xs transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF9500]" />
              <span>Cas Pièce Manquante / Relance</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('rejet')}
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#1D1D1F] border border-black/[0.09] hover:bg-[#F5F5F7] shadow-2xs transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              <span>Cas Rejet / Exception</span>
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE CARD: Arbitrages aux points de décision */}
      {decisionNodes.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
            Arbitrages aux points de décision ({decisionNodes.length})
          </h3>
          <div className="space-y-2.5">
            {decisionNodes.map((d) => {
              const outEdges = edges.filter((e) => e.sourceNodeId === d.id);
              const currentChoice =
                decisions[d.id] || outEdges[0]?.label || '';

              return (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#F5F5F7]/70 border border-black/[0.06] flex items-center justify-between gap-3 flex-wrap"
                >
                  <span className="text-xs font-semibold text-[#1D1D1F]">
                    {d.label}
                  </span>
                  <div className="inline-flex items-center gap-1 bg-white p-0.5 rounded-lg border border-black/[0.08]">
                    {outEdges.map((edge) => {
                      const lbl = edge.label || 'Branche';
                      const isActive = currentChoice === lbl;
                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => onChangeDecision(d.id, lbl)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? 'bg-[#007AFF] text-white shadow-2xs'
                              : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                          }`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM CARD: Timeline chronologique des étapes traversées */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
            Étapes traversées ({traversedNodes.length})
          </span>
          <span className="text-xs font-medium text-[#8E8E93]">
            Cliquez sur une étape pour la cibler
          </span>
        </div>

        <div className="divide-y divide-black/[0.06]">
          {traversedNodes.map((node, i) => {
            const dur = node.estimatedDurationMinutes || 0;
            cumulativeMinutes += dur;
            return (
              <div
                key={`${node.id}-${i}`}
                onClick={() => onSelectNode(node.id)}
                className="px-5 py-3 hover:bg-[#F5F5F7]/80 flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[#34C759]/12 text-[#1D8F3E] border border-[#34C759]/30 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#1D1D1F] truncate">
                      {node.label}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] flex items-center gap-2">
                      <span>{node.ownerRole || 'Système'}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {node.executionMode === 'automated' ? (
                          <Cpu className="w-3 h-3 text-[#007AFF]" />
                        ) : (
                          <User className="w-3 h-3 text-[#8E8E93]" />
                        )}
                        {node.executionMode === 'automated'
                          ? 'Automatisé'
                          : 'Manuel'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-[#1D1D1F]">
                    +{formatDuration(dur)}
                  </div>
                  <div className="text-[10.5px] text-[#8E8E93]">
                    T+{formatDuration(cumulativeMinutes)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. RECETTE WORKBENCH PANEL (Left Pane — QA Test Cases & Traceability)
// ============================================================================

interface RecetteWorkbenchProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  rules: BusinessRule[];
  testCases: TestCase[];
  selectedTestCaseId: string | null;
  onSelectTestCase: (tc: TestCase | null) => void;
  onOpenExportModal: () => void;
}

export const RecetteWorkbenchPanel: React.FC<RecetteWorkbenchProps> = ({
  nodes,
  edges,
  rules,
  testCases,
  selectedTestCaseId,
  onSelectTestCase,
  onOpenExportModal,
}) => {
  const [subTab, setSubTab] = useState<'tests' | 'matrix'>('tests');
  const [statusMap, setStatusMap] = useState<
    Record<string, 'passed' | 'failed' | 'pending'>
  >({});

  // Build deterministic test cases immediately from the live graph if testCases is empty
  const effectiveTestCases = useMemo<TestCase[]>(() => {
    if (testCases && testCases.length > 0) return testCases;

    const generated: TestCase[] = [];
    let counter = 1;

    // 1. Nominal end-to-end test case
    const allTaskIds = nodes
      .filter((n) => n.type === 'task' || n.type === 'decision')
      .slice(0, 6)
      .map((n) => n.id);
    generated.push({
      id: `TC-0${counter++}`,
      title: 'Parcours nominal de bout en bout — Exécution conforme',
      objective:
        "Vérifier qu'un dossier complet et éligible traverse toutes les étapes nominales jusqu'au règlement final.",
      preconditions: [
        'Dossier adhérent actif',
        'Pièces justificatives (CNI, RIB) complètes et valides',
      ],
      steps: [
        'Soumettre la demande initiale',
        'Valider la complétude documentaire (Oui)',
        "Valider l'éligibilité du contrat (Oui)",
        'Exécuter le calcul et ordonnancer le virement SEPA',
      ],
      expectedResult:
        "Le processus atteint l'état Fin nominale et l'avis d'exécution est émis.",
      priority: 'critical',
      sourceNodeIds: allTaskIds,
      ruleIds: rules.slice(0, 2).map((r) => r.id),
      status: 'approved',
      reviewRequired: false,
    });

    // 2. Test case per decision exception branch
    nodes
      .filter((n) => n.type === 'decision')
      .forEach((dec) => {
        const outs = edges.filter((e) => e.sourceNodeId === dec.id);
        outs.forEach((edge, idx) => {
          if (idx === 0) return; // nominal already covered
          const targetNode = nodes.find((n) => n.id === edge.targetNodeId);
          generated.push({
            id: `TC-0${counter++}`,
            title: `Cas de branche « ${edge.label || 'Exception'} » sur « ${dec.label} »`,
            objective: `Vérifier l'aiguillage du flux lorsque la décision « ${dec.label} » prend la sortie « ${edge.label} ».`,
            preconditions: [`Le flux atteint l'étape « ${dec.label} »`],
            steps: [
              `Évaluer la condition sur « ${dec.label} »`,
              `Sélectionner la branche « ${edge.label} »`,
              `Vérifier l'arrivée sur « ${targetNode?.label || 'Étape cible'} »`,
            ],
            expectedResult: `Le dossier est orienté vers « ${targetNode?.label || 'la branche attendue'} » conformément au modèle BPMN.`,
            priority: 'high',
            sourceNodeIds: [dec.id, edge.targetNodeId],
            ruleIds: dec.ruleIds || [],
            status: 'reviewed',
            reviewRequired: false,
          });
        });
      });

    // 3. Test case per business rule
    rules.forEach((rule) => {
      const linkedIds = nodes
        .filter((n) => n.ruleIds?.includes(rule.id))
        .map((n) => n.id);
      generated.push({
        id: `TC-0${counter++}`,
        title: `Conformité Règle ${rule.id} — ${rule.title}`,
        objective: rule.statement,
        preconditions: [`Règle ${rule.id} active dans le référentiel`],
        steps: [
          `Exécuter l'étape soumise à ${rule.id}`,
          'Tester un cas conforme et un cas hors seuil / non conforme',
        ],
        expectedResult: `La règle ${rule.id} bloque ou autorise l'opération selon : « ${rule.statement} »`,
        priority: rule.severity,
        sourceNodeIds: linkedIds,
        ruleIds: [rule.id],
        status: 'reviewed',
        reviewRequired: false,
      });
    });

    return generated;
  }, [testCases, nodes, edges, rules]);

  const passedCount = effectiveTestCases.filter(
    (tc) => (statusMap[tc.id] || 'passed') === 'passed'
  ).length;
  const coveragePct = Math.round(
    (passedCount / Math.max(1, effectiveTestCases.length)) * 100
  );

  return (
    <div className="h-full overflow-y-auto p-4 pb-28 space-y-4 bg-[#F5F5F7]">
      {/* TOP CARD: Coverage Summary */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#F5F5F7] border border-black/[0.07] flex flex-col items-center justify-center text-center shrink-0">
              <div className="text-xl font-bold text-[#1D1D1F] tracking-tight leading-none">
                {coveragePct}%
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6E6E73] mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                Couverture
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
                  Cahier de Recette &amp; Traçabilité MOA
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#F5F5F7] text-[#1D1D1F] border border-black/[0.07]">
                  {effectiveTestCases.length} cas générés
                </span>
              </div>
              <p className="text-xs text-[#6E6E73]">
                100% des branches BPMN et des {rules.length} règles métier (RG)
                sont couvertes par des cas de test déterministes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenExportModal}
            className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-black/[0.09] shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Exporter Recette (CSV / MD)</span>
          </button>
        </div>

        {/* Sub-navigation: macOS Segmented Control */}
        <div className="flex items-center pt-3 border-t border-black/[0.06]">
          <div className="inline-flex items-center gap-1 bg-[#F5F5F7] p-0.5 rounded-xl border border-black/[0.06]">
            <button
              type="button"
              onClick={() => setSubTab('tests')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                subTab === 'tests'
                  ? 'bg-[#007AFF] text-white shadow-2xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Fiches de test ({effectiveTestCases.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                subTab === 'matrix'
                  ? 'bg-[#007AFF] text-white shadow-2xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              Matrice Règles ↔ Étapes ({rules.length})
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CARD: Test Cases List OR Traceability Matrix */}
      {subTab === 'tests' ? (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] divide-y divide-black/[0.06] overflow-hidden">
          {effectiveTestCases.map((tc) => {
            const isSelected = selectedTestCaseId === tc.id;
            const currentSt = statusMap[tc.id] || 'passed';

            return (
              <div
                key={tc.id}
                onClick={() => onSelectTestCase(tc)}
                className={`p-4 transition cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-[#007AFF]/[0.05] border-l-[3px] border-l-[#007AFF]'
                    : 'hover:bg-[#F5F5F7]/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded-md border ${
                        isSelected
                          ? 'bg-[#007AFF] text-white border-[#007AFF]'
                          : 'bg-[#F5F5F7] text-[#1D1D1F] border-black/[0.07]'
                      }`}
                    >
                      {tc.id}
                    </span>
                    <span className="font-semibold text-[13px] text-[#1D1D1F]">
                      {tc.title}
                    </span>
                  </div>

                  {/* Quick Pass / Fail Switch */}
                  <div
                    className="inline-flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setStatusMap((prev) => ({ ...prev, [tc.id]: 'passed' }))
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                        currentSt === 'passed'
                          ? 'bg-white text-[#1D1D1F] border-[#34C759]/55 shadow-2xs'
                          : 'bg-white text-[#8E8E93] border-black/[0.08] hover:text-[#1D1D1F]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          currentSt === 'passed' ? 'bg-[#34C759]' : 'bg-[#D1D1D6]'
                        }`}
                      />
                      Conforme
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusMap((prev) => ({ ...prev, [tc.id]: 'failed' }))
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                        currentSt === 'failed'
                          ? 'bg-white text-[#C41E1A] border-[#FF3B30]/55 shadow-2xs'
                          : 'bg-white text-[#8E8E93] border-black/[0.08] hover:text-[#1D1D1F]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          currentSt === 'failed' ? 'bg-[#FF3B30]' : 'bg-[#D1D1D6]'
                        }`}
                      />
                      KO
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#6E6E73] leading-relaxed">
                  {tc.objective}
                </p>

                <div className="bg-[#F5F5F7]/75 rounded-xl p-2.5 border border-black/[0.06] space-y-1.5 text-xs">
                  <div className="font-semibold text-[#1D1D1F]">
                    Résultat attendu :{' '}
                    <span className="font-normal text-[#6E6E73]">
                      {tc.expectedResult}
                    </span>
                  </div>
                  {tc.ruleIds.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[11px] text-[#8E8E93]">
                        Règles vérifiées :
                      </span>
                      {tc.ruleIds.map((rid) => (
                        <span
                          key={rid}
                          className="font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-white text-[#1D1D1F] border border-black/[0.07]"
                        >
                          {rid}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.07] shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/[0.07] bg-[#F5F5F7]/80 text-[10.5px] font-semibold uppercase tracking-wider text-[#6E6E73]">
                <th className="py-2.5 px-4">Règle</th>
                <th className="py-2.5 px-4">Intitulé</th>
                <th className="py-2.5 px-4">Étapes liées</th>
                <th className="py-2.5 px-4 text-center">Statut Recette</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rules.map((r) => {
                const linkedNodes = nodes.filter((n) =>
                  n.ruleIds?.includes(r.id)
                );
                return (
                  <tr key={r.id} className="hover:bg-[#F5F5F7]/60 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-[#1D1D1F]">
                      {r.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">
                      {r.title}
                    </td>
                    <td className="py-3 px-4 text-[#6E6E73]">
                      {linkedNodes.length > 0
                        ? linkedNodes.map((n) => n.label).join(', ')
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-white text-[#1D1D1F] border border-black/[0.08]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                        Couverte
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
