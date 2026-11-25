import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  MessageSquarePlus,
  X,
  MoreVertical,
  Trash2,
  CheckCircle2,
  RotateCcw,
  MailWarning,
  Settings,
  Users,
  User,
  Check,
} from 'lucide-react';
import {
  Collaborator,
  Conversation,
  ProcessSummary,
  Project,
  TagItem,
} from '../../types/process';
import { ConversationSidebarFilter } from '../layout/AppSidebar';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (convId: string) => void;
  activeCollaborator: Collaborator | null;
  collaborators: Collaborator[];
  projects: Project[];
  processes: ProcessSummary[];
  tags: TagItem[];
  sidebarFilter: ConversationSidebarFilter;
  onClearSidebarFilter: () => void;
  onCreateConversation: (payload: {
    title: string;
    conversationType: 'direct_human' | 'direct_ai' | 'project_thread' | 'process_thread';
    projectId?: string | null;
    processId?: string | null;
    assigneeId?: string | null;
    participantIds?: string[];
    tags?: string[];
    initialMessage?: string;
  }) => Promise<void>;
  onDirectChatWithAgent: (agent: Collaborator) => void;
  onOpenAgentBuilder: (agent?: Collaborator | null) => void;
  onDeleteConversation?: (convId: string) => Promise<void>;
  onToggleConversationStatus?: (
    convId: string,
    newStatus: 'open' | 'resolved'
  ) => Promise<void>;
  onUpdateUnreadCount?: (convId: string, unreadCount: number) => Promise<void>;
}

function formatCompactTime(isoStr: string): string {
  try {
    const dt = new Date(isoStr);
    const diffSec = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
    if (diffSec < 60) return '1m';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    return `${Math.floor(diffSec / 86400)}j`;
  } catch {
    return '1m';
  }
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  activeCollaborator,
  collaborators,
  sidebarFilter,
  onClearSidebarFilter,
  onCreateConversation,
  onDirectChatWithAgent,
  onOpenAgentBuilder,
  onDeleteConversation,
  onToggleConversationStatus,
  onUpdateUnreadCount,
}) => {
  const [activeTab, setActiveTab] = useState<'mine' | 'ai_agents'>('mine');
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // New conversation form state: 'direct' (1-on-1) or 'group' (multiple members)
  const [createMode, setCreateMode] = useState<'direct' | 'group'>('direct');
  const [newTitle, setNewTitle] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [newInitialMsg, setNewInitialMsg] = useState('');

  const aiAgents = useMemo(() => collaborators.filter((c) => c.isAi), [collaborators]);
  const aiAgentIds = useMemo(() => new Set(aiAgents.map((a) => a.id)), [aiAgents]);
  const humanCollaborators = useMemo(
    () => collaborators.filter((c) => !c.isAi && c.id !== activeCollaborator?.id),
    [collaborators, activeCollaborator]
  );

  // Helper: determine if a conversation is a 1-on-1 AI Agent conversation
  const isAiConversation = (c: Conversation): boolean => {
    if (c.conversationType === 'direct_ai') return true;
    if (
      c.conversationType !== 'project_thread' &&
      c.conversationType !== 'process_thread' &&
      c.assigneeId &&
      aiAgentIds.has(c.assigneeId) &&
      c.participantIds.length <= 2
    ) {
      return true;
    }
    return false;
  };

  // Helper: determine if a conversation is a Group Discussion (3+ members or project_thread)
  const isGroupConversation = (c: Conversation): boolean => {
    if (
      c.conversationType === 'project_thread' ||
      c.conversationType === 'process_thread'
    ) {
      return true;
    }
    return c.participantIds.length >= 3;
  };

  // Automatically switch tab when selectedConversationId changes
  useEffect(() => {
    if (!selectedConversationId) return;
    const selected = conversations.find((c) => c.id === selectedConversationId);
    if (!selected) return;
    if (isAiConversation(selected) && activeTab !== 'ai_agents') {
      setActiveTab('ai_agents');
    } else if (!isAiConversation(selected) && activeTab !== 'mine') {
      setActiveTab('mine');
    }
  }, [selectedConversationId, conversations]);

  // Apply search + sidebar filter for conversations
  const baseFiltered = useMemo(() => {
    return conversations.filter((c) => {
      if (sidebarFilter.mode === 'project' && sidebarFilter.value) {
        if (c.projectId !== sidebarFilter.value) return false;
      } else if (sidebarFilter.mode === 'agent' && sidebarFilter.value) {
        if (
          c.assigneeId !== sidebarFilter.value &&
          !c.participantIds.includes(sidebarFilter.value)
        ) {
          return false;
        }
      } else if (sidebarFilter.mode === 'team' && sidebarFilter.value) {
        if (c.teamId !== sidebarFilter.value) return false;
      } else if (sidebarFilter.mode === 'tag' && sidebarFilter.value) {
        if (!c.tags.includes(sidebarFilter.value)) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchPreview = (c.lastMessagePreview || '').toLowerCase().includes(q);
        if (!matchTitle && !matchPreview) return false;
      }

      return true;
    });
  }, [conversations, sidebarFilter, search]);

  // 1. "Mes échanges" -> Group discussions + 1-on-1 Individual Human Collaborator discussions
  const humanExchangeRows = useMemo(() => {
    const groupConvs = baseFiltered.filter(
      (c) => !isAiConversation(c) && isGroupConversation(c)
    );

    const directRows = humanCollaborators
      .map((collab) => {
        const existingDirectConv = conversations.find(
          (c) =>
            !isAiConversation(c) &&
            !isGroupConversation(c) &&
            (c.assigneeId === collab.id || c.participantIds.includes(collab.id))
        );
        return {
          kind: 'direct_human' as const,
          collab,
          conv: existingDirectConv || null,
        };
      })
      .filter(({ collab, conv }) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName =
            collab.name.toLowerCase().includes(q) ||
            collab.handle.toLowerCase().includes(q);
          const matchPreview = (conv?.lastMessagePreview || '').toLowerCase().includes(q);
          if (!matchName && !matchPreview) return false;
        }
        return true;
      });

    return [
      ...groupConvs.map((conv) => ({
        kind: 'group' as const,
        conv,
        collab: null as Collaborator | null,
      })),
      ...directRows,
    ];
  }, [baseFiltered, humanCollaborators, conversations, search, aiAgentIds]);

  // 2. "Agents IA" -> ALL AI agents are always present in the list (linked to their conversation if started)
  const aiAgentRows = useMemo(() => {
    return aiAgents
      .map((agent) => {
        const existingConv = conversations.find(
          (c) =>
            isAiConversation(c) &&
            (c.assigneeId === agent.id || c.participantIds.includes(agent.id))
        );
        return { agent, conv: existingConv || null };
      })
      .filter(({ agent, conv }) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName =
            agent.name.toLowerCase().includes(q) ||
            agent.handle.toLowerCase().includes(q);
          const matchPreview = (conv?.lastMessagePreview || '').toLowerCase().includes(q);
          if (!matchName && !matchPreview) return false;
        }
        return true;
      });
  }, [aiAgents, conversations, search, aiAgentIds]);

  const toggleGroupMember = (id: string) => {
    setSelectedGroupMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createMode === 'group') {
      const memberNames = selectedGroupMemberIds
        .map((id) => collaborators.find((c) => c.id === id)?.name.split(' ')[0])
        .filter(Boolean);
      const groupTitle =
        newTitle.trim() ||
        (memberNames.length > 0
          ? `Groupe · ${memberNames.join(', ')}`
          : 'Nouveau groupe de projet');

      const participants = Array.from(
        new Set([
          ...(activeCollaborator ? [activeCollaborator.id] : []),
          ...selectedGroupMemberIds,
        ])
      );

      await onCreateConversation({
        title: groupTitle,
        conversationType: 'project_thread',
        assigneeId: activeCollaborator?.id || null,
        participantIds: participants,
        tags: [],
        initialMessage: newInitialMsg.trim() || undefined,
      });
    } else {
      const targetCollab = collaborators.find((c) => c.id === newAssigneeId);
      if (targetCollab && !newInitialMsg.trim()) {
        // Direct 1-click open or create
        onDirectChatWithAgent(targetCollab);
        setIsNewModalOpen(false);
        return;
      }
      const computedTitle =
        newTitle.trim() ||
        (targetCollab ? targetCollab.name : 'Nouvelle discussion');

      await onCreateConversation({
        title: computedTitle,
        conversationType: targetCollab?.isAi ? 'direct_ai' : 'direct_human',
        assigneeId: newAssigneeId || activeCollaborator?.id || null,
        participantIds: [
          ...(activeCollaborator ? [activeCollaborator.id] : []),
          ...(newAssigneeId ? [newAssigneeId] : []),
        ],
        tags: [],
        initialMessage: newInitialMsg.trim() || undefined,
      });
    }

    setNewTitle('');
    setNewInitialMsg('');
    setSelectedGroupMemberIds([]);
    setIsNewModalOpen(false);
  };

  return (
    <section
      className="w-[320px] h-full bg-white border-r border-[#ECEEF0] flex flex-col shrink-0 select-none"
      aria-label="Liste des conversations"
      onClick={() => setOpenMenuId(null)}
    >
      {/* Top Header */}
      <div className="px-3.5 pt-3 pb-2 border-b border-[#ECEEF0]">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[16px] font-cw-620 text-[#1C2024]">Conversations</h2>

          <button
            type="button"
            onClick={() => setIsNewModalOpen((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F93FF] hover:bg-[#007BE5] text-white text-[12px] font-cw-520 shadow-xs transition"
            title="Démarrer une discussion individuelle ou un groupe"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 text-[#8B8D98] absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contact, groupe ou message..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#ECEEF0] text-[12.5px] text-[#1C2024] placeholder-[#8B8D98] focus:outline-none focus:border-[#1F93FF] focus:bg-white transition"
          />
        </div>

        {/* Active Sidebar Filter Pill */}
        {sidebarFilter.mode !== 'all' && (
          <div className="mb-2 flex items-center justify-between px-2.5 py-1 rounded-md bg-[#EBF5FF] text-[#1F93FF] text-[11.5px] font-cw-520">
            <span className="truncate">
              Filtre actif : {sidebarFilter.mode} {sidebarFilter.value ? `(${sidebarFilter.value})` : ''}
            </span>
            <button
              type="button"
              onClick={onClearSidebarFilter}
              className="hover:text-[#007BE5] ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 2 Tabs Only: Mes échanges (Humains & Groupes) | Agents IA */}
        <div className="flex items-center border-b border-[#ECEEF0] -mx-3.5 px-3.5 gap-4 text-[12.5px]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('mine');
              const firstWithConv = humanExchangeRows.find((r) => r.conv);
              if (
                firstWithConv?.conv &&
                !humanExchangeRows.some((r) => r.conv?.id === selectedConversationId)
              ) {
                onSelectConversation(firstWithConv.conv.id);
              }
            }}
            className={`pb-2 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'mine'
                ? 'border-[#1F93FF] text-[#1F93FF] font-cw-620'
                : 'border-transparent text-[#60646C] hover:text-[#1C2024] font-cw-460'
            }`}
          >
            <span>Mes échanges</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === 'mine'
                  ? 'bg-[#EBF5FF] text-[#1F93FF]'
                  : 'bg-[#F2F3F7] text-[#60646C]'
              }`}
            >
              {humanExchangeRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ai_agents');
              const firstWithConv = aiAgentRows.find((r) => r.conv);
              if (
                firstWithConv?.conv &&
                !aiAgentRows.some((r) => r.conv?.id === selectedConversationId)
              ) {
                onSelectConversation(firstWithConv.conv.id);
              }
            }}
            className={`pb-2 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'ai_agents'
                ? 'border-[#1F93FF] text-[#1F93FF] font-cw-620'
                : 'border-transparent text-[#60646C] hover:text-[#1C2024] font-cw-460'
            }`}
          >
            <span>Agents IA</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === 'ai_agents'
                  ? 'bg-[#EBF5FF] text-[#1F93FF]'
                  : 'bg-[#F2F3F7] text-[#60646C]'
              }`}
            >
              {aiAgentRows.length}
            </span>
          </button>
        </div>
      </div>

      {/* Inline New Conversation Form: Message direct (1-on-1) OR Nouveau groupe */}
      {isNewModalOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-3 bg-[#FAFAFA] border-b border-[#ECEEF0] space-y-2.5 text-[12px]"
        >
          <div className="flex items-center justify-between font-cw-620 text-[#1C2024]">
            <span className="flex items-center gap-1.5">
              <MessageSquarePlus className="w-3.5 h-3.5 text-[#1F93FF]" />
              <span>Nouvelle discussion</span>
            </span>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="text-[#8B8D98] hover:text-[#1C2024]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switcher: Message direct vs Nouveau groupe */}
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#ECEEF0]">
            <button
              type="button"
              onClick={() => setCreateMode('direct')}
              className={`py-1 px-2 rounded-md text-[11.5px] font-cw-520 flex items-center justify-center gap-1 transition ${
                createMode === 'direct'
                  ? 'bg-white text-[#1C2024] shadow-2xs'
                  : 'text-[#60646C] hover:text-[#1C2024]'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#1F93FF]" />
              <span>Message direct</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('group')}
              className={`py-1 px-2 rounded-md text-[11.5px] font-cw-520 flex items-center justify-center gap-1 transition ${
                createMode === 'group'
                  ? 'bg-white text-[#1C2024] shadow-2xs'
                  : 'text-[#60646C] hover:text-[#1C2024]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#5B5BD6]" />
              <span>Nouveau groupe</span>
            </button>
          </div>

          {createMode === 'direct' ? (
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#DFE3E6] bg-white text-[12px]"
            >
              <option value="">Choisir un collaborateur...</option>
              {collaborators
                .filter((c) => c.id !== activeCollaborator?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.isAi ? `${c.name} (Agent IA)` : `${c.name} (${c.roleTitle})`}
                  </option>
                ))}
            </select>
          ) : (
            <>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nom du groupe (ex: Équipe Projet Pilote)..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#DFE3E6] bg-white focus:outline-none focus:border-[#1F93FF]"
              />

              <div className="space-y-1">
                <div className="text-[11px] font-cw-520 text-[#60646C]">
                  Sélectionner les membres du groupe ({selectedGroupMemberIds.length}) :
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-[#DFE3E6] bg-white divide-y divide-[#ECEEF0]">
                  {collaborators
                    .filter((c) => c.id !== activeCollaborator?.id)
                    .map((c) => {
                      const checked = selectedGroupMemberIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleGroupMember(c.id)}
                          className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between text-[11.5px] transition ${
                            checked ? 'bg-[#EBF5FF]/70' : 'hover:bg-[#FAFAFA]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full text-white text-[9.5px] font-cw-620 flex items-center justify-center shrink-0"
                              style={{ backgroundColor: c.avatarColor || '#1F93FF' }}
                            >
                              {c.avatarInitials}
                            </span>
                            <span className="truncate font-cw-520 text-[#1C2024]">
                              {c.name}
                            </span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked
                                ? 'bg-[#1F93FF] border-[#1F93FF] text-white'
                                : 'border-[#DFE3E6] bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          <input
            type="text"
            value={newInitialMsg}
            onChange={(e) => setNewInitialMsg(e.target.value)}
            placeholder="Premier message (optionnel)..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-[#DFE3E6] bg-white focus:outline-none focus:border-[#1F93FF]"
          />

          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-2.5 py-1 rounded-md text-[#60646C] hover:bg-[#ECEEF0]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                createMode === 'direct'
                  ? !newAssigneeId
                  : selectedGroupMemberIds.length === 0
              }
              className="px-3 py-1 rounded-md bg-[#1F93FF] text-white font-cw-520 hover:bg-[#007BE5] disabled:opacity-50"
            >
              {createMode === 'group' ? 'Créer le groupe' : 'Démarrer'}
            </button>
          </div>
        </form>
      )}

      {/* Clean Messenger / WhatsApp-style Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#ECEEF0] pb-24">
        {activeTab === 'mine' ? (
          humanExchangeRows.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="text-[13px] font-cw-520 text-[#1C2024]">
                Aucun échange trouvé
              </div>
              <p className="text-[12px] text-[#8B8D98]">
                Cliquez sur « + Nouveau » pour démarrer une discussion ou créer un groupe.
              </p>
            </div>
          ) : (
            humanExchangeRows.map((row) => {
              if (row.kind === 'group') {
                const conv = row.conv;
                const isSelected = conv.id === selectedConversationId;
                const publicMsgs = conv.messages.filter(
                  (m) => !m.isPrivateNote && m.messageType !== 'private_note'
                );
                const lastMsg = publicMsgs[publicMsgs.length - 1];
                const cleanedSenderName = (lastMsg?.senderName || '')
                  .replace(/^[^\p{L}\p{N}]+/gu, '')
                  .trim();
                const senderShort = cleanedSenderName
                  ? cleanedSenderName.startsWith('Agent ')
                    ? cleanedSenderName.split('&')[0].trim()
                    : cleanedSenderName.split(' ')[0]
                  : '';

                const rawPreview = lastMsg
                  ? lastMsg.content
                  : conv.lastMessagePreview || 'Discussion de groupe';
                const cleanBody = rawPreview
                  .replace(/\*\*/g, '')
                  .replace(/`/g, '')
                  .replace(/^.*?\s—\s/, '')
                  .trim();
                const cleanPreview = senderShort
                  ? `${senderShort} : ${cleanBody}`
                  : cleanBody;

                const menuOpen = openMenuId === conv.id;
                const humanParticipantCount = conv.participantIds.filter(
                  (pid) => !aiAgentIds.has(pid)
                ).length;
                const memberCount = Math.max(humanParticipantCount, 2);

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`group px-3.5 py-3 cursor-pointer transition relative ${
                      isSelected
                        ? 'bg-[#EBF5FF]/85 border-l-[3px] border-l-[#1F93FF]'
                        : 'bg-white hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Group Avatar (👥) + Member Count Badge */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#5B5BD6] text-white flex items-center justify-center shadow-2xs">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="absolute -bottom-0.5 -right-1 px-1 rounded-full bg-white border border-[#DFE3E6] text-[#5B5BD6] text-[9.5px] font-cw-620 leading-tight">
                          {memberCount}
                        </span>
                      </div>

                      {/* Group Name + Sender: Preview */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[13.5px] font-cw-620 text-[#1C2024] truncate">
                            {conv.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-[#8B8D98] font-cw-460">
                              {formatCompactTime(conv.updatedAt)}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#1F93FF] text-white text-[10px] font-cw-620">
                                {conv.unreadCount}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(menuOpen ? null : conv.id);
                              }}
                              title="Options du groupe"
                              className="p-1 rounded-md text-[#8B8D98] hover:text-[#1C2024] hover:bg-[#ECEEF0]/80 transition"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[12.5px] text-[#60646C] truncate mt-0.5 leading-snug">
                          {cleanPreview}
                        </p>
                      </div>
                    </div>

                    {/* Floating 3-Dots Context Menu */}
                    {menuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-3 top-10 w-52 bg-white border border-[#DFE3E6] rounded-xl shadow-xl py-1.5 z-30 text-[12px]"
                      >
                        {onToggleConversationStatus && (
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenuId(null);
                              await onToggleConversationStatus(
                                conv.id,
                                conv.status === 'resolved' ? 'open' : 'resolved'
                              );
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                          >
                            {conv.status === 'resolved' ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-[#1F93FF]" />
                                <span>Rouvrir la discussion</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#30A46C]" />
                                <span>Marquer comme résolu</span>
                              </>
                            )}
                          </button>
                        )}

                        {onUpdateUnreadCount && (
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenuId(null);
                              await onUpdateUnreadCount(
                                conv.id,
                                conv.unreadCount > 0 ? 0 : 1
                              );
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                          >
                            <MailWarning className="w-3.5 h-3.5 text-[#1F93FF]" />
                            <span>
                              {conv.unreadCount > 0
                                ? 'Marquer comme lu'
                                : 'Marquer comme non-lu'}
                            </span>
                          </button>
                        )}

                        {onDeleteConversation && (
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenuId(null);
                              await onDeleteConversation(conv.id);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-[#ECEEF0] mt-1 pt-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer le groupe</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Direct 1-on-1 Human Collaborator Row
              const { collab, conv } = row;
              const isSelected = Boolean(conv && conv.id === selectedConversationId);
              const publicMsgs = conv
                ? conv.messages.filter(
                    (m) => !m.isPrivateNote && m.messageType !== 'private_note'
                  )
                : [];
              const lastMsg = publicMsgs[publicMsgs.length - 1];

              const rawPreview = lastMsg
                ? lastMsg.content
                : conv?.lastMessagePreview || collab.roleTitle || 'Démarrer la discussion';
              const cleanPreview = rawPreview
                .replace(/\*\*/g, '')
                .replace(/`/g, '')
                .replace(/^.*?\s—\s/, '')
                .trim();

              const menuKey = conv ? conv.id : `collab-${collab.id}`;
              const menuOpen = openMenuId === menuKey;

              return (
                <div
                  key={collab.id}
                  onClick={() => {
                    if (conv) {
                      onSelectConversation(conv.id);
                    } else {
                      onDirectChatWithAgent(collab);
                    }
                  }}
                  className={`group px-3.5 py-3 cursor-pointer transition relative ${
                    isSelected
                      ? 'bg-[#EBF5FF]/85 border-l-[3px] border-l-[#1F93FF]'
                      : 'bg-white hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Collaborator Avatar + Presence Dot */}
                    <div className="relative shrink-0">
                      <div
                        className="w-10 h-10 rounded-full text-white text-xs font-cw-620 flex items-center justify-center"
                        style={{ backgroundColor: collab.avatarColor || '#1F93FF' }}
                      >
                        {collab.avatarInitials}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          collab.presenceStatus === 'online'
                            ? 'bg-[#30A46C]'
                            : collab.presenceStatus === 'busy'
                            ? 'bg-[#F76B15]'
                            : 'bg-[#8B8D98]'
                        }`}
                      />
                    </div>

                    {/* Collaborator First/Last Name + 1-line message preview */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[13.5px] font-cw-620 text-[#1C2024] truncate">
                          {collab.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {conv && (
                            <span className="text-[11px] text-[#8B8D98] font-cw-460">
                              {formatCompactTime(conv.updatedAt)}
                            </span>
                          )}
                          {conv && conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#1F93FF] text-white text-[10px] font-cw-620">
                              {conv.unreadCount}
                            </span>
                          )}
                          {conv && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(menuOpen ? null : menuKey);
                              }}
                              title="Options de la discussion"
                              className="p-1 rounded-md text-[#8B8D98] hover:text-[#1C2024] hover:bg-[#ECEEF0]/80 transition"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[12.5px] text-[#60646C] truncate mt-0.5 leading-snug">
                        {cleanPreview}
                      </p>
                    </div>
                  </div>

                  {/* Floating 3-Dots Context Menu */}
                  {menuOpen && conv && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-3 top-10 w-52 bg-white border border-[#DFE3E6] rounded-xl shadow-xl py-1.5 z-30 text-[12px]"
                    >
                      {onToggleConversationStatus && (
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenMenuId(null);
                            await onToggleConversationStatus(
                              conv.id,
                              conv.status === 'resolved' ? 'open' : 'resolved'
                            );
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                        >
                          {conv.status === 'resolved' ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-[#1F93FF]" />
                              <span>Rouvrir la discussion</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#30A46C]" />
                              <span>Marquer comme résolu</span>
                            </>
                          )}
                        </button>
                      )}

                      {onUpdateUnreadCount && (
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenMenuId(null);
                            await onUpdateUnreadCount(
                              conv.id,
                              conv.unreadCount > 0 ? 0 : 1
                            );
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                        >
                          <MailWarning className="w-3.5 h-3.5 text-[#1F93FF]" />
                          <span>
                            {conv.unreadCount > 0
                              ? 'Marquer comme lu'
                              : 'Marquer comme non-lu'}
                          </span>
                        </button>
                      )}

                      {onDeleteConversation && (
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenMenuId(null);
                            await onDeleteConversation(conv.id);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-[#ECEEF0] mt-1 pt-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer la discussion</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : aiAgentRows.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="text-[13px] font-cw-520 text-[#1C2024]">
              Aucun Agent IA trouvé
            </div>
          </div>
        ) : (
          aiAgentRows.map(({ agent, conv }) => {
            const isSelected = Boolean(conv && conv.id === selectedConversationId);
            const lastMsg = conv?.messages[conv.messages.length - 1];

            const rawPreview = lastMsg
              ? lastMsg.content
              : conv?.lastMessagePreview || agent.roleTitle || `Discuter avec @${agent.handle}`;
            const cleanPreview = rawPreview
              .replace(/\*\*/g, '')
              .replace(/^.*?\s—\s/, '')
              .trim();

            const rowKey = conv?.id || `agent-row-${agent.id}`;
            const menuOpen = openMenuId === rowKey;

            return (
              <div
                key={rowKey}
                onClick={() => {
                  if (conv) {
                    onSelectConversation(conv.id);
                  } else {
                    onDirectChatWithAgent(agent);
                  }
                }}
                className={`group px-3.5 py-3 cursor-pointer transition relative ${
                  isSelected
                    ? 'bg-[#EBF5FF]/85 border-l-[3px] border-l-[#1F93FF]'
                    : 'bg-white hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* AI Agent Avatar + Online Dot */}
                  <div className="relative shrink-0">
                    <div
                      className="w-10 h-10 rounded-full text-white text-xs font-cw-620 flex items-center justify-center"
                      style={{ backgroundColor: agent.avatarColor }}
                    >
                      {agent.avatarInitials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-[#30A46C]" />
                  </div>

                  {/* AI Agent Name + 1-line message preview */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[13.5px] font-cw-620 text-[#1C2024] truncate">
                        {agent.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {conv && (
                          <span className="text-[11px] text-[#8B8D98] font-cw-460">
                            {formatCompactTime(conv.updatedAt)}
                          </span>
                        )}
                        {conv && conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#1F93FF] text-white text-[10px] font-cw-620">
                            {conv.unreadCount}
                          </span>
                        )}
                        {/* 3 Vertical Dots Options Button (⋮) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(menuOpen ? null : rowKey);
                          }}
                          title="Options de la discussion"
                          className="p-1 rounded-md text-[#8B8D98] hover:text-[#1C2024] hover:bg-[#ECEEF0]/80 transition"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[12.5px] text-[#60646C] truncate mt-0.5 leading-snug">
                      {lastMsg?.isPrivateNote && (
                        <span className="text-[#9E6C00] font-cw-520 mr-1">🔒</span>
                      )}
                      {cleanPreview}
                    </p>
                  </div>
                </div>

                {/* Floating 3-Dots Context Menu for AI Agent Row */}
                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-3 top-10 w-52 bg-white border border-[#DFE3E6] rounded-xl shadow-xl py-1.5 z-30 text-[12px]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        onOpenAgentBuilder(agent);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Configurer l'Agent IA</span>
                    </button>

                    {conv && onToggleConversationStatus && (
                      <button
                        type="button"
                        onClick={async () => {
                          setOpenMenuId(null);
                          await onToggleConversationStatus(
                            conv.id,
                            conv.status === 'resolved' ? 'open' : 'resolved'
                          );
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                      >
                        {conv.status === 'resolved' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-[#1F93FF]" />
                            <span>Rouvrir la discussion</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#30A46C]" />
                            <span>Marquer comme résolu</span>
                          </>
                        )}
                      </button>
                    )}

                    {conv && onUpdateUnreadCount && (
                      <button
                        type="button"
                        onClick={async () => {
                          setOpenMenuId(null);
                          await onUpdateUnreadCount(
                            conv.id,
                            conv.unreadCount > 0 ? 0 : 1
                          );
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-[#F2F3F7] text-[#1C2024] flex items-center gap-2"
                      >
                        <MailWarning className="w-3.5 h-3.5 text-[#1F93FF]" />
                        <span>
                          {conv.unreadCount > 0
                            ? 'Marquer comme lu'
                            : 'Marquer comme non-lu'}
                        </span>
                      </button>
                    )}

                    {conv && onDeleteConversation && (
                      <button
                        type="button"
                        onClick={async () => {
                          setOpenMenuId(null);
                          await onDeleteConversation(conv.id);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-[#ECEEF0] mt-1 pt-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer la discussion</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};


