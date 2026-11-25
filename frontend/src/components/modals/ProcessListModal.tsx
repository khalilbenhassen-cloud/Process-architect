import React from 'react';
import { X, FolderOpen, Copy, Trash2, Calendar, User, Layers } from 'lucide-react';
import { ProcessSummary } from '../../types/process';

interface ProcessListModalProps {
  isOpen: boolean;
  onClose: () => void;
  processes: ProcessSummary[];
  currentProcessId?: string;
  onSelectProcess: (id: string) => void;
  onDeleteProcess: (id: string) => void;
}

export const ProcessListModal: React.FC<ProcessListModalProps> = ({
  isOpen,
  onClose,
  processes,
  currentProcessId,
  onSelectProcess,
  onDeleteProcess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Ouvrir un processus métier</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {processes.map((p) => {
            const isSelected = p.id === currentProcessId;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-lg border transition text-left flex items-start justify-between gap-4 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex-1 cursor-pointer" onClick={() => onSelectProcess(p.id)}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{p.name}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {p.modelState}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">v{p.version}</span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {p.nodeCount} étapes • {p.edgeCount} liaisons • {p.ruleCount} règles
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {p.owner}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-1">
                  <button
                    onClick={() => onSelectProcess(p.id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition"
                  >
                    Charger
                  </button>
                  {p.id !== 'demo-rachat-partiel' && (
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer définitivement « ${p.name} » ?`)) {
                          onDeleteProcess(p.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Supprimer le processus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
