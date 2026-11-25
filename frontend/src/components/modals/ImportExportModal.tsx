import React, { useState } from 'react';
import { X, Download, Upload, FileJson, FileText, FileSpreadsheet, AlertCircle, GitFork } from 'lucide-react';
import { getExportUrl, importProcess } from '../../services/api';
import { Process } from '../../types/process';
import { downloadProcessExcelWorkbook } from '../../utils/excelExport';
import { downloadProcessBpmnXml } from '../../utils/bpmnXmlExport';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process;
  onProcessImported: (imported: Process) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  process,
  onProcessImported,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [jsonText, setJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1_000_000) {
      setImportError('Le fichier dépasse la taille maximale autorisée de 1 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonText(content);
        setImportError(null);
      } catch (err) {
        setImportError('Impossible de lire le fichier.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!jsonText.trim()) {
      setImportError('Veuillez coller ou importer un contenu JSON valide.');
      return;
    }

    try {
      setIsImporting(true);
      setImportError(null);
      const parsed = JSON.parse(jsonText);
      const imported = await importProcess(parsed);
      onProcessImported(imported);
      onClose();
    } catch (err: any) {
      setImportError(err.message || "Erreur de validation lors de l'importation du modèle JSON.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {activeTab === 'export' ? (
              <Download className="w-5 h-5 text-indigo-600" />
            ) : (
              <Upload className="w-5 h-5 text-indigo-600" />
            )}
            <h2 className="text-sm font-bold text-slate-800">
              {activeTab === 'export' ? 'Exporter les livrables' : 'Importer un processus JSON'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 text-center border-b-2 transition ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Exports disponibles
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 text-center border-b-2 transition ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Importer un modèle
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'export' ? (
            <div className="space-y-3">
              <p className="text-slate-600">
                Téléchargez les artefacts et livrables dérivés du processus « <strong>{process.name}</strong> » :
              </p>

              <button
                type="button"
                onClick={() => downloadProcessExcelWorkbook(process)}
                className="w-full flex items-start gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/25 hover:border-emerald-400 hover:bg-emerald-50/60 transition text-left cursor-pointer"
              >
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    Classeur complet Excel (.xls)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    4 onglets prêts pour Excel : Synthèse, Étapes & durées, Flux & décisions, et Règles de gestion (RG-*).
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => downloadProcessBpmnXml(process)}
                className="w-full flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/25 hover:border-blue-400 hover:bg-blue-50/60 transition text-left cursor-pointer"
              >
                <div className="p-2 bg-blue-100 text-[#007AFF] rounded-md">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    Modèle BPMN 2.0 standard (.bpmn)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    XML ISO 19510 avec Lanes, types de tâches, passerelles et coordonnées BPMNDI (compatible Camunda, Signavio, Bizagi, bpmn.io).
                  </div>
                </div>
              </button>

              <a
                href={getExportUrl(process.id, 'json')}
                download
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left"
              >
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Modèle complet (JSON)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Contient les étapes, liaisons, règles de gestion et coordonnées visuelles versionnées.
                  </div>
                </div>
              </a>

              <a
                href={getExportUrl(process.id, 'markdown')}
                download
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left"
              >
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Rapport d'analyse MOA (Markdown)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Synthèse méthodologique, métriques opérationnelles, constats de validation et goulots d'étranglement.
                  </div>
                </div>
              </a>

              <a
                href={getExportUrl(process.id, 'csv')}
                download
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left"
              >
                <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Cas de test fonctionnels (CSV sécurisé)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Format tabulaire exportable vers Excel ou Jira / Xray avec protection contre l'injection de formules.
                  </div>
                </div>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600">
                Chargez un fichier JSON conforme au schéma Process Architect (FR-10).
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Téléverser un fichier .json :
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ou collez directement le JSON ici :
                </label>
                <textarea
                  rows={6}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='{"name": "Mon Processus", "nodes": [...], "edges": [...]}'
                  className="w-full font-mono text-[11px] p-2.5 border border-slate-300 rounded-md resize-none"
                />
              </div>

              {importError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-[11px]">{importError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isImporting || !jsonText.trim()}
                className="w-full py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                {isImporting ? 'Validation du schéma...' : 'Valider et importer le processus'}
              </button>
            </div>
          )}
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
