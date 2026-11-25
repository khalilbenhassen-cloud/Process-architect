export type NodeType = 'start' | 'end' | 'task' | 'decision' | 'data' | 'subprocess';
export type BpmnTaskKind = 'user' | 'service' | 'manual' | 'business_rule';
export type BpmnGatewayKind = 'xor' | 'or' | 'and' | 'event_based';
export type ExecutionMode = 'manual' | 'automated' | 'mixed' | 'unknown';
export type LifecycleState = 'draft' | 'review' | 'approved' | 'archived';
export type ModelState = 'as_is' | 'to_be';
export type RuleCategory = 'eligibility' | 'data_quality' | 'approval' | 'timing' | 'security' | 'other';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type SourceType = 'fictional_assumption' | 'business_requirement' | 'external_reference';

export interface Position {
  x: number;
  y: number;
}

export interface ProcessNode {
  id: string;
  type: NodeType;
  label: string;
  position: Position;
  description?: string;
  ownerRole?: string;
  application?: string;
  estimatedDurationMinutes: number;
  executionMode: ExecutionMode;
  taskKind?: BpmnTaskKind;
  gatewayKind?: BpmnGatewayKind;
  inputs?: string[];
  outputs?: string[];
  controls?: string[];
  ruleIds?: string[];
}

export interface ProcessEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  condition?: string;
  isDefault?: boolean;
}

export interface BusinessRule {
  id: string;
  title: string;
  statement: string;
  category: RuleCategory;
  severity: SeverityLevel;
  sourceType: SourceType;
  sourceNote?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Requirement {
  id: string;
  title: string;
  description?: string;
  ruleIds?: string[];
}

export interface TestCase {
  id: string;
  title: string;
  objective: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: SeverityLevel;
  sourceNodeIds: string[];
  ruleIds: string[];
  status: 'draft' | 'reviewed' | 'approved';
  reviewRequired: boolean;
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  projectId?: string | null;
  categoryId?: string | null;
  tags?: string[];
  lifecycleState: LifecycleState;
  modelState: ModelState;
  version: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  businessRules: BusinessRule[];
  requirements: Requirement[];
  testCases: TestCase[];
}

export interface ProcessVersionSummary {
  id: string;
  processId: string;
  version: string;
  note: string;
  publishedBy: string;
  publishedAt: string;
  nodeCount: number;
  ruleCount: number;
}

export interface ProcessSummary {
  id: string;
  name: string;
  description: string;
  projectId?: string | null;
  categoryId?: string | null;
  tags?: string[];
  lifecycleState: LifecycleState;
  modelState: ModelState;
  version: string;
  owner: string;
  nodeCount: number;
  edgeCount: number;
  ruleCount: number;
  updatedAt: string;
  publishedVersions?: ProcessVersionSummary[];
}

export interface Finding {
  code: string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  summary: {
    errors: number;
    warnings: number;
    suggestions: number;
    totalFindings: number;
  };
  findings: Finding[];
}

export interface SimulationResult {
  status: 'completed' | 'blocked' | 'step_limit' | 'invalid_model';
  path: string[];
  pathNodes?: Array<{
    id: string;
    label: string;
    type: string;
    ownerRole?: string;
    executionMode: string;
    duration: number;
  }>;
  branchChoices: Array<{
    nodeId: string;
    nodeLabel?: string;
    label: string;
    targetNodeId?: string;
  }>;
  totalEstimatedMinutes: number;
  manualStepCount: number;
  stopReason: string;
  pendingDecisionNodeId?: string;
  pendingDecisionLabel?: string;
  availableChoices?: string[];
  validation?: ValidationResult;
}

export interface AnalyticsResult {
  nodesCount: number;
  edgesCount: number;
  rulesCount: number;
  typeDistribution: Record<string, number>;
  executionModeDistribution: Record<string, number>;
  manualPercentage: number;
  totalProcessNominalMinutes: number;
  missingOwnerCount: number;
  missingOwnerNodes: Array<{ id: string; label: string }>;
  missingAppCount: number;
  missingAppNodes: Array<{ id: string; label: string }>;
  controlledStepsCount: number;
  decisions: Array<{
    id: string;
    label: string;
    branchesCount: number;
    branches: string[];
  }>;
  bottleneckCandidates: Array<{
    id: string;
    label: string;
    duration: number;
  }>;
}

export interface TraceabilityRow {
  requirementIds: string[];
  ruleId: string;
  ruleTitle: string;
  ruleSeverity: string;
  nodeIds: string[];
  nodeLabels: string[];
  testCaseIds: string[];
  status: 'couvert' | 'incomplet' | 'info';
  gaps: string[];
}

export interface TraceabilityResult {
  totalRules: number;
  coveredRules: number;
  coverageRate: number;
  matrix: TraceabilityRow[];
}

// ============================================================================
// SaaS B2B Types (Generic Categories, Tags, Projects, Teams, Collaborators,
// AI Collaborator Agents, Approval Gates, Conversations & Outlook Meetings)
// ============================================================================

export interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
  scope: 'global' | 'project' | 'process' | 'conversation';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  categoryId?: string | null;
  status: 'active' | 'draft' | 'review' | 'completed' | 'archived';
  ownerId?: string | null;
  ownerName: string;
  tags: string[];
  processIds: string[];
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  description: string;
  memberIds: string[];
  createdAt: string;
}

export interface Collaborator {
  id: string;
  name: string;
  handle: string;
  roleTitle: string;
  teamId?: string | null;
  email: string;
  avatarInitials: string;
  avatarColor: string;
  presenceStatus: 'online' | 'busy' | 'offline';
  isAi: boolean;
  aiSpecialty?: string;
  aiProviderModel?: string;
  systemPrompt?: string;
  aiCapabilities?: string[];
  createdAt: string;
}

export interface AIProviderConfig {
  providerId: string;
  name: string;
  modelsLabel: string;
  apiKey?: string;
  apiKeyMasked: string;
  endpointUrl: string;
  enabled: boolean;
  status: 'connected' | 'local_fallback';
  updatedAt: string;
}

export interface ApprovalGate {
  id: string;
  projectId?: string | null;
  processId: string;
  label: string;
  reviewerId?: string | null;
  reviewerName: string;
  teamId?: string | null;
  status: 'pending' | 'approved' | 'changes_requested';
  comment: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatarInitials: string;
  senderAvatarColor: string;
  senderIsAi: boolean;
  content: string;
  messageType: 'message' | 'private_note' | 'activity' | 'ai_action' | 'meeting_card' | 'approval_card';
  isPrivateNote: boolean;
  mentionedHandles: string[];
  linkedNodeIds: string[];
  linkedRuleIds: string[];
  actionPayload?: Record<string, any> | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  conversationType: 'direct_human' | 'direct_ai' | 'project_thread' | 'process_thread';
  status: 'open' | 'resolved' | 'pending';
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  projectId?: string | null;
  processId?: string | null;
  linkedNodeIds: string[];
  linkedRuleIds: string[];
  assigneeId?: string | null;
  teamId?: string | null;
  participantIds: string[];
  tags: string[];
  unreadCount: number;
  lastMessagePreview: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  projectId?: string | null;
  processId?: string | null;
  conversationId?: string | null;
  organizerId: string;
  organizerName: string;
  attendeeIds: string[];
  attendeeEmails: string[];
  startAt: string;
  endAt: string;
  durationMinutes: number;
  locationOrLink: string;
  agendaNotes: string;
  outlookSyncStatus: 'synced' | 'ready_to_sync' | 'ics_exported';
  outlookWebLink: string;
  createdAt: string;
}

