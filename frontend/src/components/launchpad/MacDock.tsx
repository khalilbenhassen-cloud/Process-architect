import React from 'react';
import {
  MAC_CATEGORIES,
  MacAppIcon,
  MacAppTargetId,
  MacCategoryId,
} from './MacAppIcon';

interface MacDockProps {
  activeTarget: MacAppTargetId;
  onSelectTarget: (target: MacAppTargetId) => void;
  unreadConversationsCount: number;
  aiAgentsCount: number;
  rulesCount: number;
  projectsCount: number;
  meetingsCount: number;
  humanCollaboratorsCount: number;
}

export const MacDock: React.FC<MacDockProps> = ({
  activeTarget,
  onSelectTarget,
  unreadConversationsCount,
  aiAgentsCount,
  rulesCount,
  projectsCount,
  meetingsCount,
  humanCollaboratorsCount,
}) => {
  if (activeTarget === 'launchpad') {
    return null;
  }

  const getBadge = (catId: MacCategoryId) => {
    switch (catId) {
      case 'conversations':
        return {
          count: unreadConversationsCount,
          color: 'red' as const,
          onlineDot: false,
        };
      case 'ai_agents':
        return {
          count: aiAgentsCount,
          color: 'emerald' as const,
          onlineDot: true,
        };
      case 'studio':
        return {
          count: rulesCount,
          color: 'blue' as const,
          onlineDot: false,
        };
      case 'projects':
        return {
          count: projectsCount,
          color: 'blue' as const,
          onlineDot: false,
        };
      case 'agenda':
        return {
          count: meetingsCount,
          color: 'blue' as const,
          onlineDot: false,
        };
      case 'teams':
        return {
          count: humanCollaboratorsCount,
          color: 'emerald' as const,
          onlineDot: false,
        };
      default:
        return { count: 0, color: 'blue' as const, onlineDot: false };
    }
  };

  return (
    <nav
      data-testid="mac-dock"
      aria-label="Dock macOS Process Architect"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 rounded-[24px] apple-glass-dock flex items-end gap-2.5 select-none"
    >
      {/* 0. Launchpad / Menu Central Icon */}
      <button
        type="button"
        data-testid="dock-item-launchpad"
        onClick={() => onSelectTarget('launchpad')}
        title="Menu Central (Afficher les grandes icônes)"
        className="apple-pressable group relative flex flex-col items-center focus:outline-none"
      >
        <div className="transform group-hover:-translate-y-2 group-hover:scale-110 transition-transform duration-200 ease-out">
          <MacAppIcon categoryId="launchpad" size="dock" />
        </div>
        <span className="mt-1 text-[10.5px] font-cw-520 text-[#60646C] group-hover:text-[#1C2024] apple-caption-tracking">
          Menu
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-0.5" />
      </button>

      {/* macOS Dock Divider */}
      <div className="h-10 w-[1px] bg-[#DFE3E6] mx-0.5 self-center" />

      {/* 1..7 Category Icons */}
      {MAC_CATEGORIES.map((cat) => {
        const isActive = activeTarget === cat.id;
        const badge = getBadge(cat.id);

        return (
          <button
            key={cat.id}
            type="button"
            data-testid={`dock-item-${cat.id}`}
            onClick={() => onSelectTarget(cat.id)}
            title={`${cat.title} — ${cat.subtitle}`}
            className="apple-pressable group relative flex flex-col items-center focus:outline-none min-w-[54px]"
          >
            {/* Floating macOS Hover Pill Tooltip */}
            <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -top-9 px-2.5 py-1 rounded-lg bg-[#1C2024]/90 text-white text-[11px] font-cw-520 whitespace-nowrap shadow-md">
              {cat.title}
            </span>

            <div
              className={`transform transition-transform duration-200 ease-out ${
                isActive
                  ? '-translate-y-1 scale-105'
                  : 'group-hover:-translate-y-2 group-hover:scale-110'
              }`}
            >
              <MacAppIcon
                categoryId={cat.id}
                size="dock"
                badgeCount={badge.count}
                badgeColor={badge.color}
                showOnlineDot={badge.onlineDot}
              />
            </div>

            <span
              className={`mt-1 text-[10.5px] apple-caption-tracking whitespace-nowrap ${
                isActive
                  ? 'font-cw-620 text-[#1F93FF]'
                  : 'font-cw-520 text-[#60646C] group-hover:text-[#1C2024]'
              }`}
            >
              {cat.shortTitle}
            </span>

            {/* macOS Active App Dot Indicator */}
            <span
              className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
                isActive ? 'bg-[#1F93FF] scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
};
