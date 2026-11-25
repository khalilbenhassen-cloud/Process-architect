import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from process_engine import (
    validate_process,
    simulate_path,
    compute_analytics,
    draft_test_cases,
    build_traceability_matrix,
    export_markdown_report,
    export_test_cases_csv,
    sanitize_csv_cell,
)

SAMPLE_MODEL = {
    "id": "sample-process",
    "name": "Demande de rachat partiel",
    "version": "1.0.0",
    "owner": "MOA Épargne Retraite",
    "businessRules": [
        {
            "id": "RG-01",
            "title": "Complétude dossier",
            "statement": "Pièces requises : RIB et CNI.",
            "category": "data_quality",
            "severity": "high",
            "sourceType": "fictional_assumption",
            "sourceNote": "Hypothèse de démo",
            "active": True
        }
    ],
    "requirements": [
        {
            "id": "EX-01",
            "title": "Contrôle automatique de complétude",
            "ruleIds": ["RG-01"]
        }
    ],
    "nodes": [
        {"id": "n_start", "type": "start", "label": "Début", "estimatedDurationMinutes": 0},
        {"id": "n_task1", "type": "task", "label": "Contrôler pièces", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 15, "ruleIds": ["RG-01"]},
        {"id": "n_dec", "type": "decision", "label": "Dossier conforme ?", "estimatedDurationMinutes": 0},
        {"id": "n_task_ok", "type": "task", "label": "Valider virement", "ownerRole": "Comptabilité", "executionMode": "automated", "estimatedDurationMinutes": 5},
        {"id": "n_task_ko", "type": "task", "label": "Notifier rejet", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 10},
        {"id": "n_end_ok", "type": "end", "label": "Fin avec succès", "estimatedDurationMinutes": 0},
        {"id": "n_end_ko", "type": "end", "label": "Fin rejet", "estimatedDurationMinutes": 0}
    ],
    "edges": [
        {"id": "e1", "sourceNodeId": "n_start", "targetNodeId": "n_task1", "label": "initier"},
        {"id": "e2", "sourceNodeId": "n_task1", "targetNodeId": "n_dec", "label": "soumettre"},
        {"id": "e3", "sourceNodeId": "n_dec", "targetNodeId": "n_task_ok", "label": "Conforme"},
        {"id": "e4", "sourceNodeId": "n_dec", "targetNodeId": "n_task_ko", "label": "Non conforme"},
        {"id": "e5", "sourceNodeId": "n_task_ok", "targetNodeId": "n_end_ok", "label": "terminer"},
        {"id": "e6", "sourceNodeId": "n_task_ko", "targetNodeId": "n_end_ko", "label": "clôturer"}
    ]
}


def test_full_model_validation():
    res = validate_process(SAMPLE_MODEL)
    assert res["valid"] is True
    assert res["summary"]["errors"] == 0


def test_dead_end_detection():
    # If n_task_ko has no way to reach an end
    bad_model = {
        **SAMPLE_MODEL,
        "edges": [e for e in SAMPLE_MODEL["edges"] if e["id"] != "e6"]
    }
    res = validate_process(bad_model)
    assert res["valid"] is False
    codes = [f["code"] for f in res["findings"]]
    assert "CANNOT_REACH_END" in codes or "NO_OUTGOING_EDGE" in codes


def test_unreachable_node_warning():
    orphan_model = {
        **SAMPLE_MODEL,
        "nodes": SAMPLE_MODEL["nodes"] + [
            {"id": "n_orphan", "type": "task", "label": "Orphelin", "ownerRole": "MOA", "estimatedDurationMinutes": 1}
        ],
        "edges": SAMPLE_MODEL["edges"] + [
            {"id": "e_orphan", "sourceNodeId": "n_orphan", "targetNodeId": "n_end_ok", "label": "go"}
        ]
    }
    res = validate_process(orphan_model)
    codes = [f["code"] for f in res["findings"]]
    assert "UNREACHABLE_NODE" in codes


def test_cycle_detection():
    cycle_model = {
        **SAMPLE_MODEL,
        "edges": SAMPLE_MODEL["edges"] + [
            {"id": "e_cycle", "sourceNodeId": "n_task_ko", "targetNodeId": "n_task1", "label": "recommencer"}
        ]
    }
    res = validate_process(cycle_model)
    codes = [f["code"] for f in res["findings"]]
    assert "CYCLE_DETECTED" in codes


def test_simulation_path_selection():
    # Test path 1: Conforme
    sim1 = simulate_path(SAMPLE_MODEL, {"n_dec": "Conforme"})
    assert sim1["status"] == "completed"
    assert "n_task_ok" in sim1["path"]
    assert "n_task_ko" not in sim1["path"]
    assert sim1["totalEstimatedMinutes"] == 20  # 0 + 15 + 0 + 5 + 0

    # Test path 2: Non conforme
    sim2 = simulate_path(SAMPLE_MODEL, {"n_dec": "Non conforme"})
    assert sim2["status"] == "completed"
    assert "n_task_ko" in sim2["path"]
    assert sim2["totalEstimatedMinutes"] == 25  # 0 + 15 + 0 + 10 + 0


def test_analytics_computation():
    analytics = compute_analytics(SAMPLE_MODEL)
    assert analytics["nodesCount"] == 7
    assert analytics["edgesCount"] == 6
    assert analytics["rulesCount"] == 1
    assert len(analytics["bottleneckCandidates"]) > 0
    assert analytics["bottleneckCandidates"][0]["id"] == "n_task1"


def test_test_case_generation():
    drafts = draft_test_cases(SAMPLE_MODEL)
    assert drafts["count"] >= 3  # 2 branches + 1 rule
    ids = [c["id"] for c in drafts["cases"]]
    assert any("TC-DEC-n_dec" in cid for cid in ids)
    assert any("TC-RULE-RG-01" in cid for cid in ids)


def test_traceability_matrix():
    matrix = build_traceability_matrix(SAMPLE_MODEL)
    assert matrix["totalRules"] == 1
    assert matrix["coverageRate"] == 100.0
    assert len(matrix["matrix"]) >= 1


def test_safe_csv_export():
    safe = sanitize_csv_cell("Normal text")
    assert safe == "Normal text"

    unsafe = sanitize_csv_cell("=1+1")
    assert unsafe == "'=1+1"

    cases = draft_test_cases(SAMPLE_MODEL)["cases"]
    csv_str = export_test_cases_csv(cases)
    assert "ID_Test" in csv_str
    assert "TC-DEC-n_dec" in csv_str


def test_markdown_report_generation():
    md = export_markdown_report(SAMPLE_MODEL)
    assert "# Rapport d'analyse de processus" in md
    assert "Demande de rachat partiel" in md
    assert "Avertissement légal" in md
