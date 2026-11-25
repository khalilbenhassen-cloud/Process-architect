import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Database,
  FileText,
  Server,
  Plus,
  Trash2,
  Search,
  ArrowUpRight,
  Paperclip,
  Image as ImageIcon,
  Eye,
  Download,
  FolderOpen,
  Table2,
  Check,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { ProcessNode } from '../../types/process';

export interface AttachedFileMeta {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

export const STORAGE_KEY_FILES = 'pa_attached_files_v1';

export function loadAttachedFilesMap(): Record<string, AttachedFileMeta[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const normalized: Record<string, AttachedFileMeta[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) {
        normalized[k] = v as AttachedFileMeta[];
      } else if (v && typeof v === 'object' && 'name' in v) {
        normalized[k] = [v as AttachedFileMeta];
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

export function saveAttachedFilesMap(map: Record<string, AttachedFileMeta[]>) {
  try {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(map));
    window.dispatchEvent(new Event('pa-attached-files-updated'));
  } catch {
    // Ignore localStorage quota limits for large files
  }
}

export function readFilesAsMeta(fileList: FileList): Promise<AttachedFileMeta[]> {
  const files = Array.from(fileList);
  return Promise.all(
    files.map(
      (file) =>
        new Promise<AttachedFileMeta>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              dataUrl: typeof reader.result === 'string' ? reader.result : '',
              uploadedAt: new Date().toLocaleString('fr-FR'),
            });
          };
          reader.readAsDataURL(file);
        })
    )
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface DataDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ProcessNode[];
  onUpdateNode: (updated: ProcessNode) => void;
  onSelectNodeInInspector: (nodeId: string) => void;
  initialStepId?: string | null;
}

interface DocumentCardItem {
  id: string;
  name: string;
  kind: 'input' | 'output';
  indexInArray: number;
  node: ProcessNode;
  stepNumber: number;
  files: AttachedFileMeta[];
}

export const DataDocumentsModal: React.FC<DataDocumentsModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onUpdateNode,
  onSelectNodeInInspector,
  initialStepId,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'steps' | 'apps'>('library');
  const [search, setSearch] = useState('');

  // Shared Step Filter ('all' or a specific node.id)
  const [selectedStepFilter, setSelectedStepFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'input' | 'output'>('all');

  useEffect(() => {
    if (isOpen && initialStepId) {
      setSelectedStepFilter(initialStepId);
      setActiveTab('library');
      setKindFilter('all');
    }
  }, [isOpen, initialStepId]);

  // Small Popover Modal state when clicking one of the 2 dashed "+ Ajouter" cards
  const [addModalState, setAddModalState] = useState<{
    isOpen: boolean;
    kind: 'input' | 'output';
    stepNodeId: string;
    docTitle: string;
    attachedFiles: AttachedFileMeta[];
  } | null>(null);

  // Per-row inline add state (Steps tab)
  const [inlineAddTarget, setInlineAddTarget] = useState<{
    nodeId: string;
    kind: 'input' | 'output';
    value: string;
  } | null>(null);

  // Applications SI tab input state
  const [newSiName, setNewSiName] = useState('');

  // Attached PC files (stored in state + localStorage, synced across components)
  const [attachedFiles, setAttachedFiles] = useState<Record<string, AttachedFileMeta[]>>(
    () => loadAttachedFilesMap()
  );
  const [previewState, setPreviewState] = useState<{
    itemId: string;
    fileIndex: number;
  } | null>(null);

  useEffect(() => {
    const syncHandler = () => {
      setAttachedFiles(loadAttachedFilesMap());
    };
    window.addEventListener('pa-attached-files-updated', syncHandler);
    return () => window.removeEventListener('pa-attached-files-updated', syncHandler);
  }, []);

  // Hidden file input ref for attaching a file to an existing predefined card
  const cardFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingCardAttach, setPendingCardAttach] = useState<{
    itemKey: string;
  } | null>(null);

  // Hidden file input ref inside the Small Add Modal
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  const stepNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.type !== 'end' ||
          (n.inputs?.length || 0) > 0 ||
          (n.outputs?.length || 0) > 0
      ),
    [nodes]
  );

  const targetStepNodeId =
    selectedStepFilter !== 'all' ? selectedStepFilter : stepNodes[0]?.id || '';

  // Flatten all inputs & outputs into visual Cards
  const allDocumentItems = useMemo<DocumentCardItem[]>(() => {
    const list: DocumentCardItem[] = [];
    nodes.forEach((node, idx) => {
      const stepNumber = idx + 1;
      (node.inputs || []).forEach((inp, i) => {
        if (!inp.trim()) return;
        const scopedKey = `${node.id}::input::${inp}`;
        const files = attachedFiles[scopedKey] || attachedFiles[inp] || [];
        list.push({
          id: `${node.id}-input-${i}-${inp}`,
          name: inp,
          kind: 'input',
          indexInArray: i,
          node,
          stepNumber,
          files,
        });
      });
      (node.outputs || []).forEach((outp, i) => {
        if (!outp.trim()) return;
        const scopedKey = `${node.id}::output::${outp}`;
        const files = attachedFiles[scopedKey] || attachedFiles[outp] || [];
        list.push({
          id: `${node.id}-output-${i}-${outp}`,
          name: outp,
          kind: 'output',
          indexInArray: i,
          node,
          stepNumber,
          files,
        });
      });
    });
    return list;
  }, [nodes, attachedFiles]);

  const stats = useMemo(() => {
    const appsMap = new Map<string, { appName: string; nodes: ProcessNode[] }>();
    nodes.forEach((n) => {
      const appName = (n.application || '').trim();
      if (appName) {
        const existing = appsMap.get(appName);
        if (existing) {
          existing.nodes.push(n);
        } else {
          appsMap.set(appName, { appName, nodes: [n] });
        }
      }
    });

    const stepScopedDocs =
      selectedStepFilter === 'all'
        ? allDocumentItems
        : allDocumentItems.filter((d) => d.node.id === selectedStepFilter);

    const inputCount = stepScopedDocs.filter((d) => d.kind === 'input').length;
    const outputCount = stepScopedDocs.filter((d) => d.kind === 'output').length;

    return {
      totalDocs: allDocumentItems.length,
      stepScopedTotal: stepScopedDocs.length,
      inputCount,
      outputCount,
      totalApps: appsMap.size,
      appsGroups: Array.from(appsMap.values()),
    };
  }, [nodes, allDocumentItems, selectedStepFilter]);

  const filteredInputItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDocumentItems.filter((item) => {
      if (item.kind !== 'input') return false;
      if (selectedStepFilter !== 'all' && item.node.id !== selectedStepFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.files.some((f) => f.name.toLowerCase().includes(q)) ||
        item.node.label.toLowerCase().includes(q) ||
        `étape ${item.stepNumber}`.includes(q)
      );
    });
  }, [allDocumentItems, selectedStepFilter, search]);

  const filteredOutputItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDocumentItems.filter((item) => {
      if (item.kind !== 'output') return false;
      if (selectedStepFilter !== 'all' && item.node.id !== selectedStepFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.files.some((f) => f.name.toLowerCase().includes(q)) ||
        item.node.label.toLowerCase().includes(q) ||
        `étape ${item.stepNumber}`.includes(q)
      );
    });
  }, [allDocumentItems, selectedStepFilter, search]);

  const filteredAppsGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stats.appsGroups
      .map((group) => {
        const matchingNodes =
          selectedStepFilter === 'all'
            ? group.nodes
            : group.nodes.filter((n) => n.id === selectedStepFilter);
        return {
          ...group,
          nodes: matchingNodes,
        };
      })
      .filter((group) => {
        if (group.nodes.length === 0) return false;
        if (!q) return true;
        return (
          group.appName.toLowerCase().includes(q) ||
          group.nodes.some((n) => n.label.toLowerCase().includes(q))
        );
      });
  }, [stats.appsGroups, selectedStepFilter, search]);

  const filteredStepNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stepNodes.filter((n) => {
      if (!q) return true;
      return (
        (n.label || '').toLowerCase().includes(q) ||
        (n.application || '').toLowerCase().includes(q) ||
        (n.inputs || []).some((i) => i.toLowerCase().includes(q)) ||
        (n.outputs || []).some((o) => o.toLowerCase().includes(q))
      );
    });
  }, [stepNodes, search]);

  if (!isOpen) return null;

  const isImageFile = (name: string, meta?: AttachedFileMeta) => {
    if (meta?.type.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(meta?.name || name);
  };

  // 1. Attach 1 or multiple PC files directly onto an existing / predefined card via its Paperclip icon (APPENDS to existing files!)
  const handleAttachFileToExistingCard = (item: DocumentCardItem) => {
    const scopedKey = `${item.node.id}::${item.kind}::${item.name}`;
    setPendingCardAttach({ itemKey: scopedKey });
    if (cardFileInputRef.current) {
      cardFileInputRef.current.value = '';
      cardFileInputRef.current.click();
    }
  };

  const handleCardFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !pendingCardAttach) return;
    const keyToSave = pendingCardAttach.itemKey;
    const plainName = keyToSave.split('::')[2] || fileList[0].name;
    setPendingCardAttach(null);

    const newMetas = await readFilesAsMeta(fileList);
    setAttachedFiles((prev) => {
      const existing = prev[keyToSave] || prev[plainName] || [];
      const combined = [...existing, ...newMetas];
      const next = {
        ...prev,
        [keyToSave]: combined,
        [plainName]: combined,
      };
      saveAttachedFilesMap(next);
      return next;
    });
  };

  // 2. Open the small Add Modal when clicking either of the 2 dashed cards (Input or Output)
  const openAddCardModal = (kind: 'input' | 'output') => {
    setAddModalState({
      isOpen: true,
      kind,
      stepNodeId: targetStepNodeId,
      docTitle: '',
      attachedFiles: [],
    });
  };

  const handleModalFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !addModalState) return;
    const newMetas = await readFilesAsMeta(fileList);

    setAddModalState((prev) =>
      prev
        ? {
            ...prev,
            docTitle: prev.docTitle.trim()
              ? prev.docTitle
              : newMetas[0]?.name || '',
            attachedFiles: [...prev.attachedFiles, ...newMetas],
          }
        : null
    );
  };

  const handleConfirmAddCardModal = () => {
    if (!addModalState) return;
    const targetNode = nodes.find((n) => n.id === addModalState.stepNodeId);
    if (!targetNode) return;

    const finalTitle =
      addModalState.docTitle.trim() ||
      addModalState.attachedFiles[0]?.name ||
      '';
    if (!finalTitle) return;

    if (addModalState.attachedFiles.length > 0) {
      const scopedKey = `${targetNode.id}::${addModalState.kind}::${finalTitle}`;
      setAttachedFiles((prev) => {
        const existing = prev[scopedKey] || prev[finalTitle] || [];
        const combined = [...existing, ...addModalState.attachedFiles];
        const next = {
          ...prev,
          [scopedKey]: combined,
          [finalTitle]: combined,
        };
        saveAttachedFilesMap(next);
        return next;
      });
    }

    if (addModalState.kind === 'input') {
      onUpdateNode({
        ...targetNode,
        inputs: [...(targetNode.inputs || []), finalTitle],
      });
    } else {
      onUpdateNode({
        ...targetNode,
        outputs: [...(targetNode.outputs || []), finalTitle],
      });
    }

    setAddModalState(null);
  };

  const handleDeleteDocumentItem = (item: DocumentCardItem) => {
    if (item.kind === 'input') {
      const nextInputs = (item.node.inputs || []).filter(
        (_, i) => i !== item.indexInArray
      );
      onUpdateNode({ ...item.node, inputs: nextInputs });
    } else {
      const nextOutputs = (item.node.outputs || []).filter(
        (_, i) => i !== item.indexInArray
      );
      onUpdateNode({ ...item.node, outputs: nextOutputs });
    }
    if (previewState?.itemId === item.id) {
      setPreviewState(null);
    }
  };

  const handleDownloadFile = (fileMeta: AttachedFileMeta) => {
    if (!fileMeta?.dataUrl) return;
    const link = document.createElement('a');
    link.href = fileMeta.dataUrl;
    link.download = fileMeta.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveSingleFileFromCard = (
    item: DocumentCardItem,
    fileIndex: number
  ) => {
    const scopedKey = `${item.node.id}::${item.kind}::${item.name}`;
    const remaining = item.files.filter((_, idx) => idx !== fileIndex);

    setAttachedFiles((prev) => {
      const next = { ...prev };
      if (remaining.length === 0) {
        delete next[scopedKey];
        delete next[item.name];
      } else {
        next[scopedKey] = remaining;
        next[item.name] = remaining;
      }
      saveAttachedFilesMap(next);
      return next;
    });

    if (previewState?.itemId === item.id) {
      if (remaining.length === 0) {
        setPreviewState(null);
      } else {
        setPreviewState({
          itemId: item.id,
          fileIndex: Math.min(previewState.fileIndex, remaining.length - 1),
        });
      }
    }
  };

  const commitInlineStepAdd = () => {
    if (!inlineAddTarget) return;
    const clean = inlineAddTarget.value.trim();
    const targetNode = nodes.find((n) => n.id === inlineAddTarget.nodeId);
    if (clean && targetNode) {
      if (inlineAddTarget.kind === 'input') {
        onUpdateNode({
          ...targetNode,
          inputs: [...(targetNode.inputs || []), clean],
        });
      } else {
        onUpdateNode({
          ...targetNode,
          outputs: [...(targetNode.outputs || []), clean],
        });
      }
    }
    setInlineAddTarget(null);
  };

  const handleAssignNewSi = () => {
    const appName = newSiName.trim();
    if (!appName) return;
    const targetNode = nodes.find((n) => n.id === targetStepNodeId);
    if (!targetNode) return;
    onUpdateNode({ ...targetNode, application: appName });
    setNewSiName('');
  };

  const selectedStepNumber =
    selectedStepFilter !== 'all'
      ? nodes.findIndex((n) => n.id === selectedStepFilter) + 1
      : 1;

  // Helper to render a single Document Card (supports multiple attached files per card!)
  const renderDocumentCard = (item: DocumentCardItem) => {
    const hasPcFiles = item.files.length > 0;
    const firstImgIdx = item.files.findIndex((f) => isImageFile(f.name, f));
    const firstImg = firstImgIdx >= 0 ? item.files[firstImgIdx] : undefined;

    return (
      <div
        key={item.id}
        className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-3.5 shadow-2xs flex flex-col justify-between gap-2.5 transition"
      >
        <div className="space-y-2.5">
          {/* Image Thumbnail if at least one PC image was attached */}
          {firstImg?.dataUrl && (
            <div
              onClick={() =>
                setPreviewState({ itemId: item.id, fileIndex: firstImgIdx })
              }
              className="h-28 w-full rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer"
            >
              <img
                src={firstImg.dataUrl}
                alt={firstImg.name}
                className="h-full w-full object-cover hover:scale-105 transition"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  item.kind === 'input'
                    ? 'bg-sky-50 text-sky-600 border-sky-200/80'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                }`}
              >
                {firstImg ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </span>
              <div className="min-w-0">
                <div
                  className="text-xs font-extrabold text-slate-900 truncate"
                  title={item.name}
                >
                  {item.name}
                </div>
                {hasPcFiles && (
                  <div className="text-[11px] font-semibold text-indigo-600">
                    {item.files.length} fichier{item.files.length > 1 ? 's' : ''}{' '}
                    joint{item.files.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Badge + Paperclip (adds/appends 1 or multiple files to this card) + Delete Card */}
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  item.kind === 'input'
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {item.kind === 'input' ? '↓ Entrée' : '↑ Sortie'}
              </span>

              <button
                type="button"
                onClick={() => handleAttachFileToExistingCard(item)}
                className={`p-1 rounded-lg border transition cursor-pointer ${
                  hasPcFiles
                    ? 'text-[#4F46E5] bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                    : 'text-slate-400 border-transparent hover:text-[#4F46E5] hover:bg-indigo-50'
                }`}
                title="Ajouter un ou plusieurs fichiers depuis votre PC à cette carte"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleDeleteDocumentItem(item)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Supprimer cette carte"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Linked Step Pill */}
          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1 truncate">
            <strong className="font-bold text-slate-800">
              Étape {item.stepNumber} :
            </strong>{' '}
            {item.node.label}
          </div>

          {/* List of all attached files inside the card */}
          {hasPcFiles && (
            <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
              {item.files.map((fileMeta, fIdx) => {
                const fileIsImg = isImageFile(fileMeta.name, fileMeta);
                return (
                  <div
                    key={`${fileMeta.name}-${fIdx}`}
                    className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/90 text-[11px] transition"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewState({ itemId: item.id, fileIndex: fIdx })
                      }
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer group"
                      title={`Aperçu de ${fileMeta.name} (${formatFileSize(
                        fileMeta.size
                      )})`}
                    >
                      {fileIsImg ? (
                        <ImageIcon className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                      )}
                      <span className="font-bold text-slate-800 group-hover:text-[#4F46E5] truncate">
                        {fileMeta.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({formatFileSize(fileMeta.size)})
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewState({ itemId: item.id, fileIndex: fIdx })
                        }
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white hover:bg-indigo-100 text-[#4F46E5] border border-indigo-200/70 font-bold text-[10.5px] transition cursor-pointer"
                        title="Aperçu du fichier"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Aperçu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadFile(fileMeta)}
                        className="p-1 rounded text-slate-500 hover:text-[#4F46E5] hover:bg-white transition cursor-pointer"
                        title={`Télécharger ${fileMeta.name}`}
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveSingleFileFromCard(item, fIdx)
                        }
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title={`Supprimer le fichier ${fileMeta.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const previewCardItem = previewState
    ? allDocumentItems.find((it) => it.id === previewState.itemId) || null
    : null;
  const previewFileMeta =
    previewCardItem && previewState
      ? previewCardItem.files[previewState.fileIndex] ||
        previewCardItem.files[0]
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-documents-modal-title"
    >
      {/* Hidden PC File Input for attaching 1 or multiple files to an existing card */}
      <input
        ref={cardFileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg"
        onChange={handleCardFileSelected}
        className="hidden"
        aria-label="Rattacher un ou plusieurs fichiers du PC à cette carte"
      />

      {/* Hidden PC File Input for the Small Add Modal (supports multiple files) */}
      <input
        ref={modalFileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg"
        onChange={handleModalFileSelected}
        className="hidden"
        aria-label="Choisir un ou plusieurs fichiers du PC pour la nouvelle carte"
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* ===================================================================
            TOP HEADER: Clean Single Line
            =================================================================== */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[#4F46E5] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="data-documents-modal-title"
                className="text-base font-extrabold text-slate-900"
              >
                Données, Documents & Applications SI
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===================================================================
            3 DISTINCT NAVIGATION TABS + SEARCH BAR
            =================================================================== */}
        <div className="px-6 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-white text-[#4F46E5] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Données & Documents ({stats.totalDocs})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('steps')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'steps'
                  ? 'bg-white text-[#4F46E5] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Vue tableau par étape ({stepNodes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('apps')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'apps'
                  ? 'bg-white text-[#4F46E5] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Applications SI ({stats.totalApps})</span>
            </button>
          </div>

          <div className="relative min-w-[240px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une donnée, un document, un SI..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* ===================================================================
            BODY CONTENT
            =================================================================== */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {/* -----------------------------------------------------------------
              TAB 1: DONNÉES & DOCUMENTS (Clean Filter Bar + 2 Dashed Add Cards)
              ----------------------------------------------------------------- */}
          {activeTab === 'library' && (
            <div className="space-y-5">
              {/* Top Filter Bar ONLY (No right-side input or + Ajouter button) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-extrabold text-slate-700">
                    Étape :
                  </span>
                  <select
                    aria-label="Filtrer par étape"
                    value={selectedStepFilter}
                    onChange={(e) => setSelectedStepFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 max-w-[320px] truncate cursor-pointer"
                  >
                    <option value="all">
                      Toutes les étapes ({stepNodes.length} étapes · {stats.totalDocs} éléments)
                    </option>
                    {stepNodes.map((sn) => {
                      const idx = nodes.findIndex((item) => item.id === sn.id) + 1;
                      const count =
                        (sn.inputs?.length || 0) + (sn.outputs?.length || 0);
                      return (
                        <option key={sn.id} value={sn.id}>
                          Étape {idx} — {sn.label} ({count})
                        </option>
                      );
                    })}
                  </select>

                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setKindFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        kindFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tous ({stats.stepScopedTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setKindFilter('input')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        kindFilter === 'input'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ↓ Entrées ({stats.inputCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setKindFilter('output')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        kindFilter === 'output'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ↑ Sorties ({stats.outputCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 1: PIÈCES & DONNÉES EN ENTRÉE + Dashed Card "+ Ajouter une entrée" */}
              {(kindFilter === 'all' || kindFilter === 'input') && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900 uppercase tracking-wider px-1">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-sky-600" />
                    <span>Pièces & Données en entrée ({filteredInputItems.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredInputItems.map((item) => renderDocumentCard(item))}

                    {/* Dashed Fictive Card at the end of Inputs */}
                    <button
                      type="button"
                      onClick={() => openAddCardModal('input')}
                      className="min-h-[112px] rounded-xl border-2 border-dashed border-sky-300/90 hover:border-sky-500 bg-sky-50/30 hover:bg-sky-50/70 p-4 flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer group"
                    >
                      <span className="w-9 h-9 rounded-full bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
                        <Plus className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-extrabold text-sky-800">
                        + Ajouter une entrée
                      </span>
                      <span className="text-[11px] text-sky-600/80">
                        Donnée métier ou fichier joint (Étape {selectedStepNumber})
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 2: DOCUMENTS & FLUX EN SORTIE + Dashed Card "+ Ajouter une sortie" */}
              {(kindFilter === 'all' || kindFilter === 'output') && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 uppercase tracking-wider px-1">
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Documents & Flux en sortie ({filteredOutputItems.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredOutputItems.map((item) => renderDocumentCard(item))}

                    {/* Dashed Fictive Card at the end of Outputs */}
                    <button
                      type="button"
                      onClick={() => openAddCardModal('output')}
                      className="min-h-[112px] rounded-xl border-2 border-dashed border-emerald-300/90 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 p-4 flex flex-col items-center justify-center gap-1.5 text-center transition cursor-pointer group"
                    >
                      <span className="w-9 h-9 rounded-full bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
                        <Plus className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-extrabold text-emerald-800">
                        + Ajouter une sortie
                      </span>
                      <span className="text-[11px] text-emerald-600/80">
                        Document généré ou statut sortant (Étape {selectedStepNumber})
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -----------------------------------------------------------------
              TAB 2: VUE TABLEAU PAR ÉTAPE
              ----------------------------------------------------------------- */}
          {activeTab === 'steps' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[28%]">Étape & Responsable</th>
                    <th className="py-3 px-4 w-[36%]">
                      ↓ Pièces & Données en entrée (Inputs)
                    </th>
                    <th className="py-3 px-4 w-[36%]">
                      ↑ Documents & Flux en sortie (Outputs)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStepNodes.map((node) => {
                    const stepNum = nodes.findIndex((n) => n.id === node.id) + 1;
                    const inputs = node.inputs || [];
                    const outputs = node.outputs || [];

                    const isAddingInputText =
                      inlineAddTarget?.nodeId === node.id &&
                      inlineAddTarget.kind === 'input';
                    const isAddingOutputText =
                      inlineAddTarget?.nodeId === node.id &&
                      inlineAddTarget.kind === 'output';

                    return (
                      <tr key={node.id} className="hover:bg-slate-50/60 align-top">
                        {/* Column 1: Step Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[10.5px] mb-1">
                                Étape {stepNum}
                              </span>
                              <div className="font-bold text-slate-900">
                                {node.label}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {node.ownerRole || 'Responsable non défini'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectNodeInInspector(node.id);
                                onClose();
                              }}
                              className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer shrink-0"
                              title="Ouvrir la fiche de l'étape"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                        {/* Column 2: Inputs */}
                        <td className="py-3 px-4 space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {inputs.map((inp, idx) => {
                              const scopedKey = `${node.id}::input::${inp}`;
                              const files =
                                attachedFiles[scopedKey] ||
                                attachedFiles[inp] ||
                                [];
                              return (
                                <span
                                  key={`${inp}-${idx}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/70 border border-sky-200/90 text-xs font-semibold text-slate-800"
                                >
                                  <FileText className="w-3 h-3 text-sky-600 shrink-0" />
                                  <span>{inp}</span>
                                  {files.length > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600">
                                      <Paperclip className="w-3 h-3 shrink-0" />
                                      {files.length > 1 && (
                                        <span>{files.length}</span>
                                      )}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = inputs.filter((_, i) => i !== idx);
                                      onUpdateNode({ ...node, inputs: next });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>

                          {isAddingInputText ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={inlineAddTarget.value}
                                onChange={(e) =>
                                  setInlineAddTarget({
                                    ...inlineAddTarget,
                                    value: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitInlineStepAdd();
                                  } else if (e.key === 'Escape') {
                                    setInlineAddTarget(null);
                                  }
                                }}
                                placeholder="Ex: Formulaire, RIB..."
                                className="flex-1 bg-white border border-sky-400 rounded-lg px-2 py-1 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={commitInlineStepAdd}
                                className="px-2 py-1 rounded-lg bg-sky-600 text-white text-xs font-bold cursor-pointer"
                                title="Valider"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddModalState({
                                  isOpen: true,
                                  kind: 'input',
                                  stepNodeId: node.id,
                                  docTitle: '',
                                  attachedFiles: [],
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-dashed border-sky-300 text-[11px] font-bold transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter une entrée</span>
                            </button>
                          )}
                        </td>

                        {/* Column 3: Outputs */}
                        <td className="py-3 px-4 space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {outputs.map((outp, idx) => {
                              const scopedKey = `${node.id}::output::${outp}`;
                              const files =
                                attachedFiles[scopedKey] ||
                                attachedFiles[outp] ||
                                [];
                              return (
                                <span
                                  key={`${outp}-${idx}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/70 border border-emerald-200/90 text-xs font-semibold text-slate-800"
                                >
                                  <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{outp}</span>
                                  {files.length > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600">
                                      <Paperclip className="w-3 h-3 shrink-0" />
                                      {files.length > 1 && (
                                        <span>{files.length}</span>
                                      )}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = outputs.filter((_, i) => i !== idx);
                                      onUpdateNode({ ...node, outputs: next });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>

                          {isAddingOutputText ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={inlineAddTarget.value}
                                onChange={(e) =>
                                  setInlineAddTarget({
                                    ...inlineAddTarget,
                                    value: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitInlineStepAdd();
                                  } else if (e.key === 'Escape') {
                                    setInlineAddTarget(null);
                                  }
                                }}
                                placeholder="Ex: Courrier, Statut..."
                                className="flex-1 bg-white border border-emerald-400 rounded-lg px-2 py-1 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={commitInlineStepAdd}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                title="Valider"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddModalState({
                                  isOpen: true,
                                  kind: 'output',
                                  stepNodeId: node.id,
                                  docTitle: '',
                                  attachedFiles: [],
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-dashed border-emerald-300 text-[11px] font-bold transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter une sortie</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* -----------------------------------------------------------------
              TAB 3: APPLICATIONS SI
              ----------------------------------------------------------------- */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-indigo-200/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#4F46E5] shrink-0" />
                  <span className="text-xs font-extrabold text-slate-700">
                    Étape :
                  </span>
                  <select
                    value={selectedStepFilter}
                    onChange={(e) => setSelectedStepFilter(e.target.value)}
                    aria-label="Filtrer et cibler par étape pour l'Application SI"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 max-w-[300px] truncate cursor-pointer"
                  >
                    <option value="all">
                      Toutes les étapes ({stats.totalApps} Applications SI)
                    </option>
                    {stepNodes.map((sn) => {
                      const idx = nodes.findIndex((item) => item.id === sn.id) + 1;
                      return (
                        <option key={sn.id} value={sn.id}>
                          Étape {idx} — {sn.label} ({sn.application || 'Aucun SI'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
                  <input
                    type="text"
                    value={newSiName}
                    onChange={(e) => setNewSiName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAssignNewSi();
                      }
                    }}
                    placeholder={`Affecter un SI à l'Étape ${selectedStepNumber} (ex: SAP, GED)...`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={handleAssignNewSi}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredAppsGroups.map((group) => (
                  <div
                    key={group.appName}
                    className="bg-white rounded-xl border border-indigo-100 p-4 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 text-[#4F46E5] flex items-center justify-center shrink-0">
                          <Server className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {group.appName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Utilisé par {group.nodes.length} étape
                            {group.nodes.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-[#4F46E5]">
                        SI Actif
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      {group.nodes.map((n) => {
                        const stepNum =
                          nodes.findIndex((item) => item.id === n.id) + 1;
                        return (
                          <div
                            key={n.id}
                            className="flex items-center justify-between gap-2 text-xs bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-200/60"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-extrabold text-slate-500 text-[11px] shrink-0">
                                Étape {stepNum}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {n.label}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={n.application || ''}
                              onChange={(e) =>
                                onUpdateNode({ ...n, application: e.target.value })
                              }
                              className="bg-white border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-semibold text-indigo-700 w-40 outline-none focus:border-indigo-400"
                              title="Modifier l'application SI de cette étape"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            FOOTER
            =================================================================== */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* ===================================================================
          SMALL POPOVER MODAL WHEN CLICKING "+ AJOUTER UNE ENTRÉE" OR "+ AJOUTER UNE SORTIE"
          (Direction is already known automatically — no need to ask Entrée/Sortie!)
          =================================================================== */}
      {addModalState && addModalState.isOpen && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAddModalState(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
                addModalState.kind === 'input'
                  ? 'bg-sky-50/80 border-sky-200/80'
                  : 'bg-emerald-50/80 border-emerald-200/80'
              }`}
            >
              <div className="flex items-center gap-2">
                {addModalState.kind === 'input' ? (
                  <ArrowDownToLine className="w-4 h-4 text-sky-600" />
                ) : (
                  <ArrowUpFromLine className="w-4 h-4 text-emerald-600" />
                )}
                <h3 className="text-sm font-extrabold text-slate-900">
                  {addModalState.kind === 'input'
                    ? 'Ajouter une pièce / donnée en entrée'
                    : 'Ajouter un document / flux en sortie'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModalState(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Step selector (pre-selected on current step) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Étape rattachée
                </label>
                <select
                  aria-label="Étape rattachée"
                  value={addModalState.stepNodeId}
                  onChange={(e) =>
                    setAddModalState({
                      ...addModalState,
                      stepNodeId: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                >
                  {stepNodes.map((sn) => {
                    const idx = nodes.findIndex((item) => item.id === sn.id) + 1;
                    return (
                      <option key={sn.id} value={sn.id}>
                        Étape {idx} — {sn.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Name input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nom de la donnée ou du document
                </label>
                <input
                  type="text"
                  autoFocus
                  value={addModalState.docTitle}
                  onChange={(e) =>
                    setAddModalState({
                      ...addModalState,
                      docTitle: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmAddCardModal();
                    }
                  }}
                  placeholder={
                    addModalState.kind === 'input'
                      ? 'Ex: Quittance de paiement, Pièce d’identité, RIB...'
                      : 'Ex: Courrier de confirmation, Statut dossier archivé...'
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Optional PC File Attachment (supports multiple files) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Fichiers ou images joints depuis le PC{' '}
                  <span className="font-normal text-slate-400">(optionnel)</span>
                </label>

                {addModalState.attachedFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {addModalState.attachedFiles.map((fileMeta, fIdx) => (
                      <div
                        key={`${fileMeta.name}-${fIdx}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {fileMeta.name}
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              {formatFileSize(fileMeta.size)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAddModalState({
                              ...addModalState,
                              attachedFiles: addModalState.attachedFiles.filter(
                                (_, idx) => idx !== fIdx
                              ),
                            })
                          }
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Retirer ce fichier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (modalFileInputRef.current) {
                      modalFileInputRef.current.value = '';
                      modalFileInputRef.current.click();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#4F46E5] bg-slate-50/70 hover:bg-indigo-50/40 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>
                    {addModalState.attachedFiles.length > 0
                      ? '+ Ajouter un autre fichier (ou plusieurs à la fois)...'
                      : 'Rattacher un ou plusieurs fichiers (PDF, Word, Excel, Image)...'}
                  </span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddModalState(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCardModal}
                disabled={
                  !addModalState.docTitle.trim() &&
                  addModalState.attachedFiles.length === 0
                }
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 ${
                  addModalState.kind === 'input'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PREVIEW MODAL FOR UPLOADED PC FILES / IMAGES
          =================================================================== */}
      {previewCardItem && previewFileMeta && previewState && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewState(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  {previewCardItem.name}{' '}
                  <span className="font-normal text-slate-400">
                    ({previewFileMeta.name})
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Étape {previewCardItem.stepNumber} ({previewCardItem.node.label}) ·{' '}
                  {formatFileSize(previewFileMeta.size)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(previewFileMeta)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveSingleFileFromCard(
                      previewCardItem,
                      previewState.fileIndex
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition cursor-pointer"
                  title="Supprimer ce fichier joint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewState(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Fermer l'aperçu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File Switcher Tabs if the card has multiple attached files */}
            {previewCardItem.files.length > 1 && (
              <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-1.5 overflow-x-auto">
                {previewCardItem.files.map((f, idx) => (
                  <button
                    key={`${f.name}-${idx}`}
                    type="button"
                    onClick={() =>
                      setPreviewState({
                        itemId: previewCardItem.id,
                        fileIndex: idx,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      previewState.fileIndex === idx
                        ? 'bg-[#4F46E5] text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[180px] truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 flex-1 overflow-auto bg-slate-50 flex items-center justify-center">
              {isImageFile(previewFileMeta.name, previewFileMeta) &&
              previewFileMeta.dataUrl ? (
                <img
                  src={previewFileMeta.dataUrl}
                  alt={previewFileMeta.name}
                  className="max-h-[62vh] max-w-full rounded-xl shadow-md border border-slate-200 object-contain"
                />
              ) : previewFileMeta.type === 'application/pdf' &&
                previewFileMeta.dataUrl ? (
                <iframe
                  src={previewFileMeta.dataUrl}
                  title={previewFileMeta.name}
                  className="w-full h-[62vh] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center space-y-2 py-10">
                  <FileText className="w-10 h-10 text-indigo-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-900">
                    {previewFileMeta.name}
                  </div>
                  <p className="text-xs text-slate-500">
                    Cliquez sur « Télécharger » en haut à droite pour ouvrir ce fichier.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
