import React, { useRef, useState } from 'react';
import {
  Users,
  Sparkles,
  Plus,
  MessageSquare,
  Settings2,
  Trash2,
  Mail,
  Shield,
  ChevronDown,
  Check,
  FolderKanban,
  X,
} from 'lucide-react';
import { Collaborator, Project, Team } from '../../types/process';
import { useStaggerReveal } from '../../utils/useStaggerReveal';

interface TeamsDirectoryViewProps {
  mode?: 'all' | 'ai_only' | 'humans_only';
  collaborators: Collaborator[];
  teams: Team[];
  projects?: Project[];
  onOpenAgentBuilder: (agentToEdit?: Collaborator | null) => void;
  onDirectChatWithCollaborator: (collab: Collaborator) => void;
  onCreateHumanCollaborator: (payload: {
    name: string;
    handle: string;
    roleTitle: string;
    email: string;
    teamId?: string | null;
    avatarColor: string;
  }) => Promise<void>;
  onUpdateCollaboratorTeam?: (collabId: string, teamId: string | null) => Promise<void>;
  onAssignTeamToProject?: (teamId: string, projectId: string, memberIds: string[]) => Promise<void>;
  onDeleteCollaborator: (collabId: string) => Promise<void>;
  onCreateTeam: (name: string, color: string, description: string) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
}

const COLORS = ['#1F93FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const TeamsDirectoryView: React.FC<TeamsDirectoryViewProps> = ({
  mode = 'all',
  collaborators,
  teams,
  projects = [],
  onOpenAgentBuilder,
  onDirectChatWithCollaborator,
  onCreateHumanCollaborator,
  onUpdateCollaboratorTeam,
  onAssignTeamToProject,
  onDeleteCollaborator,
  onCreateTeam,
  onDeleteTeam,
}) => {
  const directoryRef = useRef<HTMLDivElement>(null);
  const [showAddHuman, setShowAddHuman] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamFilterId, setSelectedTeamFilterId] = useState<string | null>(null);
  const [openCollabTeamMenuId, setOpenCollabTeamMenuId] = useState<string | null>(null);
  const [openAssignProjectTeamId, setOpenAssignProjectTeamId] = useState<string | null>(null);
  const [assignedFeedbackKey, setAssignedFeedbackKey] = useState<string | null>(null);

  useStaggerReveal(directoryRef, '[data-testid^="human-card-"]', [
    selectedTeamFilterId,
    collaborators.length,
  ]);

  // Human collaborator form
  const [humanName, setHumanName] = useState('');
  const [humanHandle, setHumanHandle] = useState('');
  const [humanRole, setHumanRole] = useState('');
  const [humanEmail, setHumanEmail] = useState('');
  const [humanTeamId, setHumanTeamId] = useState('');
  const [humanColor, setHumanColor] = useState('#1F93FF');

  // Team form
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamColor, setTeamColor] = useState('#1F93FF');

  const aiAgents = collaborators.filter((c) => c.isAi);
  const humanCollabs = collaborators.filter((c) => !c.isAi);

  const showAiSection = mode === 'all' || mode === 'ai_only';
  const showHumanSection = mode === 'all' || mode === 'humans_only';

  const handleAddHumanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanName.trim()) return;
    await onCreateHumanCollaborator({
      name: humanName.trim(),
      handle:
        humanHandle.trim().replace(/^@/, '') ||
        humanName.trim().split(' ')[0].toLowerCase(),
      roleTitle: humanRole.trim() || 'Intervenant Projet',
      email:
        humanEmail.trim() ||
        `${humanName.trim().split(' ')[0].toLowerCase()}@organisation.fr`,
      teamId: humanTeamId || null,
      avatarColor: humanColor,
    });
    setHumanName('');
    setHumanHandle('');
    setHumanRole('');
    setHumanEmail('');
    setShowAddHuman(false);
  };

  const handleAddTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    await onCreateTeam(teamName.trim(), teamColor, teamDesc.trim());
    setTeamName('');
    setTeamDesc('');
    setShowAddTeam(false);
  };

  const filteredHumanCollabs = selectedTeamFilterId
    ? humanCollabs.filter((hc) => hc.teamId === selectedTeamFilterId)
    : humanCollabs;
  const activeFilterTeam = teams.find((t) => t.id === selectedTeamFilterId) || null;

  return (
    <div
      ref={directoryRef}
      className="flex-1 h-full bg-[#FAFAFA] overflow-y-auto p-6 pb-28 text-[#1C2024] apple-workspace-enter"
      onClick={() => {
        setOpenCollabTeamMenuId(null);
        setOpenAssignProjectTeamId(null);
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Banner */}
        <div className="bg-white border border-[#ECEEF0] rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                mode === 'ai_only' ? 'bg-[#7C3AED]' : 'bg-[#1F93FF]'
              }`}
            >
              {mode === 'ai_only' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Users className="w-5 h-5" />
              )}
            </div>
            <h1 className="text-[18px] font-cw-620 text-[#1C2024] apple-title-tracking">
              {mode === 'ai_only'
                ? 'Agents IA Collaborateurs'
                : mode === 'humans_only'
                ? 'Équipes & Intervenants Humains'
                : 'Intervenants Humains, Équipes & Agents IA Collaborateurs'}
            </h1>
          </div>

          {showHumanSection && (
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAddTeam((v) => !v)}
                className="apple-pressable px-3 py-2 rounded-xl border border-[#DFE3E6] bg-white hover:bg-[#FAFAFA] text-[12px] font-cw-520 text-[#1C2024] flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 text-[#1F93FF]" />
                <span>Nouvelle Équipe</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddHuman((v) => !v)}
                className="apple-pressable px-3 py-2 rounded-xl border border-[#1F93FF]/40 bg-[#EBF5FF] hover:bg-[#1F93FF] text-[#1F93FF] hover:text-white text-[12px] font-cw-620 flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvel Intervenant</span>
              </button>
            </div>
          )}
        </div>

        {/* Inline Add Team Form */}
        {showAddTeam && (
          <form
            onSubmit={handleAddTeamSubmit}
            className="bg-white border border-[#1F93FF] rounded-2xl p-4 shadow-sm space-y-3 text-[13px]"
          >
            <div className="flex items-center justify-between font-cw-620">
              <span>Créer une Nouvelle Équipe Personnalisée</span>
              <button
                type="button"
                onClick={() => setShowAddTeam(false)}
                className="text-[#8B8D98]"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Nom de l'équipe..."
                className="px-3 py-2 rounded-lg border border-[#DFE3E6]"
              />
              <input
                type="text"
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                placeholder="Description ou périmètre..."
                className="px-3 py-2 rounded-lg border border-[#DFE3E6]"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setTeamColor(col)}
                    className={`w-5 h-5 rounded-full ${
                      teamColor === col ? 'ring-2 ring-offset-1 ring-[#1C2024]' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#1F93FF] text-white font-cw-620 hover:bg-[#007BE5]"
              >
                Créer l'équipe
              </button>
            </div>
          </form>
        )}

        {/* Inline Add Human Collaborator Form */}
        {showAddHuman && (
          <form
            onSubmit={handleAddHumanSubmit}
            className="bg-white border border-[#1F93FF] rounded-2xl p-4 shadow-sm space-y-3 text-[13px]"
          >
            <div className="flex items-center justify-between font-cw-620">
              <span>Ajouter un Intervenant Humain</span>
              <button
                type="button"
                onClick={() => setShowAddHuman(false)}
                className="text-[#8B8D98]"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={humanName}
                onChange={(e) => setHumanName(e.target.value)}
                placeholder="Nom complet..."
                className="px-3 py-2 rounded-lg border border-[#DFE3E6]"
              />
              <input
                type="text"
                value={humanRole}
                onChange={(e) => setHumanRole(e.target.value)}
                placeholder="Rôle / Fonction..."
                className="px-3 py-2 rounded-lg border border-[#DFE3E6]"
              />
              <input
                type="email"
                value={humanEmail}
                onChange={(e) => setHumanEmail(e.target.value)}
                placeholder="Email Microsoft Outlook..."
                className="px-3 py-2 rounded-lg border border-[#DFE3E6]"
              />
              <select
                value={humanTeamId}
                onChange={(e) => setHumanTeamId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#DFE3E6] bg-white"
              >
                <option value="">Équipe (Optionnel)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setHumanColor(col)}
                    className={`w-5 h-5 rounded-full ${
                      humanColor === col ? 'ring-2 ring-offset-1 ring-[#1C2024]' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#1F93FF] text-white font-cw-620 hover:bg-[#007BE5]"
              >
                Ajouter l'intervenant
              </button>
            </div>
          </form>
        )}

        {/* Section 1: Agents IA Collaborateurs Grid */}
        {showAiSection && (
          <div className="space-y-3">
            {mode !== 'ai_only' && (
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-cw-620 text-[#1C2024] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1F93FF]" />
                  <span>Agents IA Collaborateurs ({aiAgents.length})</span>
                </h2>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiAgents.map((agent) => {
                const cleanName = agent.name.replace(/^[^\p{L}\p{N}]+/gu, '').trim();
                const cleanPrompt = (agent.systemPrompt || '').replace(
                  /extrais les décisions clés sous forme de Note Privée/gi,
                  "structures les comptes-rendus d'équipe"
                );
                const cleanRole = (agent.roleTitle || '').replace(
                  /Décisions & Agenda Outlook/gi,
                  'Comptes-Rendus & Agenda Outlook'
                );

                return (
                  <div
                    key={agent.id}
                    className="bg-white border border-[#ECEEF0] hover:border-[#1F93FF]/50 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3.5 transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className="w-10 h-10 rounded-xl text-white text-xs font-cw-620 flex items-center justify-center shadow-2xs"
                              style={{ backgroundColor: agent.avatarColor }}
                            >
                              {agent.avatarInitials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#30A46C] ring-2 ring-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[14px] font-cw-620 text-[#1C2024] truncate">
                              {cleanName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-[#EBF5FF] text-[#1F93FF] text-[11px] font-cw-620">
                                @{agent.handle}
                              </span>
                              <span className="text-[11px] text-[#30A46C] font-cw-520">
                                • Actif
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenAgentBuilder(agent)}
                          className="apple-pressable p-1.5 rounded-lg border border-[#ECEEF0] text-[#60646C] hover:text-[#1F93FF] hover:bg-[#EBF5FF] transition"
                          title="Configurer cet Agent IA"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[12px] font-cw-620 text-[#1C2024]">
                        {cleanRole}
                      </div>

                      <p className="text-[11.5px] text-[#60646C] line-clamp-2 leading-relaxed">
                        {cleanPrompt}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#ECEEF0] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDirectChatWithCollaborator(agent)}
                        className="apple-pressable flex-1 py-1.5 px-3 rounded-lg bg-[#1F93FF] hover:bg-[#007BE5] text-white text-[12px] font-cw-620 flex items-center justify-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Discuter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAgentBuilder(agent)}
                        className="apple-pressable py-1.5 px-2.5 rounded-lg border border-[#DFE3E6] bg-[#FAFAFA] hover:bg-[#F2F3F7] text-[#1C2024] text-[12px] font-cw-520 flex items-center gap-1 transition"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-[#60646C]" />
                        <span>Configurer</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 6th Card: Dashed "+ Créer un Agent IA sur mesure" to balance the 3x2 grid */}
              <button
                type="button"
                onClick={() => onOpenAgentBuilder(null)}
                className="group bg-white/60 hover:bg-white border-2 border-dashed border-[#DFE3E6] hover:border-[#1F93FF] rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2.5 transition min-h-[210px]"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#EBF5FF] group-hover:bg-[#1F93FF] text-[#1F93FF] group-hover:text-white flex items-center justify-center transition shadow-2xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-[13.5px] font-cw-620 text-[#1C2024] group-hover:text-[#1F93FF] transition">
                  + Créer un Agent IA sur mesure
                </div>
                <p className="text-[11.5px] text-[#60646C] max-w-[240px] leading-relaxed">
                  Définissez un @handle, un rôle métier, un prompt système et des compétences dédiées.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Section 2 & 3: Équipes de l'Organisation & Intervenants Humains */}
        {showHumanSection && (
          <>
            {/* Équipes de l'Organisation (clickable filter + member count + 1-click Assign to Project) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-[15px] font-cw-620 text-[#1C2024] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1F93FF]" />
                  <span>Équipes de l&apos;Organisation ({teams.length})</span>
                </h2>
                {selectedTeamFilterId && (
                  <button
                    type="button"
                    onClick={() => setSelectedTeamFilterId(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBF5FF] text-[#1F93FF] text-[11.5px] font-semibold hover:bg-[#DDF0FF] transition cursor-pointer"
                  >
                    <span>Afficher tous les intervenants</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teams.map((t) => {
                  const teamMembers = humanCollabs.filter((hc) => hc.teamId === t.id);
                  const isFiltered = selectedTeamFilterId === t.id;
                  const isAssignMenuOpen = openAssignProjectTeamId === t.id;

                  return (
                    <div
                      key={t.id}
                      data-testid={`team-card-${t.id}`}
                      onClick={() =>
                        setSelectedTeamFilterId((prev) => (prev === t.id ? null : t.id))
                      }
                      className={`relative rounded-2xl p-4 flex flex-col justify-between gap-3 transition cursor-pointer border ${
                        isFiltered
                          ? 'bg-[#EBF5FF]/45 border-[#007AFF] shadow-[0_4px_14px_rgba(0,122,255,0.10)]'
                          : 'bg-white border-[#ECEEF0] hover:border-[#007AFF]/45 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            <span className="text-[13.5px] font-cw-620 text-[#1C2024] truncate">
                              {t.name}
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-[12px] text-[#60646C] line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTeam(t.id);
                          }}
                          className="p-1 text-[#8B8D98] hover:text-rose-600 shrink-0 cursor-pointer"
                          title="Supprimer cette équipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Members avatars + count + 1-click Assign to Project */}
                      <div className="pt-2.5 border-t border-black/[0.06] flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {teamMembers.length > 0 && (
                            <div className="flex items-center -space-x-1.5">
                              {teamMembers.slice(0, 4).map((m) => (
                                <span
                                  key={m.id}
                                  title={m.name}
                                  className="w-6 h-6 rounded-full text-white text-[9.5px] font-bold flex items-center justify-center ring-2 ring-white"
                                  style={{ backgroundColor: m.avatarColor }}
                                >
                                  {m.avatarInitials}
                                </span>
                              ))}
                              {teamMembers.length > 4 && (
                                <span className="w-6 h-6 rounded-full bg-[#F5F5F7] text-[#6E6E73] text-[9.5px] font-bold flex items-center justify-center ring-2 ring-white">
                                  +{teamMembers.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-semibold text-[#1D1D1F]">
                            {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        {onAssignTeamToProject && projects.length > 0 && (
                          <div
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={teamMembers.length === 0}
                              onClick={() => {
                                setOpenAssignProjectTeamId((prev) =>
                                  prev === t.id ? null : t.id
                                );
                                setOpenCollabTeamMenuId(null);
                              }}
                              title={
                                teamMembers.length === 0
                                  ? 'Ajoutez au moins un membre à cette équipe pour l’assigner'
                                  : 'Assigner toute cette équipe à un projet en 1 clic'
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                                teamMembers.length === 0
                                  ? 'border-black/[0.06] bg-[#F5F5F7] text-[#AEAEB2] cursor-not-allowed'
                                  : isAssignMenuOpen
                                  ? 'border-[#007AFF] bg-[#007AFF] text-white cursor-pointer'
                                  : 'border-black/[0.08] bg-white hover:bg-[#EBF5FF] hover:border-[#007AFF]/40 hover:text-[#007AFF] text-[#1D1D1F] cursor-pointer'
                              }`}
                            >
                              <FolderKanban className="w-3 h-3 shrink-0" />
                              <span>Assigner à un projet</span>
                              <ChevronDown className="w-3 h-3 shrink-0" />
                            </button>

                            {isAssignMenuOpen && (
                              <div className="absolute right-0 mt-1.5 w-64 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-xl shadow-xl py-1.5 z-50">
                                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                                  Assigner les {teamMembers.length} membres à :
                                </div>
                                {projects.map((proj) => {
                                  const allAlreadyIn =
                                    teamMembers.length > 0 &&
                                    teamMembers.every((m) =>
                                      (proj.memberIds || []).includes(m.id)
                                    );
                                  const feedbackKey = `${t.id}:${proj.id}`;
                                  const justAssigned = assignedFeedbackKey === feedbackKey;
                                  return (
                                    <button
                                      key={proj.id}
                                      type="button"
                                      onClick={async () => {
                                        await onAssignTeamToProject(
                                          t.id,
                                          proj.id,
                                          teamMembers.map((m) => m.id)
                                        );
                                        setAssignedFeedbackKey(feedbackKey);
                                        setTimeout(() => {
                                          setAssignedFeedbackKey((curr) =>
                                            curr === feedbackKey ? null : curr
                                          );
                                        }, 2000);
                                        setOpenAssignProjectTeamId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-[12px] hover:bg-[#F5F5F7] flex items-center justify-between gap-2 transition cursor-pointer"
                                    >
                                      <span className="truncate font-medium text-[#1D1D1F]">
                                        {proj.name}
                                      </span>
                                      {justAssigned || allAlreadyIn ? (
                                        <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[#30A46C] shrink-0">
                                          <Check className="w-3 h-3" />
                                          <span>Assignée</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10.5px] font-semibold text-[#007AFF] shrink-0">
                                          + Ajouter
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Intervenants Humains (filtered by clicked team + 1-click team reassignment) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-[15px] font-cw-620 text-[#1C2024] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1F93FF]" />
                  <span>
                    Intervenants Humains ({filteredHumanCollabs.length}
                    {activeFilterTeam ? ` / ${humanCollabs.length}` : ''})
                  </span>
                  {activeFilterTeam && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5FF] text-[#007AFF] text-[11.5px] font-semibold">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: activeFilterTeam.color }}
                      />
                      <span>{activeFilterTeam.name}</span>
                    </span>
                  )}
                </h2>
              </div>

              {filteredHumanCollabs.length === 0 ? (
                <div className="bg-white border border-[#ECEEF0] rounded-2xl p-8 text-center text-[13px] text-[#60646C] space-y-2">
                  <div>Aucun intervenant n&apos;est encore assigné à cette équipe.</div>
                  <button
                    type="button"
                    onClick={() => setSelectedTeamFilterId(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#EBF5FF] text-[#007AFF] text-[12px] font-semibold hover:bg-[#DDF0FF] cursor-pointer"
                  >
                    Afficher tous les intervenants
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHumanCollabs.map((hc) => {
                    const team = teams.find((t) => t.id === hc.teamId);
                    const isTeamMenuOpen = openCollabTeamMenuId === hc.id;

                    return (
                      <div
                        key={hc.id}
                        data-testid={`human-card-${hc.id}`}
                        className="bg-white border border-[#ECEEF0] rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div
                                  className="w-10 h-10 rounded-full text-white text-xs font-cw-620 flex items-center justify-center"
                                  style={{ backgroundColor: hc.avatarColor }}
                                >
                                  {hc.avatarInitials}
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                    hc.presenceStatus === 'online'
                                      ? 'bg-[#30A46C]'
                                      : hc.presenceStatus === 'busy'
                                      ? 'bg-[#F76B15]'
                                      : 'bg-[#8B8D98]'
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13.5px] font-cw-620 text-[#1C2024] truncate">
                                  {hc.name}
                                </div>
                                <div className="text-[11.5px] text-[#60646C] truncate">
                                  {hc.roleTitle}
                                </div>
                              </div>
                            </div>

                            {hc.id !== 'collab-user-main' && (
                              <button
                                type="button"
                                onClick={() => onDeleteCollaborator(hc.id)}
                                className="p-1 rounded text-[#8B8D98] hover:text-rose-600 cursor-pointer"
                                title="Supprimer cet intervenant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11.5px] text-[#60646C]">
                            <Mail className="w-3.5 h-3.5 text-[#8B8D98]" />
                            <span className="truncate">{hc.email}</span>
                          </div>

                          {/* Interactive 1-click Team Assignment Pill */}
                          <div
                            className="relative inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={!onUpdateCollaboratorTeam}
                              onClick={() => {
                                setOpenCollabTeamMenuId((prev) =>
                                  prev === hc.id ? null : hc.id
                                );
                                setOpenAssignProjectTeamId(null);
                              }}
                              title="Cliquer pour assigner ou changer l'équipe de cet intervenant"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                                onUpdateCollaboratorTeam
                                  ? 'cursor-pointer hover:border-[#007AFF]/50 hover:bg-[#EBF5FF]/40'
                                  : 'cursor-default'
                              } ${
                                team
                                  ? 'bg-[#FAFAFA] border-[#ECEEF0] text-[#1D1D1F]'
                                  : 'bg-white border-dashed border-black/15 text-[#6E6E73]'
                              }`}
                            >
                              {team ? (
                                <>
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: team.color }}
                                  />
                                  <span>{team.name}</span>
                                </>
                              ) : (
                                <span>Assigner une équipe</span>
                              )}
                              {onUpdateCollaboratorTeam && (
                                <ChevronDown className="w-3 h-3 text-[#8E8E93] shrink-0" />
                              )}
                            </button>

                            {isTeamMenuOpen && onUpdateCollaboratorTeam && (
                              <div className="absolute left-0 mt-1.5 w-60 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-xl shadow-xl py-1.5 z-50">
                                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                                  Assigner à une équipe
                                </div>
                                {teams.map((t) => {
                                  const active = hc.teamId === t.id;
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={async () => {
                                        await onUpdateCollaboratorTeam(hc.id, t.id);
                                        setOpenCollabTeamMenuId(null);
                                      }}
                                      className={`w-full px-3 py-1.5 text-left text-[12px] flex items-center justify-between gap-2 cursor-pointer transition ${
                                        active
                                          ? 'bg-[#EBF5FF] text-[#007AFF] font-semibold'
                                          : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-2 min-w-0">
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: t.color }}
                                        />
                                        <span className="truncate">{t.name}</span>
                                      </span>
                                      {active && (
                                        <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                                {hc.teamId && (
                                  <>
                                    <div className="h-px bg-black/[0.06] my-1" />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onUpdateCollaboratorTeam(hc.id, null);
                                        setOpenCollabTeamMenuId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-[11.5px] text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer"
                                    >
                                      Retirer de l&apos;équipe
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#ECEEF0]">
                          <button
                            type="button"
                            onClick={() => onDirectChatWithCollaborator(hc)}
                            className="apple-pressable w-full py-1.5 px-3 rounded-lg bg-[#EBF5FF] hover:bg-[#1F93FF] text-[#1F93FF] hover:text-white text-[12px] font-cw-620 flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Démarrer une conversation</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
