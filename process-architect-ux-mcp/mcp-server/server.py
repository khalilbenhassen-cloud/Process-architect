try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("process-architect-ux")
except (ImportError, ModuleNotFoundError):
    from mcp.server.mcpserver import MCPServer
    mcp = MCPServer("process-architect-ux")

REQS = {
 "layout": ["Le diagramme est la zone principale.", "Le panneau gauche ouvre sur Étapes.", "Les règles métier sont dans un onglet distinct et leurs détails sont repliés.", "L'inspecteur est contextuel et refermable."],
 "nodes": ["Les cartes affichent type, libellé court et responsable facultatif.", "Les détails longs restent dans l'inspecteur.", "Les branches de décision sont libellées et lisibles."],
 "inspector": ["Sections Général, Responsabilité, Temps, Règles métier, Données, Contrôles, Avancé.", "Fermer le panneau ne perd pas les brouillons.", "Délier une règle ne supprime pas la règle du catalogue."],
 "moa": ["Validation, Simulation, Cas de test et Traçabilité sont dans Atelier MOA.", "Un constat permet de focaliser le nœud/l'arête.", "Les tests générés sont des brouillons à réviser."],
 "responsive": [">=1280px : canevas dominant et panneaux optionnels.", "768-1279px : panneaux repliables/tiroirs.", "<768px : une zone principale à la fois."],
 "accessibility": ["Contrôles icône nommés pour les lecteurs d'écran.", "Focus clavier visible.", "Statut non transmis uniquement par couleur.", "Ajout d'étape possible sans drag-and-drop."],
 "persistence": ["Préserver les IDs et relations existants.", "Ne confirmer l'enregistrement qu'après persistance.", "Projets existants et import/export restent compatibles."]
}

@mcp.tool()
def get_ux_refactor_requirements(section: str = "all") -> str:
    """Retourne les exigences UX/UI. section: all, layout, nodes, inspector, moa, responsive, accessibility, persistence."""
    if section == "all":
        result = REQS
    elif section in REQS:
        result = {section: REQS[section]}
    else:
        return json.dumps({"error":"UNKNOWN_SECTION","validSections":["all",*REQS]}, ensure_ascii=False)
    return json.dumps(result, ensure_ascii=False, indent=2)

@mcp.tool()
def audit_ux_implementation(report_json: str) -> str:
    """Audite un rapport JSON dont les clés sont celles de la checklist et les valeurs booléennes."""
    try:
        report = json.loads(report_json)
        if not isinstance(report, dict):
            raise ValueError("La racine JSON doit être un objet.")
        return json.dumps(audit_layout_spec(report), ensure_ascii=False, indent=2)
    except (json.JSONDecodeError, ValueError) as exc:
        return json.dumps({"error":"INVALID_INPUT","message":str(exc)}, ensure_ascii=False)

@mcp.tool()
def get_ux_acceptance_checklist() -> str:
    """Retourne la checklist QA avant livraison de la refonte."""
    return json.dumps(acceptance_checklist(), ensure_ascii=False, indent=2)

@mcp.resource("process-architect-ux://specification")
def specification() -> str:
    """Principes normatifs UX/UI à suivre par l'agent de développement."""
    return "Audit avant édition. Canevas prioritaire. Étapes par défaut à gauche. Cartes compactes. Inspecteur contextuel en sections. Atelier MOA pour validation/simulation/tests/traçabilité. Préserver données et fonctionnalités. Sauvegarde véridique. Tester responsive, clavier, régression et build."

if __name__ == "__main__":
    mcp.run(transport="stdio")
