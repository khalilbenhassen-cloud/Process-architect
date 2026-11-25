import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import (
    validate_business_process,
    simulate_business_process,
    draft_functional_test_cases,
    analyze_business_process,
    guidelines,
    sample_process
)

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


def test_mcp_validate_tool():
    res_str = validate_business_process(json.dumps(MODEL))
    res = json.loads(res_str)
    assert res["valid"] is True
    assert res["summary"]["errors"] == 0


def test_mcp_validate_invalid_json():
    res_str = validate_business_process("not a json")
    res = json.loads(res_str)
    assert res["error"] == "INVALID_INPUT"


def test_mcp_simulate_tool():
    res_str = simulate_business_process(json.dumps(MODEL), json.dumps({"d": "Oui"}))
    res = json.loads(res_str)
    assert res["status"] == "completed"
    assert res["totalEstimatedMinutes"] == 10


def test_mcp_draft_tests_tool():
    res_str = draft_functional_test_cases(json.dumps(MODEL))
    res = json.loads(res_str)
    assert res["status"] == "draft"
    assert res["count"] == 2


def test_mcp_analyze_tool():
    res_str = analyze_business_process(json.dumps(MODEL))
    res = json.loads(res_str)
    assert res["nodesCount"] == 5
    assert res["edgesCount"] == 5


def test_mcp_resources():
    g = guidelines()
    assert "Process Architect guidelines" in g
    sp = json.loads(sample_process())
    assert sp["id"] == "demo-withdrawal"
