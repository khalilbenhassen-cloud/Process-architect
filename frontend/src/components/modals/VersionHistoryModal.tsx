import React, { useState } from 'react';
import { Clock, RotateCcw, X, CheckCircle2, Layers } from 'lucide-react';
import { ProcessVersionSummary } from '../../types/process';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  processName: string;
  currentVersion: string;
  versions: ProcessVersionSummary[];
  onRestoreVersion: (versionId: string) => Promise<void> | void;
}

function formatShortVersion(v: string): string {
  const clean = (v || '1.0.0').trim().replace(/^v/i, '');
  return `v${clean.split('.')[0]}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  processName,
  currentVersion,
  versions,
  onRestoreVersion,
}) => {
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col max-h-[82vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-[#F5F5F7]/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="version-history-title"
                className="text-sm font-semibold text-[#1D1D1F] tracking-tight"
              >
                Historique des versions
              </h3>
              <p className="text-[11px] text-[#6E6E73] truncate">
                {processName} · Version active :{' '}
                <strong>{formatShortVersion(currentVersion)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-black/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-2.5">
          {versions.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <Layers className="w-7 h-7 text-[#C7C7CC] mx-auto" />
              <div className="text-xs font-semibold text-[#1D1D1F]">
                Aucune version clôturée pour l&apos;instant
              </div>
              <p className="text-[11.5px] text-[#6E6E73] max-w-xs mx-auto">
                Cliquez sur <strong>Publier v1</strong> lorsque vos travaux sont
                prêts pour archiver une première version restaurable.
              </p>
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.version === currentVersion;
              const isConfirming = confirmRestoreId === ver.id;

              return (
                <div
                  key={ver.id}
                  className={`p-3.5 rounded-xl border transition ${
                    isCurrent
                      ? 'border-[#007AFF]/35 bg-[#007AFF]/[0.04]'
                      : 'border-black/[0.07] bg-white hover:bg-[#F5F5F7]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#1D1D1F] text-white text-[11px] font-bold">
                          {formatShortVersion(ver.version)}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#34C759]/12 text-[#1E7E34] text-[10.5px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                        <span className="text-[11px] text-[#8E8E93]">
                          {formatDateTime(ver.publishedAt)}
                        </span>
                      </div>

                      {ver.note && (
                        <p className="text-xs text-[#1D1D1F] leading-snug">
                          {ver.note}
                        </p>
                      )}

                      <div className="text-[11px] text-[#6E6E73]">
                        {ver.nodeCount} étapes · {ver.ruleCount} règle
                        {ver.ruleCount > 1 ? 's' : ''} · par {ver.publishedBy}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmRestoreId(null)}
                            disabled={isRestoring}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#6E6E73] bg-[#F5F5F7] hover:bg-black/[0.08] cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            disabled={isRestoring}
                            onClick={async () => {
                              setIsRestoring(true);
                              try {
                                await onRestoreVersion(ver.id);
                                setConfirmRestoreId(null);
                                onClose();
                              } finally {
                                setIsRestoring(false);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] cursor-pointer disabled:opacity-50"
                          >
                            {isRestoring ? 'Restauration…' : 'Confirmer'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(ver.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/15 border border-[#007AFF]/20 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurer</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.06] bg-[#F5F5F7]/60 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-black/[0.05] border border-black/[0.08] transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
