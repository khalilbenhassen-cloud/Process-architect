import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamsDirectoryView } from './TeamsDirectoryView';
import { Collaborator, Project, Team } from '../../types/process';

const TEAMS: Team[] = [
  {
    id: 'team-moa',
    name: 'Architecture & Pilotage MOA',
    color: '#007AFF',
    description: 'Pilotage MOA',
    memberIds: [],
    createdAt: '',
  },
  {
    id: 'team-ops',
    name: 'Opérations & Gestion Épargne',
    color: '#34C759',
    description: 'Back-Office',
    memberIds: [],
    createdAt: '',
  },
];

const COLLABS: Collaborator[] = [
  {
    id: 'c-1',
    name: 'Khalil Benhassen',
    handle: 'khalil',
    roleTitle: 'Lead MOA',
    teamId: 'team-moa',
    email: 'khalil@org.fr',
    avatarInitials: 'KB',
    avatarColor: '#007AFF',
    presenceStatus: 'online',
    isAi: false,
    createdAt: '',
  },
  {
    id: 'c-2',
    name: 'Sophie Martin',
    handle: 'sophie',
    roleTitle: 'Analyste MOA',
    teamId: 'team-moa',
    email: 'sophie@org.fr',
    avatarInitials: 'SM',
    avatarColor: '#EA580C',
    presenceStatus: 'online',
    isAi: false,
    createdAt: '',
  },
  {
    id: 'c-3',
    name: 'Yassine Lahlou',
    handle: 'yassine',
    roleTitle: 'Gestionnaire',
    teamId: 'team-ops',
    email: 'yassine@org.fr',
    avatarInitials: 'YL',
    avatarColor: '#0D9488',
    presenceStatus: 'busy',
    isAi: false,
    createdAt: '',
  },
];

const PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Demande de Rachat Partiel',
    description: '',
    status: 'active',
    tags: [],
    processIds: [],
    memberIds: ['c-3'],
    createdAt: '',
    updatedAt: '',
  },
];

describe('TeamsDirectoryView — Membres par équipe, filtrage, réassignation & affectation projet 1 clic', () => {
  it('affiche le compteur de membres, filtre au clic sur une équipe, réassigne un intervenant et assigne une équipe entière à un projet', () => {
    const onUpdateCollaboratorTeam = vi.fn().mockResolvedValue(undefined);
    const onAssignTeamToProject = vi.fn().mockResolvedValue(undefined);

    render(
      <TeamsDirectoryView
        mode="humans_only"
        collaborators={COLLABS}
        teams={TEAMS}
        projects={PROJECTS}
        onOpenAgentBuilder={vi.fn()}
        onDirectChatWithCollaborator={vi.fn()}
        onCreateHumanCollaborator={vi.fn().mockResolvedValue(undefined)}
        onUpdateCollaboratorTeam={onUpdateCollaboratorTeam}
        onAssignTeamToProject={onAssignTeamToProject}
        onDeleteCollaborator={vi.fn().mockResolvedValue(undefined)}
        onCreateTeam={vi.fn().mockResolvedValue(undefined)}
        onDeleteTeam={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Compteurs de membres sur les cartes d'équipes
    expect(screen.getByText('2 membres')).toBeInTheDocument();
    expect(screen.getByText('1 membre')).toBeInTheDocument();

    // Cliquer sur l'équipe Opérations -> filtre les intervenants (masque Khalil & Sophie, garde Yassine)
    fireEvent.click(screen.getByTestId('team-card-team-ops'));
    expect(screen.getByText('Yassine Lahlou')).toBeInTheDocument();
    expect(screen.queryByText('Khalil Benhassen')).not.toBeInTheDocument();

    // Cliquer sur "Afficher tous les intervenants" -> réaffiche tout le monde
    fireEvent.click(screen.getByRole('button', { name: /Afficher tous les intervenants/i }));
    expect(screen.getByText('Khalil Benhassen')).toBeInTheDocument();

    // Réassigner Yassine Lahlou à l'équipe MOA depuis sa carte
    const yassineCard = screen.getByTestId('human-card-c-3');
    const teamPill = yassineCard.querySelector('button[title*="changer l\'équipe"]')!;
    fireEvent.click(teamPill);
    const moaOption = screen.getAllByRole('button', { name: /Architecture & Pilotage MOA/i });
    fireEvent.click(moaOption[moaOption.length - 1]);
    expect(onUpdateCollaboratorTeam).toHaveBeenCalledWith('c-3', 'team-moa');

    // Assigner toute l'équipe MOA (c-1, c-2) au projet Demande de Rachat Partiel en 1 clic
    const moaCard = screen.getByTestId('team-card-team-moa');
    const assignBtn = moaCard.querySelector('button[title*="Assigner toute cette équipe"]')!;
    fireEvent.click(assignBtn);
    fireEvent.click(screen.getByRole('button', { name: /Demande de Rachat Partiel/i }));
    expect(onAssignTeamToProject).toHaveBeenCalledWith('team-moa', 'proj-1', ['c-1', 'c-2']);
  });
});
