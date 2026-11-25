import React from 'react';

export type MacCategoryId =
  | 'conversations'
  | 'ai_agents'
  | 'studio'
  | 'projects'
  | 'agenda'
  | 'teams'
  | 'settings';

export type MacAppTargetId = 'launchpad' | MacCategoryId;

export interface MacCategoryDefinition {
  id: MacCategoryId;
  title: string;
  shortTitle: string;
  subtitle: string;
}

export const MAC_CATEGORIES: MacCategoryDefinition[] = [
  {
    id: 'conversations',
    title: 'Conversations & Notes',
    shortTitle: 'Échanges',
    subtitle: 'Échanges d’équipe, Notes Privées 🔒 & mentions @Agent',
  },
  {
    id: 'ai_agents',
    title: 'Agents IA Collaborateurs',
    shortTitle: 'Agents IA',
    subtitle: '5 Agents IA spécialisés + Création & configuration sur mesure',
  },
  {
    id: 'studio',
    title: 'Studio BPMN, Règles & QA',
    shortTitle: 'Studio',
    subtitle: 'Modélisation des flux, Règles (RG-*), Simulation & Audit QA',
  },
  {
    id: 'projects',
    title: 'Projets & Processus',
    shortTitle: 'Projets',
    subtitle: 'Projets, processus BPMN, comparateur & jalons d’approbation',
  },
  {
    id: 'agenda',
    title: 'Agenda & Outlook',
    shortTitle: 'Agenda',
    subtitle: 'Réunions d’équipe & Synchronisation Microsoft Outlook 365',
  },
  {
    id: 'teams',
    title: 'Équipes & Intervenants',
    shortTitle: 'Équipes',
    subtitle: 'Annuaire des collaborateurs humains, équipes & présences',
  },
  {
    id: 'settings',
    title: 'Paramètres & Tags',
    shortTitle: 'Paramètres',
    subtitle: 'Catégories, Tags carrés colorés (■) & Espace Vierge',
  },
];

interface MacAppIconProps {
  categoryId: MacAppTargetId;
  size?: 'large' | 'dock';
  badgeCount?: number;
  badgeColor?: 'red' | 'blue' | 'emerald';
  showOnlineDot?: boolean;
}

export const MacAppIcon: React.FC<MacAppIconProps> = ({
  categoryId,
  size = 'large',
  showOnlineDot = false,
}) => {
  const isLarge = size === 'large';
  const boxClass = isLarge
    ? 'w-[132px] h-[132px] apple-squircle'
    : 'w-[48px] h-[48px] apple-squircle-dock';

  const renderIllustration = () => {
    switch (categoryId) {
      case 'launchpad':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="lpBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#EEF2F6" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#lpBg)" />
            {/* 3x3 colorful macOS Launchpad mini-squares */}
            <rect x="20" y="20" width="16" height="16" rx="4.5" fill="#1F93FF" />
            <rect x="42" y="20" width="16" height="16" rx="4.5" fill="#7C3AED" />
            <rect x="64" y="20" width="16" height="16" rx="4.5" fill="#10B981" />
            <rect x="20" y="42" width="16" height="16" rx="4.5" fill="#F59E0B" />
            <rect x="42" y="42" width="16" height="16" rx="4.5" fill="#0078D4" />
            <rect x="64" y="42" width="16" height="16" rx="4.5" fill="#EC4899" />
            <rect x="20" y="64" width="16" height="16" rx="4.5" fill="#6366F1" />
            <rect x="42" y="64" width="16" height="16" rx="4.5" fill="#14B8A6" />
            <rect x="64" y="64" width="16" height="16" rx="4.5" fill="#64748B" />
          </svg>
        );

      case 'conversations':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="convBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#EBF5FF" />
              </linearGradient>
              <linearGradient id="bubbleBack" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#60B6FF" />
                <stop offset="100%" stopColor="#1F93FF" />
              </linearGradient>
              <linearGradient id="bubbleFront" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1F93FF" />
                <stop offset="100%" stopColor="#0066CC" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#convBg)" />
            {/* Secondary bubble */}
            <path
              d="M36 32h38c5.5 0 10 4.5 10 10v16c0 5.5-4.5 10-10 10h-6l-8 9-2-9H36c-5.5 0-10-4.5-10-10V42c0-5.5 4.5-10 10-10z"
              fill="url(#bubbleBack)"
              opacity="0.88"
            />
            {/* Primary foreground chat bubble */}
            <path
              d="M22 22h42c6 0 11 5 11 11v18c0 6-5 11-11 11H38l-11 10 1.5-10H22c-6 0-11-5-11-11V33c0-6 5-11 11-11z"
              fill="url(#bubbleFront)"
            />
            {/* Typing dots */}
            <circle cx="33" cy="42" r="3.6" fill="#FFFFFF" />
            <circle cx="43" cy="42" r="3.6" fill="#FFFFFF" />
            <circle cx="53" cy="42" r="3.6" fill="#FFFFFF" />
            {/* Private note mini amber badge */}
            <rect x="58" y="56" width="24" height="18" rx="5" fill="#FFF6D6" stroke="#F3E29F" strokeWidth="1.5" />
            <circle cx="70" cy="65" r="3.5" fill="#D97706" />
          </svg>
        );

      case 'ai_agents':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="aiBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F5F3FF" />
                <stop offset="100%" stopColor="#E0E7FF" />
              </linearGradient>
              <linearGradient id="robotGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="55%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#1F93FF" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#aiBg)" />
            {/* Sparkles */}
            <path d="M22 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#8B5CF6" />
            <path d="M78 20l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#1F93FF" />
            {/* Antenna */}
            <line x1="50" y1="16" x2="50" y2="27" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="14" r="4.5" fill="#1F93FF" />
            {/* Robot Head */}
            <rect x="24" y="26" width="52" height="42" rx="16" fill="url(#robotGrad)" />
            {/* Visor */}
            <rect x="31" y="35" width="38" height="22" rx="9" fill="#1E1B4B" />
            {/* Glowing Eyes */}
            <circle cx="42" cy="46" r="4.2" fill="#38BDF8" />
            <circle cx="58" cy="46" r="4.2" fill="#38BDF8" />
            {/* Robot Shoulders / AI Badge */}
            <path d="M32 72h36c5 0 9 4 9 9v5H23v-5c0-5 4-9 9-9z" fill="url(#robotGrad)" opacity="0.9" />
            <text x="50" y="83" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
              IA
            </text>
          </svg>
        );

      case 'studio':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="stBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F1F5F9" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#stBg)" />
            {/* Connectors */}
            <path
              d="M30 28 H52 V48 M52 50 H74 M52 52 V74 H34"
              fill="none"
              stroke="#64748B"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Start circle */}
            <circle cx="24" cy="28" r="9" fill="#10B981" />
            {/* Task node */}
            <rect x="42" y="19" width="22" height="18" rx="5" fill="#1F93FF" />
            {/* Decision gateway diamond */}
            <polygon points="52,39 63,50 52,61 41,50" fill="#F59E0B" />
            {/* End circle */}
            <circle cx="76" cy="50" r="9" fill="#EF4444" />
            {/* Integrated RG & QA Governance Shield */}
            <path
              d="M28 60 L42 65 V74 C42 82 35 87 28 90 C21 87 14 82 14 74 V65 Z"
              fill="#1F93FF"
            />
            <path
              d="M23 74 l3.5 3.5 l6.5 -7"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'projects':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="prBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#FEF3C7" />
              </linearGradient>
              <linearGradient id="folderGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#prBg)" />
            {/* Back Kanban Card */}
            <rect x="36" y="18" width="44" height="52" rx="7" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
            <rect x="42" y="25" width="14" height="8" rx="2" fill="#10B981" />
            <rect x="60" y="25" width="14" height="8" rx="2" fill="#1F93FF" />
            {/* Front Folder */}
            <path
              d="M16 36c0-3.3 2.7-6 6-6h16l6 6h24c3.3 0 6 2.7 6 6v30c0 3.3-2.7 6-6 6H22c-3.3 0-6-2.7-6-6V36z"
              fill="url(#folderGrad)"
            />
            {/* Approval Checkmark Badge */}
            <circle cx="68" cy="68" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="3" />
            <path
              d="M62 68l4 4 8-8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'agenda':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="agBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E0F2FE" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#agBg)" />
            {/* Calendar Sheet */}
            <rect x="18" y="20" width="54" height="56" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
            <path d="M18 30c0-5.5 4.5-10 10-10h34c5.5 0 10 4.5 10 10v6H18v-6z" fill="#EF4444" />
            {/* Calendar grid dots */}
            <circle cx="30" cy="46" r="3" fill="#94A3B8" />
            <circle cx="45" cy="46" r="3" fill="#1F93FF" />
            <circle cx="60" cy="46" r="3" fill="#94A3B8" />
            <circle cx="30" cy="58" r="3" fill="#94A3B8" />
            <circle cx="45" cy="58" r="3" fill="#94A3B8" />
            {/* Microsoft Outlook Blue Badge */}
            <rect x="46" y="48" width="36" height="32" rx="8" fill="#0078D4" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x="64" y="69" textAnchor="middle" fill="#FFFFFF" fontSize="17" fontWeight="800">
              O
            </text>
          </svg>
        );

      case 'teams':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="tmBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#ECFDF5" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#tmBg)" />
            {/* Connection Ring */}
            <circle cx="50" cy="50" r="24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="4 4" />
            {/* Top Member */}
            <circle cx="50" cy="24" r="11" fill="#1F93FF" />
            <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">
              KB
            </text>
            {/* Bottom Left Member */}
            <circle cx="27" cy="64" r="11" fill="#10B981" />
            <text x="27" y="68" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">
              TM
            </text>
            {/* Bottom Right Member */}
            <circle cx="73" cy="64" r="11" fill="#F59E0B" />
            <text x="73" y="68" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">
              SB
            </text>
            {/* Center Hub */}
            <circle cx="50" cy="52" r="13" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle cx="59" cy="60" r="4" fill="#30A46C" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        );

      case 'settings':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="setBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F1F5F9" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#setBg)" />
            {/* Control panel card */}
            <rect x="16" y="22" width="44" height="56" rx="9" fill="#E2E8F0" />
            <line x1="24" y1="36" x2="52" y2="36" stroke="#64748B" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="34" cy="36" r="5" fill="#1F93FF" />
            <line x1="24" y1="50" x2="52" y2="50" stroke="#64748B" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="44" cy="50" r="5" fill="#1F93FF" />
            <line x1="24" y1="64" x2="52" y2="64" stroke="#64748B" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="30" cy="64" r="5" fill="#1F93FF" />
            {/* Colored Square Tags (Chatwoot ■) */}
            <rect x="66" y="24" width="20" height="20" rx="5" fill="#F59E0B" />
            <rect x="66" y="54" width="20" height="20" rx="5" fill="#EC4899" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative select-none ${boxClass} bg-white overflow-visible`}>
      <div className="w-full h-full overflow-hidden rounded-[22.5%]">{renderIllustration()}</div>

      {/* Bottom-right Online Presence Indicator */}
      {showOnlineDot && (
        <span
          className={`absolute ${
            isLarge ? 'bottom-1.5 right-1.5 w-3.5 h-3.5' : 'bottom-0.5 right-0.5 w-2.5 h-2.5'
          } rounded-full bg-[#30A46C] ring-2 ring-white shadow-xs`}
          title="Agents IA en ligne"
        />
      )}
    </div>
  );
};
