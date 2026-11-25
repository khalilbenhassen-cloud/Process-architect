import React, { useState, useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  CheckSquare,
  GitFork,
  Database,
  Layers,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  Link2
} from 'lucide-react';
import { NodeType, BusinessRule, ProcessNode } from '../types/process';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: NodeType) => void;
  rules: BusinessRule[];
  nodes: ProcessNode[];
  onAddRule: () => void;
  onEditRule: (rule: BusinessRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onAddNode,
  rules,
  nodes,
  onAddRule,
  onEditRule,
  onDeleteRule,
}) => {
  // Active tab: 'steps' by default (as per spec)
  const [activeTab, setActiveTab] = useState<'steps' | 'rules'>('steps');

  // Rules filtering & search
  const [ruleSearch, setRuleSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());

  // Toggle rule expansion
  const toggleRuleExpand = (id: string) => {
    setExpandedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Grouped palette items by clear logical categories
  const paletteCategories = [
    {
      category: 'Flux de processus',
      items: [
        {
          type: 'start' as NodeType,
          label: 'Début',
          description: "Point d'entrée du processus",
          icon: <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />,
          color: 'text-emerald-700',
          bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
        },
        {
          type: 'end' as NodeType,
          label: 'Fin',
          description: "Point d'aboutissement ou résultat",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />,
          color: 'text-rose-700',
          bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200'
        }
      ]
    },
    {
      category: 'Activités & Exécution',
      items: [
        {
          type: 'task' as NodeType,
          label: 'Activité / Tâche',
          description: 'Traitement manuel ou automatisé',
          icon: <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />,
          color: 'text-indigo-700',
          bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
        },
        {
          type: 'subprocess' as NodeType,
          label: 'Sous-processus',
          description: 'Ensemble structuré déporté',
          icon: <Layers className="w-3.5 h-3.5 text-purple-600" />,
          color: 'text-purple-700',
          bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
        }
      ]
    },
    {
      category: 'Contrôle & Branchement',
      items: [
        {
          type: 'decision' as NodeType,
          label: 'Point de décision',
          description: 'Branchement conditionnel (>= 2 issues)',
          icon: <GitFork className="w-3.5 h-3.5 text-amber-600" />,
          color: 'text-amber-700',
          bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200'
        }
      ]
    },
    {
      category: 'Données & Documents',
      items: [
        {
          type: 'data' as NodeType,
          label: 'Données / Entrée-Sortie',
          description: 'Document, flux ou fichier support',
          icon: <Database className="w-3.5 h-3.5 text-cyan-600" />,
          color: 'text-cyan-700',
          bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
        }
      ]
    }
  ];

  // Map of rule ID -> linked node labels
  const linkedNodesByRuleId = useMemo(() => {
    const map: Record<string, string[]> = {};
    nodes.forEach(n => {
      (n.ruleIds || []).forEach(rid => {
        if (!map[rid]) map[rid] = [];
        map[rid].push(n.label || n.id);
      });
    });
    return map;
  }, [nodes]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchSearch =
        ruleSearch.trim() === '' ||
        r.id.toLowerCase().includes(ruleSearch.toLowerCase()) ||
        r.title.toLowerCase().includes(ruleSearch.toLowerCase()) ||
        r.statement.toLowerCase().includes(ruleSearch.toLowerCase());

      const matchCategory = selectedCategory === 'all' || r.category === selectedCategory;
      const matchSeverity = selectedSeverity === 'all' || r.severity === selectedSeverity;

      return matchSearch && matchCategory && matchSeverity;
    });
  }, [rules, ruleSearch, selectedCategory, selectedSeverity]);

  if (!isOpen) return null;

  return (
    <aside
      className="absolute top-3 left-3 bottom-16 w-72 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl flex flex-col shrink-0 select-none z-20 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] overflow-hidden transition-all duration-200"
      role="complementary"
      aria-label="Palette d'étapes et catalogue de règles"
    >
      {/* Header Tabs (SynergyCodes Segmented Pill Bar) */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-2.5 py-2">
        <div className="flex gap-1 bg-slate-200/70 p-1 rounded-xl flex-1 mr-2">
          <button
            onClick={() => setActiveTab('steps')}
            aria-selected={activeTab === 'steps'}
            className={`flex-1 px-2.5 py-1 text-xs font-bold rounded-lg transition focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'steps'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Étapes
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            aria-selected={activeTab === 'rules'}
            className={`flex-1 px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'rules'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Règles métier</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {rules.length}
            </span>
          </button>
        </div>

        <button
          onClick={onClose}
          aria-label="Fermer le panneau latéral"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
          title="Masquer la palette"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: STEPS (Default) */}
      {activeTab === 'steps' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between px-0.5">
            <span>Cliquez pour insérer sur le canevas :</span>
          </div>

          <div className="space-y-4">
            {paletteCategories.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {cat.category}
                </div>
                <div className="space-y-1.5">
                  {cat.items.map(item => (
                    <button
                      key={item.type}
                      onClick={() => onAddNode(item.type)}
                      aria-label={`Ajouter une étape de type ${item.label}`}
                      className="group w-full p-2.5 rounded-xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-indigo-300 text-left flex items-center gap-3 transition shadow-2xs hover:shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition group-hover:scale-105 ${item.bg}`}>
                        {item.icon}
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate transition">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-indigo-600 text-slate-500 group-hover:text-white flex items-center justify-center shrink-0 transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: BUSINESS RULES */}
      {activeTab === 'rules' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs flex flex-col">
          {/* Action Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Catalogue ({filteredRules.length})
            </span>
            <button
              onClick={onAddRule}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition"
            >
              <Plus className="w-3 h-3" />
              Nouvelle règle
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={ruleSearch}
              onChange={e => setRuleSearch(e.target.value)}
              placeholder="Rechercher par ID ou mot-clé..."
              className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500"
            />
            {ruleSearch && (
              <button
                onClick={() => setRuleSearch('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category & Severity Filter */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white text-[11px]"
              >
                <option value="all">Toutes catégories</option>
                <option value="eligibility">Éligibilité</option>
                <option value="data_quality">Qualité données</option>
                <option value="approval">Approbation</option>
                <option value="timing">Délai / Échéance</option>
                <option value="security">Sécurité</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white text-[11px]"
              >
                <option value="all">Toute criticité</option>
                <option value="critical">Critique</option>
                <option value="high">Élevée</option>
                <option value="medium">Moyenne</option>
                <option value="low">Faible</option>
              </select>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2 flex-1 overflow-y-auto">
            {filteredRules.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Aucune règle trouvée.
              </div>
            ) : (
              filteredRules.map(rule => {
                const isExpanded = expandedRuleIds.has(rule.id);
                const linkedNodes = linkedNodesByRuleId[rule.id] || [];

                const sevInfo = {
                  critical: { label: 'Critique', bg: 'bg-rose-100 text-rose-800 border-rose-200' },
                  high: { label: 'Élevée', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
                  medium: { label: 'Moyenne', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
                  low: { label: 'Faible', bg: 'bg-slate-100 text-slate-700 border-slate-200' }
                }[rule.severity];

                return (
                  <div
                    key={rule.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition text-left space-y-1.5"
                  >
                    {/* Compact Card Header */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-mono text-xs">{rule.id}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onEditRule(rule)}
                          aria-label={`Modifier la règle ${rule.id}`}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Modifier"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Confirmez-vous la suppression définitive de la règle ${rule.id} du catalogue ?`)) {
                              onDeleteRule(rule.id);
                            }
                          }}
                          aria-label={`Supprimer la règle ${rule.id}`}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Supprimer du catalogue"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Short Title */}
                    <div className="font-semibold text-slate-800 text-[11px] leading-snug">
                      {rule.title}
                    </div>

                    {/* Severity and Linked status badges */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded border font-semibold uppercase ${sevInfo.bg}`}>
                        {sevInfo.label}
                      </span>

                      <div className="flex items-center gap-1 text-slate-500">
                        {linkedNodes.length > 0 ? (
                          <span className="flex items-center gap-0.5 text-indigo-600 font-medium" title={linkedNodes.join(', ')}>
                            <Link2 className="w-2.5 h-2.5" />
                            {linkedNodes.length} étape(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Non liée</span>
                        )}

                        {/* Collapsible toggle for details */}
                        <button
                          onClick={() => toggleRuleExpand(rule.id)}
                          aria-label={isExpanded ? "Replier les détails" : "Déplier les détails"}
                          className="p-0.5 text-slate-400 hover:text-slate-700"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Details (Progressive Disclosure) */}
                    {isExpanded && (
                      <div className="pt-2 mt-1 border-t border-dashed border-slate-200 text-[10px] space-y-1.5 bg-slate-50/60 p-2 rounded">
                        <div>
                          <div className="font-semibold text-slate-600">Énoncé formel :</div>
                          <div className="text-slate-700 italic">« {rule.statement} »</div>
                        </div>
                        {rule.sourceNote && (
                          <div>
                            <span className="font-semibold text-slate-600">Source : </span>
                            <span className="text-slate-600">{rule.sourceNote}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-600">Catégorie : </span>
                          <span className="text-slate-600">{rule.category}</span>
                        </div>
                        {linkedNodes.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-600">Étapes associées : </span>
                            <span className="text-indigo-700 font-medium">{linkedNodes.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="p-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 text-center shrink-0">
        Données fictives • Portfolio MOA
      </div>
    </aside>
  );
};
