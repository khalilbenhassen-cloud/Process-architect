import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  RotateCcw,
  Sparkles,
  FileText,
  Euro,
  ShieldCheck,
  Cpu,
  UserCheck,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  BusinessRule,
  NodeType,
  ProcessEdge,
  ProcessNode,
} from '../types/process';
import { formatDuration } from '../utils/durationFormat';
import { DiagramCaptureModal } from './modals/DiagramCaptureModal';

gsap.registerPlugin(useGSAP);

/**
 * Morphing Play <-> Pause SVG Icon (smooth geometric state transition).
 */
const MorphPlayPauseIcon: React.FC<{ isPlaying: boolean; className?: string }> = ({
  isPlaying,
  className = 'w-3.5 h-3.5',
}) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <g
      style={{
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease',
        transformOrigin: '8px 8px',
        transform: isPlaying ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(-45deg)',
        opacity: isPlaying ? 1 : 0,
      }}
    >
      <rect x="3.5" y="2.8" width="3" height="10.4" rx="1" />
      <rect x="9.5" y="2.8" width="3" height="10.4" rx="1" />
    </g>
    <g
      style={{
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease',
        transformOrigin: '8px 8px',
        transform: !isPlaying ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(45deg)',
        opacity: !isPlaying ? 1 : 0,
      }}
    >
      <path d="M4.2 3.1C4.2 2.5 4.9 2.15 5.4 2.48L12.7 7.38C13.15 7.68 13.15 8.32 12.7 8.62L5.4 13.52C4.9 13.85 4.2 13.5 4.2 12.9V3.1Z" />
    </g>
  </svg>
);

/**
 * Morphing Fullscreen <-> Exit Fullscreen SVG Icon.
 */
const MorphFullscreenIcon: React.FC<{ isFullscreen: boolean; className?: string }> = ({
  isFullscreen,
  className = 'w-3.5 h-3.5',
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <g
      style={{
        transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        transformOrigin: '8px 8px',
        transform: isFullscreen ? 'rotate(180deg) scale(0.92)' : 'rotate(0deg) scale(1)',
      }}
    >
      <path d="M2.5 6V3.5C2.5 2.95 2.95 2.5 3.5 2.5H6" />
      <path d="M10 2.5H12.5C13.05 2.5 13.5 2.95 13.5 3.5V6" />
      <path d="M13.5 10V12.5C13.5 13.05 13.05 13.5 12.5 13.5H10" />
      <path d="M6 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V10" />
    </g>
  </svg>
);

function formatClockSeconds(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export type FinanceFlowType =
  | 'gestionnaire'
  | 'dossier'
  | 'virement'
  | 'conformite'
  | 'signal_si'
  | 'alerte';

export type IsometricStationKind =
  | 'portal'
  | 'workstation'
  | 'shield'
  | 'database'
  | 'vault'
  | 'envelope';

export interface FinanceFlowMeta {
  id: FinanceFlowType;
  label: string;
  shortLabel: string;
  color: string;
  ribbonFill: string;
}

export const FINANCE_FLOW_TYPES: Record<FinanceFlowType, FinanceFlowMeta> = {
  gestionnaire: {
    id: 'gestionnaire',
    label: 'Gestionnaire (marche)',
    shortLabel: 'Gestionnaire',
    color: '#1D1D1F',
    ribbonFill: '#EEF2F7',
  },
  dossier: {
    id: 'dossier',
    label: 'Dossier KYC animé',
    shortLabel: 'Dossier KYC',
    color: '#007AFF',
    ribbonFill: '#EBF5FF',
  },
  virement: {
    id: 'virement',
    label: 'Pièces € tournantes',
    shortLabel: 'Flux €',
    color: '#22A06B',
    ribbonFill: '#E3F7EC',
  },
  conformite: {
    id: 'conformite',
    label: 'Scan Conformité LCB-FT',
    shortLabel: 'Conformité',
    color: '#D97706',
    ribbonFill: '#FFF4DC',
  },
  signal_si: {
    id: 'signal_si',
    label: 'Signal SI / API',
    shortLabel: 'Signal SI / API',
    color: '#0A84FF',
    ribbonFill: '#EDF4FF',
  },
  alerte: {
    id: 'alerte',
    label: 'Exception / Escalade',
    shortLabel: 'Exception',
    color: '#E5484D',
    ribbonFill: '#FFECEC',
  },
};

/**
 * Automatically infers the most relevant Finance animated character/object for a connection.
 */
export function inferFinanceFlowType(
  edge: ProcessEdge,
  sourceNode?: ProcessNode,
  targetNode?: ProcessNode
): FinanceFlowType {
  const edgeText = `${edge.label || ''} ${edge.condition || ''}`.toLowerCase();
  const targetText = `${targetNode?.label || ''} ${targetNode?.ownerRole || ''} ${targetNode?.application || ''}`.toLowerCase();
  const sourceText = `${sourceNode?.label || ''} ${sourceNode?.ownerRole || ''}`.toLowerCase();

  const hasOppositionReject = !edgeText.includes('sans opposition') && edgeText.includes('opposition');
  if (
    hasOppositionReject ||
    /non|rejet|refus|incomplet|inéligible|ineligible|exception|alerte|escalad|anomalie|fraude|bloc|seuil|>\s*50/i.test(
      edgeText
    ) ||
    /refus|rejet|retouche|escalad|contentieux|fraude|incomplet|forclu|caduque|non[\s-]?couvert|non[\s-]?éligible|non[\s-]?eligible|inéligible|ineligible|exclu|irrecevable|déclin|declin|sans suite|invalide/i.test(targetText)
  ) {
    return 'alerte';
  }
  if (
    /virement|règlement|reglement|indemnis|paiement|versement|rachat|trésorerie|tresorerie|sepa|comptab|débloqu|debloqu|signée|clôtur|clotur/i.test(
      targetText
    ) ||
    targetNode?.type === 'end'
  ) {
    return 'virement';
  }
  if (sourceNode?.type === 'start') {
    return 'gestionnaire';
  }
  if (
    /lcb|kyc|conform|audit|contrôle|controle|valid|homolog|garantie|vérif|verif/i.test(
      targetText
    ) ||
    sourceNode?.type === 'decision'
  ) {
    return 'conformite';
  }
  if (
    targetNode?.executionMode === 'automated' ||
    sourceNode?.executionMode === 'automated' ||
    /api|erp|core|moteur|scoring|crm|wms|si\b/i.test(targetText)
  ) {
    return 'signal_si';
  }
  if (
    /gestionnaire|conseiller|expert|responsable|directeur|analyste|client|assuré/i.test(
      `${sourceText} ${targetText}`
    )
  ) {
    return 'gestionnaire';
  }
  return 'dossier';
}

/**
 * Automatically selects the illustrated Isometric 3D Station for each process node.
 * Checks explicit node.type first (so default application names like "Portail Métier / GED" never hijack Tasks/Decisions).
 */
export function inferIsometricStationKind(node: ProcessNode): IsometricStationKind {
  const labelLower = (node.label || '').toLowerCase();
  const appLower = (node.application || '').toLowerCase();

  if (node.type === 'start') {
    return 'portal';
  }
  if (
    /refus|rejet|annul|échec|echec|forclu|caduque|non[\s-]?couvert|non[\s-]?éligible|non[\s-]?eligible|inéligible|ineligible|exclu|irrecevable|déclin|declin|sans suite|invalide|demander.*pièce|pièces?\s+manquant|pièces?\s+complément|relance|escalad|contentieux/i.test(
      labelLower
    )
  ) {
    return 'envelope';
  }
  if (node.type === 'end') {
    return 'vault';
  }
  if (node.type === 'decision') {
    return 'shield';
  }
  if (/lcb|kyc|conform|audit|contrôle|controle|fraude|valid|homolog|garantie|seuil/i.test(labelLower)) {
    return 'shield';
  }
  if (
    /virement|trésorerie|tresorerie|indemnis|règlement|reglement|paiement|sepa/i.test(labelLower)
  ) {
    return 'vault';
  }
  if (
    node.executionMode === 'automated' ||
    /core banking|erp|api|moteur|scoring|fiscal|base|ocr|ia\b/i.test(`${labelLower} ${appLower}`)
  ) {
    return 'database';
  }
  if (/portail|réception|reception|déclaration|declaration/i.test(labelLower)) {
    return 'portal';
  }
  return 'workstation';
}

/* ============================================================================
   STUDIO-GRADE VOLUMETRIC ISOMETRIC 3D STATIONS (Gradients + Highlights + Scan)
   ============================================================================ */
const IsometricStationSvg: React.FC<{
  kind: IsometricStationKind;
  isHovered: boolean;
  isActiveStep: boolean;
  isBottleneck: boolean;
}> = ({ kind, isHovered, isActiveStep, isBottleneck }) => {
  const highlighted = isHovered || isActiveStep;
  const stroke = highlighted ? '#007AFF' : '#1D1D1F';
  const strokeW = highlighted ? 1.85 : 1.45;
  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      width="124"
      height="94"
      viewBox="0 0 156 118"
      fill="none"
      className="overflow-visible pointer-events-none select-none"
      aria-hidden="true"
    >
      <defs>
        {/* Volumetric gradients for editorial studio depth */}
        <linearGradient id={`stoneTop-${uid}`} x1="22" y1="50" x2="134" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5F2EC" />
          <stop offset="100%" stopColor="#E4DFD6" />
        </linearGradient>
        <linearGradient id={`skyDesk-${uid}`} x1="22" y1="50" x2="134" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E1F0FF" />
          <stop offset="100%" stopColor="#B8DBFF" />
        </linearGradient>
        <linearGradient id={`goldShield-${uid}`} x1="50" y1="16" x2="104" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE9AD" />
          <stop offset="55%" stopColor="#F4BE5E" />
          <stop offset="100%" stopColor="#D9922B" />
        </linearGradient>
        <linearGradient id={`coralBase-${uid}`} x1="36" y1="60" x2="120" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDDCD8" />
          <stop offset="100%" stopColor="#F2A49C" />
        </linearGradient>
        <linearGradient id={`lavCyl-${uid}`} x1="46" y1="26" x2="110" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4EEFF" />
          <stop offset="50%" stopColor="#D9C8FF" />
          <stop offset="100%" stopColor="#B69BF8" />
        </linearGradient>
        <linearGradient id={`mintVault-${uid}`} x1="40" y1="22" x2="116" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E6FBF0" />
          <stop offset="50%" stopColor="#B6EED0" />
          <stop offset="100%" stopColor="#7FD6A8" />
        </linearGradient>
        <linearGradient id={`envBase-${uid}`} x1="26" y1="60" x2="130" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE1D8" />
          <stop offset="100%" stopColor="#F5B4A3" />
        </linearGradient>
        <radialGradient id={`cyanGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#38BDF8" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`redGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E5484D" stopOpacity="0.34" />
          <stop offset="68%" stopColor="#E5484D" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#E5484D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft grounded shadow */}
      <ellipse cx="78" cy="99" rx="52" ry="15" fill="#1D1D1F" fillOpacity={highlighted ? 0.14 : 0.08} />

      {/* 1. PORTAIL CLIENT — Detailed Isometric Laptop on Beveled Stone Pedestal */}
      {kind === 'portal' && (
        <g>
          <path d="M24 75 L78 50 L132 75 L78 100 Z" fill={`url(#stoneTop-${uid})`} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M24 75 L78 100 L78 108 L24 83 Z" fill="#D9D4CB" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M132 75 L78 100 L78 108 L132 83 Z" fill="#C4BEB4" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          {/* Laptop aluminum base */}
          <path d="M46 70 L82 54 L112 68 L76 84 Z" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M46 70 L76 84 L76 87 L46 73 Z" fill="#CBD5E1" stroke="#1D1D1F" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M112 68 L76 84 L76 87 L112 71 Z" fill="#94A3B8" stroke="#1D1D1F" strokeWidth="1.1" strokeLinejoin="round" />
          {/* Keyboard detail lines */}
          <path d="M58 69 L81 59 L97 66 L74 76 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.7" />
          <path d="M64 68 L83 60 M68 71 L87 63 M72 74 L91 66" stroke="#64748B" strokeWidth="0.9" strokeLinecap="round" />
          {/* Laptop screen */}
          <path d="M46 70 L44 33 L80 17 L82 54 Z" fill="#F8FAFC" stroke="#1D1D1F" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M49 65 L48 36 L77 23 L78 52 Z" fill="#EBF5FF" stroke="#1D1D1F" strokeWidth="1" />
          {/* Animated UI bars inside laptop screen */}
          <path d="M53 42 L70 34" stroke="#007AFF" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M53 48 L66 42" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M53 54 L71 46" stroke="#34C759" strokeWidth="2" strokeLinecap="round" />
          <circle cx="71" cy="30" r="1.6" fill="#34C759" />
        </g>
      )}

      {/* 2. POSTE GESTIONNAIRE — Sky-Blue Isometric Desk + Monitor with Live 82% Progress */}
      {kind === 'workstation' && (
        <g>
          {/* Desk legs */}
          <path d="M36 80 L36 100 L44 103 L44 83" fill="#93C5FD" stroke="#1D1D1F" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M74 96 L74 110 L82 106 L82 93" fill="#7AB8FA" stroke="#1D1D1F" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M114 78 L114 96 L121 93 L121 75" fill="#60A5FA" stroke="#1D1D1F" strokeWidth="1.3" strokeLinejoin="round" />
          {/* Desk top */}
          <path d="M26 71 L78 47 L130 71 L78 95 Z" fill={`url(#skyDesk-${uid})`} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M26 71 L78 95 L78 101 L26 77 Z" fill="#9DCBF9" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M130 71 L78 95 L78 101 L130 77 Z" fill="#7BB4F5" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          {/* Keyboard & Mouse on desk */}
          <path d="M72 78 L93 68 L102 72 L81 82 Z" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.1" />
          <ellipse cx="107" cy="70" rx="4.5" ry="2.6" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.1" />
          {/* Wide Studio Monitor */}
          <path d="M58 63 L58 72 L68 68 L68 59" fill="#CBD5E1" stroke="#1D1D1F" strokeWidth="1.3" />
          <path d="M40 60 L40 24 L84 6 L84 42 Z" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M44 55 L44 27 L80 12 L80 40 Z" fill="#F0FDF4" stroke="#1D1D1F" strokeWidth="1" />
          {/* Live Green Progress Gauge on Monitor */}
          <path d="M49 44 L75 33" stroke="#DCFCE7" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M49 44 L70 35" stroke="#22C55E" strokeWidth="5.5" strokeLinecap="round" />
          <text
            x="61"
            y="32"
            transform="skewY(-22)"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fill="#15803D"
            style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}
          >
            82%
          </text>
        </g>
      )}

      {/* 3. CONFORMITÉ LCB-FT / GOULOT — Volumetric Golden 3D Shield + Glowing Radar Ring */}
      {kind === 'shield' && (
        <g>
          {/* Ambient coral/red bottleneck glow */}
          <ellipse cx="78" cy="84" rx="58" ry="24" fill={`url(#redGlow-${uid})`} />
          <ellipse
            cx="78"
            cy="83"
            rx="46"
            ry="19"
            fill="none"
            stroke={isBottleneck ? '#E5484D' : '#F59E0B'}
            strokeWidth="1.8"
            className="iso-pulse-ring"
          />
          {/* Layered Cylindrical Pedestal */}
          <path d="M40 76 V87 C40 95 57 101 78 101 C99 101 116 95 116 87 V76" fill={`url(#coralBase-${uid})`} stroke={stroke} strokeWidth={strokeW} />
          <ellipse cx="78" cy="76" rx="38" ry="15" fill="#FDE8E4" stroke={stroke} strokeWidth={strokeW} />
          <ellipse cx="78" cy="73" rx="28" ry="10.5" fill="#F9C5BE" stroke="#1D1D1F" strokeWidth="1.2" />
          {/* Volumetric Golden 3D Shield */}
          <path
            d="M78 13 L105 23 V47 C105 64 92 75 78 82 C64 75 51 64 51 47 V23 L78 13 Z"
            fill={`url(#goldShield-${uid})`}
            stroke="#1D1D1F"
            strokeWidth="1.65"
            strokeLinejoin="round"
          />
          {/* Specular left facet highlight */}
          <path
            d="M78 16 L55 25 V47 C55 61 65 71 78 77 Z"
            fill="#FFFFFF"
            fillOpacity="0.24"
          />
          <path
            d="M78 21 L98 29 V46 C98 59 88 68 78 73 C68 68 58 59 58 46 V29 L78 21 Z"
            fill="none"
            stroke="#9A5B13"
            strokeWidth="1.1"
            strokeOpacity="0.55"
          />
          <path
            d="M68 47 L75 54 L89 39"
            fill="none"
            stroke="#1D1D1F"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* 4. CORE BANKING & FISCALITÉ — Lavender 3D Cylinder + Concentric Cyan Radar Rings */}
      {kind === 'database' && (
        <g>
          {/* Glowing concentric cyan API rings */}
          <ellipse cx="78" cy="84" rx="58" ry="23" fill={`url(#cyanGlow-${uid})`} />
          <ellipse cx="78" cy="84" rx="52" ry="20" fill="none" stroke="#38BDF8" strokeWidth="1.8" strokeOpacity="0.7" />
          <ellipse cx="78" cy="84" rx="43" ry="16" fill="none" stroke="#0A84FF" strokeWidth="1.5" className="iso-pulse-ring" />
          {/* Multi-tier Lavender 3D Cylinder */}
          <path d="M48 29 V75 C48 84 61.5 91 78 91 C94.5 91 108 84 108 75 V29" fill={`url(#lavCyl-${uid})`} stroke={stroke} strokeWidth={strokeW} />
          <ellipse cx="78" cy="29" rx="30" ry="12" fill="#F5F0FF" stroke={stroke} strokeWidth={strokeW} />
          <path d="M48 45 C48 53 61.5 59 78 59 C94.5 59 108 53 108 45" fill="none" stroke="#1D1D1F" strokeWidth="1.35" />
          <path d="M48 61 C48 69 61.5 75 78 75 C94.5 75 108 69 108 61" fill="none" stroke="#1D1D1F" strokeWidth="1.35" />
          {/* Specular vertical sheen */}
          <path d="M55 37 V78" stroke="#FFFFFF" strokeWidth="4" strokeOpacity="0.45" strokeLinecap="round" />
          {/* Glowing status LEDs */}
          <circle cx="62" cy="52" r="2.2" fill="#0A84FF" />
          <circle cx="62" cy="68" r="2.2" fill="#34C759" />
          <circle cx="69" cy="53.5" r="1.5" fill="#38BDF8" />
        </g>
      )}

      {/* 5. TRÉSORERIE VIREMENT SEPA — Mint-Green 3D Bank Vault with Detailed Wheel Dial */}
      {kind === 'vault' && (
        <g>
          {/* Mint beveled pedestal */}
          <path d="M24 75 L78 50 L132 75 L78 100 Z" fill="#DCFCE7" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M24 75 L78 100 L78 108 L24 83 Z" fill="#B6EED0" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M132 75 L78 100 L78 108 L132 83 Z" fill="#86D9AD" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          {/* Vault Cube Body */}
          <path d="M44 37 L78 21 L112 37 L78 53 Z" fill="#ECFDF5" stroke="#1D1D1F" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M44 37 L78 53 L78 88 L44 72 Z" fill={`url(#mintVault-${uid})`} stroke="#1D1D1F" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M112 37 L78 53 L78 88 L112 72 Z" fill="#86D9AD" stroke="#1D1D1F" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Recessed vault door frame */}
          <path d="M49 44 L73 55 L73 81 L49 70 Z" fill="#D1FAE5" stroke="#1D1D1F" strokeWidth="1.15" strokeLinejoin="round" />
          {/* Metallic Vault Wheel Dial */}
          <ellipse cx="61" cy="62" rx="8" ry="10.5" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.4" />
          <ellipse cx="61" cy="62" rx="4.5" ry="6" fill="#E2E8F0" stroke="#1D1D1F" strokeWidth="1" />
          <circle cx="61" cy="62" r="2.3" fill="#16A34A" />
          <line x1="61" y1="53" x2="61" y2="71" stroke="#1D1D1F" strokeWidth="1.1" />
          <line x1="54" y1="62" x2="68" y2="62" stroke="#1D1D1F" strokeWidth="1.1" />
        </g>
      )}

      {/* 6. DEMANDE PIÈCES / EXCEPTION — Coral Pedestal + Open 3D Envelope with Documents */}
      {kind === 'envelope' && (
        <g>
          {/* Coral pedestal */}
          <path d="M26 75 L78 51 L130 75 L78 99 Z" fill={`url(#envBase-${uid})`} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M26 75 L78 99 L78 107 L26 83 Z" fill="#ECA796" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <path d="M130 75 L78 99 L78 107 L130 83 Z" fill="#DF8F7D" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          {/* Back of open kraft envelope */}
          <path d="M48 66 L48 34 L78 20 L108 34 L108 66 Z" fill="#FDE6C4" stroke="#1D1D1F" strokeWidth="1.45" strokeLinejoin="round" />
          {/* Protruding white KYC documents */}
          <path d="M55 58 L55 28 L83 18 L97 26 L97 58 Z" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M62 34 L82 27 M62 40 L86 32 M62 46 L79 40" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          {/* Front envelope pocket fold */}
          <path d="M48 44 L78 62 L108 44 L108 72 L78 86 L48 72 Z" fill="#F5C78E" stroke="#1D1D1F" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M48 44 L78 62 L108 44" fill="none" stroke="#1D1D1F" strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
};

/* ============================================================================
   STUDIO-GRADE ANIMATED SVG CHARACTERS & MOTION GRAPHICS TRAVELING ALONG PATHS
   ============================================================================ */
const AnimatedFinanceCharacterSvg: React.FC<{ type: FinanceFlowType }> = ({ type }) => {
  if (type === 'gestionnaire') {
    return (
      <g transform="translate(0, -16)">
        {/* Subtle motion speed lines behind walking advisor */}
        <line x1="-18" y1="-6" x2="-11" y2="-6" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.65" />
        <line x1="-21" y1="-1" x2="-12" y2="-1" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.5" />
        <line x1="-17" y1="4" x2="-11" y2="4" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
        <ellipse cx="0" cy="20" rx="10" ry="3.4" fill="#1D1D1F" fillOpacity="0.18" />
        <g className="iso-walk-bob">
          <g className="iso-walk-leg-b">
            <path d="M-1 7 L-6 18" stroke="#1E293B" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M-6 18 L-2 19.2" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="iso-walk-leg-a">
            <path d="M2.5 7 L7 18" stroke="#334155" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M7 18 L10.5 19.2" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Tailored navy suit jacket */}
          <rect x="-6" y="-6.5" width="12" height="14" rx="4.2" fill="#1E3A5F" stroke="#1D1D1F" strokeWidth="1.35" />
          <path d="M-2 -6.5 L0 -1.5 L2 -6.5" fill="#FFFFFF" />
          <line x1="0" y1="-3.5" x2="0" y2="2" stroke="#007AFF" strokeWidth="1.3" strokeLinecap="round" />
          {/* Swinging arm holding crisp blue client folder */}
          <g className="iso-walk-arm">
            <path d="M3.5 -3 L9 4.5" stroke="#1E3A5F" strokeWidth="2.7" strokeLinecap="round" />
            <rect x="6.5" y="1" width="8.5" height="10" rx="1.8" fill="#007AFF" stroke="#1D1D1F" strokeWidth="1.15" transform="rotate(-12 10 5)" />
            <line x1="8.5" y1="4.8" x2="12.8" y2="4.8" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" />
          </g>
          {/* Head & Hair */}
          <circle cx="0.5" cy="-12.5" r="5" fill="#FDE6C4" stroke="#1D1D1F" strokeWidth="1.3" />
          <path d="M-4.2 -13.5 C-4.2 -18 5 -18.5 5.3 -13.5 C3 -15.2 -2 -15.2 -4.2 -13.5 Z" fill="#1D1D1F" />
          <circle cx="2.5" cy="-12.5" r="0.7" fill="#1D1D1F" />
        </g>
      </g>
    );
  }

  if (type === 'virement') {
    return (
      <g>
        {/* Twin gleaming 3D-spinning golden Euro coins */}
        <circle r="19" fill="#34C759" fillOpacity="0.14" className="iso-pulse-ring" />
        <g transform="translate(-7, 4) scale(0.78)" className="iso-coin-spin">
          <circle r="11.5" fill="#F59E0B" stroke="#1D1D1F" strokeWidth="1.5" />
          <circle r="8.2" fill="#FDE047" stroke="#B45309" strokeWidth="1" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="800" fill="#854D0E">
            €
          </text>
        </g>
        <g transform="translate(7, -4)" className="iso-coin-spin">
          <circle r="12" fill="#FACC15" stroke="#1D1D1F" strokeWidth="1.5" />
          <circle r="8.8" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="800" fill="#854D0E">
            €
          </text>
        </g>
      </g>
    );
  }

  if (type === 'dossier') {
    return (
      <g className="iso-dossier-float">
        {/* Sparkling golden stars around KYC document */}
        <path d="M-15 -11 L-14 -14 L-13 -11 L-10 -10 L-13 -9 L-14 -6 L-15 -9 L-18 -10 Z" fill="#F59E0B" />
        <path d="M14 -14 L15 -17 L16 -14 L19 -13 L16 -12 L15 -9 L14 -12 L11 -13 Z" fill="#F59E0B" />
        <g transform="rotate(-8)">
          <rect x="-11" y="-14" width="22" height="27" rx="4" fill="#FFFFFF" stroke="#1D1D1F" strokeWidth="1.5" />
          <path d="M4 -14 L11 -7 H4 Z" fill="#D8ECFF" stroke="#1D1D1F" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M-6 -4 L-4 -2 L-1 -6" fill="none" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="1" y1="-4" x2="7" y2="-4" stroke="#1D1D1F" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M-6 2 L-4 4 L-1 0" fill="none" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="1" y1="2" x2="7" y2="2" stroke="#1D1D1F" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="-6" y1="8" x2="5" y2="8" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </g>
    );
  }

  if (type === 'conformite') {
    return (
      <g className="iso-dossier-float">
        <circle r="16" fill="#F59E0B" fillOpacity="0.16" className="iso-pulse-ring" />
        <path
          d="M0 -13 L11 -8.5 V0 C11 7 6 11 0 13.5 C-6 11 -11 7 -11 0 V-8.5 L0 -13 Z"
          fill="#FFE4A3"
          stroke="#1D1D1F"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M-4 0.5 L-1 3.5 L5 -3"
          fill="none"
          stroke="#1D1D1F"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (type === 'signal_si') {
    return (
      <g>
        {/* Glowing vertical cyan & emerald API telemetry bars */}
        <circle r="15" fill="#0A84FF" fillOpacity="0.18" className="iso-pulse-ring" />
        <rect x="-8" y="-8" width="3.2" height="16" rx="1.6" fill="#0A84FF" />
        <rect x="-1.6" y="-12" width="3.2" height="24" rx="1.6" fill="#38BDF8" />
        <rect x="4.8" y="-6" width="3.2" height="12" rx="1.6" fill="#34C759" />
      </g>
    );
  }

  // alerte / exception envelope with motion lines
  return (
    <g className="iso-dossier-float">
      <line x1="-20" y1="-3" x2="-13" y2="-3" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="-18" y1="3" x2="-13" y2="3" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.5" />
      <rect x="-11" y="-8" width="22" height="16" rx="3" fill="#FDE68A" stroke="#1D1D1F" strokeWidth="1.45" />
      <path d="M-10.5 -7 L0 1.5 L10.5 -7" fill="none" stroke="#1D1D1F" strokeWidth="1.35" strokeLinejoin="round" />
    </g>
  );
};

const FlowLegendIcon: React.FC<{ type: FinanceFlowType; className?: string }> = ({
  type,
  className = 'w-3.5 h-3.5',
}) => {
  const color = FINANCE_FLOW_TYPES[type].color;
  switch (type) {
    case 'gestionnaire':
      return <UserCheck className={className} style={{ color }} />;
    case 'dossier':
      return <FileText className={className} style={{ color }} />;
    case 'virement':
      return <Euro className={className} style={{ color }} />;
    case 'conformite':
      return <ShieldCheck className={className} style={{ color }} />;
    case 'signal_si':
      return <Cpu className={className} style={{ color }} />;
    case 'alerte':
      return <AlertTriangle className={className} style={{ color }} />;
  }
};

interface AnimatedFinanceDiagramProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  rules: BusinessRule[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateNode?: (updated: ProcessNode) => void;
  onAddNodeWithEdge?: (
    type: NodeType,
    connectFromNodeId?: string,
    edgeLabel?: string,
    branchType?: 'nominal' | 'exception'
  ) => string;
  onDeleteNode?: (nodeId: string) => void;
  onConnectNodes?: (sourceId: string, targetId: string) => void;
  onSwitchToSpatial3D: () => void;
}

interface LayoutPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Cycle-safe, overlap-free isometric stage layout:
 * 1. Detects back-edges (loops) via 3-color DFS and excludes them from column ranking.
 * 2. Ranks the remaining DAG cleanly from Start -> End and compacts columns (0..K, zero empty gaps).
 * 3. Orders nodes within each column by parent barycenter to minimize crossings.
 * 4. Guarantees non-overlapping horizontal & vertical corridors on any process.
 */
export function computeIsometricLayout(
  nodes: ProcessNode[],
  edges: ProcessEdge[]
): Record<string, LayoutPos> {
  if (nodes.length === 0) return {};

  const nodeById = new Map<string, ProcessNode>();
  const adjAll = new Map<string, ProcessEdge[]>();
  for (const n of nodes) {
    nodeById.set(n.id, n);
    adjAll.set(n.id, []);
  }
  for (const e of edges) {
    if (nodeById.has(e.sourceNodeId) && nodeById.has(e.targetNodeId)) {
      adjAll.get(e.sourceNodeId)!.push(e);
    }
  }

  // 1. 3-color DFS to detect back-edges (cycles/loops)
  const color = new Map<string, 0 | 1 | 2>();
  const backEdgeIds = new Set<string>();
  const dfsVisit = (u: string) => {
    color.set(u, 1);
    for (const e of adjAll.get(u) || []) {
      const v = e.targetNodeId;
      const c = color.get(v) || 0;
      if (c === 1) {
        backEdgeIds.add(e.id);
      } else if (c === 0) {
        dfsVisit(v);
      }
    }
    color.set(u, 2);
  };

  const inDegAll = new Map<string, number>();
  for (const n of nodes) inDegAll.set(n.id, 0);
  for (const e of edges) {
    if (inDegAll.has(e.targetNodeId)) {
      inDegAll.set(e.targetNodeId, (inDegAll.get(e.targetNodeId) || 0) + 1);
    }
  }
  const orderedRoots = [
    ...nodes.filter((n) => n.type === 'start'),
    ...nodes.filter((n) => n.type !== 'start' && (inDegAll.get(n.id) || 0) === 0),
    ...nodes,
  ];
  for (const n of orderedRoots) {
    if ((color.get(n.id) || 0) === 0) {
      dfsVisit(n.id);
    }
  }

  // 2. Build guaranteed DAG & compute longest-path column rank via Kahn's algorithm
  const dagAdj = new Map<string, string[]>();
  const dagParents = new Map<string, string[]>();
  const dagInDeg = new Map<string, number>();
  for (const n of nodes) {
    dagAdj.set(n.id, []);
    dagParents.set(n.id, []);
    dagInDeg.set(n.id, 0);
  }
  for (const e of edges) {
    if (backEdgeIds.has(e.id)) continue;
    if (!nodeById.has(e.sourceNodeId) || !nodeById.has(e.targetNodeId)) continue;
    if (e.sourceNodeId === e.targetNodeId) continue;
    dagAdj.get(e.sourceNodeId)!.push(e.targetNodeId);
    dagParents.get(e.targetNodeId)!.push(e.sourceNodeId);
    dagInDeg.set(e.targetNodeId, (dagInDeg.get(e.targetNodeId) || 0) + 1);
  }

  const col = new Map<string, number>();
  const kahnQueue: string[] = [];
  for (const n of nodes) {
    if ((dagInDeg.get(n.id) || 0) === 0) {
      col.set(n.id, 0);
      kahnQueue.push(n.id);
    }
  }

  while (kahnQueue.length > 0) {
    const u = kahnQueue.shift()!;
    const uCol = col.get(u) || 0;
    for (const v of dagAdj.get(u) || []) {
      const candidate = uCol + 1;
      if ((col.get(v) ?? -1) < candidate) {
        col.set(v, candidate);
      }
      const nextDeg = (dagInDeg.get(v) || 1) - 1;
      dagInDeg.set(v, nextDeg);
      if (nextDeg === 0) {
        kahnQueue.push(v);
      }
    }
  }
  for (const n of nodes) {
    if (!col.has(n.id)) col.set(n.id, 0);
  }

  // 3. Compact column indices to 0..K so there are NEVER empty horizontal gaps
  const uniqueCols = Array.from(new Set(col.values())).sort((a, b) => a - b);
  const compactMap = new Map<number, number>();
  uniqueCols.forEach((rawCol, idx) => compactMap.set(rawCol, idx));

  const columns = new Map<number, ProcessNode[]>();
  for (const n of nodes) {
    const c = compactMap.get(col.get(n.id) || 0) || 0;
    if (!columns.has(c)) columns.set(c, []);
    columns.get(c)!.push(n);
  }

  // 4. Non-overlapping spacing + barycentric vertical ordering (works for any project & full labels)
  const NODE_W = 148;
  const NODE_H = 166;
  const COL_GAP = 300;
  const ROW_GAP = 218;
  const START_X = 80;
  const CENTER_Y = 270;

  const positions: Record<string, LayoutPos> = {};
  const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);

  for (const c of sortedCols) {
    const colNodes = columns.get(c)!;

    if (c > 0 && colNodes.length > 1) {
      colNodes.sort((a, b) => {
        const avgY = (id: string) => {
          const ps = (dagParents.get(id) || [])
            .map((pid) => positions[pid]?.y)
            .filter((v): v is number => v !== undefined);
          if (ps.length === 0) return CENTER_Y;
          return ps.reduce((s, v) => s + v, 0) / ps.length;
        };
        return avgY(a.id) - avgY(b.id);
      });
    }

    const totalH = (colNodes.length - 1) * ROW_GAP;
    const isoWave = colNodes.length === 1 ? (c % 2 === 0 ? 10 : -10) : 0;
    colNodes.forEach((node, idx) => {
      const x = START_X + c * COL_GAP;
      const y = CENTER_Y - totalH / 2 + idx * ROW_GAP - NODE_H / 2 + isoWave;
      positions[node.id] = { x, y, w: NODE_W, h: NODE_H };
    });
  }

  return positions;
}

interface Point2D {
  x: number;
  y: number;
}

function evalCubicBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number
): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

/**
 * Computes an obstacle-avoiding cubic Bézier ribbon path between two stations
 * and a guaranteed collision-free position for its edge label pill.
 */
export function computeEdgeRouteAndLabel(
  src: LayoutPos,
  tgt: LayoutPos,
  allPositions: LayoutPos[],
  fullLabel: string
): {
  isBackEdge: boolean;
  pathD: string;
  midPoint: Point2D;
  labelPoint: Point2D;
  pillW: number;
} {
  const isBackEdge = tgt.x <= src.x;
  const p0: Point2D = isBackEdge
    ? { x: src.x + src.w / 2, y: src.y + 8 }
    : { x: src.x + src.w - 14, y: src.y + 72 };
  const p3: Point2D = isBackEdge
    ? { x: tgt.x + tgt.w / 2, y: tgt.y + 8 }
    : { x: tgt.x + 14, y: tgt.y + 72 };

  let p1: Point2D;
  let p2: Point2D;

  if (isBackEdge) {
    const minSpanX = Math.min(src.x, tgt.x) - 20;
    const maxSpanX = Math.max(src.x + src.w, tgt.x + tgt.w) + 20;
    let topObstacleY = Math.min(src.y, tgt.y);
    for (const pos of allPositions) {
      if (pos.x + pos.w >= minSpanX && pos.x <= maxSpanX) {
        topObstacleY = Math.min(topObstacleY, pos.y);
      }
    }
    const arcY = topObstacleY - 72;
    p1 = { x: p0.x, y: arcY };
    p2 = { x: p3.x, y: arcY };
  } else {
    const spanX = p3.x - p0.x;
    const otherStations = allPositions.filter((pos) => pos !== src && pos !== tgt);

    const curveHitsObstacle = (cp1: Point2D, cp2: Point2D): boolean => {
      for (let i = 1; i <= 11; i++) {
        const pt = evalCubicBezier(p0, cp1, cp2, p3, i / 12);
        for (const pos of otherStations) {
          if (
            pt.x >= pos.x - 10 &&
            pt.x <= pos.x + pos.w + 10 &&
            pt.y >= pos.y - 26 &&
            pt.y <= pos.y + pos.h + 18
          ) {
            return true;
          }
        }
      }
      return false;
    };

    const dx = Math.max(48, Math.abs(spanX) * 0.45);
    p1 = { x: p0.x + dx, y: p0.y };
    p2 = { x: p3.x - dx, y: p3.y };

    if (curveHitsObstacle(p1, p2)) {
      const spanStations = otherStations.filter(
        (pos) => pos.x + pos.w > p0.x - 10 && pos.x < p3.x + 10
      );
      let minTopY = Math.min(src.y, tgt.y);
      let maxBotY = Math.max(src.y + src.h, tgt.y + tgt.h);
      for (const s of spanStations) {
        minTopY = Math.min(minTopY, s.y);
        maxBotY = Math.max(maxBotY, s.y + s.h);
      }

      const avgLineY = (p0.y + p3.y) / 2;
      const preferAbove = Math.abs(avgLineY - (minTopY - 90)) <= Math.abs(maxBotY + 90 - avgLineY);
      const offsets = [84, 136, 192, 248];
      const candidatesDetour: Array<{ cp1: Point2D; cp2: Point2D }> = [];
      for (const off of offsets) {
        const above = {
          cp1: { x: p0.x + spanX * 0.14, y: minTopY - off },
          cp2: { x: p3.x - spanX * 0.14, y: minTopY - off },
        };
        const below = {
          cp1: { x: p0.x + spanX * 0.14, y: maxBotY + off },
          cp2: { x: p3.x - spanX * 0.14, y: maxBotY + off },
        };
        if (preferAbove) {
          candidatesDetour.push(above, below);
        } else {
          candidatesDetour.push(below, above);
        }
      }

      let foundClear = false;
      for (const cand of candidatesDetour) {
        if (!curveHitsObstacle(cand.cp1, cand.cp2)) {
          p1 = cand.cp1;
          p2 = cand.cp2;
          foundClear = true;
          break;
        }
      }
      if (!foundClear && candidatesDetour.length > 0) {
        p1 = candidatesDetour[0].cp1;
        p2 = candidatesDetour[0].cp2;
      }
    }
  }

  const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  const midPoint = evalCubicBezier(p0, p1, p2, p3, 0.5);
  const pillW = Math.max(54, Math.ceil(fullLabel.length * 5.6 + 18));
  const pillH = 20;

  // Test candidate points along the real Bézier curve to guarantee zero overlap with any station box
  const candidates = [0.5, 0.34, 0.66, 0.24, 0.76];
  let labelPoint = midPoint;
  for (const t of candidates) {
    const pt = evalCubicBezier(p0, p1, p2, p3, t);
    const lx1 = pt.x - pillW / 2;
    const lx2 = pt.x + pillW / 2;
    const ly1 = pt.y - pillH / 2;
    const ly2 = pt.y + pillH / 2;

    const hitsAnyStation = allPositions.some(
      (pos) =>
        lx1 < pos.x + pos.w + 8 &&
        lx2 > pos.x - 8 &&
        ly1 < pos.y + pos.h + 18 &&
        ly2 > pos.y - 10
    );
    if (!hitsAnyStation) {
      labelPoint = pt;
      break;
    }
  }

  return { isBackEdge, pathD, midPoint, labelPoint, pillW };
}

export const AnimatedFinanceDiagram: React.FC<AnimatedFinanceDiagramProps> = ({
  nodes,
  edges,
  rules,
  onSwitchToSpatial3D,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(76);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const gsapTlRef = useRef<gsap.core.Timeline | null>(null);
  const progressProxyRef = useRef({ p: 0 });

  const totalPlaybackSec = Math.max(12, nodes.length * 3.5);
  const activeStepIndex = useMemo(() => {
    if (nodes.length === 0) return 0;
    return Math.min(nodes.length - 1, Math.floor(timelineProgress * nodes.length));
  }, [timelineProgress, nodes.length]);
  const activeNodeId = nodes[activeStepIndex]?.id || null;

  // GSAP Choreographed Timeline (smooth scrubbed walkthrough + staggered entrance)
  useGSAP(
    () => {
      if (nodes.length === 0) return;

      // Subtle staggered entrance of isometric stations
      const stationEls = rootRef.current?.querySelectorAll('[data-iso-station="true"]');
      if (stationEls && stationEls.length > 0) {
        gsap.fromTo(
          stationEls,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.42,
            stagger: 0.04,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          }
        );
      }

      progressProxyRef.current.p = 0;
      const tl = gsap.timeline({
        repeat: -1,
        paused: !isPlaying,
        onUpdate: () => {
          setTimelineProgress(progressProxyRef.current.p);
        },
      });
      tl.to(progressProxyRef.current, {
        p: 1,
        duration: totalPlaybackSec,
        ease: 'none',
      });
      tl.timeScale(speedMultiplier);
      gsapTlRef.current = tl;

      return () => {
        tl.kill();
        gsapTlRef.current = null;
      };
    },
    { scope: rootRef, dependencies: [nodes.length, totalPlaybackSec] }
  );

  // Sync Play/Pause & Speed with GSAP Timeline
  useEffect(() => {
    const tl = gsapTlRef.current;
    if (!tl) return;
    tl.timeScale(speedMultiplier);
    if (isPlaying) tl.play();
    else tl.pause();
  }, [isPlaying, speedMultiplier]);

  const handleScrubTimeline = (nextProgress: number) => {
    const clamped = Math.min(0.999, Math.max(0, nextProgress));
    progressProxyRef.current.p = clamped;
    setTimelineProgress(clamped);
    gsapTlRef.current?.progress(clamped);
  };

  const sceneCanvasRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<{
    dataUrl: string;
    fileName: string;
    dimensions: { width: number; height: number };
  } | null>(null);

  const panDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const positions = useMemo(() => computeIsometricLayout(nodes, edges), [nodes, edges]);

  // Identify bottleneck node (highest estimated duration >= 15 min)
  const bottleneckNodeId = useMemo(() => {
    let maxDur = 0;
    let id: string | null = null;
    for (const n of nodes) {
      if ((n.estimatedDurationMinutes || 0) > maxDur) {
        maxDur = n.estimatedDurationMinutes || 0;
        id = n.id;
      }
    }
    return maxDur >= 15 ? id : null;
  }, [nodes]);

  const totalDurationMinutes = useMemo(
    () => nodes.reduce((acc, n) => acc + (n.estimatedDurationMinutes || 0), 0),
    [nodes]
  );

  const contentBBox = useMemo(() => {
    const vals = Object.values(positions);
    if (vals.length === 0) {
      return { minX: 0, minY: 0, maxX: 900, maxY: 460 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pos of vals) {
      minX = Math.min(minX, pos.x - 24);
      minY = Math.min(minY, pos.y - 84);
      maxX = Math.max(maxX, pos.x + pos.w + 24);
      maxY = Math.max(maxY, pos.y + pos.h + 84);
    }
    return { minX, minY, maxX, maxY };
  }, [positions]);

  const canvasBounds = useMemo(() => {
    return {
      width: Math.max(960, contentBBox.maxX + 120),
      height: Math.max(520, contentBBox.maxY + 120),
    };
  }, [contentBBox]);

  const handleCaptureAnimated = useCallback(async () => {
    if (!sceneCanvasRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const exportW = Math.max(800, Math.ceil(canvasBounds.width));
      const exportH = Math.max(460, Math.ceil(canvasBounds.height));
      const pixelRatio = exportW > 3200 ? 1.5 : 2;

      const dataUrl = await toPng(sceneCanvasRef.current, {
        pixelRatio,
        width: exportW,
        height: exportH,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        style: {
          transform: 'none',
          width: `${exportW}px`,
          height: `${exportH}px`,
        },
      });

      setCaptureResult({
        dataUrl,
        fileName: `flux_animes_${new Date().toISOString().slice(0, 10)}.png`,
        dimensions: {
          width: Math.round(exportW * pixelRatio),
          height: Math.round(exportH * pixelRatio),
        },
      });
    } catch (err) {
      console.error('Animated diagram capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [canvasBounds.width, canvasBounds.height, isCapturing]);

  const fitToViewport = useCallback(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 120) return;

    const padX = 48;
    const padY = 48;
    const availW = Math.max(200, rect.width - padX);
    const availH = Math.max(180, rect.height - padY);
    const contentW = Math.max(200, contentBBox.maxX - contentBBox.minX);
    const contentH = Math.max(160, contentBBox.maxY - contentBBox.minY);

    const rawScale = Math.min(availW / contentW, availH / contentH);
    const clampedZoom = Math.round(Math.min(100, Math.max(32, rawScale * 100)));
    const s = clampedZoom / 100;

    const centeredX =
      padX / 2 + (availW - contentW * s) / 2 - contentBBox.minX * s;
    const centeredY =
      padY / 2 + (availH - contentH * s) / 2 - contentBBox.minY * s;

    setZoom(clampedZoom);
    setPan({ x: Math.round(centeredX), y: Math.round(centeredY) });
  }, [contentBBox]);

  useEffect(() => {
    const id = requestAnimationFrame(() => fitToViewport());
    return () => cancelAnimationFrame(id);
  }, [nodes.length, isFullscreen, fitToViewport]);

  // Sync native browser Fullscreen state & Escape key exit
  useEffect(() => {
    const onFsChange = () => {
      const activeEl = document.fullscreenElement;
      if (!activeEl) {
        setIsFullscreen(false);
      } else if (activeEl === rootRef.current) {
        setIsFullscreen(true);
      }
      requestAnimationFrame(() => fitToViewport());
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen, fitToViewport]);

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (el && typeof el.requestFullscreen === 'function') {
        try {
          await el.requestFullscreen();
        } catch {
          // Fallback to fixed viewport fullscreen already active via isFullscreen
        }
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignore exit error
        }
      }
    }
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    panDragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ds = panDragRef.current;
    if (!ds) return;
    setPan({
      x: ds.origX + (e.clientX - ds.startClientX),
      y: ds.origY + (e.clientY - ds.startClientY),
    });
  }, []);

  const handlePointerUp = () => {
    panDragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -8 : 8;
      setZoom((z) => Math.min(160, Math.max(30, z + delta)));
    }
  };

  return (
    <div
      ref={rootRef}
      data-testid="animated-finance-diagram"
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen'
          : 'flex-1 h-full relative'
      } flex flex-col overflow-hidden select-none bg-[#F8F8FA] ${
        !isPlaying ? 'iso-paused' : ''
      }`}
    >
      {/* Slim Top Bar (aligned with CurvedDiagram3D) */}
      <div className="h-11 px-4 border-b border-black/[0.07] bg-white/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-semibold text-[#6E6E73]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying ? 'bg-[#34C759]' : 'bg-[#FF9500]'
              }`}
            />
            <span>Durée totale · {totalDurationMinutes} min</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle back to Spatial 3D Diagram (right next to Zoom) */}
          <button
            type="button"
            onClick={onSwitchToSpatial3D}
            aria-pressed={true}
            title="Revenir au Diagramme BPMN"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer bg-[#1F93FF] text-white border-[#1F93FF] shadow-2xs hover:bg-[#007BE5]"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Flux animés</span>
          </button>

          {/* Zoom Slider */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#F5F5F7] border border-black/[0.07] px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#6E6E73]">
            <span>Zoom</span>
            <input
              type="range"
              min={30}
              max={160}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-20 accent-[#1F93FF] cursor-pointer"
              aria-label="Niveau de zoom du diagramme animé"
            />
          </div>

          {/* Play / Pause (Morphing Icon) */}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Mettre en pause les animations' : 'Reprendre les animations'}
            title={isPlaying ? 'Mettre en pause' : 'Reprendre'}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[11.5px] font-semibold text-[#1D1D1F] transition cursor-pointer"
          >
            <MorphPlayPauseIcon isPlaying={isPlaying} className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{isPlaying ? 'Pause' : 'Lecture'}</span>
          </button>

          {/* Center / Fit to Screen */}
          <button
            type="button"
            onClick={() => fitToViewport()}
            title="Centrer tout le diagramme dans l’écran"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[11.5px] font-semibold text-[#1D1D1F] transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#6E6E73]" />
            <span className="hidden md:inline">Centrer</span>
          </button>

          {/* Camera Capture HD Button (icon only) */}
          <button
            type="button"
            onClick={handleCaptureAnimated}
            disabled={isCapturing}
            aria-label="Capturer le flux animé en haute définition"
            title="Capturer le diagramme complet en HD (Copier / Imprimer / PNG)"
            className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer ${
              isCapturing
                ? 'bg-[#007AFF] text-white border-[#007AFF] animate-pulse'
                : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle (Morphing Icon) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Afficher en plein écran'}
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Afficher ce diagramme en plein écran'}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11.5px] font-semibold transition cursor-pointer ${
              isFullscreen
                ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] hover:bg-black'
                : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]'
            }`}
          >
            <MorphFullscreenIcon
              isFullscreen={isFullscreen}
              className={`w-3.5 h-3.5 shrink-0 ${isFullscreen ? 'text-white' : 'text-[#6E6E73]'}`}
            />
            <span className="hidden md:inline">
              {isFullscreen ? 'Quitter' : 'Plein écran'}
            </span>
          </button>
        </div>
      </div>

      {/* 100% Full-Screen Pure Isometric Visualization Canvas */}
      <div
        ref={stageContainerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={handleStagePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Subtle Isometric Diamond Grid */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-75"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="iso-diamond-grid"
              width="48"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M24 0 L48 14 L24 28 L0 14 Z"
                fill="none"
                stroke="#E4E4EA"
                strokeWidth="0.9"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#iso-diamond-grid)" />
        </svg>

        {/* Transformable Isometric Stage */}
        <div
          ref={sceneCanvasRef}
          className="origin-top-left relative"
          style={{
            width: canvasBounds.width,
            height: canvasBounds.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          }}
        >
          {/* SVG Layer: Tactile Isometric Ribbon Paths + Animated Characters/Objects */}
          <svg
            width={canvasBounds.width}
            height={canvasBounds.height}
            className="absolute inset-0 overflow-visible pointer-events-none"
          >
            {edges.map((edge) => {
              const src = positions[edge.sourceNodeId];
              const tgt = positions[edge.targetNodeId];
              if (!src || !tgt) return null;

              const srcNode = nodes.find((n) => n.id === edge.sourceNodeId);
              const tgtNode = nodes.find((n) => n.id === edge.targetNodeId);
              const flowType = inferFinanceFlowType(edge, srcNode, tgtNode);
              const meta = FINANCE_FLOW_TYPES[flowType];

              const fullEdgeLabel = (edge.label || edge.condition || '').trim();
              const { isBackEdge, pathD, midPoint, labelPoint, pillW } =
                computeEdgeRouteAndLabel(
                  src,
                  tgt,
                  Object.values(positions),
                  fullEdgeLabel
                );

              const pathId = `iso-finance-path-${edge.id}`;
              const isActiveEdge = Boolean(activeNodeId && edge.sourceNodeId === activeNodeId);
              const isGenericSuivant = /^suivant$/i.test(fullEdgeLabel);
              const showEdgePill =
                Boolean(fullEdgeLabel) &&
                !isGenericSuivant &&
                (srcNode?.type === 'decision' || isBackEdge || isActiveEdge);

              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isActiveEdge ? '#007AFF' : '#1D1D1F'}
                    strokeOpacity={isActiveEdge ? 0.9 : 0.4}
                    strokeWidth={isActiveEdge ? 14.5 : 13}
                    strokeLinecap="round"
                  />
                  <path
                    id={pathId}
                    d={pathD}
                    fill="none"
                    stroke={isActiveEdge ? '#EBF5FF' : meta.ribbonFill}
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isActiveEdge ? '#007AFF' : meta.color}
                    strokeOpacity={isActiveEdge ? 0.75 : 0.35}
                    strokeWidth={isActiveEdge ? 1.8 : 1.3}
                    strokeDasharray="5 5"
                    strokeLinecap="round"
                  />

                  {isPlaying ? (
                    <g>
                      <g transform="scale(0.84)">
                        <AnimatedFinanceCharacterSvg type={flowType} />
                      </g>
                      <animateMotion
                        dur={`${Math.max(1.6, Number((4.2 / speedMultiplier).toFixed(2)))}s`}
                        repeatCount="indefinite"
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </g>
                  ) : (
                    <g transform={`translate(${midPoint.x}, ${midPoint.y}) scale(0.84)`}>
                      <AnimatedFinanceCharacterSvg type={flowType} />
                    </g>
                  )}

                  {showEdgePill && (
                    <g transform={`translate(${labelPoint.x}, ${labelPoint.y})`}>
                      <rect
                        x={-pillW / 2}
                        y="-9.5"
                        width={pillW}
                        height="19"
                        rx="9.5"
                        fill="#FFFFFF"
                        stroke="#1D1D1F"
                        strokeWidth="1.15"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="#1D1D1F"
                      >
                        {fullEdgeLabel}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Illustrated Isometric Stations Layer (Pure Read-Only Visualization + Hover Tooltip) */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            const stationKind = inferIsometricStationKind(node);
            const isHovered = hoveredNodeId === node.id;
            const isActiveStep = node.id === activeNodeId;
            const isBottleneck = node.id === bottleneckNodeId;
            const nodeRulesCount = (node.ruleIds || []).filter((rid) =>
              rules.some((r) => r.id === rid)
            ).length;

            return (
              <div
                key={node.id}
                data-iso-station="true"
                data-testid={`finance-node-${node.id}`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: pos.w,
                }}
                className={`absolute flex flex-col items-center transition-transform duration-300 ${
                  isActiveStep ? '-translate-y-1 scale-[1.03]' : ''
                }`}
              >
                {/* Editorial Title ABOVE Station (full text, never truncated) */}
                <div className="mb-1 text-center w-full px-0.5">
                  <div className="text-[11.5px] font-bold text-[#1D1D1F] leading-snug">
                    {node.label}
                  </div>
                </div>

                {/* Illustrated Studio Volumetric Isometric Station SVG */}
                <IsometricStationSvg
                  kind={stationKind}
                  isHovered={isHovered}
                  isActiveStep={isActiveStep}
                  isBottleneck={isBottleneck}
                />

                {/* Color-coded Role / Status Pill BELOW Station (full text, crisp compact font) */}
                <div className="-mt-0.5 flex flex-col items-center gap-1">
                  {isBottleneck ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E5484D] text-white text-[9.5px] font-bold shadow-[0_4px_14px_rgba(229,72,77,0.32)] whitespace-nowrap">
                      {formatDuration(node.estimatedDurationMinutes)} · Goulot
                    </span>
                  ) : node.type === 'end' && stationKind === 'envelope' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E5484D] text-white text-[9.5px] font-bold shadow-[0_3px_10px_rgba(229,72,77,0.28)] whitespace-nowrap">
                      Refusé / Clôturé
                    </span>
                  ) : stationKind === 'vault' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#22A06B] text-white text-[9.5px] font-bold shadow-[0_3px_10px_rgba(34,160,107,0.28)] whitespace-nowrap">
                      {/prêt|pret|crédit|credit|offre/i.test(node.label)
                        ? 'Offre validée ✓'
                        : /virement|règlement|reglement|paiement|indemnis|sepa/i.test(
                            node.label
                          )
                        ? 'Virement validé ✓'
                        : 'Validé ✓'}
                    </span>
                  ) : isActiveStep && node.estimatedDurationMinutes > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF5FF] border border-[#007AFF]/45 text-[#0062CC] text-[9.5px] font-bold shadow-2xs whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse shrink-0" />
                      <span>En cours · {formatDuration(node.estimatedDurationMinutes)}</span>
                    </span>
                  ) : stationKind === 'database' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EFE8FF] border border-[#BBA5F8]/70 text-[#5B21B6] text-[9.5px] font-semibold shadow-2xs text-center leading-tight">
                      {node.application || 'API Automatisée'} · {formatDuration(node.estimatedDurationMinutes)}
                    </span>
                  ) : stationKind === 'workstation' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E1F0FF] border border-[#93C5FD]/70 text-[#0062CC] text-[9.5px] font-semibold shadow-2xs text-center leading-tight">
                      {node.ownerRole || 'Gestionnaire'} · {formatDuration(node.estimatedDurationMinutes)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F3EFE8] border border-black/[0.08] text-[#4A463F] text-[9.5px] font-semibold shadow-2xs text-center leading-tight">
                      {node.ownerRole || (node.type === 'start' ? 'Client' : 'Étape')} · {formatDuration(node.estimatedDurationMinutes)}
                    </span>
                  )}
                </div>

                {/* Discreet Hover Tooltip (zero modal / zero sidebar) */}
                {isHovered && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-40 w-56 bg-[#1D1D1F]/95 text-white rounded-xl px-3 py-2 shadow-xl pointer-events-none space-y-1">
                    <div className="text-[11.5px] font-semibold leading-snug">{node.label}</div>
                    <div className="text-[10.5px] text-white/75 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>{node.estimatedDurationMinutes || 0} min</span>
                      {node.ownerRole && <span>· {node.ownerRole}</span>}
                      {nodeRulesCount > 0 && <span>· {nodeRulesCount} RG</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Discreet Bottom-Left Legend Pill */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-full px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hidden sm:flex items-center gap-3.5 pointer-events-none">
          {(
            ['gestionnaire', 'dossier', 'virement', 'signal_si'] as FinanceFlowType[]
          ).map((ft) => (
            <span
              key={ft}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1D1D1F]"
            >
              <FlowLegendIcon type={ft} className="w-3.5 h-3.5 shrink-0" />
              <span>{FINANCE_FLOW_TYPES[ft].shortLabel}</span>
            </span>
          ))}
        </div>

        {/* Bottom-Center Translucent Apple HIG GSAP Timeline Scrubber Pill (positioned cleanly above MacDock) */}
        {nodes.length > 0 && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            data-testid="gsap-timeline-scrubber"
            className={`absolute ${
              isFullscreen ? 'bottom-5' : 'bottom-[92px]'
            } left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-full px-3.5 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.10)] flex items-center gap-3`}
          >
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pause timeline' : 'Lecture timeline'}
              className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-[#EBF5FF] text-[#1D1D1F] hover:text-[#007AFF] flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <MorphPlayPauseIcon isPlaying={isPlaying} className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col items-center gap-0.5 min-w-[160px] sm:min-w-[200px]">
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(timelineProgress * 1000)}
                onChange={(e) => handleScrubTimeline(Number(e.target.value) / 1000)}
                aria-label="Curseur de la timeline du processus"
                className="w-full h-1.5 accent-[#007AFF] cursor-pointer"
              />
              <div className="text-[10px] font-semibold text-[#6E6E73] tabular-nums">
                Étape {activeStepIndex + 1}/{nodes.length} ·{' '}
                {formatClockSeconds(timelineProgress * totalPlaybackSec)} /{' '}
                {formatClockSeconds(totalPlaybackSec)}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSpeedMultiplier((s) => (s === 0.5 ? 1 : s === 1 ? 1.5 : s === 1.5 ? 2 : 0.5))
              }
              title="Changer la cadence de lecture"
              className="px-2 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#EBF5FF] text-[#1D1D1F] hover:text-[#007AFF] text-[10.5px] font-bold transition cursor-pointer min-w-[34px] shrink-0"
            >
              {speedMultiplier}x
            </button>
          </div>
        )}
      </div>

      <DiagramCaptureModal
        isOpen={Boolean(captureResult)}
        onClose={() => setCaptureResult(null)}
        dataUrl={captureResult?.dataUrl || null}
        fileName={captureResult?.fileName || 'flux_animes.png'}
        modeLabel="Flux animés"
        dimensions={captureResult?.dimensions || null}
      />
    </div>
  );
};
