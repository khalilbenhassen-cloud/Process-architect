import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Plus,
  ShieldCheck,
  User,
  Cpu,
  Layers,
  FileText,
  Sliders,
  Database,
  Unlink,
  GitFork,
  Play,
  CheckCircle2,
  CheckSquare,
  Paperclip,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import {
  ProcessNode,
  ProcessEdge,
  BusinessRule,
  ExecutionMode,
  NodeType,
} from '../types/process';
import {
  AttachedFileMeta,
  loadAttachedFilesMap,
  saveAttachedFilesMap,
  readFilesAsMeta,
} from './modals/DataDocumentsModal';

interface PropertiesPanelProps {
  selectedNode: ProcessNode | null;
  selectedEdge: ProcessEdge | null;
  rules: BusinessRule[];
  onUpdateNode: (updated: ProcessNode) => void;
  onUpdateEdge: (updated: ProcessEdge) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onClose: () => void;
  stepNumber?: number;
  onOpenDataDocumentsForStep?: (nodeId: string) => void;
}

const TYPE_META: Record<
  NodeType,
  { label: string; pillCls: string; icon: React.ReactNode }
> = {
  start: {
    label: 'Début',
    pillCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />,
  },
  task: {
    label: 'Tâche',
    pillCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <CheckSquare className="w-3 h-3 text-blue-600" />,
  },
  decision: {
    label: 'Décision ?',
    pillCls: 'bg-amber-50 text-amber-800 border-amber-300',
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

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  selectedEdge,
  rules,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onClose,
  stepNumber,
  onOpenDataDocumentsForStep,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagOutput, setNewTagOutput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<
    Record<string, AttachedFileMeta[]>
  >(loadAttachedFilesMap);
  const [attachingTarget, setAttachingTarget] = useState<{
    kind: 'input' | 'output';
    name: string;
  } | null>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncFiles = () => setAttachedFiles(loadAttachedFilesMap());
    window.addEventListener('pa-attached-files-updated', syncFiles);
    return () =>
      window.removeEventListener('pa-attached-files-updated', syncFiles);
  }, []);

  const handleAttachFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !selectedNode || !attachingTarget)
      return;
    const target = attachingTarget;
    setAttachingTarget(null);

    const newMetas = await readFilesAsMeta(fileList);
    e.target.value = '';

    const key = `${selectedNode.id}::${target.kind}::${target.name}`;
    const currentMap = loadAttachedFilesMap();
    const existing = currentMap[key] || currentMap[target.name] || [];
    const combined = [...existing, ...newMetas];
    const next = {
      ...currentMap,
      [key]: combined,
      [target.name]: combined,
    };
    setAttachedFiles(next);
    saveAttachedFilesMap(next);
  };

  const handleNodeChange = (field: keyof ProcessNode, value: unknown) => {
    if (!selectedNode) return;
    onUpdateNode({
      ...selectedNode,
      [field]: value,
    });
  };

  const handleEdgeChange = (field: keyof ProcessEdge, value: unknown) => {
    if (!selectedEdge) return;
    onUpdateEdge({
      ...selectedEdge,
      [field]: value,
    });
  };

  const addInput = () => {
    if (!newTagInput.trim() || !selectedNode) return;
    const inputs = [...(selectedNode.inputs || []), newTagInput.trim()];
    handleNodeChange('inputs', inputs);
    setNewTagInput('');
  };

  const removeInput = (index: number) => {
    if (!selectedNode) return;
    const removedName = (selectedNode.inputs || [])[index];
    const inputs = (selectedNode.inputs || []).filter((_, i) => i !== index);
    handleNodeChange('inputs', inputs);
    if (removedName) {
      const key = `${selectedNode.id}::input::${removedName}`;
      const map = loadAttachedFilesMap();
      if (map[key]) {
        const next = { ...map };
        delete next[key];
        setAttachedFiles(next);
        saveAttachedFilesMap(next);
      }
    }
  };

  const addOutput = () => {
    if (!newTagOutput.trim() || !selectedNode) return;
    const outputs = [...(selectedNode.outputs || []), newTagOutput.trim()];
    handleNodeChange('outputs', outputs);
    setNewTagOutput('');
  };

  const removeOutput = (index: number) => {
    if (!selectedNode) return;
    const removedName = (selectedNode.outputs || [])[index];
    const outputs = (selectedNode.outputs || []).filter((_, i) => i !== index);
    handleNodeChange('outputs', outputs);
    if (removedName) {
      const key = `${selectedNode.id}::output::${removedName}`;
      const map = loadAttachedFilesMap();
      if (map[key]) {
        const next = { ...map };
        delete next[key];
        setAttachedFiles(next);
        saveAttachedFilesMap(next);
      }
    }
  };

  if (!selectedNode && !selectedEdge) {
    return null;
  }

  const primaryRuleId = selectedNode?.ruleIds?.[0];
  const primaryRule = primaryRuleId
    ? rules.find((r) => r.id === primaryRuleId)
    : null;

  const nodeTypeMeta = selectedNode
    ? TYPE_META[selectedNode.type] || TYPE_META.task
    : TYPE_META.task;

  return (
    <aside
      className="w-[380px] lg:w-[410px] h-full bg-white border-l border-slate-200/90 flex flex-col shrink-0 z-30 shadow-[-10px_0_28px_rgba(15,23,42,0.06)] overflow-hidden select-none transition-all duration-200 apple-workspace-enter"
      role="complementary"
      aria-label="Fiche Complémentaire de l'Étape"
    >
      {/* 1. Header (Notion / Linear Side-Peek Title Bar) */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <h3 className="font-extrabold text-[15px] text-slate-900 tracking-tight">
          Fiche Complémentaire de l'Étape
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Top Summary Pill & Step Large Title (Identical to Mockup) */}
      {selectedNode && (
        <div className="px-5 pt-3 pb-3 space-y-2 border-b border-slate-100/90 bg-white shrink-0">
          {/* Capsule pill: Tâche • Moteur Fiscal • RG-04 */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <span>{nodeTypeMeta.label}</span>
            <span className="text-blue-400">•</span>
            <span className="truncate max-w-[150px]">
              {selectedNode.ownerRole || 'Acteur non défini'}
            </span>
            {primaryRuleId && (
              <>
                <span className="text-blue-400">•</span>
                <span className="font-mono font-bold">{primaryRuleId}</span>
              </>
            )}
          </div>

          {/* Large Bold Step Title: 8. Calculer montant net et fiscalité */}
          <div className="font-extrabold text-[16px] text-slate-900 leading-snug">
            {stepNumber ? `${stepNumber}. ` : ''}
            {selectedNode.label || 'Étape sans nom'}
          </div>
        </div>
      )}

      {/* 3. Body: All Fields Cleanly Visible (Zero Accordions, Identical to Mockup) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
        {selectedNode && (
          <>
            {/* Field 1: Description fonctionnelle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Description fonctionnelle
              </label>
              <textarea
                rows={3}
                value={selectedNode.description || ''}
                onChange={(e) => handleNodeChange('description', e.target.value)}
                placeholder="Appliquer les grilles de taux et règles de déduction pour déterminer le montant net à payer et la part fiscale applicable selon la réglementation en vigueur."
                className="w-full text-xs text-slate-700 leading-relaxed bg-slate-50/70 border border-slate-200/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 outline-none resize-none transition"
              />
            </div>

            {/* Field 2: Application SI & Mode */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                Application SI & Mode
              </label>

              {/* Segmented Apple-style buttons: Manuel | Automatisé | Mixte */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleNodeChange('executionMode', 'manual')}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    selectedNode.executionMode === 'manual'
                      ? 'bg-blue-100/90 text-blue-800 border border-blue-300 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manuel
                </button>
                <button
                  type="button"
                  onClick={() => handleNodeChange('executionMode', 'automated')}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    selectedNode.executionMode === 'automated'
                      ? 'bg-blue-100/90 text-blue-800 border border-blue-300 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Automatisé
                </button>
                <button
                  type="button"
                  onClick={() => handleNodeChange('executionMode', 'mixed')}
                  className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                    selectedNode.executionMode === 'mixed'
                      ? 'bg-blue-100/90 text-blue-800 border border-blue-300 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mixte
                </button>
              </div>

              {/* Application SI input */}
              <input
                type="text"
                value={selectedNode.application || ''}
                onChange={(e) => handleNodeChange('application', e.target.value)}
                placeholder="Système d'Information (ex. Moteur Fiscal, SAP, GED...)"
                className="w-full text-xs px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Field 3: Durée SLA */}
            {selectedNode.type !== 'start' && selectedNode.type !== 'end' && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">
                  Durée SLA
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        handleNodeChange('estimatedDurationMinutes', mins)
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        selectedNode.estimatedDurationMinutes === mins
                          ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                  <div className="inline-flex items-center gap-1 ml-auto">
                    <input
                      type="number"
                      min="0"
                      value={selectedNode.estimatedDurationMinutes ?? 0}
                      onChange={(e) =>
                        handleNodeChange(
                          'estimatedDurationMinutes',
                          Math.max(0, parseInt(e.target.value) || 0)
                        )
                      }
                      className="w-14 px-2 py-1 text-center font-bold text-slate-800 border border-slate-200 rounded-lg text-xs"
                    />
                    <span className="text-slate-400 text-xs">min</span>
                  </div>
                </div>
              </div>
            )}

            {/* Field 4: Documents Entrées / Sorties */}
            <div className="space-y-2.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-800">
                  Documents Entrées / Sorties
                </label>
                {onOpenDataDocumentsForStep && (
                  <button
                    type="button"
                    onClick={() => onOpenDataDocumentsForStep(selectedNode.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] border border-indigo-200/80 text-[11px] font-bold transition cursor-pointer"
                    title="Ouvrir Données & documents filtré sur cette étape"
                  >
                    <span>Données & documents</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Hidden file input for attaching PC files from Ouvrir drawer */}
              <input
                ref={attachFileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,.svg"
                onChange={handleAttachFileChange}
                className="hidden"
              />

              {/* Entrées */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 font-medium">Entrées:</span>
                {(selectedNode.inputs || []).map((inp, idx) => {
                  const files =
                    attachedFiles[`${selectedNode.id}::input::${inp}`] ||
                    attachedFiles[inp] ||
                    [];
                  const firstFile = files[0];
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                        files.length > 0
                          ? 'bg-indigo-50/70 text-slate-900 border-indigo-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200/80'
                      }`}
                    >
                      <span>{inp}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachingTarget({ kind: 'input', name: inp });
                          attachFileRef.current?.click();
                        }}
                        title={
                          files.length > 0
                            ? `${files.length} fichier(s) : ${files
                                .map((f) => f.name)
                                .join(', ')} (cliquer pour en ajouter)`
                            : 'Joindre un ou plusieurs fichiers depuis le PC'
                        }
                        className={`inline-flex items-center gap-0.5 p-0.5 rounded transition cursor-pointer ${
                          files.length > 0
                            ? 'text-indigo-600 hover:bg-indigo-100 font-bold'
                            : 'text-slate-400 hover:text-indigo-600'
                        }`}
                      >
                        <Paperclip className="w-3 h-3" />
                        {files.length > 1 && (
                          <span className="text-[10px]">{files.length}</span>
                        )}
                      </button>
                      {firstFile && (
                        <a
                          href={firstFile.dataUrl}
                          download={firstFile.name}
                          title={`Télécharger ${firstFile.name}`}
                          className="p-0.5 rounded text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeInput(idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addInput())
                    }
                    placeholder="+ Entrée"
                    className="w-24 px-2 py-1 text-[11px] border border-dashed border-blue-300 rounded-md outline-none bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sorties */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 font-medium">Sorties:</span>
                {(selectedNode.outputs || []).map((out, idx) => {
                  const files =
                    attachedFiles[`${selectedNode.id}::output::${out}`] ||
                    attachedFiles[out] ||
                    [];
                  const firstFile = files[0];
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                        files.length > 0
                          ? 'bg-emerald-50/70 text-slate-900 border-emerald-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200/80'
                      }`}
                    >
                      <span>{out}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachingTarget({ kind: 'output', name: out });
                          attachFileRef.current?.click();
                        }}
                        title={
                          files.length > 0
                            ? `${files.length} fichier(s) : ${files
                                .map((f) => f.name)
                                .join(', ')} (cliquer pour en ajouter)`
                            : 'Joindre un ou plusieurs fichiers depuis le PC'
                        }
                        className={`inline-flex items-center gap-0.5 p-0.5 rounded transition cursor-pointer ${
                          files.length > 0
                            ? 'text-emerald-600 hover:bg-emerald-100 font-bold'
                            : 'text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        <Paperclip className="w-3 h-3" />
                        {files.length > 1 && (
                          <span className="text-[10px]">{files.length}</span>
                        )}
                      </button>
                      {firstFile && (
                        <a
                          href={firstFile.dataUrl}
                          download={firstFile.name}
                          title={`Télécharger ${firstFile.name}`}
                          className="p-0.5 rounded text-emerald-600 hover:bg-emerald-100 transition"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeOutput(idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagOutput}
                    onChange={(e) => setNewTagOutput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addOutput())
                    }
                    placeholder="+ Sortie"
                    className="w-24 px-2 py-1 text-[11px] border border-dashed border-emerald-300 rounded-md outline-none bg-white focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Field 5: Détail de la Règle RG-04 (Grey rounded card, Identical to Mockup) */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                Détail de la Règle {primaryRuleId || 'RG'}
              </label>

              {primaryRule ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-normal">
                  {primaryRule.statement || primaryRule.title}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                  Aucune règle de conformité associée à cette étape.
                </div>
              )}
            </div>

            {/* Field 6: Delete Step */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Confirmez-vous la suppression de l'étape « ${selectedNode.label} » ?`
                    )
                  ) {
                    onDeleteNode(selectedNode.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cette étape</span>
              </button>
            </div>
          </>
        )}

        {/* Selected Edge Properties (si une liaison est cliquée sur le canevas) */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Liaison ID :{' '}
              <code className="font-mono font-bold text-slate-800">
                {selectedEdge.id}
              </code>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Libellé de la branche (issue de décision){' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={selectedEdge.label || ''}
                onChange={(e) => handleEdgeChange('label', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-400 outline-none"
                placeholder="Ex. Complet, Incomplet, Conforme, Rejet..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Condition logique / métier
              </label>
              <input
                type="text"
                value={selectedEdge.condition || ''}
                onChange={(e) => handleEdgeChange('condition', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-400 outline-none"
                placeholder="Ex. montant >= 50000"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Supprimer cette liaison de transition ?')) {
                    onDeleteEdge(selectedEdge.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cette liaison</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
