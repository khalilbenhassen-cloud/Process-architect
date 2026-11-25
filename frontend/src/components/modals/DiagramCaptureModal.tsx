import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Check,
  Copy,
  Download,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface DiagramCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataUrl: string | null;
  fileName: string;
  modeLabel: string;
  dimensions?: { width: number; height: number } | null;
}

export const DiagramCaptureModal: React.FC<DiagramCaptureModalProps> = ({
  isOpen,
  onClose,
  dataUrl,
  fileName,
  modeLabel,
  dimensions,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<'fit' | number>('fit');

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setCopyError(null);
      setPreviewZoom('fit');
    }
  }, [isOpen, dataUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !dataUrl) return null;

  const handleCopy = async () => {
    try {
      setCopyError(null);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && 'ClipboardItem' in window) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      } else {
        setCopyError('Copie directe non supportée par ce navigateur — utilisez Enregistrer PNG.');
      }
    } catch {
      setCopyError('Impossible de copier automatiquement — utilisez Enregistrer PNG.');
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;
    win.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${fileName}</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      html, body { margin: 0; padding: 0; background: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
      img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="${fileName}" onload="setTimeout(() => { window.focus(); window.print(); }, 180);" />
  </body>
</html>`);
    win.document.close();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagram-capture-title"
        className="w-full max-w-5xl max-h-[90vh] bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_28px_72px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-black/[0.07] bg-[#F5F5F7]/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="diagram-capture-title"
                className="text-sm font-semibold text-[#1D1D1F] tracking-tight truncate"
              >
                Capture Haute Définition · {modeLabel}
              </h3>
              <p className="text-[11px] text-[#6E6E73] truncate">
                {dimensions
                  ? `${dimensions.width} × ${dimensions.height} px (HD 2×)`
                  : 'PNG Haute Définition'}{' '}
                · Prêt à coller dans PowerPoint, Word ou PDF
              </p>
            </div>
          </div>

          {/* Preview Zoom Controls */}
          <div className="flex items-center gap-1 bg-white border border-black/[0.08] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                setPreviewZoom((z) =>
                  z === 'fit' ? 60 : Math.max(25, z - 25)
                )
              }
              title="Dézoomer l'aperçu"
              aria-label="Dézoomer l'aperçu"
              className="p-1 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewZoom('fit')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                previewZoom === 'fit'
                  ? 'bg-[#007AFF]/10 text-[#007AFF]'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              {previewZoom === 'fit' ? 'Ajusté' : `${previewZoom}%`}
            </button>
            <button
              type="button"
              onClick={() =>
                setPreviewZoom((z) =>
                  z === 'fit' ? 100 : Math.min(250, z + 25)
                )
              }
              title="Zoomer dans la capture pour vérifier la netteté"
              aria-label="Zoomer dans la capture"
              className="p-1 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewZoom(100)}
              title="Afficher à 100% (taille réelle)"
              aria-label="Afficher à 100%"
              className={`px-1.5 py-0.5 rounded-lg text-[10.5px] font-semibold cursor-pointer ${
                previewZoom === 100
                  ? 'bg-[#007AFF]/10 text-[#007AFF]'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-black/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable HD Image Preview Stage */}
        <div
          className={`flex-1 min-h-[300px] overflow-auto bg-[#ECEEF2] p-5 ${
            previewZoom === 'fit' ? 'flex items-center justify-center' : 'block'
          }`}
        >
          <div className="inline-block shrink-0 bg-white rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-black/[0.06]">
            <img
              src={dataUrl}
              alt={`Capture du diagramme (${modeLabel})`}
              style={
                previewZoom === 'fit'
                  ? { maxWidth: '100%', maxHeight: '62vh', display: 'block', borderRadius: 12 }
                  : {
                      width: dimensions
                        ? `${Math.round((dimensions.width / 2) * (previewZoom / 100))}px`
                        : `${previewZoom * 12}px`,
                      height: 'auto',
                      maxWidth: 'none',
                      display: 'block',
                      borderRadius: 12,
                    }
              }
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-black/[0.07] bg-[#F5F5F7]/80 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="text-[11px] text-[#6E6E73]">
            {copyError ? (
              <span className="text-[#FF3B30] font-medium">{copyError}</span>
            ) : copied ? (
              <span className="text-[#1E7E34] font-semibold">
                Image HD copiée dans le presse-papiers !
              </span>
            ) : (
              <span>Utilisez le zoom en haut pour contrôler la netteté des textes.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-black/[0.04] border border-black/[0.1] shadow-2xs transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#34C759]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#6E6E73]" />
              )}
              <span>{copied ? 'Copié' : 'Copier'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="apple-pressable inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#1D1D1F] bg-white hover:bg-black/[0.04] border border-black/[0.1] shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Imprimer / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="apple-pressable inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Enregistrer PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
