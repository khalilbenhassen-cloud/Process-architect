import {
  Process,
  ProcessSummary,
  ProcessVersionSummary,
  ValidationResult,
  SimulationResult,
  AnalyticsResult,
  TraceabilityResult,
  TestCase,
  Category,
  TagItem,
  Project,
  Team,
  Collaborator,
  AIProviderConfig,
  ApprovalGate,
  Conversation,
  Meeting,
} from '../types/process';

const BASE_URL = '/api';

// ============================================================================
// Processes API
// ============================================================================

export async function fetchProcesses(): Promise<ProcessSummary[]> {
  const res = await fetch(`${BASE_URL}/processes`);
  if (!res.ok) throw new Error('Impossible de charger la liste des processus.');
  return res.json();
}

export async function fetchProcess(id: string): Promise<Process> {
  const res = await fetch(`${BASE_URL}/processes/${id}`);
  if (!res.ok) throw new Error(`Processus ${id} introuvable.`);
  return res.json();
}

export async function createProcess(payload: {
  name: string;
  description?: string;
  owner?: string;
  modelState?: string;
  projectId?: string | null;
  categoryId?: string | null;
  tags?: string[];
}): Promise<Process> {
  const res = await fetch(`${BASE_URL}/processes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur lors de la création du processus.');
  return res.json();
}

export async function updateProcess(process: Process): Promise<Process> {
  const res = await fetch(`${BASE_URL}/processes/${process.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(process),
  });
  if (!res.ok) throw new Error('Erreur lors de la sauvegarde du processus.');
  return res.json();
}

export async function deleteProcess(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/processes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erreur lors de la suppression du processus.');
}

export async function duplicateProcess(id: string): Promise<Process> {
  const res = await fetch(`${BASE_URL}/processes/${id}/duplicate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erreur lors de la duplication du processus.');
  return res.json();
}

export async function fetchProcessVersions(
  id: string
): Promise<ProcessVersionSummary[]> {
  const res = await fetch(`${BASE_URL}/processes/${id}/versions`);
  if (!res.ok) throw new Error("Impossible de charger l'historique des versions.");
  return res.json();
}

export async function publishProcessVersion(
  id: string,
  payload: {
    mode: 'publish_current' | 'update_current' | 'new_version';
    note?: string;
    publishedBy?: string;
    process?: Process;
  }
): Promise<{
  process: Process;
  version: ProcessVersionSummary;
  versions: ProcessVersionSummary[];
}> {
  const res = await fetch(`${BASE_URL}/processes/${id}/versions/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur lors de la publication de la version.');
  return res.json();
}

export async function restoreProcessVersion(
  processId: string,
  versionId: string
): Promise<Process> {
  const res = await fetch(
    `${BASE_URL}/processes/${processId}/versions/${versionId}/restore`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Impossible de restaurer cette version.');
  return res.json();
}

export async function validateProcess(id: string): Promise<ValidationResult> {
  const res = await fetch(`${BASE_URL}/processes/${id}/validate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erreur lors de la validation du processus.');
  return res.json();
}

export async function simulateProcess(
  id: string,
  decisions: Record<string, string>,
  maxSteps = 100
): Promise<SimulationResult> {
  const res = await fetch(`${BASE_URL}/processes/${id}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions, maxSteps }),
  });
  if (!res.ok) throw new Error('Erreur lors de la simulation du processus.');
  return res.json();
}

export async function fetchAnalytics(id: string): Promise<AnalyticsResult> {
  const res = await fetch(`${BASE_URL}/processes/${id}/analytics`);
  if (!res.ok) throw new Error('Impossible de charger les métriques du processus.');
  return res.json();
}

export async function generateTestCases(
  id: string
): Promise<{ count: number; cases: TestCase[]; note: string }> {
  const res = await fetch(`${BASE_URL}/processes/${id}/test-cases`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erreur lors de la génération des cas de test.');
  return res.json();
}

export async function fetchTraceability(id: string): Promise<TraceabilityResult> {
  const res = await fetch(`${BASE_URL}/processes/${id}/traceability`);
  if (!res.ok) throw new Error('Impossible de charger la matrice de traçabilité.');
  return res.json();
}

export function getExportUrl(id: string, format: 'json' | 'markdown' | 'csv'): string {
  return `${BASE_URL}/processes/${id}/export?format=${format}`;
}

export async function importProcess(data: unknown): Promise<Process> {
  const res = await fetch(`${BASE_URL}/processes/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Format invalide' }));
    throw new Error(err.detail || "Erreur lors de l'importation du processus.");
  }
  return res.json();
}

// ============================================================================
// Categories & Tags API (Client Customizable)
// ============================================================================

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error('Erreur chargement catégories.');
  return res.json();
}

export async function createCategory(payload: {
  name: string;
  color?: string;
  description?: string;
}): Promise<Category> {
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création catégorie.');
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  await fetch(`${BASE_URL}/categories/${id}`, { method: 'DELETE' });
}

export async function fetchTags(): Promise<TagItem[]> {
  const res = await fetch(`${BASE_URL}/tags`);
  if (!res.ok) throw new Error('Erreur chargement tags.');
  return res.json();
}

export async function createTag(payload: {
  name: string;
  color?: string;
  scope?: 'global' | 'project' | 'process' | 'conversation';
}): Promise<TagItem> {
  const res = await fetch(`${BASE_URL}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création tag.');
  return res.json();
}

export async function deleteTag(id: string): Promise<void> {
  await fetch(`${BASE_URL}/tags/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Projects API
// ============================================================================

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/projects`);
  if (!res.ok) throw new Error('Erreur chargement projets.');
  return res.json();
}

export async function createProject(payload: {
  name: string;
  description?: string;
  categoryId?: string | null;
  status?: string;
  ownerId?: string | null;
  ownerName?: string;
  tags?: string[];
  processIds?: string[];
  memberIds?: string[];
}): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création projet.');
  return res.json();
}

export async function updateProject(
  projectId: string,
  payload: Partial<Project>
): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour projet.');
  return res.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  await fetch(`${BASE_URL}/projects/${projectId}`, { method: 'DELETE' });
}

// ============================================================================
// Teams, Collaborators & AI Collaborator Agents API
// ============================================================================

export async function fetchTeams(): Promise<Team[]> {
  const res = await fetch(`${BASE_URL}/teams`);
  if (!res.ok) throw new Error('Erreur chargement équipes.');
  return res.json();
}

export async function createTeam(payload: {
  name: string;
  color?: string;
  description?: string;
  memberIds?: string[];
}): Promise<Team> {
  const res = await fetch(`${BASE_URL}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création équipe.');
  return res.json();
}

export async function deleteTeam(teamId: string): Promise<void> {
  await fetch(`${BASE_URL}/teams/${teamId}`, { method: 'DELETE' });
}

export async function fetchCollaborators(isAi?: boolean): Promise<Collaborator[]> {
  const qs = isAi !== undefined ? `?is_ai=${isAi}` : '';
  const res = await fetch(`${BASE_URL}/collaborators${qs}`);
  if (!res.ok) throw new Error('Erreur chargement collaborateurs.');
  return res.json();
}

export async function createCollaborator(payload: {
  name: string;
  handle?: string;
  roleTitle?: string;
  teamId?: string | null;
  email?: string;
  avatarInitials?: string;
  avatarColor?: string;
  presenceStatus?: 'online' | 'busy' | 'offline';
  isAi?: boolean;
  aiSpecialty?: string;
  aiProviderModel?: string;
  systemPrompt?: string;
  aiCapabilities?: string[];
}): Promise<Collaborator> {
  const res = await fetch(`${BASE_URL}/collaborators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création intervenant / agent IA.');
  return res.json();
}

export async function updateCollaborator(
  collabId: string,
  payload: Partial<Collaborator>
): Promise<Collaborator> {
  const res = await fetch(`${BASE_URL}/collaborators/${collabId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour intervenant / agent IA.');
  return res.json();
}

export async function deleteCollaborator(collabId: string): Promise<void> {
  await fetch(`${BASE_URL}/collaborators/${collabId}`, { method: 'DELETE' });
}

export async function fetchAIProviders(): Promise<AIProviderConfig[]> {
  const res = await fetch(`${BASE_URL}/ai-providers`);
  if (!res.ok) throw new Error('Erreur chargement fournisseurs IA.');
  return res.json();
}

export async function createAIProvider(payload: {
  name: string;
  modelsLabel: string;
  apiKey?: string;
  endpointUrl: string;
  enabled?: boolean;
}): Promise<AIProviderConfig> {
  const res = await fetch(`${BASE_URL}/ai-providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création fournisseur IA.');
  return res.json();
}

export async function updateAIProvider(
  providerId: string,
  payload: {
    name?: string;
    modelsLabel?: string;
    apiKey?: string;
    endpointUrl?: string;
    enabled?: boolean;
  }
): Promise<AIProviderConfig> {
  const res = await fetch(`${BASE_URL}/ai-providers/${providerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour fournisseur IA.');
  return res.json();
}

export async function deleteAIProvider(providerId: string): Promise<void> {
  await fetch(`${BASE_URL}/ai-providers/${providerId}`, { method: 'DELETE' });
}

// ============================================================================
// Approval Gates API
// ============================================================================

export async function fetchApprovals(params?: {
  processId?: string;
  projectId?: string;
}): Promise<ApprovalGate[]> {
  const sp = new URLSearchParams();
  if (params?.processId) sp.set('process_id', params.processId);
  if (params?.projectId) sp.set('project_id', params.projectId);
  const qs = sp.toString() ? `?${sp.toString()}` : '';
  const res = await fetch(`${BASE_URL}/approvals${qs}`);
  if (!res.ok) throw new Error('Erreur chargement approbations.');
  return res.json();
}

export async function createApprovalGate(payload: {
  projectId?: string | null;
  processId: string;
  label: string;
  reviewerId?: string | null;
  reviewerName?: string;
  teamId?: string | null;
  comment?: string;
}): Promise<ApprovalGate> {
  const res = await fetch(`${BASE_URL}/approvals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création jalon de validation.');
  return res.json();
}

export async function updateApprovalGate(
  approvalId: string,
  payload: Partial<ApprovalGate>
): Promise<ApprovalGate> {
  const res = await fetch(`${BASE_URL}/approvals/${approvalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour jalon de validation.');
  return res.json();
}

export async function deleteApprovalGate(approvalId: string): Promise<void> {
  await fetch(`${BASE_URL}/approvals/${approvalId}`, { method: 'DELETE' });
}

// ============================================================================
// Chatwoot Conversations & Multi-Agent IA API
// ============================================================================

export async function fetchConversations(params?: {
  projectId?: string;
  processId?: string;
}): Promise<Conversation[]> {
  const sp = new URLSearchParams();
  if (params?.projectId) sp.set('project_id', params.projectId);
  if (params?.processId) sp.set('process_id', params.processId);
  const qs = sp.toString() ? `?${sp.toString()}` : '';
  const res = await fetch(`${BASE_URL}/conversations${qs}`);
  if (!res.ok) throw new Error('Erreur chargement conversations.');
  return res.json();
}

export async function createConversation(payload: {
  title: string;
  conversationType?: 'direct_human' | 'direct_ai' | 'project_thread' | 'process_thread';
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  projectId?: string | null;
  processId?: string | null;
  linkedNodeIds?: string[];
  linkedRuleIds?: string[];
  assigneeId?: string | null;
  teamId?: string | null;
  participantIds?: string[];
  tags?: string[];
  initialMessage?: string;
  senderId?: string;
}): Promise<Conversation> {
  const res = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création conversation.');
  return res.json();
}

export async function updateConversation(
  convId: string,
  payload: Partial<Conversation>
): Promise<Conversation> {
  const res = await fetch(`${BASE_URL}/conversations/${convId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour conversation.');
  return res.json();
}

export async function deleteConversation(convId: string): Promise<void> {
  await fetch(`${BASE_URL}/conversations/${convId}`, { method: 'DELETE' });
}

export async function postConversationMessage(
  convId: string,
  payload: {
    senderId: string;
    content: str_or_string;
    isPrivateNote?: boolean;
    messageType?: 'message' | 'private_note' | 'activity' | 'ai_action' | 'meeting_card' | 'approval_card';
    linkedNodeIds?: string[];
    linkedRuleIds?: string[];
    actionPayload?: Record<string, any> | null;
  }
): Promise<Conversation> {
  const res = await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erreur lors de l'envoi du message.");
  return res.json();
}
type str_or_string = string;

export async function applyConversationAgentAction(
  convId: string,
  payload: { messageId: string; processId?: string | null; projectId?: string | null }
): Promise<{
  actionType: string;
  applied: boolean;
  processId?: string;
  message?: string;
  meeting?: Meeting;
  conversation: Conversation;
}> {
  const res = await fetch(`${BASE_URL}/conversations/${convId}/apply-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erreur lors de l'application de l'action IA.");
  return res.json();
}

// ============================================================================
// Meetings & Microsoft Outlook API
// ============================================================================

export async function fetchMeetings(params?: {
  projectId?: string;
  processId?: string;
}): Promise<Meeting[]> {
  const sp = new URLSearchParams();
  if (params?.projectId) sp.set('project_id', params.projectId);
  if (params?.processId) sp.set('process_id', params.processId);
  const qs = sp.toString() ? `?${sp.toString()}` : '';
  const res = await fetch(`${BASE_URL}/meetings${qs}`);
  if (!res.ok) throw new Error('Erreur chargement réunions.');
  return res.json();
}

export async function createMeeting(payload: {
  title: string;
  projectId?: string | null;
  processId?: string | null;
  conversationId?: string | null;
  organizerId?: string;
  organizerName?: string;
  attendeeIds?: string[];
  attendeeEmails?: string[];
  startAt: string;
  durationMinutes?: number;
  locationOrLink?: string;
  agendaNotes?: string;
  postToConversation?: boolean;
}): Promise<Meeting> {
  const res = await fetch(`${BASE_URL}/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création réunion Outlook.');
  return res.json();
}

export async function syncMeetingOutlook(meetingId: string): Promise<{
  status: string;
  meeting: Meeting;
  outlookWebLink: string;
  icsDownloadUrl: string;
}> {
  const res = await fetch(`${BASE_URL}/meetings/${meetingId}/sync-outlook`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erreur synchronisation Outlook.');
  return res.json();
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  await fetch(`${BASE_URL}/meetings/${meetingId}`, { method: 'DELETE' });
}

export function getMeetingIcsUrl(meetingId: string): string {
  return `${BASE_URL}/meetings/${meetingId}/ics`;
}

export async function resetWorkspaceBlank(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/workspace/reset-blank`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erreur réinitialisation espace.');
  return res.json();
}

export async function resetWorkspaceDemo(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/workspace/reset-demo`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erreur restauration espace démo.');
  return res.json();
}

// ============================================================================
// Authentication & Session API
// ============================================================================

const AUTH_TOKEN_KEY = 'pa_session_token';

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: Collaborator }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Email ou mot de passe incorrect.');
  }
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  roleTitle?: string;
}): Promise<{ token: string; user: Collaborator }> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Impossible de créer le compte.');
  }
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

export async function fetchCurrentUser(): Promise<Collaborator | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearAuthToken();
    return null;
  }
  const data = await res.json();
  return data.user || null;
}

export async function logoutUser(): Promise<void> {
  const token = getAuthToken();
  clearAuthToken();
  if (!token) return;
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore network error on logout
  }
}

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Session expirée.');
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Impossible de modifier le mot de passe.');
  }
}
