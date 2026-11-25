"""Multi-Agent AI Collaborator Engine for Process Architect.

Supports the 5 built-in AI Collaborator Agents:
- 🤖 Architect Copilot (@Copilot)
- 📐 Agent Modélisateur (@Modelisateur)
- 🔍 Agent Auditeur & Règles (@Auditeur)
- 🧪 Agent QA & Simulation (@QA)
- 📅 Agent Secrétaire de Projet (@Secretaire)
Plus any custom AI Collaborator Agent created and configured by the client.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
import sys
import unicodedata
import uuid
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
MCP_DIR = ROOT_DIR / "mcp-server"
if str(MCP_DIR) not in sys.path:
    sys.path.insert(0, str(MCP_DIR))

from process_engine import (
    validate_process,
    compute_analytics,
    draft_test_cases,
    build_traceability_matrix,
)
from app.models import (
    CollaboratorModel,
    ConversationModel,
    ConversationMessageModel,
    ProcessModel,
)


DEFAULT_AI_AGENTS: list[CollaboratorModel] = [
    CollaboratorModel(
        id="agent-copilot",
        name="Architect Copilot",
        handle="Copilot",
        roleTitle="Orchestrateur IA & Architecte Processus",
        teamId=None,
        email="copilot@process-architect.ai",
        avatarInitials="AI",
        avatarColor="#1F93FF",
        presenceStatus="online",
        isAi=True,
        aiSpecialty="orchestrator",
        aiProviderModel="openai:gpt-4o",
        systemPrompt=(
            "Tu es Architect Copilot, l'orchestrateur IA principal de la plateforme Process Architect. "
            "Tu aides les équipes à concevoir, auditer, tester et documenter leurs processus et projets."
        ),
        aiCapabilities=[
            "model_steps",
            "audit_rules",
            "generate_tests",
            "summarize_and_schedule",
        ],
    ),
    CollaboratorModel(
        id="agent-modelisateur",
        name="Agent Modélisateur",
        handle="Modelisateur",
        roleTitle="Spécialiste Conception de Flux & BPM",
        teamId=None,
        email="modelisateur@process-architect.ai",
        avatarInitials="MO",
        avatarColor="#7C3AED",
        presenceStatus="online",
        isAi=True,
        aiSpecialty="modeler",
        aiProviderModel="openai:gpt-4o",
        systemPrompt=(
            "Tu transformes une discussion ou un besoin exprimé en texte en étapes de processus "
            "(Activités, Décisions, Données, Début/Fin) et connecteurs logiques prêts pour le Studio."
        ),
        aiCapabilities=["model_steps"],
    ),
    CollaboratorModel(
        id="agent-auditeur",
        name="Agent Auditeur & Règles",
        handle="Auditeur",
        roleTitle="Auditeur de Cohérence & Règles de Gestion",
        teamId=None,
        email="auditeur@process-architect.ai",
        avatarInitials="AU",
        avatarColor="#D97706",
        presenceStatus="online",
        isAi=True,
        aiSpecialty="auditor",
        aiProviderModel="anthropic:claude-3-7-sonnet",
        systemPrompt=(
            "Tu vérifies la cohérence structurelle du flux, détectes les étapes orphelines ou incomplètes "
            "et rédiges ou corriges les règles de gestion métier (RG-*)."
        ),
        aiCapabilities=["audit_rules"],
    ),
    CollaboratorModel(
        id="agent-qa",
        name="Agent QA & Simulation",
        handle="QA",
        roleTitle="Ingénieur Recette, Scénarios de Test & Couverture",
        teamId=None,
        email="qa@process-architect.ai",
        avatarInitials="QA",
        avatarColor="#059669",
        presenceStatus="online",
        isAi=True,
        aiSpecialty="qa",
        aiProviderModel="openai:gpt-4o-mini",
        systemPrompt=(
            "Tu génères automatiquement les scénarios de test nominaux et d'exception à partir du processus "
            "et vérifies le taux de couverture des règles de gestion."
        ),
        aiCapabilities=["generate_tests"],
    ),
    CollaboratorModel(
        id="agent-secretaire",
        name="Agent Secrétaire de Projet",
        handle="Secretaire",
        roleTitle="Synthèse d'Échanges, Comptes-Rendus & Agenda Outlook",
        teamId=None,
        email="secretaire@process-architect.ai",
        avatarInitials="SP",
        avatarColor="#0284C7",
        presenceStatus="online",
        isAi=True,
        aiSpecialty="secretary",
        aiProviderModel="google:gemini-2.5-flash",
        systemPrompt=(
            "Tu résumes les échanges entre collaborateurs, structures les comptes-rendus d'équipe "
            "et prépares automatiquement l'ordre du jour des réunions Microsoft Outlook."
        ),
        aiCapabilities=["summarize_and_schedule"],
    ),
]


def _normalize_handle(value: str) -> str:
    """Normalize a @handle (lowercase, strip accents and leading @)."""
    raw = (value or "").strip().lstrip("@").lower()
    nfkd = unicodedata.normalize("NFKD", raw)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def extract_mentioned_handles(content: str) -> list[str]:
    """Extract all @handles from message content."""
    if not content:
        return []
    matches = re.findall(r"@([A-Za-z0-9_\-\u00C0-\u017F]+)", content)
    return list(dict.fromkeys(matches))


def resolve_triggered_ai_agents(
    content: str,
    conversation: ConversationModel,
    all_collaborators: list[CollaboratorModel],
) -> list[CollaboratorModel]:
    """Find which AI Collaborator Agent(s) should respond to the user's message."""
    ai_agents = [c for c in all_collaborators if c.isAi]
    by_norm_handle = {_normalize_handle(a.handle): a for a in ai_agents}

    # Also map common aliases
    aliases = {
        "copilot": "copilot",
        "architect": "copilot",
        "modelisateur": "modelisateur",
        "modele": "modelisateur",
        "auditeur": "auditeur",
        "regles": "auditeur",
        "qa": "qa",
        "test": "qa",
        "secretaire": "secretaire",
        "agenda": "secretaire",
        "outlook": "secretaire",
    }

    mentioned = extract_mentioned_handles(content)
    triggered: list[CollaboratorModel] = []
    seen_ids: set[str] = set()

    for m in mentioned:
        norm = _normalize_handle(m)
        target_norm = aliases.get(norm, norm)
        agent = by_norm_handle.get(target_norm)
        if agent and agent.id not in seen_ids:
            triggered.append(agent)
            seen_ids.add(agent.id)

    if triggered:
        return triggered

    # If no explicit @mention, check if this is a direct conversation with an AI agent
    if conversation.conversationType == "direct_ai":
        for pid in conversation.participantIds:
            agent = next((a for a in ai_agents if a.id == pid), None)
            if agent and agent.id not in seen_ids:
                triggered.append(agent)
                seen_ids.add(agent.id)
                break
        if not triggered and conversation.assigneeId:
            agent = next((a for a in ai_agents if a.id == conversation.assigneeId), None)
            if agent:
                triggered.append(agent)
        if not triggered and ai_agents:
            triggered.append(ai_agents[0])

    return triggered


def _infer_role_and_kind(topic: str) -> tuple[str, str, str, int]:
    """Infer (ownerRole, taskKind, executionMode, durationMinutes) from natural-language topic."""
    lower = topic.lower()
    if re.search(r"virement|sepa|trésorerie|tresorerie|paiement|règlement|reglement", lower):
        return "Trésorerie / Opérations", "service", "automated", 10
    if re.search(r"ocr|erp|automat|lettrage|api|moteur|scoring|calcul|archivage", lower):
        return "Système ERP / Automatique", "service", "automated", 5
    if re.search(r"manager|directeur|hiérarchique|hierarchique|direction|comité|comite", lower):
        return "Manager / Direction", "user", "manual", 20
    if re.search(r"relance|justificatif|avoir|notifier|notification|demande de", lower):
        return "Système de notification", "service", "automated", 5
    if re.search(r"comptab|facture|bon de commande|rapprochement", lower):
        return "Comptable Fournisseurs", "user", "manual", 15
    return "Gestionnaire Métier", "user", "mixed", 15


def _build_modeler_response(
    agent: CollaboratorModel,
    user_text: str,
    process: ProcessModel | None,
) -> tuple[str, dict[str, Any]]:
    """Generate BPMN 2.0-compliant workflow steps (and 2-branch gateways ONLY when warranted)."""
    clean_topic = re.sub(r"@[A-Za-z0-9_\-\u00C0-\u017F]+", "", user_text).strip()
    clean_topic = re.sub(
        r"^(?:ajoute|ajouter|crée|cree|créer|creer|insère|insere|propose|proposer)\s+(?:une?\s+)?(?:nouvelle\s+)?(?:étape|etape|tâche|tache|activité|activite)\s+(?:de\s+|d'|pour\s+)?",
        "",
        clean_topic,
        flags=re.IGNORECASE,
    ).strip()
    if len(clean_topic) < 5:
        clean_topic = "Contrôle et validation de conformité de l'étape"
    clean_topic = clean_topic[0].upper() + clean_topic[1:]

    short_label = clean_topic[:58] if len(clean_topic) <= 58 else clean_topic[:55] + "..."
    owner_role, task_kind, exec_mode, duration_min = _infer_role_and_kind(clean_topic)
    lower = clean_topic.lower()

    needs_gateway = bool(
        re.search(
            r"\?|décision|decision|valid|seuil|montant|≥|>=|>|<|conform|éligib|eligib|délai|delai|sous \d+|litige|rejet|refus|visa|rapprochement",
            lower,
        )
    )
    is_event_gateway = bool(re.search(r"sous \d+\s*j|délai|delai|attente|expir", lower))

    task_id = f"node_ai_{uuid.uuid4().hex[:6]}"
    base_x = 640
    base_y = 300
    if process and process.nodes:
        non_ends = [n for n in process.nodes if n.type != NodeType.END]
        max_x = max((n.position.x for n in non_ends), default=400)
        base_x = max_x + 320

    proposed_nodes: list[dict[str, Any]] = [
        {
            "id": task_id,
            "type": "task",
            "label": short_label,
            "position": {"x": base_x, "y": base_y},
            "description": f"Étape générée par {agent.name} : {clean_topic}",
            "ownerRole": owner_role,
            "application": "Système Métier",
            "estimatedDurationMinutes": duration_min,
            "executionMode": exec_mode,
            "taskKind": task_kind,
            "inputs": ["Dossier / données d'entrée"],
            "outputs": ["Résultat traité"],
            "controls": ["Contrôle de conformité"],
            "ruleIds": [],
        }
    ]
    proposed_edges: list[dict[str, Any]] = []
    nominal_tail_id = task_id
    nominal_edge_label = "Suivant"
    summary_lines = [f"- Activité ({task_kind.upper()}) : « {short_label} » ({owner_role}, {duration_min} min)"]

    if needs_gateway:
        dec_id = f"node_dec_{uuid.uuid4().hex[:6]}"
        days_match = re.search(r"sous\s+(\d+)\s*jours?", lower)
        if is_event_gateway:
            gw_kind = "event_based"
            gw_label = (
                f"Réponse reçue sous {days_match.group(1)} jours ?"
                if days_match
                else "Réponse reçue dans les délais ?"
            )
            nominal_edge_label = "Réponse reçue"
            exc_edge_label = (
                f"Délai expiré (> {days_match.group(1)}j)" if days_match else "Délai expiré"
            )
            exc_task_label = "Clôturer pour délai expiré & notifier"
            exc_end_label = "Clôturé sans suite"
        elif re.search(r"rapprochement|conform|bon de commande", lower):
            gw_kind = "xor"
            gw_label = "Conformité validée ?"
            nominal_edge_label = "Conforme"
            exc_edge_label = "Non conforme / Litige"
            exc_task_label = "Notifier le rejet motivé"
            exc_end_label = "Rejeté avec motif"
        else:
            gw_kind = "xor"
            gw_label = "Validation accordée ?"
            nominal_edge_label = "Validé"
            exc_edge_label = "Refusé"
            exc_task_label = "Notifier le refus motivé"
            exc_end_label = "Demande refusée"

        proposed_nodes.append(
            {
                "id": dec_id,
                "type": "decision",
                "label": gw_label,
                "position": {"x": base_x + 320, "y": base_y},
                "description": f"Passerelle BPMN 2.0 générée par {agent.name}.",
                "ownerRole": owner_role,
                "application": "Workflow Engine",
                "estimatedDurationMinutes": 2,
                "executionMode": "automated" if gw_kind == "event_based" else "mixed",
                "gatewayKind": gw_kind,
                "inputs": ["Résultat traité"],
                "outputs": [f"{nominal_edge_label} / {exc_edge_label}"],
                "controls": [],
                "ruleIds": [],
            }
        )
        proposed_edges.append(
            {
                "id": f"edge_ai_{uuid.uuid4().hex[:6]}",
                "sourceNodeId": task_id,
                "targetNodeId": dec_id,
                "label": "Traité",
            }
        )

        # Reuse an existing rejection task in the process if available, otherwise create a clean exception task + end
        existing_reject_task = None
        if process:
            existing_reject_task = next(
                (
                    n
                    for n in process.nodes
                    if n.type == NodeType.TASK
                    and re.search(r"rejet|refus|clôturer.*expir|forclusion", (n.label or "").lower())
                ),
                None,
            )

        if existing_reject_task:
            proposed_edges.append(
                {
                    "id": f"edge_ai_exc_{uuid.uuid4().hex[:6]}",
                    "sourceNodeId": dec_id,
                    "targetNodeId": existing_reject_task.id,
                    "label": exc_edge_label,
                }
            )
            summary_lines.append(
                f"- Passerelle ({gw_kind.upper()}) : « {gw_label} » → {nominal_edge_label} (suite) / {exc_edge_label} (→ {existing_reject_task.label})"
            )
        else:
            exc_task_id = f"node_exc_{uuid.uuid4().hex[:6]}"
            exc_end_id = f"node_end_exc_{uuid.uuid4().hex[:6]}"
            proposed_nodes.extend(
                [
                    {
                        "id": exc_task_id,
                        "type": "task",
                        "label": exc_task_label,
                        "position": {"x": base_x + 480, "y": base_y + 220},
                        "description": f"Traitement d'exception généré par {agent.name}.",
                        "ownerRole": owner_role,
                        "application": "Système de notification",
                        "estimatedDurationMinutes": 5,
                        "executionMode": "automated",
                        "taskKind": "service",
                        "inputs": ["Motif d'exception"],
                        "outputs": ["Notification envoyée"],
                        "controls": [],
                        "ruleIds": [],
                    },
                    {
                        "id": exc_end_id,
                        "type": "end",
                        "label": exc_end_label,
                        "position": {"x": base_x + 780, "y": base_y + 235},
                        "description": "Fin de branche d'exception.",
                        "ownerRole": owner_role,
                        "application": "Système Métier",
                        "estimatedDurationMinutes": 0,
                        "executionMode": "automated",
                    },
                ]
            )
            proposed_edges.extend(
                [
                    {
                        "id": f"edge_ai_exc_{uuid.uuid4().hex[:6]}",
                        "sourceNodeId": dec_id,
                        "targetNodeId": exc_task_id,
                        "label": exc_edge_label,
                    },
                    {
                        "id": f"edge_ai_exc_end_{uuid.uuid4().hex[:6]}",
                        "sourceNodeId": exc_task_id,
                        "targetNodeId": exc_end_id,
                        "label": "Notifié",
                    },
                ]
            )
            summary_lines.append(
                f"- Passerelle ({gw_kind.upper()}) : « {gw_label} » → {nominal_edge_label} (suite) / {exc_edge_label} → « {exc_task_label} » → Fin « {exc_end_label} »"
            )

        nominal_tail_id = dec_id

    proc_name = process.name if process else "Processus courant"
    reply = (
        f"J'ai analysé votre demande pour {proc_name}.\n\n"
        f"Proposition BPMN 2.0 prête à être injectée dans le Studio :\n"
        + "\n".join(summary_lines)
        + "\n\nCliquez sur le bouton ci-dessous pour ajouter et relier ces éléments dans le Studio."
    )

    payload = {
        "actionType": "apply_model_steps",
        "buttonLabel": "Appliquer les étapes au Studio",
        "agentId": agent.id,
        "agentName": agent.name,
        "processId": process.id if process else None,
        "proposedNodes": proposed_nodes,
        "proposedEdges": proposed_edges,
        "nominalEntryNodeId": task_id,
        "nominalTailNodeId": nominal_tail_id,
        "nominalExitLabel": nominal_edge_label,
        "applied": False,
    }
    return reply, payload


def _build_auditor_response(
    agent: CollaboratorModel,
    user_text: str,
    process: ProcessModel | None,
) -> tuple[str, dict[str, Any]]:
    """Audit the linked process and draft a structured Business Rule (RG-*)."""
    clean_topic = re.sub(r"@[A-Za-z0-9_\-\u00C0-\u017F]+", "", user_text).strip()
    rule_num = (len(process.businessRules) + 1) if process else 1
    new_rule_id = f"RG-PROJ-{rule_num:02d}"

    validation_summary_md = ""
    findings_list: list[dict[str, Any]] = []
    if process:
        proc_dict = process.model_dump()
        val_res = validate_process(proc_dict)
        analytics = compute_analytics(proc_dict)
        errs = val_res["summary"]["errors"]
        warns = val_res["summary"]["warnings"]
        missing_owners = analytics.get("missingOwnerCount", 0)
        findings_list = val_res.get("findings", [])[:4]
        validation_summary_md = (
            f"Diagnostic de cohérence sur {process.name} :\n"
            f"- Statut structurel : {'✅ Valide' if val_res['valid'] else '⚠️ Anomalies détectées'} "
            f"({errs} erreur(s), {warns} avertissement(s))\n"
            f"- Étapes sans responsable : {missing_owners} étape(s)\n"
            f"- Règles de gestion actives : {len(process.businessRules)} règle(s)\n\n"
        )

    cleaned_rule_text = re.sub(
        r"^(?:fais|fait|faire|lance|lancer)?\s*(?:un\s+)?(?:audit[^.,;:]*?(?:et\s+)?)?(?:crée|cree|créer|creer|rédige|redige|ajoute|ajouter|propose|proposer)\s+(?:une?\s+)?(?:nouvelle\s+)?(?:règle|regle)\s+(?:métier|metier|de gestion)?\s*(?:sur|pour|concernant)?\s*",
        "",
        clean_topic,
        flags=re.IGNORECASE,
    ).strip()
    if len(cleaned_rule_text) > 12:
        rule_statement = cleaned_rule_text[0].upper() + cleaned_rule_text[1:]
    elif len(clean_topic) > 12:
        rule_statement = clean_topic[0].upper() + clean_topic[1:]
    else:
        rule_statement = "Toute étape critique du processus doit faire l'objet d'un contrôle tracé et d'une validation explicite avant clôture."
    proposed_rule = {
        "id": new_rule_id,
        "title": f"Contrôle de gouvernance ({new_rule_id})",
        "statement": rule_statement,
        "category": "approval",
        "severity": "high",
        "sourceType": "business_requirement",
        "sourceNote": f"Rédigée par {agent.name} en conversation d'équipe",
        "active": True,
    }

    reply = (
        f"Audit et formalisation de règle terminés.\n\n"
        f"{validation_summary_md}"
        f"Proposition de Règle de Gestion ({new_rule_id}) :\n"
        f"• {proposed_rule['title']} : « {proposed_rule['statement']} »\n\n"
        f"Vous pouvez enregistrer cette règle directement dans le référentiel du processus en 1 clic."
    )

    payload = {
        "actionType": "add_business_rules",
        "buttonLabel": f"Enregistrer la règle {new_rule_id}",
        "agentId": agent.id,
        "agentName": agent.name,
        "processId": process.id if process else None,
        "proposedRules": [proposed_rule],
        "findings": findings_list,
        "applied": False,
    }
    return reply, payload


def _build_qa_response(
    agent: CollaboratorModel,
    user_text: str,
    process: ProcessModel | None,
) -> tuple[str, dict[str, Any]]:
    """Generate QA test cases and coverage metrics for the linked process."""
    cases: list[dict[str, Any]] = []
    coverage_rate = 100.0
    if process:
        proc_dict = process.model_dump()
        drafted = draft_test_cases(proc_dict)
        cases = drafted.get("cases", [])[:3]
        trace = build_traceability_matrix(proc_dict)
        coverage_rate = trace.get("coverageRate", 100.0)

    if not cases:
        cases = [
            {
                "id": f"TC-AI-{uuid.uuid4().hex[:4].upper()}",
                "title": "Scénario nominal — Validation de bout en bout",
                "objective": "Vérifier l'exécution complète du parcours nominal sans blocage.",
                "preconditions": ["Données d'entrée complètes et valides"],
                "steps": ["Démarrer le flux", "Valider les contrôles intermédiaires", "Vérifier la sortie"],
                "expectedResult": "Parcours terminé avec statut validé.",
                "priority": "high",
                "sourceNodeIds": [],
                "ruleIds": [],
                "status": "draft",
                "reviewRequired": True,
            }
        ]

    titles_md = "\n".join(f"- {c['id']} : {c['title']}" for c in cases)
    reply = (
        f"J'ai généré les scénarios de test et calculé la couverture.\n\n"
        f"- Couverture actuelle des règles : {coverage_rate}%\n"
        f"- Cas de test proposés ({len(cases)}) :\n{titles_md}\n\n"
        f"Cliquez ci-dessous pour intégrer ces cas de test au cahier de recette du processus."
    )

    payload = {
        "actionType": "add_test_cases",
        "buttonLabel": f"Ajouter {len(cases)} cas de test au processus",
        "agentId": agent.id,
        "agentName": agent.name,
        "processId": process.id if process else None,
        "proposedTestCases": cases,
        "coverageRate": coverage_rate,
        "applied": False,
    }
    return reply, payload


def _build_secretary_response(
    agent: CollaboratorModel,
    user_text: str,
    conversation: ConversationModel,
    process: ProcessModel | None,
) -> tuple[str, dict[str, Any]]:
    """Summarize the conversation, extract decisions for a Private Note, and prepare an Outlook meeting."""
    recent_msgs = [m for m in conversation.messages[-6:] if m.content.strip()]
    participants = sorted({m.senderName for m in recent_msgs if m.senderName})
    participants_str = ", ".join(participants) if participants else "Équipe Projet"

    bullets = []
    for m in recent_msgs[-3:]:
        snippet = m.content.strip().replace("\n", " ")
        if len(snippet) > 90:
            snippet = snippet[:87] + "..."
        bullets.append(f"• {m.senderName} : « {snippet} »")
    summary_block = "\n".join(bullets) if bullets else "• Alignement sur les étapes et règles du processus."

    tomorrow_10am = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    meeting_title = f"Comité d'alignement — {conversation.title}"
    summary_note_text = (
        f"Synthèse d'équipe ({agent.name}) :\n"
        f"Participants : {participants_str}\n"
        f"Points clés retenus :\n{summary_block}"
    )

    reply = (
        f"Voici la synthèse de vos échanges et la préparation de réunion Microsoft Outlook :\n\n"
        f"📋 Résumé & Points d'action\n"
        f"- Intervenants actifs : {participants_str}\n"
        f"{summary_block}\n\n"
        f"📅 Proposition de Réunion Outlook\n"
        f"- Sujet : {meeting_title}\n"
        f"- Créneau proposé : Demain à 10h00 UTC (45 min) — Microsoft Teams / Outlook\n\n"
        f"Utilisez l'action ci-dessous pour créer et synchroniser la réunion avec Outlook."
    )

    payload = {
        "actionType": "create_meeting_and_note",
        "buttonLabel": "Planifier la Réunion Outlook",
        "agentId": agent.id,
        "agentName": agent.name,
        "privateNoteContent": summary_note_text,
        "proposedMeeting": {
            "title": meeting_title,
            "projectId": conversation.projectId,
            "processId": conversation.processId or (process.id if process else None),
            "conversationId": conversation.id,
            "startAt": tomorrow_10am.isoformat(),
            "durationMinutes": 45,
            "locationOrLink": "Microsoft Teams / Réunion Outlook",
            "agendaNotes": f"Ordre du jour préparé par {agent.name} :\n{summary_block}",
        },
        "applied": False,
    }
    return reply, payload


def _try_call_external_llm(
    agent: CollaboratorModel,
    user_message: str,
    conversation: ConversationModel,
    process: ProcessModel | None,
) -> str | None:
    """If the admin has configured an active AI Provider API key in Settings, call the LLM API."""
    import json as _json
    import os
    import urllib.request

    provider_model = (agent.aiProviderModel or "openai:gpt-4o").strip()
    if provider_model.startswith("mcp:"):
        return None

    provider_id = provider_model.split(":", 1)[0] if ":" in provider_model else "openai"
    model_name = provider_model.split(":", 1)[1] if ":" in provider_model else "gpt-4o"

    try:
        from app.storage import get_ai_provider

        cfg = get_ai_provider(provider_id, include_raw_key=True)
    except Exception:
        cfg = None

    api_key = (cfg.apiKey.strip() if cfg and cfg.enabled else "") or ""
    endpoint_url = (cfg.endpointUrl.strip() if cfg else "") or ""

    if not api_key:
        if provider_id == "openai":
            api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        elif provider_id == "anthropic":
            api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        elif provider_id == "google":
            api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    is_custom_provider = provider_id not in ("openai", "anthropic", "google")
    if not api_key and not (is_custom_provider and cfg and cfg.enabled):
        return None

    proc_ctx = "Aucun processus rattaché."
    if process:
        nodes_summary = ", ".join(f"{n.label} ({n.type})" for n in process.nodes[:12])
        rules_summary = ", ".join(f"{r.id}: {r.title}" for r in process.businessRules[:10])
        proc_ctx = (
            f"Processus actif: {process.name} ({len(process.nodes)} étapes, {len(process.businessRules)} règles).\n"
            f"Étapes: {nodes_summary}\n"
            f"Règles: {rules_summary}"
        )

    sys_prompt = (
        f"Tu es {agent.name} (@{agent.handle}), {agent.roleTitle}.\n"
        f"Instructions métier: {agent.systemPrompt}\n"
        f"Contexte du processus projet:\n{proc_ctx}\n"
        f"Réponds en français de manière concise, structurée et professionnelle."
    )

    try:
        if provider_id == "anthropic":
            base = (endpoint_url or "https://api.anthropic.com/v1").rstrip("/")
            url = f"{base}/messages"
            body = _json.dumps(
                {
                    "model": model_name,
                    "max_tokens": 500,
                    "system": sys_prompt,
                    "messages": [{"role": "user", "content": user_message}],
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode("utf-8"))
                return data["content"][0]["text"].strip()

        elif provider_id == "google":
            base = (endpoint_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")
            url = f"{base}/models/{model_name}:generateContent?key={api_key}"
            body = _json.dumps(
                {
                    "systemInstruction": {"parts": [{"text": sys_prompt}]},
                    "contents": [{"role": "user", "parts": [{"text": user_message}]}],
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()

        else:
            # OpenAI or any custom OpenAI-compatible provider (DeepSeek, Groq, Scaleway, OVH, Azure, Mistral, Ollama, vLLM...)
            base = (endpoint_url or "https://api.openai.com/v1").rstrip("/")
            url = base if base.endswith("/chat/completions") else f"{base}/chat/completions"
            body = _json.dumps(
                {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                }
            ).encode("utf-8")
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            req = urllib.request.Request(
                url,
                data=body,
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None

    return None


def generate_ai_agent_reply(
    agent: CollaboratorModel,
    user_message: str,
    conversation: ConversationModel,
    process: ProcessModel | None = None,
) -> tuple[str, dict[str, Any] | None]:
    """Generate a contextual reply and executable actionPayload from an AI Collaborator Agent."""
    lower = user_message.lower()
    specialty = (agent.aiSpecialty or "custom").lower()
    caps = set(agent.aiCapabilities or [])

    # Direct specialty routing for the 4 dedicated specialists
    if specialty == "modeler":
        reply, payload = _build_modeler_response(agent, user_message, process)
    elif specialty == "auditor":
        reply, payload = _build_auditor_response(agent, user_message, process)
    elif specialty == "qa":
        reply, payload = _build_qa_response(agent, user_message, process)
    elif specialty == "secretary":
        reply, payload = _build_secretary_response(agent, user_message, conversation, process)
    elif ("model_steps" in caps or specialty == "orchestrator") and any(
        k in lower for k in ["étape", "etape", "modélis", "modelis", "flux", "ajout", "noeud", "nœud", "décision", "decision"]
    ):
        reply, payload = _build_modeler_response(agent, user_message, process)
    elif ("audit_rules" in caps or specialty == "orchestrator") and any(
        k in lower for k in ["règle", "regle", "rg-", "audit", "cohérence", "coherence", "anomalie", "contrôle", "controle"]
    ):
        reply, payload = _build_auditor_response(agent, user_message, process)
    elif ("generate_tests" in caps or specialty == "orchestrator") and any(
        k in lower for k in ["test", "qa", "recette", "simulation", "scénario", "scenario", "couverture"]
    ):
        reply, payload = _build_qa_response(agent, user_message, process)
    elif ("summarize_and_schedule" in caps or specialty == "orchestrator") and any(
        k in lower for k in ["réunion", "reunion", "outlook", "agenda", "résum", "resum", "synthèse", "synthese", "comité"]
    ):
        reply, payload = _build_secretary_response(agent, user_message, conversation, process)
    else:
        reply, payload = _build_auditor_response(agent, user_message, process)
        if agent.systemPrompt and specialty == "custom":
            reply = (
                f"**{agent.name}** *(Instructions personnalisées actives : « {agent.systemPrompt[:90]} »)*\n\n"
                + reply
            )

    # If an external AI Provider (OpenAI / Claude / Gemini / Custom) is connected, enrich the text response with live LLM output
    live_llm_text = _try_call_external_llm(agent, user_message, conversation, process)
    if live_llm_text:
        reply = f"**{agent.name}**\n\n{live_llm_text}"

    return reply, payload
