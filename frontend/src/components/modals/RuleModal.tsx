import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { BusinessRule, RuleCategory, SeverityLevel, SourceType } from '../../types/process';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: BusinessRule) => void;
  ruleToEdit?: BusinessRule | null;
}

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  ruleToEdit,
}) => {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [category, setCategory] = useState<RuleCategory>('other');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [sourceType, setSourceType] = useState<SourceType>('business_requirement');
  const [sourceNote, setSourceNote] = useState('');

  useEffect(() => {
    if (ruleToEdit) {
      setId(ruleToEdit.id);
      setTitle(ruleToEdit.title);
      setStatement(ruleToEdit.statement);
      setCategory(ruleToEdit.category);
      setSeverity(ruleToEdit.severity);
      setSourceType(ruleToEdit.sourceType);
      setSourceNote(ruleToEdit.sourceNote || '');
    } else {
      setId(`RG-${Math.floor(100 + Math.random() * 900)}`);
      setTitle('');
      setStatement('');
      setCategory('eligibility');
      setSeverity('high');
      setSourceType('business_requirement');
      setSourceNote('');
    }
  }, [ruleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !title.trim() || !statement.trim()) return;

    onSaveRule({
      id: id.trim(),
      title: title.trim(),
      statement: statement.trim(),
      category,
      severity,
      sourceType,
      sourceNote: sourceNote.trim() || undefined,
      active: true,
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1F93FF]" />
            <h2 className="text-sm font-bold text-slate-800">
              {ruleToEdit ? 'Modifier la règle de gestion' : 'Nouvelle règle de gestion'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Identifiant <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="RG-01"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Titre de la règle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Contrôle d'antériorité fiscale"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Énoncé métier formel <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Spécifier l'énoncé de la règle de façon univoque..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RuleCategory)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="eligibility">Éligibilité</option>
                <option value="data_quality">Qualité des données</option>
                <option value="approval">Approbation / Visa</option>
                <option value="timing">Délai / Échéance</option>
                <option value="security">Sécurité / Conformité</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sévérité / Criticité</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="low">Faible (Low)</option>
                <option value="medium">Moyenne (Medium)</option>
                <option value="high">Élevée (High)</option>
                <option value="critical">Critique (Critical)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Origine de la règle</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="business_requirement">Besoin métier / MOA</option>
                <option value="external_reference">Réglementaire / Référence externe</option>
                <option value="fictional_assumption">Hypothèse de travail</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Note de source (optionnel)</label>
              <input
                type="text"
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
                placeholder="Ex. Directive HCSF, réunion du 12/03..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#1F93FF] text-white rounded-lg font-semibold hover:bg-[#007BE5] transition cursor-pointer"
            >
              Enregistrer la règle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
