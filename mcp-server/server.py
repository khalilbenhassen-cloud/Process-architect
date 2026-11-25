"""MCP server for Process Architect.

Tools accept process models directly; this avoids hidden filesystem/network access.
Use only with fictional/demo data. The host client controls when a tool is invoked.
Compatible with MCP SDK v1 (FastMCP) and v2 (MCPServer).
"""
import json
from typing import Any

try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("process-architect")
except (ImportError, ModuleNotFoundError):
    from mcp.server.mcpserver import MCPServer
    mcp = MCPServer("process-architect")

from process_engine import (
    validate_process,
    simulate_path,
    compute_analytics,
    draft_test_cases,
    build_traceability_matrix,
)


@mcp.tool()
def validate_business_process(process_json: str) -> str:
    """Validate a Process Architect JSON model and return structural errors/warnings.

    Args:
        process_json: JSON string containing `nodes` and `edges`.
    """
    try:
        if len(process_json) > 1_000_000:
            raise ValueError("Le modèle dépasse la limite de 1 Mo.")
        process = json.loads(process_json)
        if not isinstance(process, dict):
            raise ValueError("La racine JSON doit être un objet.")
        result = validate_process(process)
        return json.dumps(result, ensure_ascii=False)
    except (json.JSONDecodeError, ValueError) as exc:
        return json.dumps({"error": "INVALID_INPUT", "message": str(exc)}, ensure_ascii=False)


@mcp.tool()
def simulate_business_process(process_json: str, decisions_json: str = "{}", max_steps: int = 100) -> str:
    """Simulate one deterministic path. Decision choices map node IDs to outgoing edge labels.

    Args:
        process_json: JSON string containing `nodes` and `edges`.
        decisions_json: JSON object string, for example {"decision-1":"Dossier complet"}.
        max_steps: Maximum visited nodes, between 1 and 500.
    """
    try:
        if len(process_json) > 1_000_000:
            raise ValueError("Le modèle dépasse la limite de 1 Mo.")
        if not 1 <= max_steps <= 500:
            raise ValueError("max_steps doit être compris entre 1 et 500.")
        process = json.loads(process_json)
        decisions = json.loads(decisions_json)
        if not isinstance(process, dict) or not isinstance(decisions, dict):
            raise ValueError("Le modèle et les décisions doivent être des objets JSON.")
        return json.dumps(simulate_path(process, decisions, max_steps), ensure_ascii=False)
    except (json.JSONDecodeError, ValueError) as exc:
        return json.dumps({"error": "INVALID_INPUT", "message": str(exc)}, ensure_ascii=False)


@mcp.tool()
def draft_functional_test_cases(process_json: str) -> str:
    """Draft functional test cases for every outgoing branch of each decision node and rule.

    Results are drafts and must be reviewed by a business analyst before use.
    Args:
        process_json: JSON string containing `nodes` and `edges`.
    """
    try:
        if len(process_json) > 1_000_000:
            raise ValueError("Le modèle dépasse la limite de 1 Mo.")
        process = json.loads(process_json)
        if not isinstance(process, dict):
            raise ValueError("La racine JSON doit être un objet.")
        return json.dumps(draft_test_cases(process), ensure_ascii=False)
    except (json.JSONDecodeError, ValueError) as exc:
        return json.dumps({"error": "INVALID_INPUT", "message": str(exc)}, ensure_ascii=False)


@mcp.tool()
def analyze_business_process(process_json: str) -> str:
    """Compute structural metrics, manual step proportions, and bottleneck candidates.

    Args:
        process_json: JSON string containing `nodes`, `edges` and optional `businessRules`.
    """
    try:
        if len(process_json) > 1_000_000:
            raise ValueError("Le modèle dépasse la limite de 1 Mo.")
        process = json.loads(process_json)
        if not isinstance(process, dict):
            raise ValueError("La racine JSON doit être un objet.")
        return json.dumps(compute_analytics(process), ensure_ascii=False)
    except (json.JSONDecodeError, ValueError) as exc:
        return json.dumps({"error": "INVALID_INPUT", "message": str(exc)}, ensure_ascii=False)


@mcp.resource("process-architect://guidelines")
def guidelines() -> str:
    """Core product principles and constraints for an AI client."""
    return """Process Architect guidelines:
- Use fictional data only; never imply affiliation with a real insurer.
- Ask for clarification when business rules are underspecified.
- Distinguish user-provided requirements from assumptions.
- Do not invent regulatory citations or claim compliance.
- Generated tests and analyses are drafts requiring human review.
- Never overwrite or delete project data without explicit user approval.
- Prefer deterministic domain logic over language-model guesses.
"""


@mcp.resource("process-architect://sample-process")
def sample_process() -> str:
    """Fictional demonstration process for retirement savings withdrawal."""
    sample = {
        "id": "demo-withdrawal",
        "name": "Demande de rachat partiel — démonstration fictive",
        "nodes": [
            {"id": "start", "type": "start", "label": "Réception demande", "estimatedDurationMinutes": 0},
            {"id": "review", "type": "task", "label": "Contrôler le dossier", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 15},
            {"id": "decision", "type": "decision", "label": "Dossier complet ?", "estimatedDurationMinutes": 0},
            {"id": "complete", "type": "task", "label": "Vérifier éligibilité", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 20},
            {"id": "missing", "type": "task", "label": "Demander pièces manquantes", "ownerRole": "Gestionnaire", "executionMode": "manual", "estimatedDurationMinutes": 10},
            {"id": "end_succes", "type": "end", "label": "Rachat validé", "estimatedDurationMinutes": 0},
            {"id": "end_caduc", "type": "end", "label": "Demande caduque", "estimatedDurationMinutes": 0}
        ],
        "edges": [
            {"id": "e1", "sourceNodeId": "start", "targetNodeId": "review", "label": "Dépôt"},
            {"id": "e2", "sourceNodeId": "review", "targetNodeId": "decision", "label": "Contrôle terminé"},
            {"id": "e3", "sourceNodeId": "decision", "targetNodeId": "complete", "label": "Complet"},
            {"id": "e4", "sourceNodeId": "decision", "targetNodeId": "missing", "label": "Incomplet"},
            {"id": "e5", "sourceNodeId": "complete", "targetNodeId": "end_succes", "label": "Validé"},
            {"id": "e6", "sourceNodeId": "missing", "targetNodeId": "end_caduc", "label": "Délai forclos"}
        ]
    }
    return json.dumps(sample, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run(transport="stdio")
