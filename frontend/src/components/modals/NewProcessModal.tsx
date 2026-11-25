import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { ModelState } from '../../types/process';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; owner: string; modelState: ModelState }) => void;
}

export const NewProcessModal: React.FC<NewProcessModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('Direction MOA');
  const [modelState, setModelState] = useState<ModelState>('to_be');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      owner: owner.trim(),
      modelState
    });
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Nouveau processus métier</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nom du processus <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Souscription en ligne — Assurance Vie"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Périmètre</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Finalité métier, déclencheurs, périmètre applicatif..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Responsable MOA / Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Ex. Équipe MOA Sinistres"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cible du modèle</label>
              <select
                value={modelState}
                onChange={(e) => setModelState(e.target.value as ModelState)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="to_be">TO-BE (Cible)</option>
                <option value="as_is">AS-IS (Existant)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-md border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-700">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
            <span>
              Un canevas initial avec un nœud <strong>Début</strong> et un nœud <strong>Fin</strong> sera automatiquement généré.
            </span>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              Créer le processus
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
