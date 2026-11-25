CHECKS = {
 "canvas_primary":"Le diagramme est la zone principale.",
 "steps_default":"Le panneau gauche ouvre sur Étapes.",
 "rules_collapsed":"Les détails des règles sont repliés.",
 "compact_nodes":"Les cartes sont compactes.",
 "contextual_inspector":"L'inspecteur est contextuel.",
 "inspector_sections":"Les propriétés sont groupées en sections.",
 "moa_workspace":"L'Atelier MOA regroupe les quatre fonctions.",
 "save_state_truthful":"Les états de sauvegarde sont exacts.",
 "data_preserved":"Les projets et identifiants existants sont préservés.",
 "responsive":"Les trois formats d'écran sont testés.",
 "keyboard_accessible":"Les interactions essentielles sont accessibles au clavier.",
 "regression_tests":"Les tests de régression sont exécutés.",
 "production_build":"Le build de production réussit."
}
def acceptance_checklist():
 return {"total":len(CHECKS),"items":[{"key":k,"requirement":v,"required":True} for k,v in CHECKS.items()],"completionRule":"Chaque point doit être vérifié ou reporté avec justification."}
def audit_layout_spec(report):
 results=[]
 for key, description in CHECKS.items():
  value=report.get(key,False)
  results.append({"key":key,"requirement":description,"passed":value is True,"note":value if isinstance(value,str) else None})
 passed=sum(1 for x in results if x["passed"])
 return {"passed":passed,"total":len(results),"complete":passed==len(results),"missingOrUnverified":[x["key"] for x in results if not x["passed"]],"results":results,"warning":"Audit du rapport fourni uniquement; confirmer les preuves par inspection et tests réels."}
