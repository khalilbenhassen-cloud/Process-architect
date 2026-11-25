import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import {
  BusinessRule,
  ProcessNode,
  RuleCategory,
  SeverityLevel,
} from '../../types/process';

interface RulesCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: BusinessRule[];
  nodes: ProcessNode[];
  onAddRule: () => void;
  onEditRule: (rule: BusinessRule) => void;
  onDeleteRule: (ruleId: string) => void;
  canImportProjectRules?: boolean;
  onImportProjectRules?: () => Promise<number>;
}

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  eligibility: 'Éligibilité',
  data_quality: 'Qualité données',
  approval: 'Approbation',
  timing: 'Délai / Échéance',
  security: 'Sécurité',
  other: 'Général / Autre',
};

const SEVERITY_INFO: Record<
  SeverityLevel,
  { label: string; badgeCls: string }
> = {
  critical: {
    label: 'Critique',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  high: {
    label: 'Élevée',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  medium: {
    label: 'Moyenne',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  low: {
    label: 'Faible',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const RulesCatalogModal: React.FC<RulesCatalogModalProps> = ({
  isOpen,
  onClose,
  rules,
  nodes,
  onAddRule,
  onEditRule,
  onDeleteRule,
  canImportProjectRules = false,
  onImportProjectRules,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());
  const [pendingDeleteRule, setPendingDeleteRule] = useState<BusinessRule | null>(null);
  const [isImportingRules, setIsImportingRules] = useState(false);

  // Map each rule ID to the list of node labels that use it
  const linkedNodesByRuleId = useMemo(() => {
    const map: Record<string, ProcessNode[]> = {};
    for (const rule of rules) {
      map[rule.id] = [];
    }
    for (const node of nodes) {
      if (node.ruleIds && node.ruleIds.length > 0) {
        for (const rid of node.ruleIds) {
          if (!map[rid]) map[rid] = [];
          map[rid].push(node);
        }
      }
    }
    return map;
  }, [rules, nodes]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchSearch =
        search === '' ||
        rule.id.toLowerCase().includes(search.toLowerCase()) ||
        rule.title.toLowerCase().includes(search.toLowerCase()) ||
        rule.statement.toLowerCase().includes(search.toLowerCase());

      const matchCat =
        selectedCategory === 'all' || rule.category === selectedCategory;

      const matchSev =
        selectedSeverity === 'all' || rule.severity === selectedSeverity;

      return matchSearch && matchCat && matchSev;
    });
  }, [rules, search, selectedCategory, selectedSeverity]);

  const toggleExpand = (id: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-catalog-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh] apple-workspace-enter">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="rules-catalog-title"
                className="text-base font-extrabold text-slate-900 tracking-tight"
              >
                Catalogue des Règles Métier & Conformité
              </h2>
              <p className="text-xs text-slate-500">
                {rules.length} règle{rules.length > 1 ? 's' : ''} définie{rules.length > 1 ? 's' : ''} dans le processus métier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canImportProjectRules && onImportProjectRules && (
              <button
                type="button"
                disabled={isImportingRules}
                onClick={async () => {
                  setIsImportingRules(true);
                  try {
                    await onImportProjectRules();
                  } finally {
                    setIsImportingRules(false);
                  }
                }}
                className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/15 border border-[#007AFF]/20 transition cursor-pointer disabled:opacity-50"
                title="Importer les règles déjà définies dans les autres processus de ce projet (ex. AS-IS)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isImportingRules ? 'Import...' : 'Importer du projet'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onAddRule();
              }}
              className="apple-pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle règle</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le catalogue"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2.5 shrink-0">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par identifiant, titre ou texte..."
              className="w-full pl-9 pr-8 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 bg-slate-50/70 focus:bg-white focus:border-indigo-400 outline-none transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/70 text-xs text-slate-700 font-medium outline-none focus:bg-white focus:border-indigo-400 cursor-pointer"
            >
              <option value="all">Toutes catégories</option>
              <option value="eligibility">Éligibilité</option>
              <option value="data_quality">Qualité données</option>
              <option value="approval">Approbation</option>
              <option value="timing">Délai / Échéance</option>
              <option value="security">Sécurité</option>
              <option value="other">Général / Autre</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/70 text-xs text-slate-700 font-medium outline-none focus:bg-white focus:border-indigo-400 cursor-pointer"
            >
              <option value="all">Toute criticité</option>
              <option value="critical">Critique</option>
              <option value="high">Élevée</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>
          </div>
        </div>

        {/* Rules Cards List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
          {filteredRules.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                Aucune règle trouvée
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Modifiez vos filtres de recherche ou créez une nouvelle règle avec le bouton ci-dessus.
              </p>
            </div>
          ) : (
            filteredRules.map((rule) => {
              const sev =
                SEVERITY_INFO[rule.severity] || SEVERITY_INFO.medium;
              const catLabel =
                CATEGORY_LABELS[rule.category] || rule.category;
              const linkedNodes = linkedNodesByRuleId[rule.id] || [];
              const isExpanded = expandedRuleIds.has(rule.id);

              return (
                <div
                  key={rule.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 p-4 transition shadow-2xs hover:shadow-xs space-y-2.5 text-left"
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {rule.id}
                      </span>

                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sev.badgeCls}`}
                      >
                        {sev.label}
                      </span>

                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {catLabel}
                      </span>

                      {linkedNodes.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(rule.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer transition"
                          title="Afficher les étapes rattachées"
                        >
                          <Layers className="w-3 h-3" />
                          <span>
                            {linkedNodes.length} étape{linkedNodes.length > 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Non rattachée
                        </span>
                      )}
                    </div>

                    {/* Actions (Edit / Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditRule(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                        title="Modifier la règle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteRule(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                        title="Supprimer la règle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="font-bold text-sm text-slate-900 leading-snug">
                    {rule.title}
                  </div>

                  {/* Statement */}
                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 font-normal">
                    {rule.statement}
                  </div>

                  {/* Expanded Linked Steps */}
                  {isExpanded && linkedNodes.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Étapes rattachées à cette règle :
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedNodes.map((node) => (
                          <span
                            key={node.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>{node.label}</span>
                            {node.ownerRole && (
                              <span className="text-[10px] text-slate-400">
                                ({node.ownerRole})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {filteredRules.length} sur {rules.length} règle{rules.length > 1 ? 's' : ''} affichée{filteredRules.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="apple-pressable px-4 py-1.5 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Apple HIG Confirmation Modal for Rule Deletion */}
      {pendingDeleteRule && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
          onClick={() => setPendingDeleteRule(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div className="space-y-1.5">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                Supprimer la règle {pendingDeleteRule.id} ?
              </h3>
              <p className="text-[12.5px] text-[#6E6E73] leading-relaxed">
                La règle <strong className="text-[#1D1D1F]">{pendingDeleteRule.title}</strong> sera supprimée du catalogue et détachée des étapes associées.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteRule(null)}
                className="px-3.5 py-1.5 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[12px] font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRule(pendingDeleteRule.id);
                  setPendingDeleteRule(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-white text-[12px] font-semibold shadow-2xs transition cursor-pointer"
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
