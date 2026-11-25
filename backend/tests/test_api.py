from pathlib import Path
import sys
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_processes_list():
    response = client.get("/api/processes")
    assert response.status_code == 200
    processes = response.json()
    assert isinstance(processes, list)
    assert any(p["id"] == "demo-rachat-partiel" for p in processes)


def test_get_demo_process_detail():
    response = client.get("/api/processes/demo-rachat-partiel")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Demande de rachat partiel — Épargne Retraite (Démo Fictive)"
    assert len(data["nodes"]) > 0
    assert len(data["businessRules"]) > 0


def test_validate_demo_process():
    response = client.post("/api/processes/demo-rachat-partiel/validate")
    assert response.status_code == 200
    res = response.json()
    assert "valid" in res
    assert res["valid"] is True


def test_simulate_demo_process():
    # Simulate happy path: Complet, Eligible, < 50k
    decisions = {
        "node_dec_complet": "Complet et conforme",
        "node_dec_eligible": "Éligible sans opposition",
        "node_dec_seuil": "Inférieur à 50 000 €"
    }
    response = client.post("/api/processes/demo-rachat-partiel/simulate", json={"decisions": decisions})
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    assert "node_end_succes" in res["path"]
    assert res["totalEstimatedMinutes"] > 0


def test_simulate_demo_process_high_amount():
    # Simulate high amount: requires double validation
    decisions = {
        "node_dec_complet": "Complet et conforme",
        "node_dec_eligible": "Éligible sans opposition",
        "node_dec_seuil": "Supérieur ou égal à 50 000 €"
    }
    response = client.post("/api/processes/demo-rachat-partiel/simulate", json={"decisions": decisions})
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    assert "node_double_validation" in res["path"]
    assert "node_end_succes" in res["path"]


def test_generate_test_cases():
    response = client.post("/api/processes/demo-rachat-partiel/test-cases")
    assert response.status_code == 200
    res = response.json()
    assert res["count"] > 0
    assert len(res["cases"]) > 0


def test_analytics():
    response = client.get("/api/processes/demo-rachat-partiel/analytics")
    assert response.status_code == 200
    res = response.json()
    assert res["nodesCount"] > 0
    assert "manualPercentage" in res


def test_traceability():
    response = client.get("/api/processes/demo-rachat-partiel/traceability")
    assert response.status_code == 200
    res = response.json()
    assert res["totalRules"] > 0
    assert "coverageRate" in res


def test_export_markdown():
    response = client.get("/api/processes/demo-rachat-partiel/export?format=markdown")
    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    assert "# Rapport d'analyse de processus" in response.text


def test_export_csv():
    response = client.get("/api/processes/demo-rachat-partiel/export?format=csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "ID_Test" in response.text


def test_create_and_delete_process():
    create_payload = {
        "name": "Processus Test Temporaire",
        "description": "Créé pour test unitaire",
        "owner": "Testeur",
        "modelState": "to_be"
    }
    create_res = client.post("/api/processes", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    proc_id = created["id"]
    assert created["name"] == "Processus Test Temporaire"

    # Delete
    del_res = client.delete(f"/api/processes/{proc_id}")
    assert del_res.status_code == 200

    # Verify not found
    get_res = client.get(f"/api/processes/{proc_id}")
    assert get_res.status_code == 404


def test_five_default_ai_collaborator_agents_and_custom_agent_builder():
    res = client.get("/api/ai-agents")
    assert res.status_code == 200
    agents = res.json()
    handles = {a["handle"] for a in agents}
    assert {"Copilot", "Modelisateur", "Auditeur", "QA", "Secretaire"}.issubset(handles)

    # Client creates a custom AI Collaborator Agent
    custom_payload = {
        "name": "🛡️ Agent Gouvernance Interne",
        "handle": "Gouvernance",
        "roleTitle": "Vérificateur des Normes Internes",
        "avatarColor": "#8B5CF6",
        "isAi": True,
        "aiSpecialty": "custom",
        "systemPrompt": "Vérifie systématiquement la présence d'un contrôle interne sur chaque étape.",
        "aiCapabilities": ["audit_rules", "summarize_and_schedule"],
    }
    create_res = client.post("/api/ai-agents", json=custom_payload)
    assert create_res.status_code == 201
    created_agent = create_res.json()
    assert created_agent["isAi"] is True
    assert created_agent["handle"] == "Gouvernance"

    # Cleanup custom agent
    del_res = client.delete(f"/api/ai-agents/{created_agent['id']}")
    assert del_res.status_code == 200


def test_customizable_categories_tags_projects_and_teams():
    cat_res = client.post("/api/categories", json={"name": "Direction Opérations", "color": "#10B981"})
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    tag_res = client.post("/api/tags", json={"name": "priorite-q4", "color": "#EF4444", "scope": "project"})
    assert tag_res.status_code == 201
    tag_id = tag_res.json()["id"]

    proj_res = client.post(
        "/api/projects",
        json={
            "name": "Projet Test Paramétrable",
            "description": "Créé librement par le client",
            "categoryId": cat_id,
            "tags": ["priorite-q4"],
            "processIds": ["demo-rachat-partiel"],
        },
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Cleanup
    client.delete(f"/api/projects/{proj_id}")
    client.delete(f"/api/tags/{tag_id}")
    client.delete(f"/api/categories/{cat_id}")


def test_conversation_with_ai_agents_and_outlook_meeting_ics():
    # Create conversation
    conv_res = client.post(
        "/api/conversations",
        json={
            "title": "Test Discussion Équipe & Agents IA",
            "conversationType": "project_thread",
            "processId": "demo-rachat-partiel",
            "tags": ["en-revue"],
        },
    )
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # Post message mentioning @Modelisateur
    msg_res = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={
            "senderId": "collab-user-main",
            "content": "Bonjour @Modelisateur peux-tu proposer une étape de contrôle qualité ?",
            "isPrivateNote": False,
        },
    )
    assert msg_res.status_code == 200
    updated_conv = msg_res.json()
    # Should have user message + AI agent reply with actionPayload
    assert len(updated_conv["messages"]) >= 2
    ai_msg = updated_conv["messages"][-1]
    assert ai_msg["senderIsAi"] is True
    assert ai_msg["actionPayload"]["actionType"] == "apply_model_steps"

    # Schedule an Outlook meeting linked to the conversation
    meet_res = client.post(
        "/api/meetings",
        json={
            "title": "Point Synchronisation Outlook",
            "conversationId": conv_id,
            "processId": "demo-rachat-partiel",
            "startAt": "2026-10-25T14:00:00Z",
            "durationMinutes": 30,
            "attendeeEmails": ["khalil.benhassen@organisation.fr"],
            "agendaNotes": "Revue du flux",
        },
    )
    assert meet_res.status_code == 201
    meeting = meet_res.json()
    assert "outlook.office.com/calendar/0/deeplink/compose" in meeting["outlookWebLink"]

    # Export .ics file
    ics_res = client.get(f"/api/meetings/{meeting['id']}/ics")
    assert ics_res.status_code == 200
    assert "BEGIN:VCALENDAR" in ics_res.text
    assert "Point Synchronisation Outlook" in ics_res.text

    # Cleanup
    client.delete(f"/api/meetings/{meeting['id']}")
    client.delete(f"/api/conversations/{conv_id}")


def test_all_five_specialized_ai_agents_and_apply_action():
    """Verify @Copilot, @Auditeur, @QA, and @Secretaire responses and 1-click action execution."""
    conv_res = client.post(
        "/api/conversations",
        json={
            "title": "Test Multi-Agents IA Complet",
            "conversationType": "direct_ai",
            "processId": "demo-rachat-partiel",
            "tags": ["prioritaire"],
        },
    )
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # 1. Invoke @Auditeur
    res_audit = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={
            "senderId": "collab-user-main",
            "content": "@Auditeur vérifie la cohérence des règles métier du processus.",
            "isPrivateNote": False,
        },
    )
    assert res_audit.status_code == 200
    msg_audit = res_audit.json()["messages"][-1]
    assert msg_audit["senderId"] == "agent-auditeur"
    assert msg_audit["actionPayload"]["actionType"] == "add_business_rules"

    # 2. Invoke @QA
    res_qa = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={
            "senderId": "collab-user-main",
            "content": "@QA génère les scénarios de test nominaux et d'exception.",
            "isPrivateNote": False,
        },
    )
    assert res_qa.status_code == 200
    msg_qa = res_qa.json()["messages"][-1]
    assert msg_qa["senderId"] == "agent-qa"
    assert msg_qa["actionPayload"]["actionType"] == "add_test_cases"

    # 3. Invoke @Secretaire
    res_sec = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={
            "senderId": "collab-user-main",
            "content": "@Secretaire résume nos décisions et prépare l'ordre du jour Outlook.",
            "isPrivateNote": False,
        },
    )
    assert res_sec.status_code == 200
    msg_sec = res_sec.json()["messages"][-1]
    assert msg_sec["senderId"] == "agent-secretaire"
    assert msg_sec["actionPayload"]["actionType"] == "create_meeting_and_note"
    assert "proposedMeeting" in msg_sec["actionPayload"]

    # 4. Execute 1-click apply-action on @Secretaire message (creates Private Note 🔒 + Meeting)
    apply_res = client.post(
        f"/api/conversations/{conv_id}/apply-action",
        json={"messageId": msg_sec["id"]},
    )
    assert apply_res.status_code == 200
    apply_data = apply_res.json()
    assert apply_data["applied"] is True
    private_notes = [m for m in apply_data["conversation"]["messages"] if m["isPrivateNote"]]
    assert len(private_notes) >= 1
    if "meeting" in apply_data and apply_data["meeting"]:
        client.delete(f"/api/meetings/{apply_data['meeting']['id']}")

    # Cleanup
    client.delete(f"/api/conversations/{conv_id}")


def test_approvals_and_outlook_graph_sync():
    # Create an approval gate
    app_res = client.post(
        "/api/approvals",
        json={
            "projectId": "proj-default-1",
            "processId": "demo-rachat-partiel",
            "label": "Validation finale Architecture & Conformité",
            "reviewerId": "collab-user-2",
            "comment": "En attente de revue",
        },
    )
    assert app_res.status_code == 201
    approval = app_res.json()

    # Approve the gate
    upd_res = client.put(
        f"/api/approvals/{approval['id']}",
        json={"status": "approved", "comment": "Validé en comité"},
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["status"] == "approved"

    # Create meeting and test Graph sync endpoint
    meet_res = client.post(
        "/api/meetings",
        json={
            "title": "Comité Validation Finale",
            "projectId": "proj-default-1",
            "startAt": "2026-10-28T10:00:00Z",
            "durationMinutes": 45,
        },
    )
    assert meet_res.status_code == 201
    meet_id = meet_res.json()["id"]

    sync_res = client.post(f"/api/meetings/{meet_id}/sync-outlook", json={})
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "synced"
    assert "outlook.office.com/calendar/0/deeplink/compose" in sync_res.json()["outlookWebLink"]

    # Cleanup
    client.delete(f"/api/meetings/{meet_id}")
    client.delete(f"/api/approvals/{approval['id']}")

