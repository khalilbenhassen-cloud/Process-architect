import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Folder,
  FolderKanban,
  Workflow,
  LayoutGrid,
  Calendar,
  Bell,
  Check,
  LogOut,
} from 'lucide-react';
import { Collaborator, ProcessSummary, Project } from '../../types/process';
import { MAC_CATEGORIES, MacAppTargetId } from './MacAppIcon';

interface MacTopBarProps {
  activeTarget: MacAppTargetId;
  onSelectTarget: (target: MacAppTargetId) => void;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  processes: ProcessSummary[];
  currentProcessId?: string;
  onSelectProcess: (processId: string) => void;
  collaborators: Collaborator[];
  activeCollaborator: Collaborator | null;
  onSwitchActiveCollaborator: (collab: Collaborator) => void;
  onUpdateCollaboratorStatus: (
    collabId: string,
    status: 'online' | 'busy' | 'offline'
  ) => void;
  onOpenMeetingModal: () => void;
  onOpenNewAgentModal: () => void;
  onLogout?: () => void;
}

export const MacTopBar: React.FC<MacTopBarProps> = ({
  activeTarget,
  onSelectTarget,
  projects,
  selectedProjectId,
  onSelectProject,
  processes,
  currentProcessId,
  onSelectProcess,
  collaborators,
  activeCollaborator,
  onSwitchActiveCollaborator,
  onUpdateCollaboratorStatus,
  onOpenMeetingModal,
  onOpenNewAgentModal,
  onLogout,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCategory = MAC_CATEGORIES.find((c) => c.id === activeTarget);
  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  const humanCollaborators = collaborators.filter((c) => !c.isAi);

  const presenceDotColor = (status?: string) => {
    if (status === 'online') return 'bg-[#30A46C]';
    if (status === 'busy') return 'bg-[#F76B15]';
    return 'bg-[#8B8D98]';
  };

  if (activeTarget === 'launchpad') {
    return (
      <div className="w-full px-5 sm:px-8 pt-3.5 pb-1 shrink-0 z-40 select-none">
        <header
          aria-label="Barre de menu Process Architect"
          className="w-full h-[50px] pl-3 pr-2.5 rounded-full bg-white/78 backdrop-blur-xl border border-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between"
        >
          {/* Left: App Squircle Icon + Process Architect */}
          <button
            type="button"
            onClick={() => onSelectTarget('launchpad')}
            className="apple-pressable flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
            title="Process Architect"
          >
            <span
              className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(31,130,255,0.32)]"
              style={{
                background: 'linear-gradient(145deg, #2AA8FF 0%, #1F78FF 52%, #4B4DED 100%)',
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="3.2"
                  y="3.2"
                  width="5.2"
                  height="5.2"
                  rx="1.3"
                  stroke="white"
                  strokeWidth="1.7"
                />
                <rect
                  x="11.6"
                  y="11.6"
                  width="5.2"
                  height="5.2"
                  rx="1.3"
                  stroke="white"
                  strokeWidth="1.7"
                />
                <path
                  d="M8.4 5.8H10.2V14.2H11.6"
                  stroke="white"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[14px] font-bold text-[#1C2024] apple-title-tracking">
              Process Architect
            </span>
          </button>

          {/* Right: Bell Icon Button + Blue Avatar Circle */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="apple-pressable w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-black/[0.05] shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex items-center justify-center text-[#3A3F45] transition cursor-pointer"
            >
              <Bell className="w-[14.5px] h-[14.5px] stroke-[1.8]" />
            </button>

            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="Profil utilisateur"
              title={activeCollaborator?.name || 'Khalil Benhassen'}
              className="apple-pressable w-8 h-8 rounded-full text-white text-[11px] font-bold tracking-tight flex items-center justify-center shadow-[0_2px_6px_rgba(0,136,255,0.28)] hover:brightness-105 transition cursor-pointer"
              style={{ backgroundColor: activeCollaborator?.avatarColor || '#0088FF' }}
            >
              {activeCollaborator?.avatarInitials || 'KB'}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-11 w-64 bg-white border border-[#DFE3E6] rounded-xl shadow-xl p-2.5 z-50 space-y-2">
                <div className="px-2 py-0.5 text-[10.5px] font-cw-620 text-[#8B8D98] uppercase tracking-wider">
                  Mon statut de présence
                </div>
                <div className="flex items-center gap-1">
                  {(['online', 'busy', 'offline'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        if (activeCollaborator) {
                          onUpdateCollaboratorStatus(activeCollaborator.id, st);
                        }
                      }}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-cw-520 flex items-center justify-center gap-1 border transition ${
                        activeCollaborator?.presenceStatus === st
                          ? 'border-[#1F93FF] bg-[#EBF5FF] text-[#1F93FF]'
                          : 'border-[#ECEEF0] text-[#60646C] hover:bg-[#F2F3F7]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${presenceDotColor(st)}`} />
                      <span>
                        {st === 'online' ? 'En ligne' : st === 'busy' ? 'Occupé' : 'Absent'}
                      </span>
                    </button>
                  ))}
                </div>

                {onLogout ? (
                  <div className="pt-1.5 border-t border-[#ECEEF0]">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-[12px] font-semibold transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="px-2 pt-1.5 text-[10.5px] font-cw-620 text-[#8B8D98] uppercase tracking-wider border-t border-[#ECEEF0]">
                      Intervenant actif
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {humanCollaborators.map((hc) => (
                        <button
                          key={hc.id}
                          type="button"
                          onClick={() => {
                            onSwitchActiveCollaborator(hc);
                            setUserMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg hover:bg-[#F2F3F7] flex items-center justify-between text-left text-[12px]"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="w-5 h-5 rounded-full text-white text-[10px] font-cw-620 flex items-center justify-center shrink-0"
                              style={{ backgroundColor: hc.avatarColor }}
                            >
                              {hc.avatarInitials}
                            </span>
                            <span className="truncate font-cw-520 text-[#1C2024]">{hc.name}</span>
                          </span>
                          {activeCollaborator?.id === hc.id && (
                            <Check className="w-3.5 h-3.5 text-[#1F93FF] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>
      </div>
    );
  }

  return (
    <header
      aria-label="Barre de menu Process Architect"
      className="relative h-[42px] px-4 apple-glass-topbar flex items-center justify-between gap-3 shrink-0 z-50 select-none"
    >
      {/* Left: Brand + Active Module Breadcrumb + Project Dropdown on Conversations */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => onSelectTarget('launchpad')}
          className="apple-pressable flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/5 transition text-left"
          title="Retourner au Menu Central (Launchpad)"
        >
          <span className="w-6 h-6 rounded-[6px] bg-[#1F93FF] text-white font-cw-620 text-[11px] flex items-center justify-center shadow-2xs">
            PA
          </span>
          <span className="text-[13px] font-cw-620 text-[#1C2024] apple-title-tracking">
            Process Architect
          </span>
        </button>

        <span className="text-[#DFE3E6]">/</span>
        <button
          type="button"
          onClick={() => onSelectTarget('launchpad')}
          className="apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EBF5FF] text-[#1F93FF] text-[12px] font-cw-620 hover:bg-[#DDF0FF] transition shrink-0"
          title="Afficher toutes les catégories au centre (Launchpad)"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{activeCategory?.title || 'Menu Central'}</span>
        </button>

        {/* Studio-synced Project-only dropdown on Conversations (each project has its own exchanges) */}
        {activeTarget === 'conversations' && projects.length > 0 && (
          <>
            <span className="hidden sm:inline text-[#DFE3E6]">/</span>
            <div ref={projectMenuRef} className="hidden sm:block relative min-w-0">
              <button
                type="button"
                aria-label="Projet actif pour les échanges"
                onClick={() => setProjectMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-black/5 transition cursor-pointer text-[#6E6E73] hover:text-[#1D1D1F] min-w-0"
                title="Choisir le projet dont vous souhaitez afficher les échanges"
              >
                <Folder className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                <span className="text-[12.5px] font-medium truncate max-w-[200px]">
                  {activeProject?.name?.split('—')[0].trim() || 'Projet actif'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
              </button>

              {projectMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/[0.08] py-1.5 text-xs text-[#1D1D1F] z-50">
                  <div className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Projets disponibles
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {projects.map((p) => {
                      const isSelected = p.id === (selectedProjectId || activeProject?.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(p.id);
                            setProjectMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#EBF5FF] text-[#1F93FF] font-semibold'
                              : 'text-[#1D1D1F] font-medium'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#1F93FF] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Center: CRM Context Pill (Hidden on global screens & Conversations which uses the left Studio-style project dropdown) */}
      {activeTarget !== 'projects' &&
        activeTarget !== 'teams' &&
        activeTarget !== 'settings' &&
        activeTarget !== 'agenda' &&
        activeTarget !== 'ai_agents' &&
        activeTarget !== 'conversations' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-[#DFE3E6] shadow-2xs text-[12px]">
            <div className="flex items-center gap-1 text-[#60646C]">
              <FolderKanban className="w-3.5 h-3.5 text-[#1F93FF]" />
              <select
                aria-label="Projet actif"
                value={selectedProjectId || ''}
                onChange={(e) => onSelectProject(e.target.value || null)}
                className="bg-transparent font-cw-520 text-[#1C2024] focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="">Tous les projets</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[#DFE3E6] px-0.5">→</span>

            <div className="flex items-center gap-1 text-[#60646C]">
              <Workflow className="w-3.5 h-3.5 text-[#7C3AED]" />
              <select
                aria-label="Processus actif"
                value={currentProcessId || ''}
                onChange={(e) => {
                  if (e.target.value) onSelectProcess(e.target.value);
                }}
                className="bg-transparent font-cw-520 text-[#1C2024] focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                {processes.map((proc) => (
                  <option key={proc.id} value={proc.id}>
                    {proc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

      {/* Right: Quick Actions + Active Collaborator Status */}
      <div className="flex items-center gap-2 shrink-0 relative">
        {activeTarget !== 'agenda' && activeTarget !== 'ai_agents' && (
          <button
            type="button"
            onClick={onOpenMeetingModal}
            className="apple-pressable hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#DFE3E6] bg-white hover:bg-[#FAFAFA] text-[11.5px] font-cw-520 text-[#1C2024] transition"
            title="Planifier une réunion synchronisée avec Microsoft Outlook"
          >
            <Calendar className="w-3.5 h-3.5 text-[#1F93FF]" />
            <span>Réunion Outlook</span>
          </button>
        )}

        {/* Active Collaborator Menu */}
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="apple-pressable flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/5 transition"
        >
          <div className="relative">
            <div
              className="w-6 h-6 rounded-full text-white text-[10.5px] font-cw-620 flex items-center justify-center"
              style={{ backgroundColor: activeCollaborator?.avatarColor || '#1F93FF' }}
            >
              {activeCollaborator?.avatarInitials || 'KB'}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${presenceDotColor(
                activeCollaborator?.presenceStatus
              )}`}
            />
          </div>
          <span className="text-[12px] font-cw-520 text-[#1C2024] hidden sm:inline max-w-[130px] truncate">
            {activeCollaborator?.name || 'Khalil Benhassen'}
          </span>
          <ChevronDown className="w-3 h-3 text-[#8B8D98]" />
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-10 w-64 bg-white border border-[#DFE3E6] rounded-xl shadow-xl p-2.5 z-50 space-y-2">
            <div className="px-2 py-0.5 text-[10.5px] font-cw-620 text-[#8B8D98] uppercase tracking-wider">
              Mon statut de présence
            </div>
            <div className="flex items-center gap-1">
              {(['online', 'busy', 'offline'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (activeCollaborator) {
                      onUpdateCollaboratorStatus(activeCollaborator.id, st);
                    }
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-cw-520 flex items-center justify-center gap-1 border transition ${
                    activeCollaborator?.presenceStatus === st
                      ? 'border-[#1F93FF] bg-[#EBF5FF] text-[#1F93FF]'
                      : 'border-[#ECEEF0] text-[#60646C] hover:bg-[#F2F3F7]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${presenceDotColor(st)}`} />
                  <span>{st === 'online' ? 'En ligne' : st === 'busy' ? 'Occupé' : 'Absent'}</span>
                </button>
              ))}
            </div>

            {onLogout ? (
              <div className="pt-1.5 border-t border-[#ECEEF0]">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-[12px] font-semibold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            ) : (
              <>
                <div className="px-2 pt-1.5 text-[10.5px] font-cw-620 text-[#8B8D98] uppercase tracking-wider border-t border-[#ECEEF0]">
                  Intervenant actif
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {humanCollaborators.map((hc) => (
                    <button
                      key={hc.id}
                      type="button"
                      onClick={() => {
                        onSwitchActiveCollaborator(hc);
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg hover:bg-[#F2F3F7] flex items-center justify-between text-left text-[12px]"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-5 h-5 rounded-full text-white text-[10px] font-cw-620 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: hc.avatarColor }}
                        >
                          {hc.avatarInitials}
                        </span>
                        <span className="truncate font-cw-520 text-[#1C2024]">{hc.name}</span>
                      </span>
                      {activeCollaborator?.id === hc.id && (
                        <Check className="w-3.5 h-3.5 text-[#1F93FF] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
