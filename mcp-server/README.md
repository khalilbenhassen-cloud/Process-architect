# Process Architect MCP server

This local MCP server gives compatible AI clients three deterministic tools:
- `validate_business_process`: structural validation of a supplied process model.
- `simulate_business_process`: simulate a path using explicit decision choices.
- `draft_functional_test_cases`: create draft test cases for decision branches.

It also exposes `process-architect://guidelines` as a resource.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
python server.py
```

The server uses stdio; a successful process may appear to wait silently because it is waiting for MCP messages. Start it through an MCP client rather than expecting a web page.

## Example process JSON

```json
{
  "id": "demo-withdrawal",
  "name": "Demande de rachat partiel — démonstration",
  "nodes": [
    {"id":"start","type":"start","label":"Début","estimatedDurationMinutes":0},
    {"id":"review","type":"task","label":"Contrôler le dossier","ownerRole":"Gestionnaire","executionMode":"manual","estimatedDurationMinutes":15},
    {"id":"decision","type":"decision","label":"Dossier complet ?","estimatedDurationMinutes":0},
    {"id":"complete","type":"task","label":"Poursuivre le traitement","ownerRole":"Gestionnaire","executionMode":"mixed","estimatedDurationMinutes":20},
    {"id":"missing","type":"task","label":"Demander les pièces manquantes","ownerRole":"Gestionnaire","executionMode":"manual","estimatedDurationMinutes":10},
    {"id":"end","type":"end","label":"Fin","estimatedDurationMinutes":0}
  ],
  "edges": [
    {"id":"e1","sourceNodeId":"start","targetNodeId":"review","label":"Suivant"},
    {"id":"e2","sourceNodeId":"review","targetNodeId":"decision","label":"Contrôle terminé"},
    {"id":"e3","sourceNodeId":"decision","targetNodeId":"complete","label":"Complet"},
    {"id":"e4","sourceNodeId":"decision","targetNodeId":"missing","label":"Incomplet"},
    {"id":"e5","sourceNodeId":"complete","targetNodeId":"end","label":"Terminé"},
    {"id":"e6","sourceNodeId":"missing","targetNodeId":"end","label":"Demande envoyée"}
  ]
}
```

For `simulate_business_process`, the decision map would be `{"decision":"Complet"}`.

## Safety boundaries
- No filesystem tools, shell execution, arbitrary network access, database access or deletion tools are exposed.
- Models are passed explicitly as JSON strings and validated.
- Outputs are advisory; human review is required.
- Do not pass personal data or real insurance records.
- This starter is not production hardened. Add authentication/authorization before any network exposure.

## Compatibility
MCP client configuration differs by host. Use the absolute Python interpreter and script paths from this repository. Never paste a configuration with placeholder paths unchanged.
