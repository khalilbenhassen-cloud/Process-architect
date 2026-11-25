"""Pydantic domain models for Process Architect SaaS B2B platform."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class LifecycleState(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    ARCHIVED = "archived"


class ModelState(str, Enum):
    AS_IS = "as_is"
    TO_BE = "to_be"


class NodeType(str, Enum):
    START = "start"
    END = "end"
    TASK = "task"
    DECISION = "decision"
    DATA = "data"
    SUBPROCESS = "subprocess"


class ExecutionMode(str, Enum):
    MANUAL = "manual"
    AUTOMATED = "automated"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class RuleCategory(str, Enum):
    ELIGIBILITY = "eligibility"
    DATA_QUALITY = "data_quality"
    APPROVAL = "approval"
    TIMING = "timing"
    SECURITY = "security"
    OTHER = "other"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SourceType(str, Enum):
    FICTIONAL_ASSUMPTION = "fictional_assumption"
    BUSINESS_REQUIREMENT = "business_requirement"
    EXTERNAL_REFERENCE = "external_reference"


class Position(BaseModel):
    x: float = 0.0
    y: float = 0.0


class NodeModel(BaseModel):
    id: str
    type: NodeType
    label: str
    position: Position = Field(default_factory=Position)
    description: str | None = ""
    ownerRole: str | None = ""
    application: str | None = ""
    estimatedDurationMinutes: int = Field(default=0, ge=0)
    executionMode: ExecutionMode = ExecutionMode.UNKNOWN
    taskKind: Literal["user", "service", "manual", "business_rule"] | None = None
    gatewayKind: Literal["xor", "or", "and", "event_based"] | None = None
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)
    ruleIds: list[str] = Field(default_factory=list)


class EdgeModel(BaseModel):
    id: str
    sourceNodeId: str
    targetNodeId: str
    label: str | None = ""
    condition: str | None = ""
    isDefault: bool = False


class BusinessRuleModel(BaseModel):
    id: str
    title: str
    statement: str
    category: RuleCategory = RuleCategory.OTHER
    severity: SeverityLevel = SeverityLevel.MEDIUM
    sourceType: SourceType = SourceType.FICTIONAL_ASSUMPTION
    sourceNote: str | None = "Hypothèse de démonstration fictive"
    active: bool = True
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: str = Field(default_factory=utc_now_iso)


class RequirementModel(BaseModel):
    id: str
    title: str
    description: str | None = ""
    ruleIds: list[str] = Field(default_factory=list)


class TestCaseModel(BaseModel):
    id: str
    title: str
    objective: str
    preconditions: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    expectedResult: str
    priority: SeverityLevel = SeverityLevel.MEDIUM
    sourceNodeIds: list[str] = Field(default_factory=list)
    ruleIds: list[str] = Field(default_factory=list)
    status: Literal["draft", "reviewed", "approved"] = "draft"
    reviewRequired: bool = True


class ProcessModel(BaseModel):
    id: str
    name: str
    description: str = ""
    projectId: str | None = None
    categoryId: str | None = None
    tags: list[str] = Field(default_factory=list)
    lifecycleState: LifecycleState = LifecycleState.DRAFT
    modelState: ModelState = ModelState.TO_BE
    version: str = "1.0.0"
    owner: str = "MOA Process"
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: str = Field(default_factory=utc_now_iso)
    nodes: list[NodeModel] = Field(default_factory=list)
    edges: list[EdgeModel] = Field(default_factory=list)
    businessRules: list[BusinessRuleModel] = Field(default_factory=list)
    requirements: list[RequirementModel] = Field(default_factory=list)
    testCases: list[TestCaseModel] = Field(default_factory=list)


class ProcessVersionSummary(BaseModel):
    id: str
    processId: str
    version: str
    note: str = ""
    publishedBy: str = "MOA Process"
    publishedAt: str
    nodeCount: int = 0
    ruleCount: int = 0


class PublishVersionRequest(BaseModel):
    mode: Literal["publish_current", "update_current", "new_version"] = "publish_current"
    note: str = ""
    publishedBy: str = "MOA Process"
    process: ProcessModel | None = None


class ProcessSummary(BaseModel):
    id: str
    name: str
    description: str
    projectId: str | None = None
    categoryId: str | None = None
    tags: list[str] = Field(default_factory=list)
    lifecycleState: LifecycleState
    modelState: ModelState
    version: str
    owner: str
    nodeCount: int
    edgeCount: int
    ruleCount: int
    updatedAt: str
    publishedVersions: list[ProcessVersionSummary] = Field(default_factory=list)


class SimulationRequest(BaseModel):
    decisions: dict[str, str] = Field(default_factory=dict)
    maxSteps: int = Field(default=100, ge=1, le=500)


class ProcessCreateRequest(BaseModel):
    name: str
    description: str = ""
    owner: str = "MOA Process"
    modelState: ModelState = ModelState.TO_BE
    projectId: str | None = None
    categoryId: str | None = None
    tags: list[str] = Field(default_factory=list)


# ============================================================================
# SaaS B2B Generic Models (Categories, Tags, Projects, Teams, Collaborators,
# AI Collaborator Agents, Approval Gates, Chatwoot Conversations & Outlook)
# ============================================================================

class CategoryModel(BaseModel):
    id: str
    name: str
    color: str = "#1F93FF"
    description: str = ""
    createdAt: str = Field(default_factory=utc_now_iso)


class CategoryCreateRequest(BaseModel):
    name: str
    color: str = "#1F93FF"
    description: str = ""


class TagModel(BaseModel):
    id: str
    name: str
    color: str = "#1F93FF"
    scope: Literal["global", "project", "process", "conversation"] = "global"
    createdAt: str = Field(default_factory=utc_now_iso)


class TagCreateRequest(BaseModel):
    name: str
    color: str = "#1F93FF"
    scope: Literal["global", "project", "process", "conversation"] = "global"


class ProjectModel(BaseModel):
    id: str
    name: str
    description: str = ""
    categoryId: str | None = None
    status: Literal["active", "draft", "review", "completed", "archived"] = "active"
    ownerId: str | None = None
    ownerName: str = "Chef de Projet"
    tags: list[str] = Field(default_factory=list)
    processIds: list[str] = Field(default_factory=list)
    memberIds: list[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: str = Field(default_factory=utc_now_iso)


class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""
    categoryId: str | None = None
    status: Literal["active", "draft", "review", "completed", "archived"] = "active"
    ownerId: str | None = None
    ownerName: str = "Chef de Projet"
    tags: list[str] = Field(default_factory=list)
    processIds: list[str] = Field(default_factory=list)
    memberIds: list[str] = Field(default_factory=list)


class ProjectUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    categoryId: str | None = None
    status: Literal["active", "draft", "review", "completed", "archived"] | None = None
    ownerId: str | None = None
    ownerName: str | None = None
    tags: list[str] | None = None
    processIds: list[str] | None = None
    memberIds: list[str] | None = None


class TeamModel(BaseModel):
    id: str
    name: str
    color: str = "#1F93FF"
    description: str = ""
    memberIds: list[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)


class TeamCreateRequest(BaseModel):
    name: str
    color: str = "#1F93FF"
    description: str = ""
    memberIds: list[str] = Field(default_factory=list)


class CollaboratorModel(BaseModel):
    id: str
    name: str
    handle: str
    roleTitle: str = "Collaborateur"
    teamId: str | None = None
    email: str = ""
    avatarInitials: str = "PA"
    avatarColor: str = "#1F93FF"
    presenceStatus: Literal["online", "busy", "offline"] = "online"
    isAi: bool = False
    aiSpecialty: str = ""  # orchestrator | modeler | auditor | qa | secretary | custom
    aiProviderModel: str = "openai:gpt-4o"
    systemPrompt: str = ""
    aiCapabilities: list[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)


class CollaboratorCreateRequest(BaseModel):
    name: str
    handle: str = ""
    roleTitle: str = "Collaborateur"
    teamId: str | None = None
    email: str = ""
    avatarInitials: str = ""
    avatarColor: str = "#1F93FF"
    presenceStatus: Literal["online", "busy", "offline"] = "online"
    isAi: bool = False
    aiSpecialty: str = "custom"
    aiProviderModel: str = "openai:gpt-4o"
    systemPrompt: str = ""
    aiCapabilities: list[str] = Field(default_factory=list)


class CollaboratorUpdateRequest(BaseModel):
    name: str | None = None
    handle: str | None = None
    roleTitle: str | None = None
    teamId: str | None = None
    email: str | None = None
    avatarInitials: str | None = None
    avatarColor: str | None = None
    presenceStatus: Literal["online", "busy", "offline"] | None = None
    aiSpecialty: str | None = None
    aiProviderModel: str | None = None
    systemPrompt: str | None = None
    aiCapabilities: list[str] | None = None


class AIProviderConfigModel(BaseModel):
    providerId: str  # openai | anthropic | google | custom_endpoint
    name: str
    modelsLabel: str = ""
    apiKey: str = ""
    apiKeyMasked: str = ""
    endpointUrl: str = ""
    enabled: bool = False
    status: Literal["connected", "local_fallback"] = "local_fallback"
    updatedAt: str = Field(default_factory=utc_now_iso)


class AIProviderConfigCreateRequest(BaseModel):
    name: str
    modelsLabel: str = "custom-model"
    apiKey: str = ""
    endpointUrl: str = "https://api.example.com/v1"
    enabled: bool = True


class AIProviderConfigUpdateRequest(BaseModel):
    name: str | None = None
    modelsLabel: str | None = None
    apiKey: str | None = None
    endpointUrl: str | None = None
    enabled: bool | None = None


class ApprovalGateModel(BaseModel):
    id: str
    projectId: str | None = None
    processId: str
    label: str
    reviewerId: str | None = None
    reviewerName: str = ""
    teamId: str | None = None
    status: Literal["pending", "approved", "changes_requested"] = "pending"
    comment: str = ""
    updatedAt: str = Field(default_factory=utc_now_iso)


class ApprovalGateCreateRequest(BaseModel):
    projectId: str | None = None
    processId: str
    label: str
    reviewerId: str | None = None
    reviewerName: str = ""
    teamId: str | None = None
    comment: str = ""


class ApprovalGateUpdateRequest(BaseModel):
    label: str | None = None
    reviewerId: str | None = None
    reviewerName: str | None = None
    teamId: str | None = None
    status: Literal["pending", "approved", "changes_requested"] | None = None
    comment: str | None = None


class ConversationMessageModel(BaseModel):
    id: str
    conversationId: str
    senderId: str
    senderName: str
    senderHandle: str = ""
    senderAvatarInitials: str = "PA"
    senderAvatarColor: str = "#1F93FF"
    senderIsAi: bool = False
    content: str
    messageType: Literal[
        "message",
        "private_note",
        "activity",
        "ai_action",
        "meeting_card",
        "approval_card",
    ] = "message"
    isPrivateNote: bool = False
    mentionedHandles: list[str] = Field(default_factory=list)
    linkedNodeIds: list[str] = Field(default_factory=list)
    linkedRuleIds: list[str] = Field(default_factory=list)
    actionPayload: dict[str, Any] | None = None
    createdAt: str = Field(default_factory=utc_now_iso)


class ConversationMessageCreateRequest(BaseModel):
    senderId: str
    content: str
    isPrivateNote: bool = False
    messageType: Literal[
        "message",
        "private_note",
        "activity",
        "ai_action",
        "meeting_card",
        "approval_card",
    ] = "message"
    linkedNodeIds: list[str] = Field(default_factory=list)
    linkedRuleIds: list[str] = Field(default_factory=list)
    actionPayload: dict[str, Any] | None = None


class ConversationModel(BaseModel):
    id: str
    title: str
    conversationType: Literal[
        "direct_human", "direct_ai", "project_thread", "process_thread"
    ] = "project_thread"
    status: Literal["open", "resolved", "pending"] = "open"
    priority: Literal["none", "low", "medium", "high", "urgent"] = "medium"
    projectId: str | None = None
    processId: str | None = None
    linkedNodeIds: list[str] = Field(default_factory=list)
    linkedRuleIds: list[str] = Field(default_factory=list)
    assigneeId: str | None = None
    teamId: str | None = None
    participantIds: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    unreadCount: int = 0
    lastMessagePreview: str = ""
    messages: list[ConversationMessageModel] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: str = Field(default_factory=utc_now_iso)


class ConversationCreateRequest(BaseModel):
    title: str
    conversationType: Literal[
        "direct_human", "direct_ai", "project_thread", "process_thread"
    ] = "project_thread"
    priority: Literal["none", "low", "medium", "high", "urgent"] = "medium"
    projectId: str | None = None
    processId: str | None = None
    linkedNodeIds: list[str] = Field(default_factory=list)
    linkedRuleIds: list[str] = Field(default_factory=list)
    assigneeId: str | None = None
    teamId: str | None = None
    participantIds: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    initialMessage: str | None = None
    senderId: str | None = None


class ConversationUpdateRequest(BaseModel):
    title: str | None = None
    status: Literal["open", "resolved", "pending"] | None = None
    priority: Literal["none", "low", "medium", "high", "urgent"] | None = None
    projectId: str | None = None
    processId: str | None = None
    linkedNodeIds: list[str] | None = None
    linkedRuleIds: list[str] | None = None
    assigneeId: str | None = None
    teamId: str | None = None
    participantIds: list[str] | None = None
    tags: list[str] | None = None
    unreadCount: int | None = None


class ApplyAgentActionRequest(BaseModel):
    messageId: str
    processId: str | None = None
    projectId: str | None = None


class MeetingModel(BaseModel):
    id: str
    title: str
    projectId: str | None = None
    processId: str | None = None
    conversationId: str | None = None
    organizerId: str = ""
    organizerName: str = "Chef de Projet"
    attendeeIds: list[str] = Field(default_factory=list)
    attendeeEmails: list[str] = Field(default_factory=list)
    startAt: str
    endAt: str
    durationMinutes: int = 45
    locationOrLink: str = "Microsoft Teams / Réunion Outlook"
    agendaNotes: str = ""
    outlookSyncStatus: Literal["synced", "ready_to_sync", "ics_exported"] = "ready_to_sync"
    outlookWebLink: str = ""
    createdAt: str = Field(default_factory=utc_now_iso)


class MeetingCreateRequest(BaseModel):
    title: str
    projectId: str | None = None
    processId: str | None = None
    conversationId: str | None = None
    organizerId: str = "collab-user-main"
    organizerName: str = "Chef de Projet"
    attendeeIds: list[str] = Field(default_factory=list)
    attendeeEmails: list[str] = Field(default_factory=list)
    startAt: str
    durationMinutes: int = 45
    locationOrLink: str = "Microsoft Teams / Réunion Outlook"
    agendaNotes: str = ""
    postToConversation: bool = True


class MeetingUpdateRequest(BaseModel):
    title: str | None = None
    startAt: str | None = None
    durationMinutes: int | None = None
    locationOrLink: str | None = None
    agendaNotes: str | None = None
    attendeeIds: list[str] | None = None
    attendeeEmails: list[str] | None = None
    outlookSyncStatus: Literal["synced", "ready_to_sync", "ics_exported"] | None = None
