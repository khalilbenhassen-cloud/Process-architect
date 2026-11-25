import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgendaView } from './AgendaView';
import { Meeting, ProcessSummary, Project } from '../../types/process';

const TODAY_ISO = new Date(Date.now() + 2 * 3_600_000).toISOString();
const TOMORROW_ISO = new Date(Date.now() + 26 * 3_600_000).toISOString();
const PAST_ISO = new Date(Date.now() - 48 * 3_600_000).toISOString();

const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Demande de Rachat Partiel',
    description: '',
    status: 'active',
    tags: [],
    processIds: ['proc-1'],
    memberIds: [],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'proj-2',
    name: 'Sinistre Auto — Indemnisation Digitale',
    description: '',
    status: 'active',
    tags: [],
    processIds: ['proc-2'],
    memberIds: [],
    createdAt: '',
    updatedAt: '',
  },
];

const PROCESSES: ProcessSummary[] = [
  {
    id: 'proc-1',
    name: 'Rachat Partiel — TO-BE',
    description: '',
    lifecycleState: 'approved',
    modelState: 'to_be',
    version: '1.0',
    owner: 'MOA',
    nodeCount: 12,
    edgeCount: 12,
    ruleCount: 5,
    updatedAt: '',
  },
];

const MEETINGS: Meeting[] = [
  {
    id: 'meet-1',
    title: 'Comité MOA — Rachat Partiel',
    startAt: TODAY_ISO,
    durationMinutes: 45,
    locationOrLink: 'Microsoft Teams',
    attendeeEmails: ['a@org.fr', 'b@org.fr'],
    agendaNotes: '1. Revue des règles RG',
    projectId: 'proj-1',
    processId: 'proc-1',
    conversationId: 'conv-1',
    outlookWebLink: 'https://outlook.office.com/calendar/0/deeplink/compose',
    outlookSyncStatus: 'ready',
    createdBy: 'user-1',
    createdAt: '',
  },
  {
    id: 'meet-2',
    title: 'Atelier Sinistre Auto',
    startAt: TOMORROW_ISO,
    durationMinutes: 30,
    locationOrLink: 'Salle B',
    attendeeEmails: ['c@org.fr'],
    agendaNotes: 'Validation du flux AS-IS',
    projectId: 'proj-2',
    outlookWebLink: 'https://outlook.office.com/calendar/0/deeplink/compose',
    outlookSyncStatus: 'synced',
    createdBy: 'user-1',
    createdAt: '',
  },
  {
    id: 'meet-past',
    title: 'Cadrage initial (passé)',
    startAt: PAST_ISO,
    durationMinutes: 60,
    locationOrLink: 'Teams',
    attendeeEmails: [],
    agendaNotes: '',
    projectId: 'proj-1',
    outlookWebLink: 'https://outlook.office.com/calendar/0/deeplink/compose',
    outlookSyncStatus: 'synced',
    createdBy: 'user-1',
    createdAt: '',
  },
];

describe('AgendaView — Barre harmonisée Studio + Liste chronologique (Option A)', () => {
  it('regroupe les réunions à venir par jour, filtre par onglet/projet et déclenche les actions', () => {
    const onOpenScheduleModal = vi.fn();
    const onSyncOutlook = vi.fn().mockResolvedValue(undefined);
    const onDeleteMeeting = vi.fn().mockResolvedValue(undefined);
    const onOpenConversation = vi.fn();
    const onOpenProcessInStudio = vi.fn();
    const onDirectChatWithSecretary = vi.fn();

    render(
      <AgendaView
        meetings={MEETINGS}
        projects={PROJECTS}
        processes={PROCESSES}
        collaborators={[]}
        onOpenScheduleModal={onOpenScheduleModal}
        onSyncOutlook={onSyncOutlook}
        onDeleteMeeting={onDeleteMeeting}
        onOpenConversation={onOpenConversation}
        onOpenProcessInStudio={onOpenProcessInStudio}
        onDirectChatWithSecretary={onDirectChatWithSecretary}
      />
    );

    // Onglet "À venir" actif par défaut : affiche les 2 réunions à venir, masque la passée
    expect(screen.getByText('Comité MOA — Rachat Partiel')).toBeInTheDocument();
    expect(screen.getByText('Atelier Sinistre Auto')).toBeInTheDocument();
    expect(screen.queryByText('Cadrage initial (passé)')).not.toBeInTheDocument();

    // Regroupement par jour (Option A)
    expect(screen.getByText(/Aujourd’hui/i)).toBeInTheDocument();
    expect(screen.getByText(/Demain/i)).toBeInTheDocument();

    // Basculer sur "Passées"
    fireEvent.click(screen.getAllByRole('button', { name: /Passées/i })[0]);
    expect(screen.getByText('Cadrage initial (passé)')).toBeInTheDocument();
    expect(screen.queryByText('Atelier Sinistre Auto')).not.toBeInTheDocument();

    // Revenir sur "À venir" et tester les actions Studio / Synchroniser / Planifier / Secrétaire
    fireEvent.click(screen.getAllByRole('button', { name: /À venir/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir dans Studio/i }));
    expect(onOpenProcessInStudio).toHaveBeenCalledWith('proc-1');

    fireEvent.click(screen.getByRole('button', { name: /Synchroniser/i }));
    expect(onSyncOutlook).toHaveBeenCalledWith('meet-1');

    fireEvent.click(screen.getByRole('button', { name: /^Planifier$/i }));
    expect(onOpenScheduleModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Agent Secrétaire/i }));
    expect(onDirectChatWithSecretary).toHaveBeenCalledTimes(1);
  });
});
