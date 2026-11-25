import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Play,
  FileCheck,
  Table,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  ValidationResult,
  SimulationResult,
  AnalyticsResult,
  TraceabilityResult,
  TestCase,
  Process
} from '../types/process';
import { getExportUrl } from '../services/api';

interface AnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  process: Process;
  validation: ValidationResult | null;
  onRunValidation: () => void;
  simulation: SimulationResult | null;
  onRunSimulation: (decisions: Record<string, string>) => void;
  onClearSimulation: () => void;
  testCases: TestCase[];
  onGenerateTestCases: () => void;
  traceability: TraceabilityResult | null;
  onFetchTraceability: () => void;
  analytics: AnalyticsResult | null;
  onFetchAnalytics: () => void;
  onFocusElement: (id: string, type: 'node' | 'edge') => void;
}

export const AnalysisDrawer: React.FC<AnalysisDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  process,
  validation,
  onRunValidation,
  simulation,
  onRunSimulation,
  onClearSimulation,
  testCases,
  onGenerateTestCases,
  traceability,
  onFetchTraceability,
  analytics,
  onFetchAnalytics,
  onFocusElement,
}) => {
  // Decision selections for simulation
  const [selectedDecisions, setSelectedDecisions] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  // Extract decision nodes and their branch options from process
  const decisionNodes = process.nodes.filter(n => n.type === 'decision');
  const outgoingBranchesByNode: Record<string, string[]> = {};
  decisionNodes.forEach(d => {
    const branches = process.edges
      .filter(e => e.sourceNodeId === d.id && e.label?.trim())
      .map(e => e.label!.trim());
    outgoingBranchesByNode[d.id] = branches;
  });

  const handleDecisionChange = (nodeId: string, choice: string) => {
    setSelectedDecisions(prev => ({
      ...prev,
      [nodeId]: choice
    }));
  };

  const handleExecuteSim = () => {
    onRunSimulation(selectedDecisions);
  };

  return (
    <div
      className={`${
        isExpanded ? 'h-[52vh]' : 'h-76'
      } mx-3 mb-3 rounded-2xl border border-slate-200/95 bg-white/95 backdrop-blur-xl flex flex-col shrink-0 z-30 shadow-[0_-8px_32px_-6px_rgba(15,23,42,0.14)] overflow-hidden transition-all duration-200`}
    >
      {/* Drawer Header Tabs */}
      <div className="h-11 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onTabChange('validation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'validation'
                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Validation
            {validation && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                validation.summary.errors > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {validation.summary.errors > 0 ? `${validation.summary.errors} err` : 'OK'}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('simulation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'simulation'
                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Simulation de parcours
            {simulation && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-700">
                {simulation.status}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'tests'
                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Cas de test ({testCases.length})
          </button>

          <button
            onClick={() => {
              onTabChange('traceability');
              if (!traceability) onFetchTraceability();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'traceability'
                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Matrice de traçabilité
          </button>

          <button
            onClick={() => {
              onTabChange('analytics');
              if (!analytics) onFetchAnalytics();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'analytics'
                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Synthèse & Métriques
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
            title={isExpanded ? 'Réduire la hauteur' : 'Agrandir le panneau MOA'}
          >
            {isExpanded ? 'Réduire' : 'Agrandir'}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
            title="Fermer le panneau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 text-xs">
        {/* TAB 1: VALIDATION */}
        {activeTab === 'validation' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onRunValidation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Analyser le processus
                </button>
                {validation && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700">Résultat :</span>
                    {validation.valid ? (
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Modèle intègre et valide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> {validation.summary.errors} erreur(s) bloquante(s)
                      </span>
                    )}
                    <span className="text-slate-500">
                      ({validation.summary.warnings} avertissement(s), {validation.summary.suggestions} suggestion(s))
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Findings list */}
            {validation?.findings && validation.findings.length > 0 ? (
              <div className="space-y-1.5 border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <div className="col-span-2">Sévérité & Code</div>
                  <div className="col-span-8">Description du constat</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {validation.findings.map((f, idx) => {
                    const badge = {
                      error: 'bg-rose-100 text-rose-700 border-rose-200',
                      warning: 'bg-amber-100 text-amber-700 border-amber-200',
                      suggestion: 'bg-blue-100 text-blue-700 border-blue-200'
                    }[f.severity];

                    return (
                      <div key={idx} className="grid grid-cols-12 px-3 py-2 items-center hover:bg-slate-50/70 transition">
                        <div className="col-span-2 flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${badge}`}>
                            {f.severity}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{f.code}</span>
                        </div>
                        <div className="col-span-8 text-slate-700 text-xs">
                          {f.message}
                        </div>
                        <div className="col-span-2 text-right">
                          {(f.nodeId || f.edgeId) && (
                            <button
                              onClick={() => {
                                if (f.nodeId) onFocusElement(f.nodeId, 'node');
                                else if (f.edgeId) onFocusElement(f.edgeId, 'edge');
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Localiser
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : validation ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Aucune anomalie structurelle détectée. Le processus est prêt pour la simulation.
              </div>
            ) : (
              <div className="p-4 bg-slate-50 text-slate-500 rounded-lg text-center">
                Cliquez sur « Analyser le processus » pour exécuter les contrôles de conformité et d'intégrité MOA.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SIMULATION */}
        {activeTab === 'simulation' && (
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-4">
              {/* Decision branch config */}
              <div className="col-span-5 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Choix d'arbitrage aux décisions :</span>
                  <span className="text-[10px] text-slate-400">{decisionNodes.length} point(s)</span>
                </div>

                {decisionNodes.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Aucun nœud de décision dans le modèle.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {decisionNodes.map(d => {
                      const branches = outgoingBranchesByNode[d.id] || [];
                      return (
                        <div key={d.id} className="text-xs">
                          <label className="block text-[11px] font-medium text-slate-600 truncate mb-1">
                            {d.label}
                          </label>
                          <select
                            value={selectedDecisions[d.id] || ''}
                            onChange={(e) => handleDecisionChange(d.id, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="">-- Choisir une branche --</option>
                            {branches.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={handleExecuteSim}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Simuler le parcours
                  </button>
                  {simulation && (
                    <button
                      onClick={onClearSimulation}
                      className="px-2.5 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
                      title="Effacer la simulation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation Result */}
              <div className="col-span-7 bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Résultat du parcours simulé :</span>
                  {simulation && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      simulation.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {simulation.status}
                    </span>
                  )}
                </div>

                {simulation ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Étapes traversées</div>
                        <div className="text-base font-bold text-slate-800">{simulation.path.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Durée totale estimée</div>
                        <div className="text-base font-bold text-indigo-600">{simulation.totalEstimatedMinutes} min</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Étapes manuelles/mixtes</div>
                        <div className="text-base font-bold text-amber-600">{simulation.manualStepCount}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <strong>Motif :</strong> {simulation.stopReason}
                    </div>

                    {/* Step path list */}
                    <div className="max-h-24 overflow-y-auto border border-slate-100 rounded p-1.5 bg-slate-50/50 space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {simulation.pathNodes?.map((pn, idx) => (
                          <React.Fragment key={idx}>
                            <button
                              onClick={() => onFocusElement(pn.id, 'node')}
                              className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition"
                            >
                              {pn.label}
                            </button>
                            {idx < simulation.pathNodes!.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-8">
                    Sélectionnez les choix de branches souhaités et lancez la simulation déterministe.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEST CASES */}
        {activeTab === 'tests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={onGenerateTestCases}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer / Actualiser les cas de test
                </button>
                <span className="text-[11px] text-slate-500 italic">
                  Dérivés des branches de décisions et des règles métier.
                </span>
              </div>

              {testCases.length > 0 && (
                <div className="flex items-center gap-2">
                  <a
                    href={getExportUrl(process.id, 'csv')}
                    download
                    className="flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium text-xs"
                  >
                    <Download className="w-3 h-3" />
                    Exporter CSV (Anti-injection)
                  </a>
                </div>
              )}
            </div>

            {testCases.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                Aucun cas de test généré. Cliquez sur « Générer les cas de test » pour dériver automatiquement la couverture fonctionnelle.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">ID Test</th>
                      <th className="py-2 px-3">Titre & Objectif</th>
                      <th className="py-2 px-3">Priorité</th>
                      <th className="py-2 px-3">Résultat attendu</th>
                      <th className="py-2 px-3">Règles liées</th>
                      <th className="py-2 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testCases.map((tc) => (
                      <tr key={tc.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{tc.id}</td>
                        <td className="py-2 px-3 max-w-xs">
                          <div className="font-semibold text-slate-800">{tc.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2">{tc.objective}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                            tc.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                            tc.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {tc.priority}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 text-[11px] max-w-xs truncate" title={tc.expectedResult}>
                          {tc.expectedResult}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {(tc.ruleIds || []).join(', ') || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {tc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRACEABILITY MATRIX */}
        {activeTab === 'traceability' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onFetchTraceability}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition"
                >
                  Actualiser la matrice
                </button>
                {traceability && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Taux de couverture des règles :</span>
                    <span className="font-bold text-indigo-700 text-sm">{traceability.coverageRate} %</span>
                    <span className="text-slate-400 text-xs">
                      ({traceability.coveredRules} / {traceability.totalRules} règles couvertes par des tests)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {traceability ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Exigence (ID)</th>
                      <th className="py-2 px-3">Règle de gestion</th>
                      <th className="py-2 px-3">Étape(s) du processus</th>
                      <th className="py-2 px-3">Cas de test</th>
                      <th className="py-2 px-3">Statut & Écarts (Gaps)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {traceability.matrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {row.requirementIds.join(', ')}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800">{row.ruleId}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{row.ruleTitle}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {row.nodeLabels.join(' • ') || <span className="text-rose-500 italic">Aucune étape liée</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-indigo-700 text-[11px]">
                          {row.testCaseIds.join(', ') || <span className="text-rose-500 italic">Aucun test</span>}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'couvert' ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Couvert
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-bold" title={row.gaps.join(', ')}>
                              Écart ({row.gaps.join(', ')})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic text-center py-6">
                Chargement de la matrice de traçabilité...
              </p>
            )}
          </div>
        )}

        {/* TAB 5: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-xs">
                Métriques d'architecture et de performance nominale :
              </span>
              <a
                href={getExportUrl(process.id, 'markdown')}
                download
                className="flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium text-xs"
              >
                <Download className="w-3 h-3" />
                Télécharger le rapport d'analyse Markdown
              </a>
            </div>

            {analytics ? (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Taille du modèle</div>
                  <div className="text-lg font-bold text-slate-800">{analytics.nodesCount} étapes / {analytics.edgesCount} liaisons</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Taux manuel / mixte</div>
                  <div className="text-lg font-bold text-amber-600">{analytics.manualPercentage} %</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Temps cumulé nominal</div>
                  <div className="text-lg font-bold text-indigo-600">{analytics.totalProcessNominalMinutes} min</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Règles cataloguées</div>
                  <div className="text-lg font-bold text-emerald-600">{analytics.rulesCount}</div>
                </div>

                <div className="col-span-2 bg-white p-3 rounded border border-slate-200">
                  <div className="font-semibold text-slate-700 text-xs mb-1">Goulots d'étranglement potentiels (durée max) :</div>
                  <ul className="space-y-1">
                    {analytics.bottleneckCandidates.map(b => (
                      <li key={b.id} className="flex justify-between text-[11px] text-slate-600">
                        <span>{b.label}</span>
                        <span className="font-bold text-slate-800">{b.duration} min</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="col-span-2 bg-white p-3 rounded border border-slate-200">
                  <div className="font-semibold text-slate-700 text-xs mb-1">Étapes sans rôle responsable désigné :</div>
                  {analytics.missingOwnerNodes.length === 0 ? (
                    <p className="text-emerald-600 text-[11px] font-medium">Toutes les tâches possèdent un rôle responsable.</p>
                  ) : (
                    <ul className="space-y-1 text-rose-600 text-[11px]">
                      {analytics.missingOwnerNodes.map(m => (
                        <li key={m.id}>• {m.label}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic text-center py-6">Chargement des métriques...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
