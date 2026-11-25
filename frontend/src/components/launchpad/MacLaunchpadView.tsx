import React from 'react';
import {
  Collaborator,
  Conversation,
  Meeting,
  Process,
  Project,
} from '../../types/process';
import {
  MAC_CATEGORIES,
  MacAppIcon,
  MacCategoryId,
} from './MacAppIcon';

interface MacLaunchpadViewProps {
  onSelectCategory: (categoryId: MacCategoryId) => void;
  activeCollaborator: Collaborator | null;
  collaborators: Collaborator[];
  conversations: Conversation[];
  projects: Project[];
  meetings: Meeting[];
  currentProcess: Process | null;
  onStartDirectAgentChat: (agent: Collaborator) => void;
}

export const MacLaunchpadView: React.FC<MacLaunchpadViewProps> = ({
  onSelectCategory,
  activeCollaborator,
  collaborators,
  conversations,
  projects,
  meetings,
  currentProcess,
}) => {
  const aiAgents = collaborators.filter((c) => c.isAi);
  const humanCount = collaborators.filter((c) => !c.isAi).length;
  const openConvCount = conversations.filter((c) => c.status === 'open').length;
  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const getBadgeForCategory = (catId: MacCategoryId) => {
    switch (catId) {
      case 'conversations':
        return {
          count: unreadTotal > 0 ? unreadTotal : openConvCount,
          color: (unreadTotal > 0 ? 'red' : 'blue') as 'red' | 'blue' | 'emerald',
          onlineDot: false,
        };
      case 'ai_agents':
        return {
          count: aiAgents.length,
          color: 'emerald' as const,
          onlineDot: true,
        };
      case 'studio':
        return {
          count: currentProcess?.businessRules?.length || 0,
          color: 'blue' as const,
          onlineDot: false,
        };
      case 'projects':
        return {
          count: projects.length,
          color: 'blue' as const,
          onlineDot: false,
        };
      case 'agenda':
        return {
          count: meetings.length,
          color: 'blue' as const,
          onlineDot: false,
        };
      case 'teams':
        return {
          count: humanCount,
          color: 'emerald' as const,
          onlineDot: false,
        };
      default:
        return { count: 0, color: 'blue' as const, onlineDot: false };
    }
  };

  const firstName = (activeCollaborator?.name || 'Khalil').split(' ')[0];
  const rawDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <main
      aria-label="Menu Central Process Architect"
      className="flex-1 w-full h-full overflow-y-auto bg-transparent flex flex-col items-center justify-start pt-8 sm:pt-12 pb-8 px-6 select-none apple-launchpad-enter"
    >
      {/* Top Greeting (Left-aligned with Date of the day above) */}
      <div className="w-full max-w-5xl text-left mb-11 pl-2 sm:pl-6">
        <p className="text-[13.5px] font-medium text-[#6E6E73] mb-1">
          {formattedDate}
        </p>
        <h1 className="text-[34px] sm:text-[42px] font-bold text-[#1D1D1F] tracking-tight leading-tight">
          Bonjour {firstName}
        </h1>
      </div>

      {/* Central Grid of 7 Large Square Illustrated macOS Icons */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-10 gap-y-12 justify-items-center">
          {MAC_CATEGORIES.map((cat) => {
            const badge = getBadgeForCategory(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`launchpad-card-${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className="apple-pressable group flex flex-col items-center text-center max-w-[200px] focus:outline-none"
              >
                <div className="transform group-hover:-translate-y-2 group-hover:scale-[1.05] transition-transform duration-200 ease-out">
                  <MacAppIcon
                    categoryId={cat.id}
                    size="large"
                    badgeCount={badge.count}
                    badgeColor={badge.color}
                    showOnlineDot={badge.onlineDot}
                  />
                </div>
                <span className="mt-3.5 text-[15px] font-cw-620 text-[#1C2024] group-hover:text-[#1F93FF] transition apple-body-tracking">
                  {cat.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
};

