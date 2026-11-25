import React, { useState, useEffect } from 'react';
import { Check, GitBranch, Sparkles, X } from 'lucide-react';

interface PublishVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  processName: string;
  currentVersion: string;
  /** 'close_draft' = clôturer un brouillon en v1 ; 'save_published' = choisir entre Maj vX ou créer v(X+1) */
  dialogMode: 'close_draft' | 'save_published';
  isSubmitting?: boolean;
  onConfirm: (
    mode: 'publish_current' | 'update_current' | 'new_version',
    note: string
  ) => Promise<void> | void;
}

function getMajorNumber(version: string): number {
  const raw = (version || '1.0.0').trim().replace(/^v/i, '');
  const parsed = parseInt(raw.split('.')[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export const PublishVersionModal: React.FC<PublishVersionModalProps> = ({
  isOpen,
  onClose,
  processName,
  currentVersion,
  dialogMode,
  isSubmitting = false,
  onConfirm,
}) => {
  const major = getMajorNumber(currentVersion);
  const nextMajor = major + 1;

  const [selectedChoice, setSelectedChoice] = useState<
    'update_current' | 'new_version'
  >('new_version');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedChoice('new_version');
      setNote('');
    }
  }, [isOpen, dialogMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiMode =
      dialogMode === 'close_draft' ? 'publish_current' : selectedChoice;
    await onConfirm(apiMode, note.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-version-title"
        className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.22)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-[#F5F5F7]/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] shrink-0">
              {dialogMode === 'close_draft' ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <GitBranch className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="publish-version-title"
                className="text-sm font-semibold text-[#1D1D1F] tracking-tight truncate"
              >
                {dialogMode === 'close_draft'
                  ? `Clôturer et publier v${major}`
                  : `Enregistrer les modifications`}
              </h3>
              <p className="text-[11px] text-[#6E6E73] truncate">{processName}</p>
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
        <div className="p-5 space-y-4">
          {dialogMode === 'close_draft' ? (
            <div className="p-3.5 rounded-xl bg-[#007AFF]/[0.06] border border-[#007AFF]/20 text-xs text-[#1D1D1F] leading-relaxed">
              Un instantané complet de la <strong>version v{major}</strong>{' '}
              (étapes, flux, durées et règles métier) sera archivé dans
              l&apos;historique et visible dans l&apos;écran{' '}
              <strong>Projets</strong>.
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-[#6E6E73]">
                La version <strong>v{major}</strong> est déjà clôturée. Choisissez
                comment enregistrer vos nouveaux changements :
              </p>

              {/* Option 1: New version v(N+1) */}
              <button
                type="button"
                onClick={() => setSelectedChoice('new_version')}
                className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  selectedChoice === 'new_version'
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.06] shadow-2xs'
                    : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7]/70'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedChoice === 'new_version'
                      ? 'border-[#007AFF] bg-[#007AFF]'
                      : 'border-[#C7C7CC]'
                  }`}
                >
                  {selectedChoice === 'new_version' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#1D1D1F]">
                      Passer en v{nextMajor}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-semibold">
                      <Sparkles className="w-2.5 h-2.5" />
                      Recommandé
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-snug">
                    Conserve <strong>v{major}</strong> intacte dans l&apos;historique
                    (restaurable en 1 clic) et crée la version{' '}
                    <strong>v{nextMajor}</strong>.
                  </p>
                </div>
              </button>

              {/* Option 2: Update current vN */}
              <button
                type="button"
                onClick={() => setSelectedChoice('update_current')}
                className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  selectedChoice === 'update_current'
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.06] shadow-2xs'
                    : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7]/70'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedChoice === 'update_current'
                      ? 'border-[#007AFF] bg-[#007AFF]'
                      : 'border-[#C7C7CC]'
                  }`}
                >
                  {selectedChoice === 'update_current' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#1D1D1F]">
                    Mettre à jour v{major}
                  </div>
                  <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-snug">
                    Enregistre directement sur la version{' '}
                    <strong>v{major}</strong> actuelle (petit ajustement sans
                    incrémenter).
                  </p>
                </div>
              </button>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#1D1D1F] mb-1">
              Note de version (optionnelle)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                dialogMode === 'close_draft'
                  ? 'Ex. Version validée en comité risque'
                  : 'Ex. Ajustement des durées et ajout RG-316'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-black/[0.1] bg-[#F5F5F7]/60 focus:bg-white focus:border-[#007AFF] outline-none transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-black/[0.06] bg-[#F5F5F7]/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-black/[0.05] border border-black/[0.08] transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? 'Enregistrement…'
              : dialogMode === 'close_draft'
              ? `Publier v${major}`
              : selectedChoice === 'new_version'
              ? `Enregistrer en v${nextMajor}`
              : `Mettre à jour v${major}`}
          </button>
        </div>
      </form>
    </div>
  );
};
