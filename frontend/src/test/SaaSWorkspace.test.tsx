import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { AppSidebar } from '../components/layout/AppSidebar';
import { ConversationList } from '../components/conversations/ConversationList';
import { ConversationThread } from '../components/conversations/ConversationThread';
import { AIAgentBuilderModal } from '../components/modals/AIAgentBuilderModal';
import { MeetingChatCard } from '../components/agenda/MeetingChatCard';
import { MacLaunchpadView } from '../components/launchpad/MacLaunchpadView';
import { MacDock } from '../components/launchpad/MacDock';
import { Collaborator, Conversation, Meeting, Project, Team, TagItem, Category } from '../types/process';

const MOCK_COLLABORATORS: Collaborator[] = [
  {
    id: 'collab-user-main',
    name: 'Khalil Benhassen',
    handle: 'khalil',
    roleTitle: 'Responsable Projet',
    teamId: 'team-1',
    email: 'khalil.benhassen@organisation.fr',
    avatarInitials: 'KB',
    avatarColor: '#1F93FF',
    presenceStatus: 'online',
    isAi: false,
    aiSpecialty: '',
    systemPrompt: '',
    aiCapabilities: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent-copilot',
    name: '🤖 Architect Copilot',
    handle: 'Copilot',
    roleTitle: 'Orchestrateur & Conseil',
    teamId: 'team-1',
    email: '',
    avatarInitials: 'AC',
    avatarColor: '#1F93FF',
    presenceStatus: 'online',
    isAi: true,
    aiSpecialty: 'orchestrator',
    systemPrompt: 'Orchestrateur principal.',
    aiCapabilities: ['model_steps', 'audit_rules', 'generate_qa', 'summarize_and_schedule'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent-modelisateur',
    name: '📐 Agent Modélisateur',
    handle: 'Modelisateur',
    roleTitle: 'Architecture de Flux & BPMN',
    teamId: 'team-1',
    email: '',
    avatarInitials: 'AM',
    avatarColor: '#7C3AED',
    presenceStatus: 'online',
    isAi: true,
    aiSpecialty: 'modeler',
    systemPrompt: 'Transforme un besoin texte en étapes.',
    aiCapabilities: ['model_steps'],
    createdAt: new Date().toISOString(),
  },
];

const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Transformation Opérationnelle',
    description: 'Projet générique paramétrable',
    categoryId: 'cat-1',
    status: 'active',
    ownerId: 'collab-user-main',
    ownerName: 'Khalil Benhassen',
    tags: ['prioritaire'],
    processIds: ['demo-rachat-partiel'],
    memberIds: ['collab-user-main', 'agent-copilot'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Équipe Architecture',
    color: '#1F93FF',
    description: 'Équipe transversale',
    memberIds: ['collab-user-main', 'agent-copilot'],
    createdAt: new Date().toISOString(),
  },
];

const MOCK_TAGS: TagItem[] = [
  {
    id: 'tag-1',
    name: 'prioritaire',
    color: '#EF4444',
    scope: 'both',
    createdAt: new Date().toISOString(),
  },
];

const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Opérations',
    color: '#1F93FF',
    description: 'Catégorie générique',
    createdAt: new Date().toISOString(),
  },
];

const MOCK_CONVERSATION: Conversation = {
  id: 'conv-1',
  title: 'Cadrage du flux et règles de contrôle',
  conversationType: 'project_thread',
  status: 'open',
  priority: 'high',
  projectId: 'proj-1',
  processId: 'demo-rachat-partiel',
  linkedNodeIds: [],
  linkedRuleIds: [],
  assigneeId: 'collab-user-main',
  teamId: 'team-1',
  participantIds: ['collab-user-main', 'agent-copilot', 'agent-modelisateur'],
  tags: ['prioritaire'],
  unreadCount: 1,
  lastMessagePreview: 'Voici la proposition de modélisation',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'collab-user-main',
      senderName: 'Khalil Benhassen',
      senderHandle: 'khalil',
      senderAvatarInitials: 'KB',
      senderAvatarColor: '#1F93FF',
      senderIsAi: false,
      content: 'Bonjour @Modelisateur peux-tu structurer les étapes ?',
      messageType: 'message',
      isPrivateNote: false,
      mentionedHandles: ['Modelisateur'],
      linkedNodeIds: [],
      linkedRuleIds: [],
      actionPayload: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'collab-user-main',
      senderName: 'Khalil Benhassen',
      senderHandle: 'khalil',
      senderAvatarInitials: 'KB',
      senderAvatarColor: '#1F93FF',
      senderIsAi: false,
      content: 'Décision interne : valider le jalon avant vendredi.',
      messageType: 'private_note',
      isPrivateNote: true,
      mentionedHandles: [],
      linkedNodeIds: [],
      linkedRuleIds: [],
      actionPayload: null,
      createdAt: new Date().toISOString(),
    },
  ],
};

const MOCK_MEETING: Meeting = {
  id: 'meet-1',
  title: 'Revue Architecture & Validation Outlook',
  projectId: 'proj-1',
  processId: 'demo-rachat-partiel',
  conversationId: 'conv-1',
  organizerId: 'collab-user-main',
  organizerName: 'Khalil Benhassen',
  attendeeIds: ['collab-user-main'],
  attendeeEmails: ['khalil.benhassen@organisation.fr'],
  startAt: '2026-10-30T14:00:00Z',
  endAt: '2026-10-30T14:45:00Z',
  durationMinutes: 45,
  locationOrLink: 'Microsoft Teams / Outlook',
  agendaNotes: 'Ordre du jour : validation des étapes et règles RG.',
  outlookSyncStatus: 'ready_to_sync',
  outlookWebLink: 'https://outlook.office.com/calendar/0/deeplink/compose?subject=Revue',
  createdAt: new Date().toISOString(),
};

describe('SaaS B2B Chatwoot Workspace & AI Collaborator Agents', () => {
  it('renders AppSidebar with tree-line sections, AI Collaborators, and Espace Vierge button', () => {
    render(
      <AppSidebar
        activeSection="conversations"
        onSelectSection={vi.fn()}
        conversationFilter={{ mode: 'all' }}
        onSelectConversationFilter={vi.fn()}
        projects={MOCK_PROJECTS}
        processes={[]}
        onSelectProject={vi.fn()}
        onSelectProcess={vi.fn()}
        categories={MOCK_CATEGORIES}
        teams={MOCK_TEAMS}
        tags={MOCK_TAGS}
        collaborators={MOCK_COLLABORATORS}
        conversations={[MOCK_CONVERSATION]}
        meetings={[MOCK_MEETING]}
        activeCollaborator={MOCK_COLLABORATORS[0]}
        onChangeActiveCollaborator={vi.fn()}
        onUpdatePresence={vi.fn()}
        onCreateProject={vi.fn()}
        onCreateTeam={vi.fn()}
        onCreateTag={vi.fn()}
        onCreateCategory={vi.fn()}
        onOpenAgentBuilder={vi.fn()}
        onOpenAgentChat={vi.fn()}
        onResetBlankWorkspace={vi.fn()}
      />
    );

    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getAllByText('🤖 Architect Copilot').length).toBeGreaterThan(0);
    expect(screen.getByText('+ Créer un Agent IA')).toBeInTheDocument();
    expect(screen.getAllByText('Transformation Opérationnelle').length).toBeGreaterThan(0);
    expect(screen.getByText('Paramètres (Espace vierge)')).toBeInTheDocument();
  });

  it('renders ConversationList with 2 tabs (Mes échanges | Agents IA) and Messenger/WhatsApp style preview', () => {
    render(
      <ConversationList
        conversations={[MOCK_CONVERSATION]}
        selectedConversationId="conv-1"
        onSelectConversation={vi.fn()}
        sidebarFilter={{ mode: 'all' }}
        onClearSidebarFilter={vi.fn()}
        projects={MOCK_PROJECTS}
        processes={[]}
        tags={MOCK_TAGS}
        collaborators={MOCK_COLLABORATORS}
        activeCollaborator={MOCK_COLLABORATORS[0]}
        onCreateConversation={vi.fn()}
        onDirectChatWithAgent={vi.fn()}
        onOpenAgentBuilder={vi.fn()}
      />
    );

    expect(screen.getByText('Mes échanges')).toBeInTheDocument();
    expect(screen.getByText('Agents IA')).toBeInTheDocument();
    expect(screen.getByText('Khalil Benhassen')).toBeInTheDocument();
    expect(screen.getByText('Décision interne : valider le jalon avant vendredi.')).toBeInTheDocument();
  });

  it('renders ConversationThread with Private Notes (🔒) and @Agent quick invocation bar', () => {
    render(
      <ConversationThread
        conversation={MOCK_CONVERSATION}
        collaborators={MOCK_COLLABORATORS}
        projects={MOCK_PROJECTS}
        currentProcess={null}
        activeCollaborator={MOCK_COLLABORATORS[0]}
        onSendMessage={vi.fn()}
        onApplyAgentAction={vi.fn()}
        onToggleStatus={vi.fn()}
        onOpenMeetingModal={vi.fn()}
        onOpenAgentBuilder={vi.fn()}
        onJumpToStudioNode={vi.fn()}
        detailsPanelOpen={true}
        onToggleDetailsPanel={vi.fn()}
      />
    );

    expect(screen.getByText("Note Privée d'Équipe")).toBeInTheDocument();
    expect(screen.getByText('Décision interne : valider le jalon avant vendredi.')).toBeInTheDocument();
    expect(screen.getAllByText('@Copilot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('@Modelisateur').length).toBeGreaterThan(0);
  });

  it('renders AIAgentBuilderModal for creating or configuring AI Collaborator Agents', () => {
    render(
      <AIAgentBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        editingAgent={null}
        teams={MOCK_TEAMS}
        onSaveAgent={vi.fn()}
      />
    );

    expect(screen.getByText('Créer un Agent IA Collaborateur')).toBeInTheDocument();
    expect(screen.getByText("Nom de l'Agent IA")).toBeInTheDocument();
    expect(screen.getByText('Identifiant de mention (@handle)')).toBeInTheDocument();
  });

  it('renders MeetingChatCard with Microsoft Outlook Web 365 deep link and .ics export', () => {
    render(<MeetingChatCard meeting={MOCK_MEETING} />);

    expect(screen.getByText('Revue Architecture & Validation Outlook')).toBeInTheDocument();
    expect(screen.getByText('📅 Ouvrir dans Microsoft Outlook (Web / 365)')).toBeInTheDocument();
    expect(screen.getByText("📥 Télécharger l'invitation Outlook (.ics)")).toBeInTheDocument();
  });

  it('renders MacLaunchpadView with the 7 square illustrated categories and triggers navigation on click', () => {
    const onSelectCategory = vi.fn();
    render(
      <MacLaunchpadView
        onSelectCategory={onSelectCategory}
        activeCollaborator={MOCK_COLLABORATORS[0]}
        collaborators={MOCK_COLLABORATORS}
        conversations={[MOCK_CONVERSATION]}
        projects={MOCK_PROJECTS}
        meetings={[MOCK_MEETING]}
        currentProcess={null}
        onStartDirectAgentChat={vi.fn()}
      />
    );

    expect(screen.getByText('Conversations & Notes')).toBeInTheDocument();
    expect(screen.getByText('Agents IA Collaborateurs')).toBeInTheDocument();
    expect(screen.getByText('Studio BPMN, Règles & QA')).toBeInTheDocument();
    expect(screen.getByText('Projets & Jalons')).toBeInTheDocument();
    expect(screen.getByText('Agenda & Outlook')).toBeInTheDocument();
    expect(screen.getByText('Équipes & Intervenants')).toBeInTheDocument();
    expect(screen.getByText('Paramètres & Tags')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('launchpad-card-studio'));
    expect(onSelectCategory).toHaveBeenCalledWith('studio');
  });

  it('renders MacDock at the bottom center with Launchpad button and the 7 category icons', () => {
    const onSelectTarget = vi.fn();
    render(
      <MacDock
        activeTarget="studio"
        onSelectTarget={onSelectTarget}
        unreadConversationsCount={1}
        aiAgentsCount={2}
        rulesCount={3}
        projectsCount={1}
        meetingsCount={1}
        humanCollaboratorsCount={1}
      />
    );

    expect(screen.getByTestId('mac-dock')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-launchpad')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-conversations')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-ai_agents')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-studio')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-projects')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-agenda')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-teams')).toBeInTheDocument();
    expect(screen.getByTestId('dock-item-settings')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dock-item-conversations'));
    expect(onSelectTarget).toHaveBeenCalledWith('conversations');
  });
});

