import React, { useState } from 'react';
import {
  Inbox,
  MessageSquare,
  FolderKanban,
  Workflow,
  Users,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Bot,
  Hash,
  Search,
  RotateCcw,
  FileText,
  ShieldCheck,
  BookOpen,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  Category,
  Collaborator,
  Conversation,
  Meeting,
  ProcessSummary,
  Project,
  TagItem,
  Team,
} from '../../types/process';

export type WorkspaceSection =
  | 'inbox'
  | 'conversations'
  | 'projects'
  | 'studio'
  | 'teams'
  | 'agenda'
  | 'settings';

export type ConversationSidebarFilter = {
  mode: 'all' | 'mentions' | 'unattended' | 'project' | 'agent' | 'team' | 'tag';
  value?: string;
};

interface AppSidebarProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  conversationFilter: ConversationSidebarFilter;
  onSelectConversationFilter: (filter: ConversationSidebarFilter) => void;
  projects: Project[];
  processes: ProcessSummary[];
  currentProcessId?: string;
  selectedProjectId?: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectProcess: (processId: string) => void;
  categories: Category[];
  tags: TagItem[];
  teams: Team[];
  collaborators: Collaborator[];
  conversations: Conversation[];
  meetings: Meeting[];
  activeCollaborator: Collaborator | null;
  onSwitchActiveCollaborator: (collab: Collaborator) => void;
  onUpdateCollaboratorStatus: (collabId: string, status: 'online' | 'busy' | 'offline') => void;
  onQuickCreateProject: (name: string, categoryId?: string | null) => Promise<void>;
  onQuickCreateTeam: (name: string, color: string) => Promise<void>;
  onQuickCreateTag: (name: string, color: string) => Promise<void>;
  onOpenNewProcessModal: () => void;
  onOpenAgentBuilder: (agentToEdit?: Collaborator | null) => void;
  onDirectChatWithAgent: (agent: Collaborator) => void;
  onOpenStudioSubView?: (subView: 'canvas' | 'rules' | 'analysis' | 'docs') => void;
  onResetWorkspaceBlank?: () => Promise<void>;
}

const PRESET_COLORS = ['#1F93FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSection,
  onSelectSection,
  conversationFilter,
  onSelectConversationFilter,
  projects,
  processes,
  currentProcessId,
  selectedProjectId,
  onSelectProject,
  onSelectProcess,
  tags,
  teams,
  collaborators,
  conversations,
  meetings,
  activeCollaborator,
  onSwitchActiveCollaborator,
  onUpdateCollaboratorStatus,
  onQuickCreateProject,
  onQuickCreateTeam,
  onQuickCreateTag,
  onOpenNewProcessModal,
  onOpenAgentBuilder,
  onDirectChatWithAgent,
  onOpenStudioSubView,
  onResetWorkspaceBlank,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [convTreeOpen, setConvTreeOpen] = useState(true);
  const [convProjectsOpen, setConvProjectsOpen] = useState(true);
  const [convAgentsOpen, setConvAgentsOpen] = useState(true);
  const [convTeamsOpen, setConvTeamsOpen] = useState(false);
  const [convTagsOpen, setConvTagsOpen] = useState(true);
  const [projectsTreeOpen, setProjectsTreeOpen] = useState(true);
  const [studioTreeOpen, setStudioTreeOpen] = useState(true);

  // Quick-add inline forms
  const [addingType, setAddingType] = useState<'project' | 'team' | 'tag' | null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState('#1F93FF');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const aiAgents = collaborators.filter((c) => c.isAi);
  const humanCollaborators = collaborators.filter((c) => !c.isAi);
  const openConversationsCount = conversations.filter((c) => c.status === 'open').length;
  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !addingType) return;
    if (addingType === 'project') {
      await onQuickCreateProject(quickName.trim(), null);
    } else if (addingType === 'team') {
      await onQuickCreateTeam(quickName.trim(), quickColor);
    } else if (addingType === 'tag') {
      await onQuickCreateTag(quickName.trim(), quickColor);
    }
    setQuickName('');
    setAddingType(null);
  };

  const presenceDotColor = (status?: string) => {
    if (status === 'online') return 'bg-[#30A46C]';
    if (status === 'busy') return 'bg-[#F76B15]';
    return 'bg-[#8B8D98]';
  };

  if (collapsed) {
    return (
      <aside
        className="w-14 h-full bg-[#FAFAFA] border-r border-[#ECEEF0] flex flex-col items-center py-3 justify-between shrink-0 select-none z-30"
        aria-label="Navigation principale réduite"
      >
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="w-9 h-9 rounded-lg bg-[#1F93FF] text-white font-cw-620 text-xs flex items-center justify-center shadow-xs hover:bg-[#007BE5] transition"
            title="Déplier la barre latérale"
          >
            PA
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('inbox')}
            className={`relative p-2 rounded-lg transition ${
              activeSection === 'inbox'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'text-[#60646C] hover:bg-[#F2F3F7]'
            }`}
            title="Ma Boîte"
          >
            <Inbox className="w-4 h-4" />
            {unreadTotal > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1F93FF] text-white text-[10px] flex items-center justify-center font-cw-620">
                {unreadTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('conversations')}
            className={`p-2 rounded-lg transition ${
              activeSection === 'conversations'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'text-[#60646C] hover:bg-[#F2F3F7]'
            }`}
            title="Conversations & Agents IA"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('projects')}
            className={`p-2 rounded-lg transition ${
              activeSection === 'projects'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'text-[#60646C] hover:bg-[#F2F3F7]'
            }`}
            title="Projets & Processus"
          >
            <FolderKanban className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('studio')}
            className={`p-2 rounded-lg transition ${
              activeSection === 'studio'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'text-[#60646C] hover:bg-[#F2F3F7]'
            }`}
            title="Studio de Modélisation"
          >
            <Workflow className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('teams')}
            className={`p-2 rounded-lg transition ${
              activeSection === 'teams'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'text-[#60646C] hover:bg-[#F2F3F7]'
            }`}
            title="Intervenants, Équipes & Agents IA"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('agenda')}
            className={`p-2 rounded-lg transition ${
              activeSection === 'agenda'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'text-[#60646C] hover:bg-[#F2F3F7]'
            }`}
            title="Agenda & Réunions Outlook"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-[#60646C] hover:bg-[#F2F3F7] transition"
          title="Ouvrir le menu"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="w-[240px] h-full bg-[#FAFAFA] border-r border-[#ECEEF0] flex flex-col justify-between shrink-0 select-none z-30 text-[#1C2024]"
      aria-label="Navigation principale Process Architect"
    >
      {/* Top Workspace Header (Chatwoot style) */}
      <div className="px-3 py-2.5 border-b border-[#ECEEF0] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#1F93FF] text-white font-cw-620 text-xs flex items-center justify-center shrink-0 shadow-xs">
            PA
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-cw-620 text-[#1C2024] truncate leading-tight">
              Process Architect
            </div>
            <div className="text-[11px] text-[#8B8D98] truncate leading-tight">
              Espace Collaboratif
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            className="p-1.5 rounded-md text-[#60646C] hover:bg-[#ECEEF0]/70 hover:text-[#1C2024] transition"
            title="Rechercher dans l'espace"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-[#60646C] hover:bg-[#ECEEF0]/70 hover:text-[#1C2024] transition"
            title="Réduire la barre latérale"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Quick Filter Search Bar */}
      {showSearch && (
        <div className="px-2.5 py-2 border-b border-[#ECEEF0] bg-white">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer projets, agents, tags..."
            className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[#DFE3E6] bg-[#FAFAFA] text-[#1C2024] focus:outline-none focus:border-[#1F93FF]"
          />
        </div>
      )}

      {/* Inline Quick Creation Form (Project / Team / Tag) */}
      {addingType && (
        <form
          onSubmit={handleQuickCreateSubmit}
          className="mx-2.5 my-2 p-2.5 rounded-lg bg-white border border-[#1F93FF]/40 shadow-sm space-y-2"
        >
          <div className="flex items-center justify-between text-[11px] font-cw-620 text-[#1C2024]">
            <span>
              {addingType === 'project' && 'Nouveau Projet'}
              {addingType === 'team' && 'Nouvelle Équipe'}
              {addingType === 'tag' && 'Nouveau Tag / Catégorie'}
            </span>
            <button
              type="button"
              onClick={() => setAddingType(null)}
              className="text-[#8B8D98] hover:text-[#1C2024] text-xs"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            autoFocus
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder={
              addingType === 'project'
                ? 'Nom du projet...'
                : addingType === 'team'
                ? "Nom de l'équipe..."
                : 'Nom du tag...'
            }
            className="w-full text-[12px] px-2 py-1 rounded border border-[#DFE3E6] focus:outline-none focus:border-[#1F93FF]"
          />
          {(addingType === 'team' || addingType === 'tag') && (
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setQuickColor(col)}
                  className={`w-4 h-4 rounded-sm transition ${
                    quickColor === col ? 'ring-2 ring-offset-1 ring-[#1C2024]' : ''
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          )}
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setAddingType(null)}
              className="px-2 py-1 text-[11px] text-[#60646C] hover:bg-[#F2F3F7] rounded"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 text-[11px] font-cw-520 bg-[#1F93FF] text-white rounded hover:bg-[#007BE5]"
            >
              Créer
            </button>
          </div>
        </form>
      )}

      {/* Scrollable Navigation Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-[13px]">
        {/* 1. Ma Boîte (Inbox) */}
        <button
          type="button"
          onClick={() => {
            onSelectSection('conversations');
            onSelectConversationFilter({ mode: 'all' });
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
            activeSection === 'inbox'
              ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
              : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Inbox className="w-4 h-4 shrink-0 text-[#60646C]" />
            <span className="truncate">Ma Boîte</span>
          </span>
          {unreadTotal > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-cw-620 bg-[#EBF5FF] text-[#1F93FF]">
              {unreadTotal}
            </span>
          )}
        </button>

        {/* 2. Conversations (Chatwoot Tree-Line Menu) */}
        <div>
          <div
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
              activeSection === 'conversations'
                ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
            }`}
            onClick={() => {
              onSelectSection('conversations');
              setConvTreeOpen((o) => !o);
            }}
          >
            <span className="flex items-center gap-2 truncate">
              <MessageSquare
                className={`w-4 h-4 shrink-0 ${
                  activeSection === 'conversations' ? 'text-[#1F93FF]' : 'text-[#60646C]'
                }`}
              />
              <span className="truncate">Conversations</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded text-[11px] font-cw-520 text-[#60646C] bg-[#ECEEF0]/80">
                {openConversationsCount}
              </span>
              {convTreeOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#8B8D98]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#8B8D98]" />
              )}
            </div>
          </div>

          {convTreeOpen && (
            <div className="cw-tree-container mt-0.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelectSection('conversations');
                  onSelectConversationFilter({ mode: 'all' });
                }}
                className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12.5px] flex items-center justify-between transition ${
                  activeSection === 'conversations' && conversationFilter.mode === 'all'
                    ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                    : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                }`}
              >
                <span className="truncate">Toutes les conversations</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectSection('conversations');
                  onSelectConversationFilter({ mode: 'mentions' });
                }}
                className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12.5px] flex items-center justify-between transition ${
                  activeSection === 'conversations' && conversationFilter.mode === 'mentions'
                    ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                    : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                }`}
              >
                <span className="truncate">@ Mentions</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectSection('conversations');
                  onSelectConversationFilter({ mode: 'unattended' });
                }}
                className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12.5px] flex items-center justify-between transition ${
                  activeSection === 'conversations' && conversationFilter.mode === 'unattended'
                    ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                    : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                }`}
              >
                <span className="truncate">Non suivies</span>
              </button>

              {/* Sub-tree: Projets inside Conversations */}
              <div className="cw-tree-node pt-1">
                <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-cw-620 text-[#60646C]">
                  <button
                    type="button"
                    onClick={() => setConvProjectsOpen((v) => !v)}
                    className="flex items-center gap-1 hover:text-[#1C2024] truncate"
                  >
                    {convProjectsOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>Projets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingType('project');
                      setQuickName('');
                    }}
                    className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF]"
                    title="Créer un nouveau projet"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {convProjectsOpen && (
                  <div className="cw-tree-container space-y-0.5">
                    {projects
                      .filter(
                        (p) =>
                          !searchQuery ||
                          p.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            onSelectSection('conversations');
                            onSelectConversationFilter({ mode: 'project', value: proj.id });
                          }}
                          className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] flex items-center justify-between transition ${
                            activeSection === 'conversations' &&
                            conversationFilter.mode === 'project' &&
                            conversationFilter.value === proj.id
                              ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                              : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                          }`}
                        >
                          <span className="truncate">{proj.name}</span>
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAddingType('project');
                        setQuickName('');
                      }}
                      className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[11.5px] text-[#1F93FF] hover:bg-[#EBF5FF]/60 flex items-center gap-1 font-cw-520"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nouveau projet</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-tree: 🤖 Agents IA Collaborateurs */}
              <div className="cw-tree-node pt-1">
                <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-cw-620 text-[#60646C]">
                  <button
                    type="button"
                    onClick={() => setConvAgentsOpen((v) => !v)}
                    className="flex items-center gap-1 hover:text-[#1C2024] truncate"
                  >
                    {convAgentsOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>Agents IA Collaborateurs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAgentBuilder(null)}
                    className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF]"
                    title="Créer et configurer un nouvel Agent IA Collaborateur"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {convAgentsOpen && (
                  <div className="cw-tree-container space-y-0.5">
                    {aiAgents
                      .filter(
                        (a) =>
                          !searchQuery ||
                          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.handle.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((agent) => (
                        <div
                          key={agent.id}
                          className={`cw-tree-node group w-full px-2 py-1 rounded-md text-[12px] flex items-center justify-between transition cursor-pointer ${
                            activeSection === 'conversations' &&
                            conversationFilter.mode === 'agent' &&
                            conversationFilter.value === agent.id
                              ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                              : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                          }`}
                          onClick={() => onDirectChatWithAgent(agent)}
                          title={`${agent.name} (@${agent.handle}) — Cliquer pour discuter`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-[#30A46C] shrink-0" />
                            <span className="truncate">{agent.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAgentBuilder(agent);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-[#ECEEF0] text-[#1C2024] hover:bg-[#1F93FF] hover:text-white transition"
                            title="Configurer cet Agent IA"
                          >
                            ⚙
                          </button>
                        </div>
                      ))}

                    <button
                      type="button"
                      onClick={() => onOpenAgentBuilder(null)}
                      className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[11.5px] text-[#1F93FF] hover:bg-[#EBF5FF]/60 flex items-center gap-1 font-cw-520"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>+ Créer un Agent IA</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-tree: Équipes Humaines */}
              <div className="cw-tree-node pt-1">
                <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-cw-620 text-[#60646C]">
                  <button
                    type="button"
                    onClick={() => setConvTeamsOpen((v) => !v)}
                    className="flex items-center gap-1 hover:text-[#1C2024] truncate"
                  >
                    {convTeamsOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>Équipes Humaines</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingType('team');
                      setQuickName('');
                    }}
                    className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF]"
                    title="Créer une équipe"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {convTeamsOpen && (
                  <div className="cw-tree-container space-y-0.5">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          onSelectSection('conversations');
                          onSelectConversationFilter({ mode: 'team', value: team.id });
                        }}
                        className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] flex items-center gap-1.5 transition ${
                          activeSection === 'conversations' &&
                          conversationFilter.mode === 'team' &&
                          conversationFilter.value === team.id
                            ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                            : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="truncate">{team.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAddingType('team');
                        setQuickName('');
                      }}
                      className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[11.5px] text-[#1F93FF] hover:bg-[#EBF5FF]/60 flex items-center gap-1 font-cw-520"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nouvelle équipe</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-tree: Catégories & Tags (Chatwoot colored squares ■) */}
              <div className="cw-tree-node pt-1">
                <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-cw-620 text-[#60646C]">
                  <button
                    type="button"
                    onClick={() => setConvTagsOpen((v) => !v)}
                    className="flex items-center gap-1 hover:text-[#1C2024] truncate"
                  >
                    {convTagsOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>Catégories & Tags</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingType('tag');
                      setQuickName('');
                    }}
                    className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF]"
                    title="Créer un tag personnalisé"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {convTagsOpen && (
                  <div className="cw-tree-container space-y-0.5">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          onSelectSection('conversations');
                          onSelectConversationFilter({ mode: 'tag', value: tag.name });
                        }}
                        className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] flex items-center gap-2 transition ${
                          activeSection === 'conversations' &&
                          conversationFilter.mode === 'tag' &&
                          conversationFilter.value === tag.name
                            ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                            : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAddingType('tag');
                        setQuickName('');
                      }}
                      className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[11.5px] text-[#1F93FF] hover:bg-[#EBF5FF]/60 flex items-center gap-1 font-cw-520"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nouveau tag</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Projets & Processus (Direct Tree Menu) */}
        <div className="pt-1">
          <div
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
              activeSection === 'projects'
                ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
            }`}
            onClick={() => {
              onSelectSection('projects');
              setProjectsTreeOpen((o) => !o);
            }}
          >
            <span className="flex items-center gap-2 truncate">
              <FolderKanban
                className={`w-4 h-4 shrink-0 ${
                  activeSection === 'projects' ? 'text-[#1F93FF]' : 'text-[#60646C]'
                }`}
              />
              <span className="truncate">Projets & Processus</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingType('project');
                  setQuickName('');
                }}
                className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF]"
                title="Créer un projet"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {projectsTreeOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#8B8D98]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#8B8D98]" />
              )}
            </div>
          </div>

          {projectsTreeOpen && (
            <div className="cw-tree-container mt-0.5 space-y-0.5">
              <button
                type="button"
                onClick={() => onSelectSection('projects')}
                className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] transition ${
                  activeSection === 'projects' && !selectedProjectId
                    ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                    : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                }`}
              >
                Vue d'ensemble ({projects.length})
              </button>

              {projects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    onSelectProject(proj.id);
                    onSelectSection('projects');
                  }}
                  className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] flex items-center justify-between transition ${
                    activeSection === 'projects' && selectedProjectId === proj.id
                      ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                      : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                  }`}
                >
                  <span className="truncate">{proj.name}</span>
                  <span className="text-[10px] text-[#8B8D98]">{proj.processIds.length}</span>
                </button>
              ))}

              {/* Direct Process shortcuts */}
              {processes.slice(0, 5).map((proc) => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => {
                    onSelectProcess(proc.id);
                    onSelectSection('studio');
                  }}
                  className={`cw-tree-node w-full text-left px-2 py-1 rounded-md text-[11.5px] flex items-center gap-1.5 transition ${
                    activeSection === 'studio' && currentProcessId === proc.id
                      ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                      : 'text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
                  }`}
                  title={`Ouvrir ${proc.name} dans le Studio`}
                >
                  <Workflow className="w-3 h-3 shrink-0 text-[#1F93FF]" />
                  <span className="truncate">{proc.name}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={onOpenNewProcessModal}
                className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[11.5px] text-[#1F93FF] hover:bg-[#EBF5FF]/60 flex items-center gap-1 font-cw-520"
              >
                <Plus className="w-3 h-3" />
                <span>+ Créer un projet / processus</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Studio de Modélisation */}
        <div className="pt-1">
          <div
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
              activeSection === 'studio'
                ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
                : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
            }`}
            onClick={() => {
              onSelectSection('studio');
              setStudioTreeOpen((o) => !o);
            }}
          >
            <span className="flex items-center gap-2 truncate">
              <Workflow
                className={`w-4 h-4 shrink-0 ${
                  activeSection === 'studio' ? 'text-[#1F93FF]' : 'text-[#60646C]'
                }`}
              />
              <span className="truncate">Studio de Modélisation</span>
            </span>
            {studioTreeOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#8B8D98]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#8B8D98]" />
            )}
          </div>

          {studioTreeOpen && (
            <div className="cw-tree-container mt-0.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelectSection('studio');
                  onOpenStudioSubView?.('canvas');
                }}
                className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024] flex items-center gap-1.5"
              >
                <Workflow className="w-3 h-3" />
                <span>Éditeur de flux</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectSection('studio');
                  onOpenStudioSubView?.('rules');
                }}
                className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024] flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3" />
                <span>Référentiel des Règles</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectSection('studio');
                  onOpenStudioSubView?.('analysis');
                }}
                className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024] flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Analyse, Simulation & Tests</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectSection('studio');
                  onOpenStudioSubView?.('docs');
                }}
                className="cw-tree-node w-full text-left px-2 py-1 rounded-md text-[12px] text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024] flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3" />
                <span>Documentation & Exports</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Intervenants, Équipes & Agents IA [+] */}
        <div
          onClick={() => onSelectSection('teams')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
            activeSection === 'teams'
              ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
              : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Users
              className={`w-4 h-4 shrink-0 ${
                activeSection === 'teams' ? 'text-[#1F93FF]' : 'text-[#60646C]'
              }`}
            />
            <span className="truncate">Intervenants, Équipes & IA</span>
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#8B8D98]">{collaborators.length}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAgentBuilder(null);
              }}
              className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF]"
              title="Créer un Agent IA ou un Intervenant"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6. Agenda & Réunions Outlook */}
        <button
          type="button"
          onClick={() => onSelectSection('agenda')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
            activeSection === 'agenda'
              ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
              : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Calendar
              className={`w-4 h-4 shrink-0 ${
                activeSection === 'agenda' ? 'text-[#1F93FF]' : 'text-[#60646C]'
              }`}
            />
            <span className="truncate">Agenda & Réunions Outlook</span>
          </span>
          {meetings.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[11px] font-cw-520 bg-[#EBF5FF] text-[#1F93FF]">
              {meetings.length}
            </span>
          )}
        </button>

        {/* 7. Paramètres (Espace vierge, Catégories) */}
        <div
          onClick={() => onSelectSection('settings')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
            activeSection === 'settings'
              ? 'bg-[#EBF5FF] text-[#1F93FF] font-cw-520'
              : 'text-[#1C2024] hover:bg-[#F2F3F7] font-cw-460'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Settings
              className={`w-4 h-4 shrink-0 ${
                activeSection === 'settings' ? 'text-[#1F93FF]' : 'text-[#60646C]'
              }`}
            />
            <span className="truncate">Paramètres (Espace vierge)</span>
          </span>
          {onResetWorkspaceBlank && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    'Voulez-vous réinitialiser la plateforme en Espace Vierge ? (Les catégories, projets et exemples seront vidés ; vos 5 Agents IA collaborateurs resteront actifs).'
                  )
                ) {
                  onResetWorkspaceBlank();
                }
              }}
              className="p-0.5 rounded hover:bg-[#ECEEF0] text-[#8B8D98] hover:text-[#1C2024]"
              title="Réinitialiser immédiatement en Espace Vierge"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Collaborator Profile Switcher (Chatwoot Agent Status Footer) */}
      <div className="p-2.5 border-t border-[#ECEEF0] bg-[#FAFAFA] relative">
        {userMenuOpen && (
          <div className="absolute bottom-14 left-2 right-2 bg-white border border-[#DFE3E6] rounded-xl shadow-lg p-2 z-50 space-y-1.5">
            <div className="px-2 py-1 text-[11px] font-cw-620 text-[#8B8D98] uppercase tracking-wider">
              Mon Statut de Présence
            </div>
            <div className="flex items-center gap-1 px-1">
              {(['online', 'busy', 'offline'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (activeCollaborator) {
                      onUpdateCollaboratorStatus(activeCollaborator.id, st);
                    }
                  }}
                  className={`flex-1 py-1 px-1.5 rounded text-[11px] font-cw-520 flex items-center justify-center gap-1 border transition ${
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

            <div className="px-2 pt-1.5 pb-0.5 text-[11px] font-cw-620 text-[#8B8D98] uppercase tracking-wider border-t border-[#ECEEF0]">
              Changer d'intervenant actif
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5">
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
          </div>
        )}

        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-[#ECEEF0]/70 transition text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-full text-white text-xs font-cw-620 flex items-center justify-center"
                style={{ backgroundColor: activeCollaborator?.avatarColor || '#1F93FF' }}
              >
                {activeCollaborator?.avatarInitials || 'KB'}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#FAFAFA] ${presenceDotColor(
                  activeCollaborator?.presenceStatus || 'online'
                )}`}
              />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-cw-620 text-[#1C2024] truncate leading-tight">
                {activeCollaborator?.name || 'Khalil Benhassen'}
              </div>
              <div className="text-[11px] text-[#60646C] truncate leading-tight">
                {activeCollaborator?.roleTitle || 'Chef de Projet'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8B8D98] shrink-0" />
        </button>
      </div>
    </aside>
  );
};
