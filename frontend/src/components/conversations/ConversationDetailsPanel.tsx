import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Mail,
  Sparkles,
  Workflow,
  BookOpen,
  Download,
  Settings2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ApprovalGate,
  Collaborator,
  Conversation,
  Meeting,
  Process,
  ProcessSummary,
  Project,
  TagItem,
  Team,
} from '../../types/process';
import { ChatAttachment } from './ConversationThread';

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface ConversationDetailsPanelProps {
  conversation: Conversation | null;
  activeCollaborator?: Collaborator | null;
  collaborators: Collaborator[];
  teams: Team[];
  tags: TagItem[];
  projects: Project[];
  processes: ProcessSummary[];
  currentProcess: Process | null;
  approvals: ApprovalGate[];
  meetings: Meeting[];
  onUpdateConversation: (convId: string, payload: Partial<Conversation>) => Promise<void>;
  onUpdateApproval: (
    approvalId: string,
    status: 'pending' | 'approved' | 'changes_requested'
  ) => Promise<void>;
  onCreateApproval: (label: string, reviewerId?: string | null) => Promise<void>;
  onOpenScheduleMeetingModal: () => void;
  onJumpToStudioNode: (processId: string | null | undefined, nodeId?: string) => void;
  onOpenAgentBuilder: (agent: Collaborator) => void;
}

export const ConversationDetailsPanel: React.FC<ConversationDetailsPanelProps> = ({
  conversation,
  activeCollaborator,
  collaborators,
  tags,
  currentProcess,
  onUpdateConversation,
  onJumpToStudioNode,
  onOpenAgentBuilder,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tagsPriority: true,
    linked: true,
    files: true,
  });

  if (!conversation) return null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentUserId = activeCollaborator?.id || 'collab-user-main';

  // Determine whether this is a Group Discussion vs a 1-on-1 Direct Discussion
  const isGroup =
    conversation.conversationType === 'project_thread' ||
    conversation.conversationType === 'process_thread' ||
    (conversation.conversationType !== 'direct_ai' &&
      conversation.participantIds.length >= 3);

  // Resolve 1-on-1 interlocutor (never the current user Khalil Benhassen)
  const resolveInterlocutor = (): Collaborator | undefined => {
    if (conversation.assigneeId) {
      const assigned = collaborators.find((col) => col.id === conversation.assigneeId);
      if (assigned && (assigned.isAi || assigned.id !== currentUserId)) {
        return assigned;
      }
    }
    const otherParticipantId = conversation.participantIds.find(
      (pid) => pid !== currentUserId
    );
    if (otherParticipantId) {
      const other = collaborators.find((col) => col.id === otherParticipantId);
      if (other) return other;
    }
    const lastNonSelfMsg = [...conversation.messages]
      .reverse()
      .find((m) => m.senderId && m.senderId !== currentUserId);
    if (lastNonSelfMsg) {
      const senderCollab = collaborators.find((col) => col.id === lastNonSelfMsg.senderId);
      if (senderCollab) return senderCollab;
    }
    return collaborators.find((col) => col.id !== currentUserId);
  };

  const interlocutor = !isGroup ? resolveInterlocutor() : undefined;

  // Collect all unique linked steps & rules (from conversation metadata + message bubbles)
  const allLinkedNodeIds = Array.from(
    new Set([
      ...conversation.linkedNodeIds,
      ...conversation.messages.flatMap((m) => m.linkedNodeIds || []),
    ])
  );

  const allLinkedRuleIds = Array.from(
    new Set([
      ...conversation.linkedRuleIds,
      ...conversation.messages.flatMap((m) => m.linkedRuleIds || []),
    ])
  );

  // Collect all shared files & images from conversation messages
  const sharedAttachments: Array<ChatAttachment & { senderName: string; createdAt: string }> =
    conversation.messages.flatMap((m) => {
      const list = Array.isArray(m.actionPayload?.attachments)
        ? (m.actionPayload.attachments as ChatAttachment[])
        : [];
      return list.map((att) => ({
        ...att,
        senderName: m.senderName,
        createdAt: m.createdAt,
      }));
    });

  const handleToggleTag = async (tagName: string) => {
    const nextTags = conversation.tags.includes(tagName)
      ? conversation.tags.filter((t) => t !== tagName)
      : [...conversation.tags, tagName];
    await onUpdateConversation(conversation.id, { tags: nextTags });
  };

  const priorityMeta: Record<
    string,
    { label: string; className: string } | undefined
  > = {
    urgent: {
      label: 'Urgente',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    high: {
      label: 'Haute',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    medium: {
      label: 'Moyenne',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    low: {
      label: 'Faible',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  };
  const activePriorityBadge = priorityMeta[conversation.priority];

  return (
    <aside
      className="w-[290px] h-full bg-white border-l border-[#ECEEF0] flex flex-col overflow-y-auto shrink-0 select-none text-[12.5px] text-[#1C2024] pb-32"
      aria-label="Détails de la conversation"
    >
      {/* Top Header: Clean Section Title for Groups (no duplicate with Column 2) OR Interlocutor Profile Card for 1-on-1 */}
      {isGroup ? (
        <div className="px-4 py-3 border-b border-[#ECEEF0] bg-[#FAFAFA]/60 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-cw-620 text-[#1C2024]">
              Informations & Contexte
            </div>
            <div className="text-[11px] text-[#60646C]">
              Éléments liés et fichiers du groupe
            </div>
          </div>
        </div>
      ) : (
        interlocutor && (
          <div className="p-4 border-b border-[#ECEEF0] bg-[#FAFAFA]/60">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div
                  className="w-11 h-11 rounded-full text-white text-sm font-cw-620 flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: interlocutor.avatarColor }}
                >
                  {interlocutor.avatarInitials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                    interlocutor.isAi || interlocutor.presenceStatus === 'online'
                      ? 'bg-[#30A46C]'
                      : interlocutor.presenceStatus === 'busy'
                      ? 'bg-[#F76B15]'
                      : 'bg-[#8B8D98]'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-cw-620 text-[#1C2024] truncate">
                  {interlocutor.name.replace(/^[^\p{L}\p{N}]+/gu, '').trim()}
                </div>
                <div className="text-[11.5px] text-[#60646C] truncate">
                  {interlocutor.roleTitle}
                </div>
                {interlocutor.email && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#8B8D98] mt-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{interlocutor.email}</span>
                  </div>
                )}
              </div>
            </div>

            {interlocutor.isAi && (
              <div className="mt-3 pt-2.5 border-t border-[#ECEEF0] flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-cw-520 text-[#1F93FF]">
                  <Sparkles className="w-3 h-3" />
                  <span>@{interlocutor.handle} • En ligne</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAgentBuilder(interlocutor)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-[#DFE3E6] hover:border-[#1F93FF] text-[11px] font-cw-520 text-[#1C2024] transition"
                >
                  <Settings2 className="w-3 h-3 text-[#1F93FF]" />
                  <span>Configurer IA</span>
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* Accordion 1: Tags & Priorité */}
      <div className="border-b border-[#ECEEF0]">
        <button
          type="button"
          onClick={() => toggleSection('tagsPriority')}
          className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-[#FAFAFA] transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-cw-620 text-[12.5px] text-[#1C2024]">
              Tags & Priorité
            </span>
            {activePriorityBadge && (
              <span
                className={`px-1.5 py-0.2 rounded border text-[10px] font-cw-620 ${activePriorityBadge.className}`}
              >
                {activePriorityBadge.label}
              </span>
            )}
          </div>
          {openSections.tagsPriority ? (
            <Minus className="w-3.5 h-3.5 text-[#60646C] shrink-0" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-[#60646C] shrink-0" />
          )}
        </button>

        {!openSections.tagsPriority && conversation.tags.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1">
            {conversation.tags.map((tagName) => {
              const tagObj = tags.find((t) => t.name === tagName);
              return (
                <span
                  key={tagName}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EBF5FF] border border-[#1F93FF]/30 text-[#1F93FF] text-[10.5px] font-cw-520"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-[2px]"
                    style={{ backgroundColor: tagObj?.color || '#1F93FF' }}
                  />
                  <span>{tagName}</span>
                </span>
              );
            })}
          </div>
        )}

        {openSections.tagsPriority && (
          <div className="px-4 pb-3.5 space-y-2.5">
            <div>
              <label className="block text-[11px] text-[#60646C] mb-1">Priorité</label>
              <select
                value={conversation.priority}
                onChange={(e) =>
                  onUpdateConversation(conversation.id, {
                    priority: e.target.value as any,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#DFE3E6] bg-[#FAFAFA] text-[11.5px] focus:outline-none focus:border-[#1F93FF]"
              >
                <option value="none">Aucune</option>
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#60646C] mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const active = conversation.tags.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTag(t.name)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-cw-520 border transition ${
                        active
                          ? 'bg-[#EBF5FF] border-[#1F93FF] text-[#1F93FF]'
                          : 'bg-[#FAFAFA] border-[#ECEEF0] text-[#60646C] hover:bg-[#F2F3F7]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-[2px]"
                        style={{ backgroundColor: t.color }}
                      />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Étapes & Règles liées (Clic = Studio) */}
      <div className="border-b border-[#ECEEF0]">
        <button
          type="button"
          onClick={() => toggleSection('linked')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition"
        >
          <span className="font-cw-620 text-[12.5px] text-[#1C2024]">
            Étapes & Règles liées ({allLinkedNodeIds.length + allLinkedRuleIds.length})
          </span>
          {openSections.linked ? (
            <Minus className="w-3.5 h-3.5 text-[#60646C]" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-[#60646C]" />
          )}
        </button>

        {openSections.linked && (
          <div className="px-4 pb-3.5 space-y-2.5">
            {allLinkedNodeIds.length === 0 && allLinkedRuleIds.length === 0 ? (
              <div className="text-[11.5px] text-[#8B8D98] py-1">
                Aucune étape ou règle liée dans cette discussion.
              </div>
            ) : (
              <>
                {allLinkedNodeIds.length > 0 && (
                  <div>
                    <div className="text-[11px] text-[#60646C] mb-1">
                      Étapes liées (Clic = Studio)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {allLinkedNodeIds.map((nid) => {
                        const nodeObj = currentProcess?.nodes.find((n) => n.id === nid);
                        return (
                          <button
                            key={nid}
                            type="button"
                            onClick={() => onJumpToStudioNode(conversation.processId, nid)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF5FF] text-[#1F93FF] text-[11px] font-cw-520 hover:bg-[#1F93FF] hover:text-white transition"
                          >
                            <Workflow className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[190px]">
                              {nodeObj?.label || nid}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {allLinkedRuleIds.length > 0 && (
                  <div>
                    <div className="text-[11px] text-[#60646C] mb-1">
                      Règles de gestion liées
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {allLinkedRuleIds.map((rid) => (
                        <button
                          key={rid}
                          type="button"
                          onClick={() => onJumpToStudioNode(conversation.processId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-cw-520 hover:bg-amber-100 transition"
                        >
                          <BookOpen className="w-3 h-3 shrink-0" />
                          <span>{rid}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Accordion 3: Fichiers & Images partagés */}
      <div className="border-b border-[#ECEEF0]">
        <button
          type="button"
          onClick={() => toggleSection('files')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition"
        >
          <span className="font-cw-620 text-[12.5px] text-[#1C2024]">
            Fichiers & Images partagés ({sharedAttachments.length})
          </span>
          {openSections.files ? (
            <Minus className="w-3.5 h-3.5 text-[#60646C]" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-[#60646C]" />
          )}
        </button>

        {openSections.files && (
          <div className="px-4 pb-3.5 space-y-2">
            {sharedAttachments.length === 0 ? (
              <div className="text-[11.5px] text-[#8B8D98] py-1">
                Aucun fichier ou image partagé dans cette discussion.
              </div>
            ) : (
              sharedAttachments.map((att) => (
                <a
                  key={att.id}
                  href={att.dataUrl}
                  download={att.name}
                  title={`Télécharger ${att.name}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#FAFAFA] hover:bg-[#EBF5FF]/50 border border-[#ECEEF0] hover:border-[#1F93FF]/30 transition group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {att.isImage ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-8 h-8 rounded-lg object-cover border border-[#DFE3E6] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#EBF5FF] text-[#1F93FF] flex items-center justify-center shrink-0">
                        {att.isImage ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-cw-620 text-[#1C2024] truncate">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-[#8B8D98] truncate">
                        {formatFileSize(att.size)} • {att.senderName}
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white group-hover:bg-[#1F93FF] text-[#60646C] group-hover:text-white border border-[#DFE3E6] group-hover:border-[#1F93FF] transition shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
