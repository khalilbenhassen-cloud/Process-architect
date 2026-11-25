# Process Architect UX/UI Refactor MCP Kit

Ce kit contient une spécification UX/UI prête à transmettre à un agent IA, un plan d'implémentation, un prompt, et un serveur MCP avec des outils de référence/checklist.

## Fichiers
- `docs/UX_UI_SPEC.md`: spécification complète.
- `docs/IMPLEMENTATION_PLAN.md`: phases de réalisation.
- `docs/AI_IMPLEMENTATION_PROMPT.md`: prompt prêt à coller.
- `mcp-server/server.py`: serveur MCP local.
- `mcp-server/ux_checks.py`: audit de checklist.
- `mcp-server/tests/`: tests de la checklist.

## Installation MCP
Python 3.12+ :
```bash
cd mcp-server
python -m venv .venv
source .venv/bin/activate
pip install -e .
python server.py
```
Sur Windows PowerShell : `.venv\\Scripts\\Activate.ps1`. Le transport est stdio : lancer via un client MCP compatible. Adapter les chemins absolus dans la configuration du client.

Le serveur expose `get_ux_refactor_requirements`, `audit_ux_implementation`, `get_ux_acceptance_checklist` et la ressource `process-architect-ux://specification`.

Le serveur ne lit/modifie pas directement le dépôt : il fournit des exigences structurées à l'agent. L'agent doit avoir accès au dépôt et implémenter les changements.
