import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from process_engine import validate_process, simulate_path, draft_test_cases

MODEL = {
    "id": "demo",
    "nodes": [
        {"id": "s", "type": "start", "label": "Start", "estimatedDurationMinutes": 0},
        {"id": "d", "type": "decision", "label": "Complet ?", "estimatedDurationMinutes": 0},
        {"id": "a", "type": "task", "label": "Traiter", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 10},
        {"id": "b", "type": "task", "label": "Demander pièces", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 5},
        {"id": "e", "type": "end", "label": "End", "estimatedDurationMinutes": 0}
    ],
    "edges": [
        {"id": "1", "sourceNodeId": "s", "targetNodeId": "d", "label": "go"},
        {"id": "2", "sourceNodeId": "d", "targetNodeId": "a", "label": "Oui"},
        {"id": "3", "sourceNodeId": "d", "targetNodeId": "b", "label": "Non"},
        {"id": "4", "sourceNodeId": "a", "targetNodeId": "e", "label": "done"},
        {"id": "5", "sourceNodeId": "b", "targetNodeId": "e", "label": "done"}
    ]
}


def test_valid_model():
    assert validate_process(MODEL)["valid"] is True


def test_simulation_requires_decision():
    assert simulate_path(MODEL)["status"] == "blocked"


def test_simulation_completes():
    result = simulate_path(MODEL, {"d": "Oui"})
    assert result["status"] == "completed"
    assert result["totalEstimatedMinutes"] == 10


def test_drafts_cover_decision_branches():
    result = draft_test_cases(MODEL)
    assert result["count"] == 2
    assert all(case["reviewRequired"] for case in result["cases"])


def test_missing_end_is_invalid():
    model = {**MODEL, "nodes": [n for n in MODEL["nodes"] if n["id"] != "e"]}
    assert validate_process(model)["valid"] is False
