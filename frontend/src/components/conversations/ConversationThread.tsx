import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Workflow,
  BookOpen,
  Check,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Users,
  UserPlus,
  UserMinus,
  ShieldCheck,
  X,
  Image as ImageIcon,
  FileText,
  Download,
} from 'lucide-react';
import {
  Collaborator,
  Conversation,
  Process,
  Project,
} from '../../types/process';
import { MeetingChatCard } from '../agenda/MeetingChatCard';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string;
  isImage: boolean;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface ConversationThreadProps {
  conversation: Conversation | null;
  activeCollaborator: Collaborator | null;
  collaborators: Collaborator[];
  currentProcess: Process | null;
  projects: Project[];
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onSendMessage: (payload: {
    content: string;
    isPrivateNote: boolean;
    linkedNodeIds: string[];
    linkedRuleIds: string[];
    actionPayload?: Record<string, any> | null;
  }) => Promise<void>;
  onToggleStatus: (convId: string, newStatus: 'open' | 'resolved') => Promise<void>;
  onApplyAgentAction: (messageId: string) => Promise<void>;
  onOpenScheduleMeetingModal: () => void;
  onJumpToStudioNode: (processId: string | null | undefined, nodeId?: string) => void;
  onOpenAgentBuilder: (agent: Collaborator) => void;
  onUpdateParticipants?: (convId: string, participantIds: string[]) => Promise<void>;
}

function cleanBubbleText(raw: string): string {
  return raw
    .replace(/^\*\*.*?\*\*\s*—\s*/u, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  conversation,
  activeCollaborator,
  collaborators,
  currentProcess,
  detailsOpen,
  onToggleDetails,
  onSendMessage,
  onApplyAgentAction,
  onJumpToStudioNode,
  onUpdateParticipants,
}) => {
  const [content, setContent] = useState('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [mentionDismissed, setMentionDismissed] = useState<boolean>(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const [applyingMsgId, setApplyingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [conversation?.id, conversation?.messages.length]);

  useEffect(() => {
    setShowMembersMenu(false);
    setShowLinkPicker(false);
    setAttachments([]);
    setSelectedNodeIds([]);
    setSelectedRuleIds([]);
  }, [conversation?.id, currentProcess?.id]);

  if (!conversation) {
    return (
      <main className="flex-1 h-full bg-[#FAFAFA] flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#1F93FF] flex items-center justify-center mb-3 shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-[16px] font-cw-620 text-[#1C2024]">
          Sélectionnez une discussion
        </h3>
        <p className="text-[13px] text-[#60646C] max-w-md mt-1">
          Choisissez un collaborateur, un groupe ou un Agent IA dans la colonne de gauche pour afficher vos échanges.
        </p>
      </main>
    );
  }

  // Determine whether this is a Group Discussion vs a 1-on-1 Direct Discussion
  const isGroup =
    conversation.conversationType === 'project_thread' ||
    conversation.conversationType === 'process_thread' ||
    (conversation.conversationType !== 'direct_ai' &&
      conversation.participantIds.length >= 3);

  // Group Admin is the group creator (stored in assigneeId, or first participant)
  const groupAdminId =
    conversation.assigneeId || conversation.participantIds[0] || 'collab-user-main';
  const isCurrentUserGroupAdmin = Boolean(
    activeCollaborator && activeCollaborator.id === groupAdminId
  );

  // Resolve human group members for group header subtitle & management menu (AI Agents are always available via @, not group members)
  const currentGroupMembers = conversation.participantIds
    .map((pid) => collaborators.find((col) => col.id === pid))
    .filter((c): c is Collaborator => c != null && !c.isAi);

  const nonMemberHumanCollaborators = collaborators.filter(
    (c) => !c.isAi && !conversation.participantIds.includes(c.id)
  );

  const handleAddMemberToGroup = async (collabId: string) => {
    if (!onUpdateParticipants || !isCurrentUserGroupAdmin) return;
    if (conversation.participantIds.includes(collabId)) return;
    const nextIds = [...conversation.participantIds, collabId];
    await onUpdateParticipants(conversation.id, nextIds);
  };

  const handleRemoveMemberFromGroup = async (collabId: string) => {
    if (!onUpdateParticipants || !isCurrentUserGroupAdmin || collabId === groupAdminId) {
      return;
    }
    const nextIds = conversation.participantIds.filter((id) => id !== collabId);
    await onUpdateParticipants(conversation.id, nextIds);
  };

  const groupMemberNames = isGroup
    ? currentGroupMembers
        .map((member) =>
          activeCollaborator && member.id === activeCollaborator.id
            ? 'Vous'
            : member.name
        )
        .filter(Boolean)
    : [];

  // Resolve primary interlocutor (Collaborator or AI Agent) for 1-on-1 Messenger/WhatsApp-style header
  const resolveInterlocutor = (): Collaborator | undefined => {
    if (conversation.assigneeId) {
      const assigned = collaborators.find((col) => col.id === conversation.assigneeId);
      if (assigned && (assigned.isAi || assigned.id !== activeCollaborator?.id)) {
        return assigned;
      }
    }
    const otherParticipantId = conversation.participantIds.find(
      (pid) => pid !== activeCollaborator?.id
    );
    if (otherParticipantId) {
      const other = collaborators.find((col) => col.id === otherParticipantId);
      if (other) return other;
    }
    const lastNonSelfMsg = [...conversation.messages]
      .reverse()
      .find((m) => m.senderId && m.senderId !== activeCollaborator?.id);
    if (lastNonSelfMsg) {
      const senderCollab = collaborators.find((col) => col.id === lastNonSelfMsg.senderId);
      if (senderCollab) return senderCollab;
    }
    return collaborators.find((col) => col.id === conversation.assigneeId);
  };

  const interlocutor = !isGroup ? resolveInterlocutor() : undefined;
  const rawDisplayName = isGroup
    ? conversation.title
    : interlocutor
    ? interlocutor.name
    : conversation.title;
  const displayName = rawDisplayName.replace(/^[^\p{L}\p{N}]+/gu, '').trim();
  const humanGroupMemberCount = Math.max(currentGroupMembers.length, 2);
  const displaySubtitle = isGroup
    ? groupMemberNames.length > 0
      ? groupMemberNames.join(', ')
      : `${humanGroupMemberCount} membres`
    : interlocutor?.roleTitle || '';
  const avatarInitials =
    interlocutor?.avatarInitials ||
    displayName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  const avatarColor = interlocutor?.avatarColor || '#1F93FF';

  const nodeMap = new Map((currentProcess?.nodes || []).map((n) => [n.id, n.label]));
  const ruleMap = new Map((currentProcess?.businessRules || []).map((r) => [r.id, r.title]));

  // Detect active @mention query before the cursor
  const textBeforeCursor = content.slice(0, cursorPos || content.length);
  const mentionMatch = !mentionDismissed
    ? textBeforeCursor.match(/(?:^|\s)@([A-Za-z0-9_\-\u00C0-\u017F]*)$/)
    : null;
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;

  // @Mention rule:
  // - ALL AI Agents are ALWAYS available in @
  // - Human collaborators are ONLY available if they belong to this conversation/group
  const allowedMentionTargets = collaborators.filter((c) => {
    if (c.isAi) return true;
    return (
      conversation.participantIds.includes(c.id) ||
      conversation.assigneeId === c.id
    );
  });

  const filteredMentions =
    mentionQuery !== null
      ? allowedMentionTargets.filter((c) => {
          if (!mentionQuery) return true;
          return (
            c.handle.toLowerCase().includes(mentionQuery) ||
            c.name.toLowerCase().includes(mentionQuery) ||
            (c.roleTitle || '').toLowerCase().includes(mentionQuery)
          );
        })
      : [];

  const isMentionOpen = mentionQuery !== null && filteredMentions.length > 0;
  const safeMentionIndex = isMentionOpen
    ? Math.min(mentionIndex, filteredMentions.length - 1)
    : 0;

  const handleSelectMention = (collab: Collaborator) => {
    const effectiveCursor = cursorPos || content.length;
    const before = content.slice(0, effectiveCursor);
    const after = content.slice(effectiveCursor);
    const replacedBefore = before.replace(
      /(@[A-Za-z0-9_\-\u00C0-\u017F]*)$/,
      `@${collab.handle} `
    );
    const nextContent = replacedBefore + after;
    setContent(nextContent);
    setCursorPos(replacedBefore.length);
    setMentionIndex(0);
    setMentionDismissed(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(replacedBefore.length, replacedBefore.length);
      }
    }, 0);
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        const newAtt: ChatAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          isImage: file.type.startsWith('image/'),
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!content.trim() && attachments.length === 0) || sending) return;
    setSending(true);
    try {
      const messageText =
        content.trim() ||
        `📎 ${attachments.map((a) => a.name).join(', ')}`;
      await onSendMessage({
        content: messageText,
        isPrivateNote: false,
        linkedNodeIds: selectedNodeIds,
        linkedRuleIds: selectedRuleIds,
        actionPayload: attachments.length > 0 ? { attachments } : null,
      });
      setContent('');
      setCursorPos(0);
      setSelectedNodeIds([]);
      setSelectedRuleIds([]);
      setAttachments([]);
      setShowLinkPicker(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isMentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredMentions[safeMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionDismissed(true);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const visibleMessages = conversation.messages.filter(
    (msg) => !msg.isPrivateNote && msg.messageType !== 'private_note'
  );

  return (
    <main
      className="flex-1 h-full bg-white flex flex-col min-w-0 overflow-hidden relative"
      aria-label="Fil de conversation"
    >
      {/* Clean Messenger / WhatsApp Thread Header (Group vs 1-on-1) */}
      <header className="px-4 py-2.5 border-b border-[#ECEEF0] bg-white flex items-center justify-between gap-3 shrink-0 relative z-20">
        <div className="min-w-0 flex items-center gap-3">
          {isGroup ? (
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#5B5BD6] text-white flex items-center justify-center shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-1 px-1 rounded-full bg-white border border-[#DFE3E6] text-[#5B5BD6] text-[9px] font-cw-620 leading-tight">
                {humanGroupMemberCount}
              </span>
            </div>
          ) : (
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-full text-white text-[12px] font-cw-620 flex items-center justify-center shadow-2xs"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarInitials}
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 ${
                  interlocutor?.presenceStatus === 'busy' ? 'bg-amber-400' : 'bg-[#30A46C]'
                }`}
              />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[14.5px] font-cw-620 text-[#1C2024] truncate leading-tight">
                {displayName}
              </h2>
              {isGroup && (
                <button
                  type="button"
                  onClick={() => setShowMembersMenu((v) => !v)}
                  className="px-2 py-0.5 rounded-full bg-[#EEF0FF] hover:bg-[#E0E4FF] text-[#5B5BD6] text-[10.5px] font-cw-620 shrink-0 flex items-center gap-1 transition"
                  title={
                    isCurrentUserGroupAdmin
                      ? 'Cliquer pour ajouter ou retirer un membre du groupe'
                      : 'Voir les membres du groupe'
                  }
                >
                  {isCurrentUserGroupAdmin ? (
                    <UserPlus className="w-3 h-3" />
                  ) : (
                    <Users className="w-3 h-3" />
                  )}
                  <span>
                    Groupe · {humanGroupMemberCount} membres
                    {isCurrentUserGroupAdmin ? ' (Gérer)' : ''}
                  </span>
                </button>
              )}
            </div>
            {displaySubtitle && (
              <p className="text-[11.5px] text-[#60646C] truncate leading-tight mt-0.5">
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Header Action: Toggle Details Panel */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleDetails}
            className="p-1.5 rounded-lg border border-[#ECEEF0] text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024] transition"
            title={detailsOpen ? 'Masquer les détails' : 'Afficher les détails'}
          >
            {detailsOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Floating Group Members Popover (Admin Only for Add / Remove) */}
        {isGroup && showMembersMenu && (
          <div className="absolute left-4 top-14 w-84 bg-white border border-[#DFE3E6] rounded-xl shadow-2xl p-3 z-40 text-[12px] space-y-3">
            <div className="flex items-center justify-between border-b border-[#ECEEF0] pb-2">
              <span className="font-cw-620 text-[#1C2024] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#5B5BD6]" />
                <span>Membres du groupe ({currentGroupMembers.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMembersMenu(false)}
                className="text-[#8B8D98] hover:text-[#1C2024]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Current Members List */}
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {currentGroupMembers.map((member) => {
                const isSelf = activeCollaborator?.id === member.id;
                const isMemberAdmin = member.id === groupAdminId;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[#FAFAFA]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full text-white text-[10px] font-cw-620 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: member.avatarColor || '#1F93FF' }}
                      >
                        {member.avatarInitials}
                      </span>
                      <div className="min-w-0">
                        <div className="font-cw-520 text-[#1C2024] truncate flex items-center gap-1.5">
                          <span className="truncate">
                            {member.name} {isSelf && '(Vous)'}
                          </span>
                          {isMemberAdmin && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#EEF0FF] border border-[#5B5BD6]/25 text-[#5B5BD6] text-[10px] font-cw-620 shrink-0">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>Admin</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-[#8B8D98] truncate">
                          @{member.handle}
                        </div>
                      </div>
                    </div>

                    {isCurrentUserGroupAdmin && !isMemberAdmin && onUpdateParticipants && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberFromGroup(member.id)}
                        className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-cw-520 flex items-center gap-1 shrink-0 transition"
                        title="Retirer ce membre du groupe"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>Retirer</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin-Only Section: Add Collaborators Not Yet in Group */}
            {isCurrentUserGroupAdmin ? (
              <div className="border-t border-[#ECEEF0] pt-2 space-y-1.5">
                <div className="text-[11px] font-cw-620 text-[#60646C]">
                  Ajouter un collaborateur au groupe :
                </div>
                {nonMemberHumanCollaborators.length === 0 ? (
                  <div className="text-[11px] text-[#8B8D98] py-1">
                    Tous les collaborateurs font déjà partie de ce groupe.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {nonMemberHumanCollaborators.map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[#FAFAFA]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded-full text-white text-[10px] font-cw-620 flex items-center justify-center shrink-0"
                            style={{ backgroundColor: collab.avatarColor || '#1F93FF' }}
                          >
                            {collab.avatarInitials}
                          </span>
                          <span className="truncate font-cw-520 text-[#1C2024]">
                            {collab.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddMemberToGroup(collab.id)}
                          className="px-2 py-0.5 rounded-md bg-[#EBF5FF] hover:bg-[#1F93FF] text-[#1F93FF] hover:text-white text-[11px] font-cw-620 flex items-center gap-1 shrink-0 transition"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Ajouter</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-[#ECEEF0] pt-2 text-[11px] text-[#8B8D98]">
                Seul l'administrateur du groupe peut ajouter ou retirer des membres.
              </div>
            )}
          </div>
        )}
      </header>

      {/* Scrollable Message Stream */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-[#FAFAFA]/50">
        {visibleMessages.map((msg) => {
          const isOutgoing =
            !msg.senderIsAi &&
            activeCollaborator &&
            msg.senderId === activeCollaborator.id;
          const isMeetingCard =
            msg.messageType === 'meeting_card' ||
            msg.actionPayload?.actionType === 'outlook_meeting_card';

          // Centered Activity Message
          if (msg.messageType === 'activity') {
            return (
              <div key={msg.id} className="flex justify-center my-1">
                <span className="px-3 py-1 rounded-full bg-[#F2F3F7] text-[#60646C] text-[11.5px] font-cw-460">
                  {msg.content}
                </span>
              </div>
            );
          }

          const cleanedText = cleanBubbleText(msg.content);

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                isOutgoing ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Sender Avatar */}
              <div
                className="w-8 h-8 rounded-full text-white text-xs font-cw-620 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
                style={{ backgroundColor: msg.senderAvatarColor || '#1F93FF' }}
              >
                {msg.senderAvatarInitials || 'PA'}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-2xs ${
                  msg.senderIsAi
                    ? 'bg-[#F2F3F7] border border-[#1F93FF]/25 text-[#1C2024]'
                    : isOutgoing
                    ? 'bg-[#DDF0FF] text-[#1C2024]'
                    : 'bg-[#F2F3F7] text-[#1C2024]'
                }`}
              >
                {/* Bubble Header: Sender Name + Timestamp */}
                <div className="flex items-center justify-between gap-3 mb-1 text-[11.5px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-cw-620 text-[#1C2024] truncate">
                      {(msg.senderName || '').replace(/^[^\p{L}\p{N}]+/gu, '').trim()}
                    </span>
                    {msg.senderIsAi && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#EBF5FF] text-[#1F93FF] text-[10px] font-cw-620 shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>IA</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] text-[#8B8D98] shrink-0">
                    {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Formatted Content with interactive @mention and RG-* highlights */}
                <div className="whitespace-pre-line break-words">
                  {cleanedText.split(/(@[A-Za-z0-9_\-\u00C0-\u017F]+|RG-[A-Z0-9\-]+)/g).map((part, idx) => {
                    if (part.startsWith('@')) {
                      return (
                        <span
                          key={idx}
                          className="inline-block px-1.5 py-0.2 mx-0.5 rounded bg-[#EBF5FF] text-[#1F93FF] font-cw-620 text-[12.5px]"
                        >
                          {part}
                        </span>
                      );
                    }
                    if (part.startsWith('RG-')) {
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onJumpToStudioNode(conversation.processId)}
                          className="inline-block px-1.5 py-0.2 mx-0.5 rounded bg-amber-100/80 text-amber-900 font-cw-620 text-[12px] hover:bg-amber-200 transition"
                          title="Cliquer pour ouvrir cette règle dans le Studio"
                        >
                          {part}
                        </button>
                      );
                    }
                    return <React.Fragment key={idx}>{part}</React.Fragment>;
                  })}
                </div>

                {/* Attached Images & Files inside Message Bubble */}
                {Array.isArray(msg.actionPayload?.attachments) &&
                  msg.actionPayload.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {(msg.actionPayload.attachments as ChatAttachment[]).map((att) =>
                        att.isImage ? (
                          <div
                            key={att.id}
                            className="rounded-xl overflow-hidden border border-black/10 bg-white/80 max-w-xs"
                          >
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              title={`Télécharger ${att.name}`}
                              className="block relative group"
                            >
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="max-h-56 w-full object-cover block"
                              />
                              <div className="px-2.5 py-1.5 bg-white/95 border-t border-[#ECEEF0] flex items-center justify-between gap-2 text-[11px] text-[#1C2024]">
                                <span className="truncate font-cw-520">{att.name}</span>
                                <span className="inline-flex items-center gap-1 text-[#1F93FF] font-cw-620 shrink-0">
                                  <Download className="w-3 h-3" />
                                  <span>{formatFileSize(att.size)}</span>
                                </span>
                              </div>
                            </a>
                          </div>
                        ) : (
                          <a
                            key={att.id}
                            href={att.dataUrl}
                            download={att.name}
                            title={`Télécharger ${att.name}`}
                            className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white/95 hover:bg-white border border-[#DFE3E6] transition group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#EBF5FF] text-[#1F93FF] flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] font-cw-620 text-[#1C2024] truncate">
                                  {att.name}
                                </div>
                                <div className="text-[10.5px] text-[#8B8D98]">
                                  {formatFileSize(att.size)}
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-1 rounded-lg bg-[#F2F3F7] group-hover:bg-[#1F93FF] text-[#60646C] group-hover:text-white text-[11px] font-cw-520 flex items-center gap-1 transition shrink-0">
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger</span>
                            </div>
                          </a>
                        )
                      )}
                    </div>
                  )}

                {/* Linked Process Steps & Business Rules Chips */}
                {(msg.linkedNodeIds.length > 0 || msg.linkedRuleIds.length > 0) && (
                  <div className="flex items-center flex-wrap gap-1.5 mt-2 pt-2 border-t border-black/5">
                    {msg.linkedNodeIds.map((nid) => {
                      const fullLabel = nodeMap.get(nid) || nid;
                      return (
                        <button
                          key={nid}
                          type="button"
                          onClick={() => onJumpToStudioNode(conversation.processId, nid)}
                          className="apple-pressable inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 hover:bg-[#1F93FF] text-[#1C2024] hover:text-white border border-[#DFE3E6] text-[11px] font-cw-520 transition max-w-[210px]"
                          title={`Étape liée : ${fullLabel} (Cliquer pour ouvrir dans le Studio)`}
                        >
                          <Workflow className="w-3 h-3 text-[#1F93FF] shrink-0" />
                          <span className="truncate">{fullLabel}</span>
                        </button>
                      );
                    })}
                    {msg.linkedRuleIds.map((rid) => {
                      const fullRuleTitle = ruleMap.get(rid);
                      return (
                        <button
                          key={rid}
                          type="button"
                          onClick={() => onJumpToStudioNode(conversation.processId)}
                          className="apple-pressable inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 hover:bg-amber-600 text-[#1C2024] hover:text-white border border-[#DFE3E6] text-[11px] font-cw-620 transition"
                          title={
                            fullRuleTitle
                              ? `${rid} — ${fullRuleTitle} (Cliquer pour ouvrir dans le Studio)`
                              : `Règle ${rid} (Cliquer pour ouvrir dans le Studio)`
                          }
                        >
                          <BookOpen className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{rid}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Outlook Meeting Card inside Chat */}
                {isMeetingCard && msg.actionPayload?.meeting && (
                  <div className="mt-2.5">
                    <MeetingChatCard meeting={msg.actionPayload.meeting} compact />
                  </div>
                )}

                {/* AI Collaborator Action Card (1-Click Deliverable into Studio / Rules / QA / Outlook) */}
                {msg.actionPayload &&
                  msg.actionPayload.actionType &&
                  msg.actionPayload.actionType !== 'outlook_meeting_card' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-white border border-[#1F93FF]/30 space-y-2">
                      <div className="flex items-center justify-between text-[11.5px] font-cw-620 text-[#1C2024]">
                        <span className="flex items-center gap-1.5 text-[#1F93FF]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Livrable exécutable en 1 clic</span>
                        </span>
                        {msg.actionPayload.applied && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px]">
                            <Check className="w-3 h-3" />
                            Appliqué
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(msg.actionPayload.applied) || applyingMsgId === msg.id}
                          onClick={async () => {
                            setApplyingMsgId(msg.id);
                            try {
                              await onApplyAgentAction(msg.id);
                            } finally {
                              setApplyingMsgId(null);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-cw-620 flex items-center gap-1.5 transition ${
                            msg.actionPayload.applied
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-[#1F93FF] hover:bg-[#007BE5] text-white shadow-xs'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {applyingMsgId === msg.id
                              ? 'Application en cours...'
                              : msg.actionPayload.applied
                              ? '✅ Appliqué avec succès'
                              : msg.actionPayload.buttonLabel || 'Appliquer au processus'}
                          </span>
                        </button>

                        {conversation.processId && (
                          <button
                            type="button"
                            onClick={() => onJumpToStudioNode(conversation.processId)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#DFE3E6] hover:bg-[#FAFAFA] text-[11.5px] font-cw-520 text-[#1C2024] flex items-center gap-1"
                          >
                            <Workflow className="w-3.5 h-3.5 text-[#1F93FF]" />
                            <span>Voir dans le Studio</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Single-Line Messenger / WhatsApp Composer (Raised higher above the macOS Dock) */}
      <div className="border-t border-[#ECEEF0] px-4 pt-3 pb-32 bg-white relative">
        {/* Hidden File Inputs for Images and Documents */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.json,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Floating @Mention Autocomplete Dropdown (Collaborators & AI Agents) */}
        {isMentionOpen && (
          <div
            role="listbox"
            aria-label="Suggestions de mention"
            className="mb-2.5 bg-white border border-[#DFE3E6] rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto z-30"
          >
            <div className="px-3 py-1.5 bg-[#FAFAFA] border-b border-[#ECEEF0] flex items-center justify-between text-[11px] text-[#60646C] font-cw-520">
              <span>Mentionner un collaborateur ou un Agent IA</span>
              <span className="text-[10.5px] text-[#8B8D98]">↑↓ Entrée pour choisir</span>
            </div>
            <div className="divide-y divide-[#ECEEF0]/60">
              {filteredMentions.map((collab, idx) => {
                const active = idx === safeMentionIndex;
                return (
                  <button
                    key={collab.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectMention(collab);
                    }}
                    onMouseEnter={() => setMentionIndex(idx)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition ${
                      active ? 'bg-[#EBF5FF]/80' : 'hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full text-white text-[10.5px] font-cw-620 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: collab.avatarColor || '#1F93FF' }}
                      >
                        {collab.avatarInitials || 'PA'}
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-block px-1.5 py-0.2 rounded bg-[#EBF5FF] text-[#1F93FF] font-cw-620 text-[12px]">
                          @{collab.handle}
                        </span>
                        <span className="text-[12.5px] font-cw-620 text-[#1C2024] truncate">
                          {collab.name.replace(/^[^\p{L}\p{N}]+/gu, '').trim()}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-cw-520 ${
                        collab.isAi
                          ? 'bg-[#EBF5FF] text-[#1F93FF]'
                          : 'bg-[#F2F3F7] text-[#60646C]'
                      }`}
                    >
                      {collab.isAi ? 'Agent IA' : collab.roleTitle || 'Collaborateur'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview Strip of Selected Files / Images Before Sending */}
        {attachments.length > 0 && (
          <div className="mb-2.5 flex items-center flex-wrap gap-2 p-2 rounded-xl bg-[#FAFAFA] border border-[#DFE3E6]">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg bg-white border border-[#DFE3E6] shadow-2xs max-w-[230px]"
              >
                {att.isImage ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-8 h-8 rounded-md object-cover border border-[#ECEEF0] shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-[#EBF5FF] text-[#1F93FF] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-cw-620 text-[#1C2024] truncate">
                    {att.name}
                  </div>
                  <div className="text-[10px] text-[#8B8D98]">
                    {formatFileSize(att.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="p-1 rounded-md text-[#8B8D98] hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                  title="Retirer cette pièce jointe"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Paperclip Attachment Menu: Files, Images & Process Step / Rule Links */}
        {showLinkPicker && (
          <div className="mb-2.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#DFE3E6] space-y-3 text-[11.5px]">
            {/* Row 1: Upload Files or Images from Computer */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#ECEEF0]">
              <span className="font-cw-620 text-[#1C2024]">
                Joindre depuis votre ordinateur
              </span>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EBF5FF] text-[#1C2024] hover:text-[#1F93FF] border border-[#DFE3E6] hover:border-[#1F93FF]/40 font-cw-520 flex items-center gap-1.5 transition shadow-2xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#1F93FF]" />
                  <span>Image / Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EBF5FF] text-[#1C2024] hover:text-[#1F93FF] border border-[#DFE3E6] hover:border-[#1F93FF]/40 font-cw-520 flex items-center gap-1.5 transition shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1F93FF]" />
                  <span>Fichier / Document (PDF, Word, Excel...)</span>
                </button>
              </div>
            </div>

            {/* Row 2: Optional Process Steps & Business Rules */}
            {currentProcess && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="font-cw-620 text-[#1C2024] mb-1">
                    Lier une étape ({currentProcess.name})
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {currentProcess.nodes.map((n) => {
                      const active = selectedNodeIds.includes(n.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() =>
                            setSelectedNodeIds((prev) =>
                              prev.includes(n.id)
                                ? prev.filter((x) => x !== n.id)
                                : [...prev, n.id]
                            )
                          }
                          className={`px-2 py-0.5 rounded border text-[11px] transition ${
                            active
                              ? 'bg-[#1F93FF] text-white border-[#1F93FF]'
                              : 'bg-white text-[#60646C] border-[#DFE3E6]'
                          }`}
                        >
                          {n.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="font-cw-620 text-[#1C2024] mb-1">
                    Lier une règle de gestion
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {currentProcess.businessRules.map((r) => {
                      const active = selectedRuleIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() =>
                            setSelectedRuleIds((prev) =>
                              prev.includes(r.id)
                                ? prev.filter((x) => x !== r.id)
                                : [...prev, r.id]
                            )
                          }
                          className={`px-2 py-0.5 rounded border text-[11px] transition ${
                            active
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-[#60646C] border-[#DFE3E6]'
                          }`}
                        >
                          {r.id}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single-Line Messenger / WhatsApp Bar: [📎] + [Écrivez un message...] + [Envoyer] */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLinkPicker((v) => !v)}
            title="Joindre un fichier, une image, une étape ou une règle"
            className={`px-2.5 py-2 rounded-xl border text-[12px] font-cw-520 flex items-center gap-1.5 transition shrink-0 ${
              attachments.length > 0 ||
              selectedNodeIds.length > 0 ||
              selectedRuleIds.length > 0 ||
              showLinkPicker
                ? 'border-[#1F93FF] bg-[#EBF5FF] text-[#1F93FF]'
                : 'border-[#DFE3E6] bg-[#FAFAFA] text-[#60646C] hover:bg-[#F2F3F7] hover:text-[#1C2024]'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            {attachments.length + selectedNodeIds.length + selectedRuleIds.length > 0 && (
              <span>
                {attachments.length + selectedNodeIds.length + selectedRuleIds.length}
              </span>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setCursorPos(e.target.selectionStart ?? e.target.value.length);
              setMentionDismissed(false);
              setMentionIndex(0);
            }}
            onClick={(e) =>
              setCursorPos(e.currentTarget.selectionStart ?? e.currentTarget.value.length)
            }
            onKeyUp={(e) => {
              if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Escape') {
                setCursorPos(
                  e.currentTarget.selectionStart ?? e.currentTarget.value.length
                );
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez un message... (tapez @ pour mentionner)"
            className="flex-1 px-3.5 py-2 rounded-xl border border-[#DFE3E6] bg-[#FAFAFA] text-[13px] text-[#1C2024] focus:bg-white focus:border-[#1F93FF] focus:outline-none transition"
          />

          <button
            type="submit"
            disabled={sending || (!content.trim() && attachments.length === 0)}
            className="px-4 py-2 rounded-xl text-[12.5px] font-cw-620 flex items-center gap-1.5 shadow-xs transition shrink-0 bg-[#1F93FF] hover:bg-[#007BE5] text-white disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Envoyer</span>
          </button>
        </form>
      </div>
    </main>
  );
};


