"""SQLite storage layer for Process Architect SaaS B2B platform."""
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3
import sys
from typing import Any
import uuid

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models import (
    AIProviderConfigModel,
    ApprovalGateModel,
    CategoryModel,
    CollaboratorModel,
    ConversationMessageModel,
    ConversationModel,
    MeetingModel,
    ProcessModel,
    ProcessSummary,
    ProcessVersionSummary,
    ProjectModel,
    TagModel,
    TeamModel,
    utc_now_iso,
)
from app.sample_data import (
    DEMO_PROCESS,
    DEMO_PROCESS_AS_IS,
    DEMO_PROCESS_SINISTRE,
    DEMO_PROCESS_SINISTRE_AS_IS,
)
from app.ai_agents import DEFAULT_AI_AGENTS
from app.auth import generate_session_token, hash_password, verify_password
from app.outlook import build_outlook_web_deeplink, compute_end_iso

DB_DIR = Path(__file__).resolve().parents[1] / "data"
DB_PATH = DB_DIR / "processes.db"


def _write_process_record(conn: sqlite3.Connection, process: ProcessModel) -> None:
    data_dict = process.model_dump()
    data_json = json.dumps(data_dict, ensure_ascii=False)
    conn.execute(
        """
        INSERT INTO processes (id, name, description, lifecycle_state, model_state, version, owner, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            lifecycle_state = excluded.lifecycle_state,
            model_state = excluded.model_state,
            version = excluded.version,
            owner = excluded.owner,
            data_json = excluded.data_json,
            updated_at = excluded.updated_at
        """,
        (
            process.id,
            process.name,
            process.description,
            process.lifecycleState.value
            if hasattr(process.lifecycleState, "value")
            else str(process.lifecycleState),
            process.modelState.value
            if hasattr(process.modelState, "value")
            else str(process.modelState),
            process.version,
            process.owner,
            data_json,
            process.createdAt,
            process.updatedAt,
        ),
    )


def _seed_default_saas_entities(conn: sqlite3.Connection) -> None:
    """Seed the 5 AI Collaborator Agents and neutral customizable workspace entities if empty."""
    # 1. Always ensure the 5 built-in AI Collaborator Agents exist
    for agent in DEFAULT_AI_AGENTS:
        row = conn.execute("SELECT id FROM collaborators WHERE id = ?", (agent.id,)).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO collaborators (id, is_ai, data_json, created_at) VALUES (?, ?, ?, ?)",
                (agent.id, 1, json.dumps(agent.model_dump(), ensure_ascii=False), agent.createdAt),
            )

    # Check if workspace was already initialized (meta flag or existing human collaborators)
    human_row = conn.execute("SELECT id FROM collaborators WHERE is_ai = 0 LIMIT 1").fetchone()
    if human_row:
        return

    now = utc_now_iso()

    # 2. Seed customizable human collaborators
    default_humans = [
        CollaboratorModel(
            id="collab-user-main",
            name="Khalil Benhassen",
            handle="khalil",
            roleTitle="Architecte Processus & Chef de Projet MOA",
            teamId="team-architecture",
            email="khalil.benhassen@organisation.fr",
            avatarInitials="KB",
            avatarColor="#1F93FF",
            presenceStatus="online",
            isAi=False,
        ),
        CollaboratorModel(
            id="collab-thomas",
            name="Thomas Mercier",
            handle="thomas",
            roleTitle="Référent Opérations & Gestion Épargne",
            teamId="team-operations",
            email="thomas.mercier@organisation.fr",
            avatarInitials="TM",
            avatarColor="#10B981",
            presenceStatus="online",
            isAi=False,
        ),
        CollaboratorModel(
            id="collab-sarah",
            name="Sarah Benali",
            handle="sarah",
            roleTitle="Responsable Qualité, Recette QA & Règles",
            teamId="team-qualite",
            email="sarah.benali@organisation.fr",
            avatarInitials="SB",
            avatarColor="#F59E0B",
            presenceStatus="online",
            isAi=False,
        ),
        CollaboratorModel(
            id="collab-claire",
            name="Claire Dubois",
            handle="claire",
            roleTitle="Experte Conformité LCB-FT & Juridique",
            teamId="team-qualite",
            email="claire.dubois@organisation.fr",
            avatarInitials="CD",
            avatarColor="#8B5CF6",
            presenceStatus="busy",
            isAi=False,
        ),
    ]
    for h in default_humans:
        conn.execute(
            "INSERT OR IGNORE INTO collaborators (id, is_ai, data_json, created_at) VALUES (?, ?, ?, ?)",
            (h.id, 0, json.dumps(h.model_dump(), ensure_ascii=False), h.createdAt),
        )

    # 3. Seed customizable teams
    default_teams = [
        TeamModel(
            id="team-architecture",
            name="Architecture & Pilotage MOA",
            color="#1F93FF",
            description="Équipe de conception, modélisation BPMN et pilotage des transformations",
            memberIds=["collab-user-main", "agent-copilot", "agent-modelisateur", "agent-secretaire"],
        ),
        TeamModel(
            id="team-operations",
            name="Opérations & Gestion Épargne",
            color="#10B981",
            description="Experts métier Assurance Vie / Épargne Retraite et Back-Office",
            memberIds=["collab-thomas"],
        ),
        TeamModel(
            id="team-qualite",
            name="Qualité, Conformité & Recette QA",
            color="#F59E0B",
            description="Audit des règles RG, conformité LCB-FT et cahier de recette fonctionnelle",
            memberIds=["collab-sarah", "collab-claire", "agent-auditeur", "agent-qa"],
        ),
    ]
    for t in default_teams:
        conn.execute(
            "INSERT OR IGNORE INTO teams (id, data_json, created_at) VALUES (?, ?, ?)",
            (t.id, json.dumps(t.model_dump(), ensure_ascii=False), t.createdAt),
        )

    # 4. Seed customizable categories & tags
    default_categories = [
        CategoryModel(
            id="cat-transformation",
            name="Projets de Transformation MOA",
            color="#1F93FF",
            description="Refonte et automatisation des processus métier cibles (TO-BE)",
        ),
        CategoryModel(
            id="cat-operations",
            name="Opérations & Gestion Épargne",
            color="#10B981",
            description="Processus opérationnels et cartographie de l'existant (AS-IS)",
        ),
        CategoryModel(
            id="cat-conformite",
            name="Conformité & Contrôle Interne",
            color="#8B5CF6",
            description="Dispositifs de contrôle LCB-FT, délégation financière et piste d'audit",
        ),
    ]
    for c in default_categories:
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, data_json, created_at) VALUES (?, ?, ?)",
            (c.id, json.dumps(c.model_dump(), ensure_ascii=False), c.createdAt),
        )

    default_tags = [
        TagModel(id="tag-prioritaire", name="prioritaire", color="#EF4444", scope="global"),
        TagModel(id="tag-revue", name="en-revue", color="#F59E0B", scope="global"),
        TagModel(id="tag-automatisation", name="automatisation", color="#1F93FF", scope="global"),
        TagModel(id="tag-validation", name="validation-requise", color="#8B5CF6", scope="global"),
        TagModel(id="tag-lcbft", name="conformite-lcbft", color="#10B981", scope="global"),
    ]
    for tg in default_tags:
        conn.execute(
            "INSERT OR IGNORE INTO tags (id, data_json, created_at) VALUES (?, ?, ?)",
            (tg.id, json.dumps(tg.model_dump(), ensure_ascii=False), tg.createdAt),
        )

    # 5. Seed the complete flagship demonstration project "Demande de Rachat Partiel"
    default_project = ProjectModel(
        id="proj-default-01",
        name="Demande de Rachat Partiel — Épargne Retraite (Projet Pilote MOA)",
        description=(
            "Projet exemplaire complet de dématérialisation et d'automatisation du traitement des demandes "
            "de rachat partiel sur contrat d'épargne retraite (données fictives). Inclut le processus cible TO-BE "
            "(16 étapes, 7 règles RG, 10 cas de test QA) ainsi que le flux historique AS-IS pour comparaison."
        ),
        categoryId="cat-transformation",
        status="active",
        ownerId="collab-user-main",
        ownerName="Khalil Benhassen",
        tags=["prioritaire", "automatisation", "conformite-lcbft"],
        processIds=[DEMO_PROCESS.id, DEMO_PROCESS_AS_IS.id],
        memberIds=[
            "collab-user-main",
            "collab-thomas",
            "collab-sarah",
            "collab-claire",
            "agent-copilot",
            "agent-modelisateur",
            "agent-auditeur",
            "agent-qa",
            "agent-secretaire",
        ],
    )
    conn.execute(
        "INSERT OR IGNORE INTO projects (id, data_json, updated_at) VALUES (?, ?, ?)",
        (default_project.id, json.dumps(default_project.model_dump(), ensure_ascii=False), default_project.updatedAt),
    )

    # 5b. Seed second distinct demonstration project "Sinistre Auto — Indemnisation Digitale"
    second_project = ProjectModel(
        id="proj-default-02",
        name="Sinistre Auto — Indemnisation Digitale (Opérations IARD)",
        description=(
            "Transformation du circuit d'indemnisation sinistre automobile : passage du constat papier et "
            "chèque postal (AS-IS) vers une e-déclaration mobile avec scoring anti-fraude IA, expertise "
            "conditionnelle >= 3 000 € et virement SEPA instantané (TO-BE)."
        ),
        categoryId="cat-operations",
        status="active",
        ownerId="collab-thomas",
        ownerName="Thomas Mercier",
        tags=["prioritaire", "en-revue", "validation-requise"],
        processIds=[DEMO_PROCESS_SINISTRE.id, DEMO_PROCESS_SINISTRE_AS_IS.id],
        memberIds=[
            "collab-user-main",
            "collab-thomas",
            "collab-claire",
            "agent-copilot",
            "agent-auditeur",
            "agent-qa",
        ],
    )
    conn.execute(
        "INSERT OR IGNORE INTO projects (id, data_json, updated_at) VALUES (?, ?, ?)",
        (second_project.id, json.dumps(second_project.model_dump(), ensure_ascii=False), second_project.updatedAt),
    )

    # 6. Seed configurable approval gates for the project/process
    default_approvals = [
        ApprovalGateModel(
            id="app-gate-01",
            projectId="proj-default-01",
            processId=DEMO_PROCESS.id,
            label="Validation Métier & Parcours Back-Office",
            reviewerId="collab-thomas",
            reviewerName="Thomas Mercier",
            teamId="team-operations",
            status="approved",
            comment="Parcours cible TO-BE, boucle de relance J+30 et SLA opérationnels validés.",
        ),
        ApprovalGateModel(
            id="app-gate-02",
            projectId="proj-default-01",
            processId=DEMO_PROCESS.id,
            label="Validation Conformité LCB-FT & Seuil 50 000 €",
            reviewerId="collab-claire",
            reviewerName="Claire Dubois",
            teamId="team-qualite",
            status="approved",
            comment="Règles RG-SEUIL-04 et RG-LCBFT-06 conformes : double signature OTP et concordance IBAN SEPA vérifiées.",
        ),
        ApprovalGateModel(
            id="app-gate-03",
            projectId="proj-default-01",
            processId=DEMO_PROCESS.id,
            label="Homologation Recette QA & Traçabilité MOA",
            reviewerId="collab-sarah",
            reviewerName="Sarah Benali",
            teamId="team-qualite",
            status="pending",
            comment="10 cas de test prêts (TC-RACH-01 à TC-RACH-10) — validation finale prévue en comité.",
        ),
        ApprovalGateModel(
            id="app-gate-04",
            projectId="proj-default-02",
            processId=DEMO_PROCESS_SINISTRE.id,
            label="Validation Parcours Indemnisation Express",
            reviewerId="collab-thomas",
            reviewerName="Thomas Mercier",
            teamId="team-operations",
            status="approved",
            comment="Flux digital < 3 000 € validé avec gain de -53 % sur le délai de traitement.",
        ),
        ApprovalGateModel(
            id="app-gate-05",
            projectId="proj-default-02",
            processId=DEMO_PROCESS_SINISTRE.id,
            label="Homologation Scoring Anti-Fraude & Expertise",
            reviewerId="collab-claire",
            reviewerName="Claire Dubois",
            teamId="team-qualite",
            status="pending",
            comment="Revue finale des règles RG-FRAU-02 et RG-EXP-03 en cours.",
        ),
    ]
    for ap in default_approvals:
        conn.execute(
            "INSERT OR IGNORE INTO approvals (id, process_id, project_id, data_json, updated_at) VALUES (?, ?, ?, ?, ?)",
            (ap.id, ap.processId, ap.projectId, json.dumps(ap.model_dump(), ensure_ascii=False), ap.updatedAt),
        )

    # 7. Seed Outlook Meetings for the project
    tomorrow_dt = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
    start_iso = tomorrow_dt.isoformat()
    end_iso = compute_end_iso(start_iso, 45)
    seed_meeting_1 = MeetingModel(
        id="meet-default-01",
        title="Comité MOA — Homologation Finale Demande de Rachat Partiel (TO-BE)",
        projectId="proj-default-01",
        processId=DEMO_PROCESS.id,
        conversationId="conv-project-01",
        organizerId="collab-user-main",
        organizerName="Khalil Benhassen",
        attendeeIds=["collab-user-main", "collab-thomas", "collab-sarah", "collab-claire"],
        attendeeEmails=[
            "khalil.benhassen@organisation.fr",
            "thomas.mercier@organisation.fr",
            "sarah.benali@organisation.fr",
            "claire.dubois@organisation.fr",
        ],
        startAt=start_iso,
        endAt=end_iso,
        durationMinutes=45,
        locationOrLink="Microsoft Teams / Réunion Outlook",
        agendaNotes=(
            "1. Comparaison des gains AS-IS (165 min manuelles) vs TO-BE (56 min nominales)\n"
            "2. Revue des 7 règles de gestion (RG-DOC-01 à RG-TRAC-07) et du seuil LCB-FT à 50 000 €\n"
            "3. Validation du cahier de recette QA (10 scénarios TC-RACH-01 à TC-RACH-10)"
        ),
        outlookSyncStatus="ready_to_sync",
    )
    seed_meeting_1.outlookWebLink = build_outlook_web_deeplink(seed_meeting_1)

    qa_dt = (datetime.now(timezone.utc) + timedelta(days=3)).replace(hour=10, minute=30, second=0, microsecond=0)
    qa_start_iso = qa_dt.isoformat()
    seed_meeting_2 = MeetingModel(
        id="meet-default-02",
        title="Point Recette QA — Simulation SEPA ISO 20022 & Cas Limites",
        projectId="proj-default-01",
        processId=DEMO_PROCESS.id,
        conversationId="conv-qa-recette",
        organizerId="collab-sarah",
        organizerName="Sarah Benali",
        attendeeIds=["collab-sarah", "collab-user-main", "collab-thomas"],
        attendeeEmails=[
            "sarah.benali@organisation.fr",
            "khalil.benhassen@organisation.fr",
            "thomas.mercier@organisation.fr",
        ],
        startAt=qa_start_iso,
        endAt=compute_end_iso(qa_start_iso, 30),
        durationMinutes=30,
        locationOrLink="Microsoft Teams / Salle Virtuelle QA",
        agendaNotes="Exécution des cas limites : forclusion J+30, rejet contrat nanti et seuil exact 50 000,00 €.",
        outlookSyncStatus="synced",
    )
    seed_meeting_2.outlookWebLink = build_outlook_web_deeplink(seed_meeting_2)

    for sm in [seed_meeting_1, seed_meeting_2]:
        conn.execute(
            "INSERT OR IGNORE INTO meetings (id, project_id, process_id, conversation_id, data_json, start_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                sm.id,
                sm.projectId,
                sm.processId,
                sm.conversationId,
                json.dumps(sm.model_dump(), ensure_ascii=False),
                sm.startAt,
            ),
        )

    # 8. Seed Chatwoot-style Conversations (MOA thread + QA thread + Direct AI Copilot thread)
    conv1_msgs = [
        ConversationMessageModel(
            id="msg-seed-01",
            conversationId="conv-project-01",
            senderId="collab-thomas",
            senderName="Thomas Mercier",
            senderHandle="thomas",
            senderAvatarInitials="TM",
            senderAvatarColor="#10B981",
            senderIsAi=False,
            content=(
                "Bonjour @khalil et @claire, j'ai validé l'étape de contrôle des pièces en GED, la relance automatique "
                "à 30 jours et le seuil de délégation à 50 000 €. @Auditeur peux-tu confirmer la couverture de nos 7 règles ?"
            ),
            messageType="message",
            isPrivateNote=False,
            mentionedHandles=["khalil", "claire", "Auditeur"],
            linkedNodeIds=["node_controle_pieces", "node_relance_pieces", "node_dec_seuil"],
            linkedRuleIds=["RG-DOC-01", "RG-FORC-02", "RG-SEUIL-04"],
        ),
        ConversationMessageModel(
            id="msg-seed-02",
            conversationId="conv-project-01",
            senderId="collab-claire",
            senderName="Claire Dubois",
            senderHandle="claire",
            senderAvatarInitials="CD",
            senderAvatarColor="#8B5CF6",
            senderIsAi=False,
            content=(
                "Avis Conformité favorable : la vérification de concordance titulaire / IBAN SEPA (`RG-LCBFT-06`) "
                "et la double signature OTP (`RG-SEUIL-04`) couvrent bien nos exigences de contrôle interne."
            ),
            messageType="message",
            isPrivateNote=False,
            linkedNodeIds=["node_controle_pieces", "node_double_validation", "node_ordonnancement"],
            linkedRuleIds=["RG-LCBFT-06", "RG-SEUIL-04", "RG-TRAC-07"],
        ),
        ConversationMessageModel(
            id="msg-seed-03",
            conversationId="conv-project-01",
            senderId="collab-user-main",
            senderName="Khalil Benhassen",
            senderHandle="khalil",
            senderAvatarInitials="KB",
            senderAvatarColor="#1F93FF",
            senderIsAi=False,
            content=(
                "🔒 Note interne d'arbitrage MOA : Le passage du flux courrier AS-IS (165 min) au flux cible TO-BE (56 min) "
                "est validé par les Opérations et la Conformité. Reste le go final QA avec @sarah demain en comité Outlook."
            ),
            messageType="private_note",
            isPrivateNote=True,
            linkedNodeIds=["node_double_validation", "node_ordonnancement"],
            linkedRuleIds=["RG-SEUIL-04", "RG-TRAC-07"],
        ),
        ConversationMessageModel(
            id="msg-seed-04",
            conversationId="conv-project-01",
            senderId="agent-auditeur",
            senderName="🔍 Agent Auditeur & Règles",
            senderHandle="Auditeur",
            senderAvatarInitials="AU",
            senderAvatarColor="#D97706",
            senderIsAi=True,
            content=(
                "**🔍 Agent Auditeur & Règles** — Audit structurel conforme (`0 erreur`) : les **7 règles de gestion** "
                "(`RG-DOC-01` à `RG-TRAC-07`) et les **5 exigences MOA** (`EX-MOA-01` à `EX-MOA-05`) couvrent 100 % des "
                "étapes actives du processus `Demande de rachat partiel`."
            ),
            messageType="ai_action",
            isPrivateNote=False,
            linkedRuleIds=["RG-DOC-01", "RG-FORC-02", "RG-ELIG-03", "RG-SEUIL-04", "RG-FISC-05", "RG-LCBFT-06", "RG-TRAC-07"],
        ),
    ]

    conv1 = ConversationModel(
        id="conv-project-01",
        title="Cadrage MOA — Règles RG, LCB-FT & Validation Rachat Partiel",
        conversationType="project_thread",
        status="open",
        priority="high",
        projectId="proj-default-01",
        processId=DEMO_PROCESS.id,
        linkedNodeIds=["node_controle_pieces", "node_dec_seuil", "node_double_validation", "node_ordonnancement"],
        linkedRuleIds=["RG-DOC-01", "RG-SEUIL-04", "RG-LCBFT-06", "RG-TRAC-07"],
        assigneeId="collab-user-main",
        teamId="team-architecture",
        participantIds=[
            "collab-user-main",
            "collab-thomas",
            "collab-sarah",
            "collab-claire",
            "agent-auditeur",
            "agent-copilot",
        ],
        tags=["prioritaire", "conformite-lcbft"],
        unreadCount=1,
        lastMessagePreview=conv1_msgs[-1].content[:110],
        messages=conv1_msgs,
        createdAt=now,
        updatedAt=now,
    )

    conv_qa_msgs = [
        ConversationMessageModel(
            id="msg-seed-qa-01",
            conversationId="conv-qa-recette",
            senderId="collab-sarah",
            senderName="Sarah Benali",
            senderHandle="sarah",
            senderAvatarInitials="SB",
            senderAvatarColor="#F59E0B",
            senderIsAi=False,
            content=(
                "Les 10 fiches de test (`TC-RACH-01` à `TC-RACH-10`) sont prêtes dans l'onglet **Recette** du Studio : "
                "cas nominal < 50k€, double signature >= 50k€, régularisation J+12, forclusion > 30j et rejet contrat nanti."
            ),
            messageType="message",
            isPrivateNote=False,
            linkedNodeIds=["node_dec_complet", "node_dec_delai", "node_dec_eligible", "node_dec_seuil"],
            linkedRuleIds=["RG-FORC-02", "RG-ELIG-03", "RG-SEUIL-04"],
        ),
        ConversationMessageModel(
            id="msg-seed-qa-02",
            conversationId="conv-qa-recette",
            senderId="agent-qa",
            senderName="🧪 Agent QA & Simulation",
            senderHandle="QA",
            senderAvatarInitials="QA",
            senderAvatarColor="#059669",
            senderIsAi=True,
            content=(
                "**🧪 Agent QA & Simulation** — Couverture de traçabilité vérifiée à **100 %** sur les 4 décisions BPMN "
                "et les 3 états de fin (`node_end_succes`, `node_end_rejet`, `node_end_caduc`). Export CSV/Markdown disponible."
            ),
            messageType="message",
            isPrivateNote=False,
            linkedNodeIds=["node_end_succes", "node_end_rejet", "node_end_caduc"],
        ),
    ]

    conv_qa = ConversationModel(
        id="conv-qa-recette",
        title="Cahier de Recette QA — Scénarios TC-RACH-01 à TC-RACH-10",
        conversationType="process_thread",
        status="open",
        priority="medium",
        projectId="proj-default-01",
        processId=DEMO_PROCESS.id,
        linkedNodeIds=["node_dec_complet", "node_dec_delai", "node_dec_eligible", "node_dec_seuil"],
        linkedRuleIds=["RG-FORC-02", "RG-ELIG-03", "RG-SEUIL-04"],
        assigneeId="collab-sarah",
        teamId="team-qualite",
        participantIds=["collab-sarah", "collab-user-main", "agent-qa"],
        tags=["en-revue", "validation-requise"],
        unreadCount=0,
        lastMessagePreview=conv_qa_msgs[-1].content[:110],
        messages=conv_qa_msgs,
        createdAt=now,
        updatedAt=now,
    )

    conv_copilot_msgs = [
        ConversationMessageModel(
            id="msg-seed-ai-01",
            conversationId="conv-ai-copilot",
            senderId="agent-copilot",
            senderName="🤖 Architect Copilot",
            senderHandle="Copilot",
            senderAvatarInitials="AI",
            senderAvatarColor="#1F93FF",
            senderIsAi=True,
            content=(
                "Bonjour ! Je suis **🤖 Architect Copilot**, votre collaborateur IA sur le projet **Demande de Rachat Partiel**.\n\n"
                "Vous pouvez discuter avec moi ici en direct ou mentionner toute l'équipe d'agents IA dans vos conversations :\n"
                "- `@Modelisateur` : créer des étapes et décisions à partir d'un texte\n"
                "- `@Auditeur` : vérifier la cohérence du flux et rédiger des règles `RG-*`\n"
                "- `@QA` : générer les scénarios de test et vérifier la couverture\n"
                "- `@Secretaire` : résumer les échanges en `🔒 Note Privée` et préparer vos réunions **Microsoft Outlook**"
            ),
            messageType="message",
            isPrivateNote=False,
        )
    ]

    conv_copilot = ConversationModel(
        id="conv-ai-copilot",
        title="🤖 Architect Copilot — Assistant & Orchestrateur IA",
        conversationType="direct_ai",
        status="open",
        priority="medium",
        projectId="proj-default-01",
        processId=DEMO_PROCESS.id,
        assigneeId="agent-copilot",
        teamId="team-architecture",
        participantIds=["collab-user-main", "agent-copilot"],
        tags=["automatisation"],
        unreadCount=0,
        lastMessagePreview="Bonjour ! Je suis 🤖 Architect Copilot, votre collaborateur IA...",
        messages=conv_copilot_msgs,
        createdAt=now,
        updatedAt=now,
    )

    for conv in [conv1, conv_qa, conv_copilot]:
        conn.execute(
            "INSERT OR IGNORE INTO conversations (id, project_id, process_id, data_json, updated_at) VALUES (?, ?, ?, ?, ?)",
            (
                conv.id,
                conv.projectId,
                conv.processId,
                json.dumps(conv.model_dump(), ensure_ascii=False),
                conv.updatedAt,
            ),
        )


def init_db() -> None:
    """Initialize SQLite tables and seed default entities if not present."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS processes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                lifecycle_state TEXT NOT NULL,
                model_state TEXT NOT NULL,
                version TEXT NOT NULL,
                owner TEXT NOT NULL,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS process_versions (
                id TEXT PRIMARY KEY,
                process_id TEXT NOT NULL,
                version TEXT NOT NULL,
                note TEXT DEFAULT '',
                published_by TEXT NOT NULL,
                published_at TEXT NOT NULL,
                snapshot_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS collaborators (
                id TEXT PRIMARY KEY,
                is_ai INTEGER NOT NULL DEFAULT 0,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                process_id TEXT NOT NULL,
                project_id TEXT,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                process_id TEXT,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                process_id TEXT,
                conversation_id TEXT,
                data_json TEXT NOT NULL,
                start_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_providers (
                id TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_credentials (
                collaborator_id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                collaborator_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )
        conn.commit()

        # Ensure demo processes (2 complete projects x TO-BE & AS-IS) exist for unit tests and initial state
        for demo_proc in (
            DEMO_PROCESS,
            DEMO_PROCESS_AS_IS,
            DEMO_PROCESS_SINISTRE,
            DEMO_PROCESS_SINISTRE_AS_IS,
        ):
            cursor = conn.execute("SELECT id FROM processes WHERE id = ?", (demo_proc.id,))
            if not cursor.fetchone():
                _write_process_record(conn, demo_proc)
        conn.commit()

        _seed_default_saas_entities(conn)
        _seed_default_ai_providers(conn)
        _seed_default_user_credentials(conn)
        conn.commit()


# ============================================================================
# Process Storage Operations
# ============================================================================

def list_processes() -> list[ProcessSummary]:
    """List all processes with metadata summaries."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, name, description, lifecycle_state, model_state, version, owner, data_json, updated_at
            FROM processes
            ORDER BY updated_at DESC
            """
        ).fetchall()

    versions_by_proc = list_all_process_versions_map()
    summaries = []
    for r in rows:
        try:
            data = json.loads(r["data_json"])
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
            rules = data.get("businessRules", [])
            summaries.append(
                ProcessSummary(
                    id=r["id"],
                    name=r["name"],
                    description=r["description"] or "",
                    projectId=data.get("projectId"),
                    categoryId=data.get("categoryId"),
                    tags=data.get("tags", []),
                    lifecycleState=r["lifecycle_state"],
                    modelState=r["model_state"],
                    version=r["version"],
                    owner=r["owner"],
                    nodeCount=len(nodes),
                    edgeCount=len(edges),
                    ruleCount=len(rules),
                    updatedAt=r["updated_at"],
                    publishedVersions=versions_by_proc.get(r["id"], []),
                )
            )
        except Exception:
            continue
    return summaries


def list_all_process_versions_map() -> dict[str, list[ProcessVersionSummary]]:
    """Return all saved process version snapshots grouped by process_id."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, process_id, version, note, published_by, published_at, snapshot_json
            FROM process_versions
            ORDER BY published_at DESC
            """
        ).fetchall()

    grouped: dict[str, list[ProcessVersionSummary]] = {}
    for r in rows:
        try:
            snap = json.loads(r["snapshot_json"])
            item = ProcessVersionSummary(
                id=r["id"],
                processId=r["process_id"],
                version=r["version"],
                note=r["note"] or "",
                publishedBy=r["published_by"] or "MOA Process",
                publishedAt=r["published_at"],
                nodeCount=len(snap.get("nodes", [])),
                ruleCount=len(snap.get("businessRules", [])),
            )
            grouped.setdefault(r["process_id"], []).append(item)
        except Exception:
            continue
    return grouped


def list_process_versions(process_id: str) -> list[ProcessVersionSummary]:
    """List saved version snapshots for a specific process."""
    return list_all_process_versions_map().get(process_id, [])


def save_process_version(
    process: ProcessModel,
    note: str = "",
    published_by: str = "MOA Process",
    overwrite_same_version: bool = False,
) -> ProcessVersionSummary:
    """Save (or overwrite) a version snapshot for a process."""
    init_db()
    now_iso = utc_now_iso()
    snap_json = process.model_dump_json()

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        existing = None
        if overwrite_same_version:
            existing = conn.execute(
                """
                SELECT id FROM process_versions
                WHERE process_id = ? AND version = ?
                ORDER BY published_at DESC LIMIT 1
                """,
                (process.id, process.version),
            ).fetchone()

        if existing:
            ver_id = existing["id"]
            conn.execute(
                """
                UPDATE process_versions
                SET note = ?, published_by = ?, published_at = ?, snapshot_json = ?
                WHERE id = ?
                """,
                (note, published_by, now_iso, snap_json, ver_id),
            )
        else:
            ver_id = f"ver-{uuid.uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO process_versions (id, process_id, version, note, published_by, published_at, snapshot_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (ver_id, process.id, process.version, note, published_by, now_iso, snap_json),
            )
        conn.commit()

    return ProcessVersionSummary(
        id=ver_id,
        processId=process.id,
        version=process.version,
        note=note,
        publishedBy=published_by,
        publishedAt=now_iso,
        nodeCount=len(process.nodes),
        ruleCount=len(process.businessRules),
    )


def restore_process_version(process_id: str, version_id: str) -> ProcessModel | None:
    """Restore a saved version snapshot as the active process state."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT snapshot_json FROM process_versions WHERE id = ? AND process_id = ?",
            (version_id, process_id),
        ).fetchone()
        if not row:
            return None
        data = json.loads(row["snapshot_json"])
        restored = ProcessModel.model_validate(data)
        restored.updatedAt = utc_now_iso()
    return save_process(restored)


def get_process(process_id: str) -> ProcessModel | None:
    """Get complete process model by ID."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT data_json FROM processes WHERE id = ?", (process_id,)).fetchone()
        if not row:
            return None
        data = json.loads(row["data_json"])
        return ProcessModel.model_validate(data)


def save_process(process: ProcessModel) -> ProcessModel:
    """Insert or update a process."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        _write_process_record(conn, process)
        conn.commit()
    return process


def delete_process(process_id: str) -> bool:
    """Delete a process by ID."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM processes WHERE id = ?", (process_id,))
        conn.commit()
        return cursor.rowcount > 0


# ============================================================================
# Categories & Tags Storage Operations
# ============================================================================

def list_categories() -> list[CategoryModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT data_json FROM categories ORDER BY created_at ASC").fetchall()
    return [CategoryModel.model_validate(json.loads(r[0])) for r in rows]


def save_category(category: CategoryModel) -> CategoryModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO categories (id, data_json, created_at) VALUES (?, ?, ?)",
            (category.id, json.dumps(category.model_dump(), ensure_ascii=False), category.createdAt),
        )
        conn.commit()
    return category


def delete_category(category_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        conn.commit()
        return cur.rowcount > 0


def list_tags() -> list[TagModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT data_json FROM tags ORDER BY created_at ASC").fetchall()
    return [TagModel.model_validate(json.loads(r[0])) for r in rows]


def save_tag(tag: TagModel) -> TagModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO tags (id, data_json, created_at) VALUES (?, ?, ?)",
            (tag.id, json.dumps(tag.model_dump(), ensure_ascii=False), tag.createdAt),
        )
        conn.commit()
    return tag


def delete_tag(tag_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        conn.commit()
        return cur.rowcount > 0


# ============================================================================
# Projects Storage Operations
# ============================================================================

def list_projects() -> list[ProjectModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT data_json FROM projects ORDER BY updated_at DESC").fetchall()
    return [ProjectModel.model_validate(json.loads(r[0])) for r in rows]


def get_project(project_id: str) -> ProjectModel | None:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT data_json FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        return ProjectModel.model_validate(json.loads(row[0]))


def save_project(project: ProjectModel) -> ProjectModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO projects (id, data_json, updated_at) VALUES (?, ?, ?)",
            (project.id, json.dumps(project.model_dump(), ensure_ascii=False), project.updatedAt),
        )
        conn.commit()
    return project


def delete_project(project_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return cur.rowcount > 0


# ============================================================================
# Teams & Collaborators (Humans + AI Agents) Storage Operations
# ============================================================================

def list_teams() -> list[TeamModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT data_json FROM teams ORDER BY created_at ASC").fetchall()
    return [TeamModel.model_validate(json.loads(r[0])) for r in rows]


def save_team(team: TeamModel) -> TeamModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO teams (id, data_json, created_at) VALUES (?, ?, ?)",
            (team.id, json.dumps(team.model_dump(), ensure_ascii=False), team.createdAt),
        )
        conn.commit()
    return team


def delete_team(team_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM teams WHERE id = ?", (team_id,))
        conn.commit()
        return cur.rowcount > 0


def list_collaborators(is_ai: bool | None = None) -> list[CollaboratorModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        if is_ai is None:
            rows = conn.execute("SELECT data_json FROM collaborators ORDER BY is_ai ASC, created_at ASC").fetchall()
        else:
            rows = conn.execute(
                "SELECT data_json FROM collaborators WHERE is_ai = ? ORDER BY created_at ASC",
                (1 if is_ai else 0,),
            ).fetchall()
    return [CollaboratorModel.model_validate(json.loads(r[0])) for r in rows]


def get_collaborator(collab_id: str) -> CollaboratorModel | None:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT data_json FROM collaborators WHERE id = ?", (collab_id,)).fetchone()
        if not row:
            return None
        return CollaboratorModel.model_validate(json.loads(row[0]))


def save_collaborator(collab: CollaboratorModel) -> CollaboratorModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO collaborators (id, is_ai, data_json, created_at) VALUES (?, ?, ?, ?)",
            (collab.id, 1 if collab.isAi else 0, json.dumps(collab.model_dump(), ensure_ascii=False), collab.createdAt),
        )
        conn.commit()
    return collab


def delete_collaborator(collab_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM collaborators WHERE id = ?", (collab_id,))
        conn.commit()
        return cur.rowcount > 0


# ============================================================================
# Approval Gates Storage Operations
# ============================================================================

def list_approvals(process_id: str | None = None, project_id: str | None = None) -> list[ApprovalGateModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        if process_id:
            rows = conn.execute(
                "SELECT data_json FROM approvals WHERE process_id = ? ORDER BY updated_at ASC",
                (process_id,),
            ).fetchall()
        elif project_id:
            rows = conn.execute(
                "SELECT data_json FROM approvals WHERE project_id = ? ORDER BY updated_at ASC",
                (project_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT data_json FROM approvals ORDER BY updated_at ASC").fetchall()
    return [ApprovalGateModel.model_validate(json.loads(r[0])) for r in rows]


def get_approval(approval_id: str) -> ApprovalGateModel | None:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT data_json FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        if not row:
            return None
        return ApprovalGateModel.model_validate(json.loads(row[0]))


def save_approval(approval: ApprovalGateModel) -> ApprovalGateModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO approvals (id, process_id, project_id, data_json, updated_at) VALUES (?, ?, ?, ?, ?)",
            (
                approval.id,
                approval.processId,
                approval.projectId,
                json.dumps(approval.model_dump(), ensure_ascii=False),
                approval.updatedAt,
            ),
        )
        conn.commit()
    return approval


def delete_approval(approval_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM approvals WHERE id = ?", (approval_id,))
        conn.commit()
        return cur.rowcount > 0


# ============================================================================
# Conversations & Messages Storage Operations
# ============================================================================

def list_conversations(project_id: str | None = None, process_id: str | None = None) -> list[ConversationModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        if project_id:
            rows = conn.execute(
                "SELECT data_json FROM conversations WHERE project_id = ? ORDER BY updated_at DESC",
                (project_id,),
            ).fetchall()
        elif process_id:
            rows = conn.execute(
                "SELECT data_json FROM conversations WHERE process_id = ? ORDER BY updated_at DESC",
                (process_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT data_json FROM conversations ORDER BY updated_at DESC").fetchall()
    return [ConversationModel.model_validate(json.loads(r[0])) for r in rows]


def get_conversation(conv_id: str) -> ConversationModel | None:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT data_json FROM conversations WHERE id = ?", (conv_id,)).fetchone()
        if not row:
            return None
        return ConversationModel.model_validate(json.loads(row[0]))


def save_conversation(conv: ConversationModel) -> ConversationModel:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO conversations (id, project_id, process_id, data_json, updated_at) VALUES (?, ?, ?, ?, ?)",
            (
                conv.id,
                conv.projectId,
                conv.processId,
                json.dumps(conv.model_dump(), ensure_ascii=False),
                conv.updatedAt,
            ),
        )
        conn.commit()
    return conv


def delete_conversation(conv_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        conn.commit()
        return cur.rowcount > 0


# ============================================================================
# Meetings & Outlook Agenda Storage Operations
# ============================================================================

def list_meetings(project_id: str | None = None, process_id: str | None = None) -> list[MeetingModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        if project_id:
            rows = conn.execute(
                "SELECT data_json FROM meetings WHERE project_id = ? ORDER BY start_at ASC",
                (project_id,),
            ).fetchall()
        elif process_id:
            rows = conn.execute(
                "SELECT data_json FROM meetings WHERE process_id = ? ORDER BY start_at ASC",
                (process_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT data_json FROM meetings ORDER BY start_at ASC").fetchall()
    return [MeetingModel.model_validate(json.loads(r[0])) for r in rows]


def get_meeting(meeting_id: str) -> MeetingModel | None:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT data_json FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
        if not row:
            return None
        return MeetingModel.model_validate(json.loads(row[0]))


def save_meeting(meeting: MeetingModel) -> MeetingModel:
    init_db()
    meeting.outlookWebLink = build_outlook_web_deeplink(meeting)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO meetings (id, project_id, process_id, conversation_id, data_json, start_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                meeting.id,
                meeting.projectId,
                meeting.processId,
                meeting.conversationId,
                json.dumps(meeting.model_dump(), ensure_ascii=False),
                meeting.startAt,
            ),
        )
        conn.commit()
    return meeting


def delete_meeting(meeting_id: str) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
        conn.commit()
        return cur.rowcount > 0


def reset_workspace_blank() -> dict[str, Any]:
    """Reset workspace categories, projects, teams, approvals, meetings and conversations to blank,
    keeping only the active human user and the 5 built-in AI Collaborator Agents."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM categories")
        conn.execute("DELETE FROM tags")
        conn.execute("DELETE FROM projects")
        conn.execute("DELETE FROM teams")
        conn.execute("DELETE FROM approvals")
        conn.execute("DELETE FROM meetings")
        conn.execute("DELETE FROM conversations")
        conn.execute("DELETE FROM collaborators WHERE is_ai = 0 AND id != 'collab-user-main'")

        # Ensure the 5 default AI agents are present
        for agent in DEFAULT_AI_AGENTS:
            conn.execute(
                "INSERT OR REPLACE INTO collaborators (id, is_ai, data_json, created_at) VALUES (?, ?, ?, ?)",
                (agent.id, 1, json.dumps(agent.model_dump(), ensure_ascii=False), agent.createdAt),
            )
        conn.commit()

    return {
        "status": "blank_workspace_ready",
        "message": "Espace de travail réinitialisé à vide. Les 5 Agents IA collaborateurs restent disponibles.",
    }


def reset_workspace_demo() -> dict[str, Any]:
    """Completely rebuild the flagship 'Demande de rachat partiel' demonstration project and processes."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM processes")
        conn.execute("DELETE FROM categories")
        conn.execute("DELETE FROM tags")
        conn.execute("DELETE FROM projects")
        conn.execute("DELETE FROM teams")
        conn.execute("DELETE FROM approvals")
        conn.execute("DELETE FROM meetings")
        conn.execute("DELETE FROM conversations")
        conn.execute("DELETE FROM collaborators")
        conn.commit()

    init_db()
    return {
        "status": "demo_workspace_restored",
        "projectId": "proj-default-01",
        "projectIds": ["proj-default-01", "proj-default-02"],
        "processIds": [
            DEMO_PROCESS.id,
            DEMO_PROCESS_AS_IS.id,
            DEMO_PROCESS_SINISTRE.id,
            DEMO_PROCESS_SINISTRE_AS_IS.id,
        ],
        "message": "Les 2 projets exemplaires (Demande de rachat partiel & Sinistre Auto IARD — TO-BE & AS-IS) ont été intégralement restaurés.",
    }


# ============================================================================
# AI Providers Configuration Storage Operations (BYOK / Enterprise LLM)
# ============================================================================

DEFAULT_AI_PROVIDERS: list[AIProviderConfigModel] = [
    AIProviderConfigModel(
        providerId="openai",
        name="OpenAI (Enterprise API)",
        modelsLabel="GPT-4o · GPT-4o-mini",
        apiKey="",
        apiKeyMasked="",
        endpointUrl="https://api.openai.com/v1",
        enabled=False,
        status="local_fallback",
    ),
    AIProviderConfigModel(
        providerId="anthropic",
        name="Anthropic Claude",
        modelsLabel="Claude 3.7 Sonnet · Claude 3.5 Haiku",
        apiKey="",
        apiKeyMasked="",
        endpointUrl="https://api.anthropic.com/v1",
        enabled=False,
        status="local_fallback",
    ),
    AIProviderConfigModel(
        providerId="google",
        name="Google Gemini (Vertex / AI Studio)",
        modelsLabel="Gemini 2.5 Pro · Gemini 2.5 Flash",
        apiKey="",
        apiKeyMasked="",
        endpointUrl="https://generativelanguage.googleapis.com/v1beta",
        enabled=False,
        status="local_fallback",
    ),
    AIProviderConfigModel(
        providerId="custom_endpoint",
        name="Endpoint Souverain (Azure OpenAI / Mistral / Ollama)",
        modelsLabel="Mistral Large · Llama 3.3 · Azure GPT-4o",
        apiKey="",
        apiKeyMasked="",
        endpointUrl="https://votre-instance.openai.azure.com/openai/v1",
        enabled=False,
        status="local_fallback",
    ),
]


def _seed_default_ai_providers(conn: sqlite3.Connection) -> None:
    for p in DEFAULT_AI_PROVIDERS:
        row = conn.execute("SELECT id FROM ai_providers WHERE id = ?", (p.providerId,)).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO ai_providers (id, data_json, updated_at) VALUES (?, ?, ?)",
                (p.providerId, json.dumps(p.model_dump(), ensure_ascii=False), p.updatedAt),
            )


def _mask_api_key(raw_key: str) -> str:
    clean = (raw_key or "").strip()
    if not clean:
        return ""
    if len(clean) <= 8:
        return "••••••••"
    return f"{clean[:4]}••••••••{clean[-4:]}"


def list_ai_providers(include_raw_key: bool = False) -> list[AIProviderConfigModel]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT data_json FROM ai_providers ORDER BY rowid ASC").fetchall()
    result: list[AIProviderConfigModel] = []
    for r in rows:
        item = AIProviderConfigModel.model_validate(json.loads(r[0]))
        item.apiKeyMasked = _mask_api_key(item.apiKey)
        if not include_raw_key:
            item.apiKey = ""
        result.append(item)
    return result


def get_ai_provider(provider_id: str, include_raw_key: bool = False) -> AIProviderConfigModel | None:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT data_json FROM ai_providers WHERE id = ?", (provider_id,)).fetchone()
    if not row:
        return None
    item = AIProviderConfigModel.model_validate(json.loads(row[0]))
    item.apiKeyMasked = _mask_api_key(item.apiKey)
    if not include_raw_key:
        item.apiKey = ""
    return item


def save_ai_provider(cfg: AIProviderConfigModel) -> AIProviderConfigModel:
    init_db()
    cfg.updatedAt = utc_now_iso()
    cfg.apiKeyMasked = _mask_api_key(cfg.apiKey)
    is_custom_or_sovereign = cfg.providerId not in ("openai", "anthropic", "google")
    cfg.status = (
        "connected"
        if (cfg.enabled and (bool(cfg.apiKey.strip()) or is_custom_or_sovereign))
        else "local_fallback"
    )
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO ai_providers (id, data_json, updated_at) VALUES (?, ?, ?)",
            (cfg.providerId, json.dumps(cfg.model_dump(), ensure_ascii=False), cfg.updatedAt),
        )
        conn.commit()
    masked_copy = cfg.model_copy(deep=True)
    masked_copy.apiKey = ""
    return masked_copy


def delete_ai_provider(provider_id: str) -> bool:
    init_db()
    if provider_id in ("openai", "anthropic", "google", "custom_endpoint"):
        return False
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("DELETE FROM ai_providers WHERE id = ?", (provider_id,))
        conn.commit()
        return cur.rowcount > 0


# ============================================================================
# Authentication & User Session Storage
# ============================================================================

DEFAULT_DEMO_PASSWORD = "demo1234"
SESSION_TTL_DAYS = 7


def _seed_default_user_credentials(conn: sqlite3.Connection) -> None:
    """Ensure every existing human collaborator has a hashed credential for email/password login."""
    rows = conn.execute("SELECT id, data_json FROM collaborators WHERE is_ai = 0").fetchall()
    now = utc_now_iso()
    for row in rows:
        collab_id = row[0]
        existing = conn.execute(
            "SELECT collaborator_id FROM user_credentials WHERE collaborator_id = ?",
            (collab_id,),
        ).fetchone()
        if existing:
            continue
        data = json.loads(row[1])
        email = (data.get("email") or "").strip().lower()
        if not email:
            handle = (data.get("handle") or collab_id).strip().lower()
            email = f"{handle}@organisation.fr"
        email_taken = conn.execute(
            "SELECT collaborator_id FROM user_credentials WHERE lower(email) = ?",
            (email,),
        ).fetchone()
        if email_taken:
            continue
        conn.execute(
            """
            INSERT INTO user_credentials (collaborator_id, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (collab_id, email, hash_password(DEFAULT_DEMO_PASSWORD), now, now),
        )


def _create_session_for_user(conn: sqlite3.Connection, collaborator_id: str) -> str:
    token = generate_session_token()
    now_dt = datetime.now(timezone.utc)
    expires_dt = now_dt + timedelta(days=SESSION_TTL_DAYS)
    conn.execute(
        """
        INSERT INTO user_sessions (token, collaborator_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (token, collaborator_id, now_dt.isoformat(), expires_dt.isoformat()),
    )
    return token


def authenticate_user(email: str, password: str) -> tuple[CollaboratorModel, str] | None:
    """Validate email + password and issue a persistent session token."""
    init_db()
    norm_email = (email or "").strip().lower()
    if not norm_email or not password:
        return None
    with sqlite3.connect(DB_PATH) as conn:
        cred = conn.execute(
            "SELECT collaborator_id, password_hash FROM user_credentials WHERE lower(email) = ?",
            (norm_email,),
        ).fetchone()
        if not cred or not verify_password(password, cred[1]):
            return None
        collab_row = conn.execute(
            "SELECT data_json FROM collaborators WHERE id = ?",
            (cred[0],),
        ).fetchone()
        if not collab_row:
            return None
        user = CollaboratorModel.model_validate(json.loads(collab_row[0]))
        token = _create_session_for_user(conn, user.id)
        conn.commit()
        return user, token


def register_user(
    name: str,
    email: str,
    password: str,
    role_title: str = "Collaborateur",
) -> tuple[CollaboratorModel, str]:
    """Create a new human collaborator account + hashed password + active session."""
    init_db()
    clean_name = (name or "").strip()
    norm_email = (email or "").strip().lower()
    if not clean_name or not norm_email or len(password or "") < 4:
        raise ValueError("Nom, email valide et mot de passe (4 caractères minimum) requis.")

    with sqlite3.connect(DB_PATH) as conn:
        existing = conn.execute(
            "SELECT collaborator_id FROM user_credentials WHERE lower(email) = ?",
            (norm_email,),
        ).fetchone()
        if existing:
            raise ValueError("Un compte existe déjà avec cette adresse email.")

        parts = [p for p in clean_name.split() if p]
        initials = (
            (parts[0][0] + parts[-1][0]).upper()
            if len(parts) >= 2
            else clean_name[:2].upper()
        )
        handle_base = "".join(ch for ch in parts[0].lower() if ch.isalnum()) or "user"
        collab_id = f"collab-{uuid.uuid4().hex[:8]}"
        now = utc_now_iso()
        palette = ["#1F93FF", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"]
        color = palette[abs(hash(norm_email)) % len(palette)]

        user = CollaboratorModel(
            id=collab_id,
            name=clean_name,
            handle=handle_base,
            roleTitle=(role_title or "Collaborateur").strip() or "Collaborateur",
            email=norm_email,
            avatarInitials=initials,
            avatarColor=color,
            presenceStatus="online",
            isAi=False,
            createdAt=now,
        )
        conn.execute(
            "INSERT INTO collaborators (id, is_ai, data_json, created_at) VALUES (?, 0, ?, ?)",
            (user.id, json.dumps(user.model_dump(), ensure_ascii=False), now),
        )
        conn.execute(
            """
            INSERT INTO user_credentials (collaborator_id, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user.id, norm_email, hash_password(password), now, now),
        )
        token = _create_session_for_user(conn, user.id)
        conn.commit()
        return user, token


def get_session_user(token: str) -> CollaboratorModel | None:
    """Resolve an active, non-expired session token to its CollaboratorModel."""
    init_db()
    clean_token = (token or "").strip()
    if not clean_token:
        return None
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT collaborator_id, expires_at FROM user_sessions WHERE token = ?",
            (clean_token,),
        ).fetchone()
        if not row:
            return None
        try:
            expires_dt = datetime.fromisoformat(row[1])
            if expires_dt < datetime.now(timezone.utc):
                conn.execute("DELETE FROM user_sessions WHERE token = ?", (clean_token,))
                conn.commit()
                return None
        except Exception:
            return None
        collab_row = conn.execute(
            "SELECT data_json FROM collaborators WHERE id = ?",
            (row[0],),
        ).fetchone()
        if not collab_row:
            return None
        return CollaboratorModel.model_validate(json.loads(collab_row[0]))


def delete_session(token: str) -> None:
    """Revoke a session token on logout."""
    init_db()
    clean_token = (token or "").strip()
    if not clean_token:
        return
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM user_sessions WHERE token = ?", (clean_token,))
        conn.commit()


def change_user_password(collaborator_id: str, current_password: str, new_password: str) -> bool:
    """Change a user's password after verifying their current password."""
    init_db()
    if len(new_password or "") < 4:
        return False
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT password_hash FROM user_credentials WHERE collaborator_id = ?",
            (collaborator_id,),
        ).fetchone()
        if not row or not verify_password(current_password, row[0]):
            return False
        conn.execute(
            "UPDATE user_credentials SET password_hash = ?, updated_at = ? WHERE collaborator_id = ?",
            (hash_password(new_password), utc_now_iso(), collaborator_id),
        )
        conn.commit()
        return True



