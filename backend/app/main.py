"""FastAPI application for Process Architect SaaS B2B platform."""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
from typing import Any
import uuid
from fastapi import FastAPI, Header, HTTPException, Query, Response, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

# Add backend directory and mcp-server directory to Python path
ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
MCP_DIR = ROOT_DIR / "mcp-server"

for p in [str(ROOT_DIR), str(BACKEND_DIR), str(MCP_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from process_engine import (
    validate_process,
    simulate_path,
    compute_analytics,
    draft_test_cases,
    build_traceability_matrix,
    export_markdown_report,
    export_test_cases_csv,
)

from app.models import (
    AIProviderConfigCreateRequest,
    AIProviderConfigModel,
    AIProviderConfigUpdateRequest,
    ApplyAgentActionRequest,
    ApprovalGateCreateRequest,
    ApprovalGateModel,
    ApprovalGateUpdateRequest,
    BusinessRuleModel,
    CategoryCreateRequest,
    CategoryModel,
    CollaboratorCreateRequest,
    CollaboratorModel,
    CollaboratorUpdateRequest,
    ConversationCreateRequest,
    ConversationMessageCreateRequest,
    ConversationMessageModel,
    ConversationModel,
    ConversationUpdateRequest,
    EdgeModel,
    ExecutionMode,
    LifecycleState,
    MeetingCreateRequest,
    MeetingModel,
    MeetingUpdateRequest,
    ModelState,
    NodeModel,
    NodeType,
    Position,
    ProcessCreateRequest,
    ProcessModel,
    ProcessSummary,
    ProcessVersionSummary,
    PublishVersionRequest,
    ProjectCreateRequest,
    ProjectModel,
    ProjectUpdateRequest,
    SimulationRequest,
    TagCreateRequest,
    TagModel,
    TeamCreateRequest,
    TeamModel,
    TestCaseModel,
    utc_now_iso,
)
from app.storage import (
    delete_ai_provider,
    delete_approval,
    delete_category,
    delete_collaborator,
    delete_conversation,
    delete_meeting,
    delete_process,
    delete_project,
    delete_tag,
    delete_team,
    get_ai_provider,
    get_approval,
    get_collaborator,
    get_conversation,
    get_meeting,
    get_process,
    get_project,
    init_db,
    list_ai_providers,
    list_approvals,
    list_categories,
    list_collaborators,
    list_conversations,
    list_meetings,
    list_processes,
    list_process_versions,
    authenticate_user,
    change_user_password,
    delete_session,
    get_session_user,
    list_projects,
    list_tags,
    list_teams,
    register_user,
    reset_workspace_blank,
    reset_workspace_demo,
    restore_process_version,
    save_ai_provider,
    save_approval,
    save_category,
    save_collaborator,
    save_conversation,
    save_meeting,
    save_process,
    save_process_version,
    save_project,
    save_tag,
    save_team,
)
from app.ai_agents import (
    extract_mentioned_handles,
    generate_ai_agent_reply,
    resolve_triggered_ai_agents,
)
from app.outlook import (
    build_graph_api_event_payload,
    build_outlook_web_deeplink,
    compute_end_iso,
    generate_ics_content,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Process Architect SaaS API",
    version="2.0.0",
    description=(
        "REST API for B2B business process modeling, customizable projects, "
        "multi-agent AI collaboration, Chatwoot conversations, and Microsoft Outlook agenda."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def get_health() -> dict[str, str]:
    return {"status": "ok", "app": "Process Architect", "version": "2.0.0"}


# ============================================================================
# Processes Endpoints (Existing + Project/Category/Tag metadata)
# ============================================================================

@app.get("/api/processes", response_model=list[ProcessSummary])
def get_all_processes() -> list[ProcessSummary]:
    return list_processes()


@app.post("/api/processes", response_model=ProcessModel, status_code=status.HTTP_201_CREATED)
def create_process(req: ProcessCreateRequest) -> ProcessModel:
    process_id = f"proc-{uuid.uuid4().hex[:8]}"
    start_id = f"node-{uuid.uuid4().hex[:6]}"
    end_id = f"node-{uuid.uuid4().hex[:6]}"

    new_proc = ProcessModel(
        id=process_id,
        name=req.name.strip() or "Nouveau processus",
        description=req.description,
        projectId=req.projectId,
        categoryId=req.categoryId,
        tags=req.tags,
        lifecycleState=LifecycleState.DRAFT,
        modelState=req.modelState,
        version="1.0.0",
        owner=req.owner,
        nodes=[
            NodeModel(
                id=start_id,
                type=NodeType.START,
                label="Début",
                position=Position(x=100, y=200),
                executionMode=ExecutionMode.AUTOMATED,
            ),
            NodeModel(
                id=end_id,
                type=NodeType.END,
                label="Fin",
                position=Position(x=600, y=200),
                executionMode=ExecutionMode.AUTOMATED,
            ),
        ],
        edges=[],
        businessRules=[],
        requirements=[],
        testCases=[],
    )
    saved = save_process(new_proc)

    # Link to project if projectId was provided
    if req.projectId:
        proj = get_project(req.projectId)
        if proj and saved.id not in proj.processIds:
            proj.processIds.append(saved.id)
            proj.updatedAt = utc_now_iso()
            save_project(proj)

    return saved


@app.get("/api/processes/{process_id}", response_model=ProcessModel)
def get_single_process(process_id: str) -> ProcessModel:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return proc


@app.put("/api/processes/{process_id}", response_model=ProcessModel)
def update_process(process_id: str, updated: ProcessModel) -> ProcessModel:
    existing = get_process(process_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Processus introuvable.")

    updated.updatedAt = utc_now_iso()
    return save_process(updated)


def _increment_major_version(version: str) -> str:
    raw = (version or "1.0.0").strip().lstrip("vV")
    parts = raw.split(".")
    try:
        major = int(parts[0])
    except (ValueError, IndexError):
        major = 1
    return f"{major + 1}.0.0"


@app.get("/api/processes/{process_id}/versions", response_model=list[ProcessVersionSummary])
def get_process_versions_endpoint(process_id: str) -> list[ProcessVersionSummary]:
    existing = get_process(process_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return list_process_versions(process_id)


@app.post("/api/processes/{process_id}/versions/publish")
def publish_process_version_endpoint(
    process_id: str, req: PublishVersionRequest
) -> dict[str, Any]:
    existing = get_process(process_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Processus introuvable.")

    target = req.process.model_copy(deep=True) if req.process else existing.model_copy(deep=True)
    target.id = process_id
    target.updatedAt = utc_now_iso()

    if req.mode == "new_version":
        # Make sure the previous published version is archived before bumping
        prev_versions = list_process_versions(process_id)
        if not any(v.version == existing.version for v in prev_versions):
            save_process_version(
                existing,
                note="Version archivée automatiquement",
                published_by=req.publishedBy,
                overwrite_same_version=False,
            )
        target.version = _increment_major_version(existing.version)
        target.lifecycleState = LifecycleState.APPROVED
        saved_proc = save_process(target)
        saved_ver = save_process_version(
            saved_proc,
            note=req.note,
            published_by=req.publishedBy,
            overwrite_same_version=False,
        )
    elif req.mode == "update_current":
        target.version = existing.version
        target.lifecycleState = LifecycleState.APPROVED
        saved_proc = save_process(target)
        saved_ver = save_process_version(
            saved_proc,
            note=req.note,
            published_by=req.publishedBy,
            overwrite_same_version=True,
        )
    else:
        # publish_current: close draft to lock current version (e.g. v1)
        target.lifecycleState = LifecycleState.APPROVED
        saved_proc = save_process(target)
        saved_ver = save_process_version(
            saved_proc,
            note=req.note,
            published_by=req.publishedBy,
            overwrite_same_version=True,
        )

    return {
        "process": saved_proc.model_dump(),
        "version": saved_ver.model_dump(),
        "versions": [v.model_dump() for v in list_process_versions(process_id)],
    }


@app.post("/api/processes/{process_id}/versions/{version_id}/restore", response_model=ProcessModel)
def restore_process_version_endpoint(process_id: str, version_id: str) -> ProcessModel:
    restored = restore_process_version(process_id, version_id)
    if not restored:
        raise HTTPException(status_code=404, detail="Version introuvable.")
    return restored


@app.delete("/api/processes/{process_id}")
def remove_process(process_id: str) -> dict[str, str]:
    success = delete_process(process_id)
    if not success:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return {"message": "Processus supprimé avec succès."}


@app.post("/api/processes/{process_id}/duplicate", response_model=ProcessModel)
def duplicate_process(process_id: str) -> ProcessModel:
    existing = get_process(process_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Processus introuvable.")

    new_id = f"proc-{uuid.uuid4().hex[:8]}"
    copied = existing.model_copy(deep=True)
    copied.id = new_id
    copied.name = f"{existing.name} (Copie)"
    copied.lifecycleState = LifecycleState.DRAFT
    copied.createdAt = utc_now_iso()
    copied.updatedAt = utc_now_iso()
    return save_process(copied)


@app.post("/api/processes/{process_id}/validate")
def validate_process_endpoint(process_id: str) -> dict:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return validate_process(proc.model_dump())


@app.post("/api/processes/{process_id}/simulate")
def simulate_process_endpoint(process_id: str, req: SimulationRequest) -> dict:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return simulate_path(proc.model_dump(), req.decisions, req.maxSteps)


@app.get("/api/processes/{process_id}/analytics")
def analytics_endpoint(process_id: str) -> dict:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return compute_analytics(proc.model_dump())


@app.post("/api/processes/{process_id}/test-cases")
def generate_tests_endpoint(process_id: str) -> dict:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return draft_test_cases(proc.model_dump())


@app.get("/api/processes/{process_id}/traceability")
def traceability_endpoint(process_id: str) -> dict:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    data = proc.model_dump()
    saved_tcs = [tc.model_dump() for tc in proc.testCases] if proc.testCases else None
    return build_traceability_matrix(data, saved_tcs)


@app.get("/api/processes/{process_id}/export")
def export_process_endpoint(
    process_id: str,
    format: str = Query("json", pattern="^(json|markdown|csv)$"),
) -> Response:
    proc = get_process(process_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Processus introuvable.")

    data = proc.model_dump()

    if format == "json":
        content = json.dumps(data, indent=2, ensure_ascii=False)
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="process-{process_id}.json"'},
        )
    elif format == "markdown":
        validation = validate_process(data)
        analytics = compute_analytics(data)
        md_text = export_markdown_report(data, validation, analytics)
        return PlainTextResponse(
            content=md_text,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="rapport-analyse-{process_id}.md"'},
        )
    elif format == "csv":
        cases_list = (
            [tc.model_dump() for tc in proc.testCases]
            if proc.testCases
            else draft_test_cases(data).get("cases", [])
        )
        csv_text = export_test_cases_csv(cases_list)
        return Response(
            content=csv_text,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="cas-de-test-{process_id}.csv"'},
        )

    raise HTTPException(status_code=400, detail="Format non supporté.")


@app.post("/api/processes/import", response_model=ProcessModel)
def import_process(payload: dict) -> ProcessModel:
    try:
        imported_proc = ProcessModel.model_validate(payload)
        if get_process(imported_proc.id):
            imported_proc.id = f"proc-{uuid.uuid4().hex[:8]}"
            imported_proc.name = f"{imported_proc.name} (Importé)"
        return save_process(imported_proc)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Échec de l'importation : le format JSON fourni ne respecte pas le schéma du modèle ({exc}).",
        )


# ============================================================================
# Categories & Tags Endpoints (100% Client-Customizable)
# ============================================================================

@app.get("/api/categories", response_model=list[CategoryModel])
def get_categories() -> list[CategoryModel]:
    return list_categories()


@app.post("/api/categories", response_model=CategoryModel, status_code=status.HTTP_201_CREATED)
def create_category(req: CategoryCreateRequest) -> CategoryModel:
    cat = CategoryModel(
        id=f"cat-{uuid.uuid4().hex[:8]}",
        name=req.name.strip() or "Nouvelle catégorie",
        color=req.color or "#1F93FF",
        description=req.description,
    )
    return save_category(cat)


@app.delete("/api/categories/{category_id}")
def remove_category(category_id: str) -> dict[str, str]:
    if not delete_category(category_id):
        raise HTTPException(status_code=404, detail="Catégorie introuvable.")
    return {"message": "Catégorie supprimée."}


@app.get("/api/tags", response_model=list[TagModel])
def get_tags() -> list[TagModel]:
    return list_tags()


@app.post("/api/tags", response_model=TagModel, status_code=status.HTTP_201_CREATED)
def create_tag(req: TagCreateRequest) -> TagModel:
    tag = TagModel(
        id=f"tag-{uuid.uuid4().hex[:8]}",
        name=req.name.strip().lower().replace(" ", "-") or "tag",
        color=req.color or "#1F93FF",
        scope=req.scope,
    )
    return save_tag(tag)


@app.delete("/api/tags/{tag_id}")
def remove_tag(tag_id: str) -> dict[str, str]:
    if not delete_tag(tag_id):
        raise HTTPException(status_code=404, detail="Tag introuvable.")
    return {"message": "Tag supprimé."}


# ============================================================================
# Projects Endpoints (Generic & Customizable)
# ============================================================================

@app.get("/api/projects", response_model=list[ProjectModel])
def get_projects() -> list[ProjectModel]:
    return list_projects()


@app.post("/api/projects", response_model=ProjectModel, status_code=status.HTTP_201_CREATED)
def create_project(req: ProjectCreateRequest) -> ProjectModel:
    proj = ProjectModel(
        id=f"proj-{uuid.uuid4().hex[:8]}",
        name=req.name.strip() or "Nouveau projet",
        description=req.description,
        categoryId=req.categoryId,
        status=req.status,
        ownerId=req.ownerId,
        ownerName=req.ownerName,
        tags=req.tags,
        processIds=req.processIds,
        memberIds=req.memberIds,
    )
    return save_project(proj)


@app.get("/api/projects/{project_id}", response_model=ProjectModel)
def get_single_project(project_id: str) -> ProjectModel:
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    return proj


@app.put("/api/projects/{project_id}", response_model=ProjectModel)
def update_project_endpoint(project_id: str, req: ProjectUpdateRequest) -> ProjectModel:
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Projet introuvable.")

    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(existing, k, v)
    existing.updatedAt = utc_now_iso()
    return save_project(existing)


@app.delete("/api/projects/{project_id}")
def remove_project(project_id: str) -> dict[str, str]:
    if not delete_project(project_id):
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    return {"message": "Projet supprimé."}


# ============================================================================
# Teams, Human Collaborators & AI Collaborator Agents Endpoints
# ============================================================================

@app.get("/api/teams", response_model=list[TeamModel])
def get_teams() -> list[TeamModel]:
    return list_teams()


@app.post("/api/teams", response_model=TeamModel, status_code=status.HTTP_201_CREATED)
def create_team(req: TeamCreateRequest) -> TeamModel:
    team = TeamModel(
        id=f"team-{uuid.uuid4().hex[:8]}",
        name=req.name.strip() or "Nouvelle équipe",
        color=req.color or "#1F93FF",
        description=req.description,
        memberIds=req.memberIds,
    )
    return save_team(team)


@app.put("/api/teams/{team_id}", response_model=TeamModel)
def update_team(team_id: str, req: TeamCreateRequest) -> TeamModel:
    teams = list_teams()
    existing = next((t for t in teams if t.id == team_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Équipe introuvable.")
    existing.name = req.name.strip() or existing.name
    existing.color = req.color or existing.color
    existing.description = req.description
    existing.memberIds = req.memberIds
    return save_team(existing)


@app.delete("/api/teams/{team_id}")
def remove_team(team_id: str) -> dict[str, str]:
    if not delete_team(team_id):
        raise HTTPException(status_code=404, detail="Équipe introuvable.")
    return {"message": "Équipe supprimée."}


def _compute_initials(name: str) -> str:
    cleaned = "".join(c for c in name if c.isalnum() or c.isspace()).strip()
    parts = [p for p in cleaned.split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    if parts:
        return parts[0][:2].upper()
    return "PA"


@app.get("/api/collaborators", response_model=list[CollaboratorModel])
def get_collaborators(is_ai: bool | None = Query(default=None)) -> list[CollaboratorModel]:
    return list_collaborators(is_ai=is_ai)


@app.post("/api/collaborators", response_model=CollaboratorModel, status_code=status.HTTP_201_CREATED)
def create_collaborator(req: CollaboratorCreateRequest) -> CollaboratorModel:
    name = req.name.strip() or ("Nouvel Agent IA" if req.isAi else "Nouveau Collaborateur")
    handle = (req.handle or name.split()[0]).strip().lstrip("@").replace(" ", "-")
    initials = req.avatarInitials.strip() or _compute_initials(name)
    prefix = "agent" if req.isAi else "collab"

    collab = CollaboratorModel(
        id=f"{prefix}-{uuid.uuid4().hex[:8]}",
        name=name,
        handle=handle,
        roleTitle=req.roleTitle or ("Agent IA Collaborateur" if req.isAi else "Collaborateur"),
        teamId=req.teamId,
        email=req.email or f"{handle.lower()}@organisation.fr",
        avatarInitials=initials,
        avatarColor=req.avatarColor or ("#7C3AED" if req.isAi else "#1F93FF"),
        presenceStatus=req.presenceStatus,
        isAi=req.isAi,
        aiSpecialty=req.aiSpecialty if req.isAi else "",
        aiProviderModel=req.aiProviderModel if req.isAi else "",
        systemPrompt=req.systemPrompt if req.isAi else "",
        aiCapabilities=req.aiCapabilities if req.isAi else [],
    )
    return save_collaborator(collab)


@app.put("/api/collaborators/{collab_id}", response_model=CollaboratorModel)
def update_collaborator_endpoint(collab_id: str, req: CollaboratorUpdateRequest) -> CollaboratorModel:
    existing = get_collaborator(collab_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Intervenant ou Agent IA introuvable.")

    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(existing, k, v)
    return save_collaborator(existing)


@app.delete("/api/collaborators/{collab_id}")
def remove_collaborator(collab_id: str) -> dict[str, str]:
    if not delete_collaborator(collab_id):
        raise HTTPException(status_code=404, detail="Intervenant ou Agent IA introuvable.")
    return {"message": "Supprimé avec succès."}


# Dedicated AI Collaborator Agent convenience endpoints
@app.get("/api/ai-agents", response_model=list[CollaboratorModel])
def get_ai_agents() -> list[CollaboratorModel]:
    return list_collaborators(is_ai=True)


@app.post("/api/ai-agents", response_model=CollaboratorModel, status_code=status.HTTP_201_CREATED)
def create_ai_agent(req: CollaboratorCreateRequest) -> CollaboratorModel:
    req.isAi = True
    if not req.aiCapabilities:
        req.aiCapabilities = ["model_steps", "audit_rules", "generate_tests", "summarize_and_schedule"]
    return create_collaborator(req)


@app.put("/api/ai-agents/{agent_id}", response_model=CollaboratorModel)
def update_ai_agent(agent_id: str, req: CollaboratorUpdateRequest) -> CollaboratorModel:
    return update_collaborator_endpoint(agent_id, req)


@app.delete("/api/ai-agents/{agent_id}")
def remove_ai_agent(agent_id: str) -> dict[str, str]:
    return remove_collaborator(agent_id)


# ============================================================================
# AI Providers Configuration Endpoints (Admin BYOK / Enterprise LLM)
# ============================================================================

@app.get("/api/ai-providers", response_model=list[AIProviderConfigModel])
def get_ai_providers_endpoint() -> list[AIProviderConfigModel]:
    return list_ai_providers(include_raw_key=False)


@app.post("/api/ai-providers", response_model=AIProviderConfigModel, status_code=status.HTTP_201_CREATED)
def create_ai_provider_endpoint(req: AIProviderConfigCreateRequest) -> AIProviderConfigModel:
    slug = "".join(c.lower() for c in req.name if c.isalnum())[:12] or "custom"
    provider_id = f"custom-{slug}-{uuid.uuid4().hex[:4]}"
    cfg = AIProviderConfigModel(
        providerId=provider_id,
        name=req.name.strip() or "Fournisseur IA Personnalisé",
        modelsLabel=req.modelsLabel.strip() or "custom-model",
        apiKey=req.apiKey.strip(),
        endpointUrl=req.endpointUrl.strip() or "https://api.example.com/v1",
        enabled=req.enabled,
    )
    return save_ai_provider(cfg)


@app.put("/api/ai-providers/{provider_id}", response_model=AIProviderConfigModel)
def update_ai_provider_endpoint(
    provider_id: str, req: AIProviderConfigUpdateRequest
) -> AIProviderConfigModel:
    existing = get_ai_provider(provider_id, include_raw_key=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Fournisseur IA introuvable.")

    if req.name is not None and req.name.strip():
        existing.name = req.name.strip()
    if req.modelsLabel is not None and req.modelsLabel.strip():
        existing.modelsLabel = req.modelsLabel.strip()
    if req.apiKey is not None:
        existing.apiKey = req.apiKey.strip()
    if req.endpointUrl is not None:
        existing.endpointUrl = req.endpointUrl.strip()
    if req.enabled is not None:
        existing.enabled = req.enabled

    return save_ai_provider(existing)


@app.delete("/api/ai-providers/{provider_id}")
def delete_ai_provider_endpoint(provider_id: str) -> dict[str, str]:
    if not delete_ai_provider(provider_id):
        raise HTTPException(status_code=400, detail="Ce fournisseur par défaut ne peut pas être supprimé.")
    return {"message": "Fournisseur IA supprimé."}


# ============================================================================
# Configurable Approval Gates Endpoints
# ============================================================================

@app.get("/api/approvals", response_model=list[ApprovalGateModel])
def get_approvals(
    process_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
) -> list[ApprovalGateModel]:
    return list_approvals(process_id=process_id, project_id=project_id)


@app.post("/api/approvals", response_model=ApprovalGateModel, status_code=status.HTTP_201_CREATED)
def create_approval_gate(req: ApprovalGateCreateRequest) -> ApprovalGateModel:
    gate = ApprovalGateModel(
        id=f"app-{uuid.uuid4().hex[:8]}",
        projectId=req.projectId,
        processId=req.processId,
        label=req.label.strip() or "Jalon de validation",
        reviewerId=req.reviewerId,
        reviewerName=req.reviewerName or "Approbateur",
        teamId=req.teamId,
        status="pending",
        comment=req.comment,
    )
    return save_approval(gate)


@app.put("/api/approvals/{approval_id}", response_model=ApprovalGateModel)
def update_approval_gate(approval_id: str, req: ApprovalGateUpdateRequest) -> ApprovalGateModel:
    existing = get_approval(approval_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Jalon d'approbation introuvable.")

    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(existing, k, v)
    existing.updatedAt = utc_now_iso()
    return save_approval(existing)


@app.delete("/api/approvals/{approval_id}")
def remove_approval_gate(approval_id: str) -> dict[str, str]:
    if not delete_approval(approval_id):
        raise HTTPException(status_code=404, detail="Jalon d'approbation introuvable.")
    return {"message": "Jalon supprimé."}


# ============================================================================
# Chatwoot-style Conversations & Multi-Agent IA Replies
# ============================================================================

@app.get("/api/conversations", response_model=list[ConversationModel])
def get_conversations_endpoint(
    project_id: str | None = Query(default=None),
    process_id: str | None = Query(default=None),
) -> list[ConversationModel]:
    return list_conversations(project_id=project_id, process_id=process_id)


@app.post("/api/conversations", response_model=ConversationModel, status_code=status.HTTP_201_CREATED)
def create_conversation_endpoint(req: ConversationCreateRequest) -> ConversationModel:
    conv_id = f"conv-{uuid.uuid4().hex[:8]}"
    now = utc_now_iso()

    conv = ConversationModel(
        id=conv_id,
        title=req.title.strip() or "Nouvelle conversation",
        conversationType=req.conversationType,
        status="open",
        priority=req.priority,
        projectId=req.projectId,
        processId=req.processId,
        linkedNodeIds=req.linkedNodeIds,
        linkedRuleIds=req.linkedRuleIds,
        assigneeId=req.assigneeId,
        teamId=req.teamId,
        participantIds=req.participantIds,
        tags=req.tags,
        unreadCount=0,
        lastMessagePreview="",
        messages=[],
        createdAt=now,
        updatedAt=now,
    )
    saved = save_conversation(conv)

    if req.initialMessage and req.initialMessage.strip():
        msg_req = ConversationMessageCreateRequest(
            senderId=req.senderId or "collab-user-main",
            content=req.initialMessage.strip(),
            isPrivateNote=False,
        )
        return post_conversation_message(saved.id, msg_req)

    return saved


@app.get("/api/conversations/{conv_id}", response_model=ConversationModel)
def get_single_conversation(conv_id: str) -> ConversationModel:
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    return conv


@app.put("/api/conversations/{conv_id}", response_model=ConversationModel)
def update_conversation_endpoint(conv_id: str, req: ConversationUpdateRequest) -> ConversationModel:
    existing = get_conversation(conv_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")

    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(existing, k, v)
    existing.updatedAt = utc_now_iso()
    return save_conversation(existing)


@app.delete("/api/conversations/{conv_id}")
def remove_conversation(conv_id: str) -> dict[str, str]:
    if not delete_conversation(conv_id):
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    return {"message": "Conversation supprimée."}


def _resolve_conversation_process(
    conv: ConversationModel,
    explicit_process_id: str | None = None,
) -> ProcessModel | None:
    """Resolve the process scoped to this conversation/project (never leak another project's process)."""
    if explicit_process_id:
        p = get_process(explicit_process_id)
        if p and (not conv.projectId or p.projectId == conv.projectId):
            return p
    if conv.processId:
        p = get_process(conv.processId)
        if p and (not conv.projectId or p.projectId == conv.projectId):
            return p
    all_procs = list_processes()
    if conv.projectId:
        project_procs = [p for p in all_procs if p.projectId == conv.projectId]
        if project_procs:
            resolved = get_process(project_procs[0].id)
            if resolved:
                conv.processId = resolved.id
            return resolved
        return None
    if all_procs:
        return get_process(all_procs[0].id)
    return None


@app.post("/api/conversations/{conv_id}/messages", response_model=ConversationModel)
def post_conversation_message(conv_id: str, req: ConversationMessageCreateRequest) -> ConversationModel:
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")

    all_collabs = list_collaborators()
    sender = next((c for c in all_collabs if c.id == req.senderId), None)
    sender_name = sender.name if sender else "Collaborateur"
    sender_handle = sender.handle if sender else "user"
    sender_initials = sender.avatarInitials if sender else "PA"
    sender_color = sender.avatarColor if sender else "#1F93FF"
    sender_is_ai = sender.isAi if sender else False

    mentions = extract_mentioned_handles(req.content)
    msg_type = "private_note" if req.isPrivateNote else req.messageType

    new_msg = ConversationMessageModel(
        id=f"msg-{uuid.uuid4().hex[:8]}",
        conversationId=conv.id,
        senderId=req.senderId,
        senderName=sender_name,
        senderHandle=sender_handle,
        senderAvatarInitials=sender_initials,
        senderAvatarColor=sender_color,
        senderIsAi=sender_is_ai,
        content=req.content,
        messageType=msg_type,
        isPrivateNote=req.isPrivateNote,
        mentionedHandles=mentions,
        linkedNodeIds=req.linkedNodeIds,
        linkedRuleIds=req.linkedRuleIds,
        actionPayload=req.actionPayload,
    )

    conv.messages.append(new_msg)
    if req.senderId not in conv.participantIds:
        conv.participantIds.append(req.senderId)

    for nid in req.linkedNodeIds:
        if nid not in conv.linkedNodeIds:
            conv.linkedNodeIds.append(nid)
    for rid in req.linkedRuleIds:
        if rid not in conv.linkedRuleIds:
            conv.linkedRuleIds.append(rid)

    conv.lastMessagePreview = req.content[:110]
    conv.updatedAt = utc_now_iso()

    # Check if any AI Collaborator Agent should respond (unless sender is already an AI agent)
    if not sender_is_ai:
        triggered_agents = resolve_triggered_ai_agents(req.content, conv, all_collabs)
        linked_proc = _resolve_conversation_process(conv)

        for ai_agent in triggered_agents:
            ai_reply_text, action_payload = generate_ai_agent_reply(
                agent=ai_agent,
                user_message=req.content,
                conversation=conv,
                process=linked_proc,
            )
            ai_msg = ConversationMessageModel(
                id=f"msg-ai-{uuid.uuid4().hex[:8]}",
                conversationId=conv.id,
                senderId=ai_agent.id,
                senderName=ai_agent.name,
                senderHandle=ai_agent.handle,
                senderAvatarInitials=ai_agent.avatarInitials,
                senderAvatarColor=ai_agent.avatarColor,
                senderIsAi=True,
                content=ai_reply_text,
                messageType="ai_action" if action_payload else "message",
                isPrivateNote=False,
                actionPayload=action_payload,
            )
            conv.messages.append(ai_msg)
            if ai_agent.id not in conv.participantIds:
                conv.participantIds.append(ai_agent.id)
            conv.lastMessagePreview = ai_reply_text[:110]
            conv.updatedAt = utc_now_iso()

    return save_conversation(conv)


@app.post("/api/conversations/{conv_id}/apply-action")
def apply_ai_agent_action(conv_id: str, req: ApplyAgentActionRequest) -> dict[str, Any]:
    """Execute the 1-click deliverable produced by an AI Collaborator Agent in a conversation."""
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")

    target_msg = next((m for m in conv.messages if m.id == req.messageId), None)
    if not target_msg or not target_msg.actionPayload:
        raise HTTPException(status_code=404, detail="Action IA introuvable sur ce message.")

    payload = target_msg.actionPayload
    action_type = payload.get("actionType")
    proc = _resolve_conversation_process(
        conv,
        explicit_process_id=req.processId or payload.get("processId"),
    )

    result_detail: dict[str, Any] = {"actionType": action_type, "applied": True}

    if action_type == "apply_model_steps" and proc:
        existing_node_ids = {n.id for n in proc.nodes}
        added_nodes: list[NodeModel] = []
        for raw_node in payload.get("proposedNodes", []):
            n_model = NodeModel.model_validate(raw_node)
            if n_model.id not in existing_node_ids:
                proc.nodes.append(n_model)
                added_nodes.append(n_model)
        for raw_edge in payload.get("proposedEdges", []):
            e_model = EdgeModel.model_validate(raw_edge)
            proc.edges.append(e_model)

        # Auto-splice newly added nominal chain cleanly before the nominal End event so the diagram stays 100% connected
        if added_nodes:
            entry_id = payload.get("nominalEntryNodeId") or added_nodes[0].id
            tail_id = payload.get("nominalTailNodeId") or added_nodes[-1].id
            exit_label = payload.get("nominalExitLabel") or "Suivant"
            existing_ends = [
                n
                for n in proc.nodes
                if n.id in existing_node_ids
                and n.type == NodeType.END
                and not re.search(r"rejet|refus|caduc|expir|non[\s-]?couvert", (n.label or "").lower())
            ]
            if not existing_ends:
                existing_ends = [n for n in proc.nodes if n.id in existing_node_ids and n.type == NodeType.END]
            nominal_end = existing_ends[0] if existing_ends else None
            if nominal_end:
                edge_to_end = next(
                    (e for e in proc.edges if e.targetNodeId == nominal_end.id and e.sourceNodeId in existing_node_ids),
                    None,
                )
                if edge_to_end:
                    edge_to_end.targetNodeId = entry_id
                proc.edges.append(
                    EdgeModel(
                        id=f"edge_ai_end_{uuid.uuid4().hex[:6]}",
                        sourceNodeId=tail_id,
                        targetNodeId=nominal_end.id,
                        label=exit_label,
                    )
                )
            else:
                prev_non_end = [n for n in proc.nodes if n.id in existing_node_ids]
                if prev_non_end:
                    proc.edges.append(
                        EdgeModel(
                            id=f"edge_ai_link_{uuid.uuid4().hex[:6]}",
                            sourceNodeId=prev_non_end[-1].id,
                            targetNodeId=entry_id,
                            label="Suivant",
                        )
                    )

        proc.updatedAt = utc_now_iso()
        save_process(proc)
        result_detail["processId"] = proc.id
        result_detail["message"] = f"Étapes ajoutées et reliées dans « {proc.name} »."

    elif action_type == "add_business_rules" and proc:
        existing_rule_ids = {r.id for r in proc.businessRules}
        for raw_rule in payload.get("proposedRules", []):
            r_model = BusinessRuleModel.model_validate(raw_rule)
            if r_model.id in existing_rule_ids:
                r_model.id = f"{r_model.id}-{uuid.uuid4().hex[:3].upper()}"
            proc.businessRules.append(r_model)
        proc.updatedAt = utc_now_iso()
        save_process(proc)
        result_detail["processId"] = proc.id
        result_detail["message"] = "Règle(s) de gestion ajoutée(s) au référentiel du processus."

    elif action_type == "add_test_cases" and proc:
        existing_tc_ids = {tc.id for tc in proc.testCases}
        for raw_tc in payload.get("proposedTestCases", []):
            tc_model = TestCaseModel.model_validate(raw_tc)
            if tc_model.id in existing_tc_ids:
                tc_model.id = f"{tc_model.id}-{uuid.uuid4().hex[:3].upper()}"
            proc.testCases.append(tc_model)
        proc.updatedAt = utc_now_iso()
        save_process(proc)
        result_detail["processId"] = proc.id
        result_detail["message"] = "Cas de test ajoutés au cahier de recette du processus."

    elif action_type == "create_meeting_and_note":
        note_text = payload.get("privateNoteContent") or "🔒 Note de synthèse créée par l'Agent Secrétaire."
        note_msg = ConversationMessageModel(
            id=f"msg-note-{uuid.uuid4().hex[:8]}",
            conversationId=conv.id,
            senderId=target_msg.senderId,
            senderName=target_msg.senderName,
            senderHandle=target_msg.senderHandle,
            senderAvatarInitials=target_msg.senderAvatarInitials,
            senderAvatarColor=target_msg.senderAvatarColor,
            senderIsAi=True,
            content=note_text,
            messageType="private_note",
            isPrivateNote=True,
        )
        conv.messages.append(note_msg)

        m_data = payload.get("proposedMeeting", {})
        start_at = m_data.get("startAt") or utc_now_iso()
        duration = int(m_data.get("durationMinutes", 45))
        all_human_collabs = list_collaborators(is_ai=False)
        if conv.projectId:
            proj_obj = get_project(conv.projectId)
            if proj_obj and proj_obj.memberIds:
                member_set = set(proj_obj.memberIds) | {"collab-user-main"}
                scoped_humans = [c for c in all_human_collabs if c.id in member_set]
                if scoped_humans:
                    all_human_collabs = scoped_humans
        emails = [c.email for c in all_human_collabs if c.email]

        new_meeting = MeetingModel(
            id=f"meet-{uuid.uuid4().hex[:8]}",
            title=m_data.get("title") or f"Réunion — {conv.title}",
            projectId=conv.projectId,
            processId=conv.processId or (proc.id if proc else None),
            conversationId=conv.id,
            organizerId="collab-user-main",
            organizerName="Khalil Benhassen",
            attendeeIds=[c.id for c in all_human_collabs],
            attendeeEmails=emails,
            startAt=start_at,
            endAt=compute_end_iso(start_at, duration),
            durationMinutes=duration,
            locationOrLink=m_data.get("locationOrLink", "Microsoft Teams / Réunion Outlook"),
            agendaNotes=m_data.get("agendaNotes", note_text),
            outlookSyncStatus="ready_to_sync",
        )
        saved_meeting = save_meeting(new_meeting)
        result_detail["meeting"] = saved_meeting.model_dump()
        result_detail["message"] = "Note privée créée et réunion ajoutée à l'Agenda Outlook."

    target_msg.actionPayload["applied"] = True
    conv.updatedAt = utc_now_iso()
    save_conversation(conv)
    result_detail["conversation"] = conv.model_dump()
    return result_detail


# ============================================================================
# Meetings & Microsoft Outlook Integration Endpoints
# ============================================================================

@app.get("/api/meetings", response_model=list[MeetingModel])
def get_meetings_endpoint(
    project_id: str | None = Query(default=None),
    process_id: str | None = Query(default=None),
) -> list[MeetingModel]:
    return list_meetings(project_id=project_id, process_id=process_id)


@app.post("/api/meetings", response_model=MeetingModel, status_code=status.HTTP_201_CREATED)
def create_meeting_endpoint(req: MeetingCreateRequest) -> MeetingModel:
    end_iso = compute_end_iso(req.startAt, req.durationMinutes)
    emails = list(req.attendeeEmails)
    if not emails and req.attendeeIds:
        all_collabs = list_collaborators()
        emails = [c.email for c in all_collabs if c.id in req.attendeeIds and c.email and not c.isAi]

    meeting = MeetingModel(
        id=f"meet-{uuid.uuid4().hex[:8]}",
        title=req.title.strip() or "Réunion Projet Outlook",
        projectId=req.projectId,
        processId=req.processId,
        conversationId=req.conversationId,
        organizerId=req.organizerId,
        organizerName=req.organizerName,
        attendeeIds=req.attendeeIds,
        attendeeEmails=emails,
        startAt=req.startAt,
        endAt=end_iso,
        durationMinutes=req.durationMinutes,
        locationOrLink=req.locationOrLink,
        agendaNotes=req.agendaNotes,
        outlookSyncStatus="ready_to_sync",
    )
    saved = save_meeting(meeting)

    # Optionally post an interactive Meeting Card into the linked conversation
    if req.postToConversation and req.conversationId:
        conv = get_conversation(req.conversationId)
        if conv:
            card_msg = ConversationMessageModel(
                id=f"msg-meet-{uuid.uuid4().hex[:8]}",
                conversationId=conv.id,
                senderId=req.organizerId,
                senderName=req.organizerName,
                senderAvatarInitials=_compute_initials(req.organizerName),
                senderAvatarColor="#1F93FF",
                senderIsAi=False,
                content=f"📅 Réunion planifiée : **{saved.title}** ({saved.durationMinutes} min)",
                messageType="meeting_card",
                isPrivateNote=False,
                actionPayload={
                    "actionType": "outlook_meeting_card",
                    "meeting": saved.model_dump(),
                },
            )
            conv.messages.append(card_msg)
            conv.lastMessagePreview = f"📅 Réunion : {saved.title}"
            conv.updatedAt = utc_now_iso()
            save_conversation(conv)

    return saved


@app.get("/api/meetings/{meeting_id}", response_model=MeetingModel)
def get_single_meeting(meeting_id: str) -> MeetingModel:
    m = get_meeting(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Réunion introuvable.")
    return m


@app.put("/api/meetings/{meeting_id}", response_model=MeetingModel)
def update_meeting_endpoint(meeting_id: str, req: MeetingUpdateRequest) -> MeetingModel:
    existing = get_meeting(meeting_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Réunion introuvable.")

    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(existing, k, v)
    existing.endAt = compute_end_iso(existing.startAt, existing.durationMinutes)
    return save_meeting(existing)


@app.delete("/api/meetings/{meeting_id}")
def remove_meeting(meeting_id: str) -> dict[str, str]:
    if not delete_meeting(meeting_id):
        raise HTTPException(status_code=404, detail="Réunion introuvable.")
    return {"message": "Réunion supprimée."}


@app.get("/api/meetings/{meeting_id}/ics")
def export_meeting_ics(meeting_id: str) -> Response:
    m = get_meeting(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Réunion introuvable.")

    m.outlookSyncStatus = "ics_exported"
    save_meeting(m)
    ics_text = generate_ics_content(m)
    return Response(
        content=ics_text,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="reunion-outlook-{meeting_id}.ics"'},
    )


@app.post("/api/meetings/{meeting_id}/sync-outlook")
def sync_meeting_with_outlook(meeting_id: str) -> dict[str, Any]:
    m = get_meeting(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Réunion introuvable.")

    m.outlookSyncStatus = "synced"
    saved = save_meeting(m)
    return {
        "status": "synced",
        "meeting": saved.model_dump(),
        "outlookWebLink": build_outlook_web_deeplink(saved),
        "icsDownloadUrl": f"/api/meetings/{meeting_id}/ics",
        "graphApiPayload": build_graph_api_event_payload(saved),
    }


# ============================================================================
# Blank Workspace Reset Endpoint ("Espace Vierge")
# ============================================================================

@app.post("/api/workspace/reset-blank")
def reset_workspace_to_blank_endpoint() -> dict[str, Any]:
    return reset_workspace_blank()


@app.post("/api/workspace/reset-demo")
def reset_workspace_to_demo_endpoint() -> dict[str, Any]:
    return reset_workspace_demo()


# ============================================================================
# Authentication & User Session Endpoints
# ============================================================================

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    roleTitle: str | None = "Collaborateur"


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    parts = authorization.strip().split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()


@app.post("/api/auth/login")
def auth_login(req: LoginRequest) -> dict[str, Any]:
    res = authenticate_user(req.email, req.password)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )
    user, token = res
    return {"token": token, "user": user.model_dump()}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def auth_register(req: RegisterRequest) -> dict[str, Any]:
    try:
        user, token = register_user(
            name=req.name,
            email=req.email,
            password=req.password,
            role_title=req.roleTitle or "Collaborateur",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"token": token, "user": user.model_dump()}


@app.get("/api/auth/me")
def auth_me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    user = get_session_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée ou invalide.",
        )
    return {"user": user.model_dump()}


@app.post("/api/auth/logout")
def auth_logout(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    if token:
        delete_session(token)
    return {"ok": True}


@app.post("/api/auth/change-password")
def auth_change_password(
    req: ChangePasswordRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    user = get_session_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
        )
    ok = change_user_password(user.id, req.currentPassword, req.newPassword)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail="Mot de passe actuel incorrect ou nouveau mot de passe trop court (min. 4 caractères).",
        )
    return {"ok": True}

