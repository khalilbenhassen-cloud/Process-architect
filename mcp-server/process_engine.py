"""Deterministic domain engine used by Process Architect and the MCP tools.

This engine provides:
- Structural validation (FR-05)
- Deterministic path simulation with cycle detection (FR-06)
- Process analytics (FR-07)
- Draft functional test case generation (FR-08)
- Requirement and rule traceability matrix (FR-09)
- Markdown and CSV report generation (FR-10)

All calculations are strictly deterministic with no external AI or network dependencies.
"""
from collections import defaultdict, deque
import csv
import io
import re
from typing import Any


def validate_process(process: dict[str, Any]) -> dict[str, Any]:
    """Validate a Process Architect process model and return structural findings."""
    findings: list[dict[str, Any]] = []
    nodes = process.get("nodes", [])
    edges = process.get("edges", [])
    rules = process.get("businessRules", [])

    node_ids = [n.get("id") for n in nodes]
    node_id_set = set(node_ids)

    # 1. Duplicate node IDs
    if len(node_ids) != len(node_id_set):
        seen_n = set()
        duplicates = set()
        for nid in node_ids:
            if nid in seen_n:
                duplicates.add(nid)
            seen_n.add(nid)
        findings.append({
            "code": "DUPLICATE_NODE_ID",
            "severity": "error",
            "message": f"Les identifiants de nœuds doivent être uniques (doublons : {', '.join(duplicates)})."
        })

    # 2. Start and End counts
    starts = [n for n in nodes if n.get("type") == "start"]
    ends = [n for n in nodes if n.get("type") == "end"]
    if len(starts) != 1:
        findings.append({
            "code": "START_COUNT",
            "severity": "error",
            "message": f"Le processus doit contenir exactement un nœud Début (trouvé : {len(starts)})."
        })
    if not ends:
        findings.append({
            "code": "END_MISSING",
            "severity": "error",
            "message": "Le processus doit contenir au moins un nœud Fin."
        })

    outgoing: dict[str, list[dict[str, Any]]] = defaultdict(list)
    incoming: dict[str, list[dict[str, Any]]] = defaultdict(list)
    adjacency: dict[str, list[str]] = defaultdict(list)
    reverse_adjacency: dict[str, list[str]] = defaultdict(list)
    edge_ids: set[str] = set()

    # 3. Edge validation
    for edge in edges:
        eid = edge.get("id")
        if not eid:
            findings.append({
                "code": "EDGE_ID_MISSING",
                "severity": "error",
                "message": "Une arête ne possède pas d'identifiant."
            })
            continue
        if eid in edge_ids:
            findings.append({
                "code": "DUPLICATE_EDGE_ID",
                "severity": "error",
                "message": f"L'identifiant d'arête '{eid}' est dupliqué."
            })
        edge_ids.add(eid)

        src, dst = edge.get("sourceNodeId"), edge.get("targetNodeId")
        if src not in node_id_set or dst not in node_id_set:
            findings.append({
                "code": "BROKEN_EDGE",
                "severity": "error",
                "message": f"L'arête '{eid}' référence un nœud inexistant (source: '{src}', cible: '{dst}')."
            })
            continue

        outgoing[src].append(edge)
        incoming[dst].append(edge)
        adjacency[src].append(dst)
        reverse_adjacency[dst].append(src)

        # Decision branch label check
        src_node = next((n for n in nodes if n.get("id") == src), None)
        if src_node and src_node.get("type") == "decision":
            label = str(edge.get("label", "")).strip()
            if not label:
                findings.append({
                    "code": "DECISION_LABEL_EMPTY",
                    "severity": "error",
                    "message": f"Chaque branche issue d'une décision doit avoir un libellé non vide (arête '{eid}').",
                    "edgeId": eid,
                    "nodeId": src
                })

    # Rule catalog set
    known_rule_ids = {r.get("id") for r in rules if r.get("id")}
    used_rule_ids = set()

    # 4. Node inspections
    for node in nodes:
        nid = node.get("id")
        typ = node.get("type")
        duration = node.get("estimatedDurationMinutes", 0)

        if not isinstance(duration, (int, float)) or duration < 0:
            findings.append({
                "code": "INVALID_DURATION",
                "severity": "error",
                "message": f"Durée invalide pour le nœud '{nid}' (doit être un entier ou nombre >= 0).",
                "nodeId": nid
            })

        if typ != "end" and not outgoing[nid]:
            findings.append({
                "code": "NO_OUTGOING_EDGE",
                "severity": "error",
                "message": f"Le nœud '{nid}' ({node.get('label', typ)}) n'a aucune liaison sortante.",
                "nodeId": nid
            })

        if typ == "decision":
            branches = outgoing[nid]
            if len(branches) < 2:
                findings.append({
                    "code": "DECISION_BRANCH_COUNT",
                    "severity": "error",
                    "message": f"La décision '{nid}' ({node.get('label', 'Décision')}) doit avoir au moins 2 branches sortantes (trouvé : {len(branches)}).",
                    "nodeId": nid
                })
            labels = [str(e.get("label", "")).strip().casefold() for e in branches if str(e.get("label", "")).strip()]
            if len(labels) != len(set(labels)):
                findings.append({
                    "code": "DECISION_LABEL_DUPLICATE",
                    "severity": "error",
                    "message": f"Les branches sortantes de la décision '{nid}' doivent avoir des libellés distincts.",
                    "nodeId": nid
                })

        if typ == "task":
            if not node.get("ownerRole"):
                findings.append({
                    "code": "OWNER_MISSING",
                    "severity": "warning",
                    "message": f"L'étape '{node.get('label', nid)}' n'a pas de rôle responsable (ownerRole).",
                    "nodeId": nid
                })
            if not str(node.get("description", "")).strip():
                findings.append({
                    "code": "DESCRIPTION_MISSING",
                    "severity": "suggestion",
                    "message": f"L'étape '{node.get('label', nid)}' gagnerait à avoir une description détaillée.",
                    "nodeId": nid
                })

        # Track linked rules
        for rid in node.get("ruleIds", []):
            used_rule_ids.add(rid)
            if known_rule_ids and rid not in known_rule_ids:
                findings.append({
                    "code": "UNKNOWN_RULE_REF",
                    "severity": "warning",
                    "message": f"Le nœud '{nid}' référence la règle inconnue '{rid}'.",
                    "nodeId": nid
                })

    # 5. Reachability from Start
    if len(starts) == 1:
        start_id = starts[0].get("id")
        seen_from_start = set()
        queue = deque([start_id])
        while queue:
            cur = queue.popleft()
            if cur in seen_from_start:
                continue
            seen_from_start.add(cur)
            queue.extend(adjacency[cur])

        for node in nodes:
            nid = node.get("id")
            if nid not in seen_from_start:
                findings.append({
                    "code": "UNREACHABLE_NODE",
                    "severity": "warning",
                    "message": f"Le nœud '{nid}' ({node.get('label', node.get('type'))}) n'est pas accessible depuis le début du processus.",
                    "nodeId": nid
                })

    # 6. Reachability to any End
    if ends:
        can_reach_end = set()
        end_queue = deque([e.get("id") for e in ends])
        while end_queue:
            cur = end_queue.popleft()
            if cur in can_reach_end:
                continue
            can_reach_end.add(cur)
            end_queue.extend(reverse_adjacency[cur])

        for node in nodes:
            nid = node.get("id")
            if nid not in can_reach_end:
                findings.append({
                    "code": "CANNOT_REACH_END",
                    "severity": "error",
                    "message": f"Le nœud '{nid}' ({node.get('label', node.get('type'))}) ne peut mener à aucun nœud Fin (impasse).",
                    "nodeId": nid
                })

    # 7. Cycle detection
    visited_state: dict[str, int] = {}  # 0: unvisited, 1: visiting, 2: visited
    has_cycle = False
    cycle_nodes: list[str] = []

    def dfs(curr: str, path: list[str]) -> bool:
        visited_state[curr] = 1
        for nxt in adjacency[curr]:
            if visited_state.get(nxt) == 1:
                cycle_nodes.append(nxt)
                return True
            if visited_state.get(nxt, 0) == 0:
                if dfs(nxt, path + [nxt]):
                    return True
        visited_state[curr] = 2
        return False

    for n in nodes:
        nid = n.get("id")
        if visited_state.get(nid, 0) == 0:
            if dfs(nid, [nid]):
                has_cycle = True

    if has_cycle:
        findings.append({
            "code": "CYCLE_DETECTED",
            "severity": "warning",
            "message": f"Une ou plusieurs boucles (cycles) ont été détectées dans le processus (nœuds de retour : {', '.join(set(cycle_nodes))})."
        })

    # Summary
    errors = sum(1 for f in findings if f["severity"] == "error")
    warnings = sum(1 for f in findings if f["severity"] == "warning")
    suggestions = sum(1 for f in findings if f["severity"] == "suggestion")

    return {
        "valid": errors == 0,
        "summary": {
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
            "totalFindings": len(findings)
        },
        "findings": findings
    }


def simulate_path(process: dict[str, Any], decisions: dict[str, str] | None = None,
                  max_steps: int = 100) -> dict[str, Any]:
    """Simulate a single deterministic path through the process model."""
    decisions = decisions or {}
    validation = validate_process(process)
    if not validation["valid"]:
        return {
            "status": "invalid_model",
            "path": [],
            "branchChoices": [],
            "totalEstimatedMinutes": 0,
            "manualStepCount": 0,
            "stopReason": "Le modèle contient des erreurs structurelles qui empêchent la simulation.",
            "validation": validation
        }

    nodes = {n["id"]: n for n in process.get("nodes", [])}
    outgoing: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in process.get("edges", []):
        outgoing[edge["sourceNodeId"]].append(edge)

    starts = [n["id"] for n in nodes.values() if n.get("type") == "start"]
    if not starts:
        return {
            "status": "invalid_model",
            "path": [],
            "branchChoices": [],
            "totalEstimatedMinutes": 0,
            "manualStepCount": 0,
            "stopReason": "Aucun nœud Début trouvé."
        }

    current = starts[0]
    path: list[str] = []
    path_nodes: list[dict[str, Any]] = []
    branch_choices: list[dict[str, Any]] = []
    total_minutes = 0
    manual_count = 0
    visited_counts: dict[str, int] = defaultdict(int)

    for step_num in range(1, max_steps + 1):
        node = nodes[current]
        visited_counts[current] += 1
        if visited_counts[current] > 2:
            return {
                "status": "blocked",
                "path": path,
                "pathNodes": path_nodes,
                "branchChoices": branch_choices,
                "totalEstimatedMinutes": total_minutes,
                "manualStepCount": manual_count,
                "stopReason": f"Cycle d'exécution interrompu : le nœud '{current}' a été traversé plus de 2 fois."
            }

        path.append(current)
        duration = int(node.get("estimatedDurationMinutes", 0))
        total_minutes += duration
        mode = node.get("executionMode", "unknown")
        if mode in ("manual", "mixed"):
            manual_count += 1

        path_nodes.append({
            "id": current,
            "label": node.get("label", current),
            "type": node.get("type"),
            "ownerRole": node.get("ownerRole"),
            "executionMode": mode,
            "duration": duration
        })

        if node.get("type") == "end":
            return {
                "status": "completed",
                "path": path,
                "pathNodes": path_nodes,
                "branchChoices": branch_choices,
                "totalEstimatedMinutes": total_minutes,
                "manualStepCount": manual_count,
                "stopReason": "Nœud Fin atteint avec succès."
            }

        candidates = outgoing.get(current, [])
        if not candidates:
            return {
                "status": "blocked",
                "path": path,
                "pathNodes": path_nodes,
                "branchChoices": branch_choices,
                "totalEstimatedMinutes": total_minutes,
                "manualStepCount": manual_count,
                "stopReason": f"Le nœud '{current}' n'a aucune transition sortante."
            }

        if node.get("type") == "decision":
            selected = decisions.get(current)
            available_labels = [e.get("label", "") for e in candidates]
            if not selected:
                return {
                    "status": "blocked",
                    "path": path,
                    "pathNodes": path_nodes,
                    "branchChoices": branch_choices,
                    "totalEstimatedMinutes": total_minutes,
                    "manualStepCount": manual_count,
                    "pendingDecisionNodeId": current,
                    "pendingDecisionLabel": node.get("label", current),
                    "availableChoices": available_labels,
                    "stopReason": f"Choix requis au point de décision '{node.get('label', current)}' parmi : {', '.join(available_labels)}."
                }

            matches = [e for e in candidates if e.get("label") == selected]
            if not matches:
                return {
                    "status": "blocked",
                    "path": path,
                    "pathNodes": path_nodes,
                    "branchChoices": branch_choices,
                    "totalEstimatedMinutes": total_minutes,
                    "manualStepCount": manual_count,
                    "stopReason": f"Option '{selected}' invalide pour la décision '{current}'. Choix possibles : {available_labels}."
                }
            chosen_edge = matches[0]
            branch_choices.append({
                "nodeId": current,
                "nodeLabel": node.get("label", current),
                "label": selected,
                "targetNodeId": chosen_edge["targetNodeId"]
            })
            current = chosen_edge["targetNodeId"]
        else:
            chosen_edge = candidates[0]
            current = chosen_edge["targetNodeId"]

    return {
        "status": "step_limit",
        "path": path,
        "pathNodes": path_nodes,
        "branchChoices": branch_choices,
        "totalEstimatedMinutes": total_minutes,
        "manualStepCount": manual_count,
        "stopReason": f"La limite maximale de {max_steps} étapes a été atteinte."
    }


def compute_analytics(process: dict[str, Any]) -> dict[str, Any]:
    """Compute detailed structural and operational metrics for the process (FR-07)."""
    nodes = process.get("nodes", [])
    edges = process.get("edges", [])
    rules = process.get("businessRules", [])

    type_counts: dict[str, int] = defaultdict(int)
    mode_counts: dict[str, int] = defaultdict(int)
    total_duration = 0
    missing_owner_nodes = []
    missing_app_nodes = []
    nodes_with_controls = []
    longest_tasks = []

    for n in nodes:
        t = n.get("type", "unknown")
        type_counts[t] += 1
        m = n.get("executionMode", "unknown")
        mode_counts[m] += 1
        dur = int(n.get("estimatedDurationMinutes", 0))
        total_duration += dur

        if t == "task":
            if not n.get("ownerRole"):
                missing_owner_nodes.append({"id": n["id"], "label": n.get("label", n["id"])})
            if not n.get("application"):
                missing_app_nodes.append({"id": n["id"], "label": n.get("label", n["id"])})
            if n.get("controls"):
                nodes_with_controls.append({"id": n["id"], "label": n.get("label", n["id"]), "controls": n.get("controls")})
            longest_tasks.append({"id": n["id"], "label": n.get("label", n["id"]), "duration": dur})

    longest_tasks.sort(key=lambda x: x["duration"], reverse=True)

    # Decision branches without test case coverage
    outgoing: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for e in edges:
        outgoing[e.get("sourceNodeId")].append(e)

    decisions_summary = []
    for n in nodes:
        if n.get("type") == "decision":
            branches = [e.get("label") for e in outgoing.get(n["id"], [])]
            decisions_summary.append({
                "id": n["id"],
                "label": n.get("label", n["id"]),
                "branchesCount": len(branches),
                "branches": branches
            })

    total_nodes = len(nodes)
    manual_ratio = (mode_counts["manual"] + mode_counts["mixed"]) / total_nodes if total_nodes > 0 else 0

    return {
        "nodesCount": total_nodes,
        "edgesCount": len(edges),
        "rulesCount": len(rules),
        "typeDistribution": dict(type_counts),
        "executionModeDistribution": dict(mode_counts),
        "manualPercentage": round(manual_ratio * 100, 1),
        "totalProcessNominalMinutes": total_duration,
        "missingOwnerCount": len(missing_owner_nodes),
        "missingOwnerNodes": missing_owner_nodes,
        "missingAppCount": len(missing_app_nodes),
        "missingAppNodes": missing_app_nodes,
        "controlledStepsCount": len(nodes_with_controls),
        "decisions": decisions_summary,
        "bottleneckCandidates": longest_tasks[:3]
    }


def draft_test_cases(process: dict[str, Any]) -> dict[str, Any]:
    """Generate draft functional test cases derived from decision branches and business rules (FR-08)."""
    nodes = {n["id"]: n for n in process.get("nodes", [])}
    rules = {r["id"]: r for r in process.get("businessRules", []) if r.get("id")}
    outgoing: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for edge in process.get("edges", []):
        if edge.get("sourceNodeId") in nodes and edge.get("targetNodeId") in nodes:
            outgoing[edge["sourceNodeId"]].append(edge)

    cases = []
    case_idx = 1

    # 1. Test cases per decision branch
    for node in nodes.values():
        if node.get("type") == "decision":
            branches = outgoing.get(node["id"], [])
            for branch_idx, edge in enumerate(branches, start=1):
                label = edge.get("label") or f"branche_{branch_idx}"
                target = nodes.get(edge["targetNodeId"], {})
                linked_rules = [rules[rid] for rid in node.get("ruleIds", []) if rid in rules]
                rule_titles = [r.get("title", rid) for rid, r in zip(node.get("ruleIds", []), linked_rules)]

                objective = f"Vérifier le comportement du processus lorsque la décision '{node.get('label', node['id'])}' produit l'issue '{label}'."
                if rule_titles:
                    objective += f" Contrôle des règles : {', '.join(rule_titles)}."

                cases.append({
                    "id": f"TC-DEC-{node['id']}-{branch_idx}",
                    "title": f"Test décision — {node.get('label', node['id'])} [{label}]",
                    "objective": objective,
                    "preconditions": [
                        "Processus de démonstration actif",
                        f"Dossier positionné à l'étape préalable à '{node.get('label', node['id'])}'",
                        "Jeu de données de test préparé (données fictives)"
                    ],
                    "steps": [
                        f"1. Naviguer jusqu'à l'étape '{node.get('label', node['id'])}'.",
                        f"2. Soumettre les critères provoquant l'évaluation de la branche '{label}'.",
                        f"3. Valider la transition vers '{target.get('label', edge['targetNodeId'])}'."
                    ],
                    "expectedResult": f"La transition est exécutée sans erreur et l'étape suivante est '{target.get('label', edge['targetNodeId'])}'.",
                    "priority": "high" if "refus" in label.casefold() or "incomplet" in label.casefold() or "non" in label.casefold() else "medium",
                    "sourceNodeIds": [node["id"], edge["targetNodeId"]],
                    "ruleIds": node.get("ruleIds", []),
                    "status": "draft",
                    "reviewRequired": True
                })
                case_idx += 1

    # 2. Test cases for critical or unlinked business rules
    for r in process.get("businessRules", []):
        rid = r.get("id")
        linked_nodes = [n["id"] for n in nodes.values() if rid in n.get("ruleIds", [])]
        cases.append({
            "id": f"TC-RULE-{rid}",
            "title": f"Test conformité règle — {r.get('title', rid)}",
            "objective": f"Valider l'application stricte de la règle de gestion {rid} : « {r.get('statement', '')} ».",
            "preconditions": [
                "Environnement de test configuré avec données fictives",
                f"Source de la règle : {r.get('sourceType', 'fictional_assumption')} ({r.get('sourceNote', 'Démonstration')})"
            ],
            "steps": [
                f"1. Préparer un cas de test respectant et un cas enfreignant la règle {rid}.",
                "2. Exécuter l'évaluation sur l'étape concernée.",
                "3. Vérifier le blocage ou le routage selon le résultat."
            ],
            "expectedResult": f"La règle {rid} s'applique avec le niveau de criticité '{r.get('severity', 'medium')}'.",
            "priority": "critical" if r.get("severity") == "critical" else ("high" if r.get("severity") == "high" else "medium"),
            "sourceNodeIds": linked_nodes,
            "ruleIds": [rid],
            "status": "draft",
            "reviewRequired": True
        })

    return {
        "status": "draft",
        "count": len(cases),
        "cases": cases,
        "note": "Cas de test générés à partir de la structure et des règles de gestion. Une revue MOA humaine est requise."
    }


def build_traceability_matrix(process: dict[str, Any], test_cases: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Generate requirement-to-rule-to-node-to-test traceability matrix (FR-09)."""
    nodes = {n["id"]: n for n in process.get("nodes", [])}
    rules = {r["id"]: r for r in process.get("businessRules", []) if r.get("id")}
    requirements = process.get("requirements", [])
    if test_cases is None:
        test_cases = draft_test_cases(process).get("cases", [])

    tests_by_rule: dict[str, list[str]] = defaultdict(list)
    tests_by_node: dict[str, list[str]] = defaultdict(list)
    for tc in test_cases:
        for rid in tc.get("ruleIds", []):
            tests_by_rule[rid].append(tc["id"])
        for nid in tc.get("sourceNodeIds", []):
            tests_by_node[nid].append(tc["id"])

    matrix_rows = []
    rule_ids_covered = set()
    node_ids_covered = set()

    for r in process.get("businessRules", []):
        rid = r.get("id")
        linked_nodes = [nid for nid, n in nodes.items() if rid in n.get("ruleIds", [])]
        linked_tests = list(set(tests_by_rule.get(rid, [])))
        if linked_tests:
            rule_ids_covered.add(rid)

        # find requirements linking to this rule
        linked_reqs = [req.get("id") for req in requirements if rid in req.get("ruleIds", [])]

        matrix_rows.append({
            "requirementIds": linked_reqs or ["Non spécifiée"],
            "ruleId": rid,
            "ruleTitle": r.get("title", rid),
            "ruleSeverity": r.get("severity", "medium"),
            "nodeIds": linked_nodes,
            "nodeLabels": [nodes[nid].get("label", nid) for nid in linked_nodes if nid in nodes],
            "testCaseIds": linked_tests,
            "status": "couvert" if (linked_nodes and linked_tests) else "incomplet",
            "gaps": [
                *(["Aucune étape liée"] if not linked_nodes else []),
                *(["Aucun cas de test lié"] if not linked_tests else [])
            ]
        })

    # Nodes without rules
    for nid, n in nodes.items():
        if n.get("type") in ("task", "decision") and not n.get("ruleIds"):
            matrix_rows.append({
                "requirementIds": ["-"],
                "ruleId": "-",
                "ruleTitle": "(Aucune règle associée)",
                "ruleSeverity": "-",
                "nodeIds": [nid],
                "nodeLabels": [n.get("label", nid)],
                "testCaseIds": tests_by_node.get(nid, []),
                "status": "info",
                "gaps": ["Étape sans règle de gestion formelle"]
            })

    total_rules = len(rules)
    covered_rules = len(rule_ids_covered)
    coverage_rate = round((covered_rules / total_rules * 100), 1) if total_rules > 0 else 100.0

    return {
        "totalRules": total_rules,
        "coveredRules": covered_rules,
        "coverageRate": coverage_rate,
        "matrix": matrix_rows
    }


def export_markdown_report(process: dict[str, Any], validation: dict[str, Any] | None = None,
                            analytics: dict[str, Any] | None = None) -> str:
    """Generate a comprehensive Markdown analysis report for Business Analysts / sponsors (FR-10)."""
    if validation is None:
        validation = validate_process(process)
    if analytics is None:
        analytics = compute_analytics(process)

    name = process.get("name", "Processus sans titre")
    version = process.get("version", "1.0.0")
    lifecycle = process.get("lifecycleState", "draft")
    owner = process.get("owner", "Non renseigné")
    nodes = process.get("nodes", [])
    edges = process.get("edges", [])

    lines = [
        f"# Rapport d'analyse de processus — {name}",
        "",
        "> **Avertissement légal et méthodologique** : Ce document a été produit par Process Architect sur la base de données et de règles strictement fictives à des fins de démonstration MOA / Business Analysis. Il ne constitue aucunement une référence réglementaire ou contractuelle officielle.",
        "",
        "## 1. Fiche d'identité du processus",
        f"- **Nom du processus** : {name}",
        f"- **Identifiant** : `{process.get('id', 'N/A')}`",
        f"- **Version** : {version}",
        f"- **État de cycle de vie** : `{lifecycle}`",
        f"- **Modèle** : `{process.get('modelState', 'to_be')}`",
        f"- **Responsable MOA** : {owner}",
        f"- **Description** : {process.get('description', 'Non spécifiée.')}",
        "",
        "## 2. Synthèse métrique et structurelle",
        f"- **Nombre total de nœuds** : {analytics.get('nodesCount', len(nodes))}",
        f"- **Nombre de liaisons (arêtes)** : {analytics.get('edgesCount', len(edges))}",
        f"- **Règles de gestion documentées** : {analytics.get('rulesCount', 0)}",
        f"- **Taux d'activités manuelles/mixtes** : {analytics.get('manualPercentage', 0)} %",
        f"- **Durée nominale cumulée estimée** : {analytics.get('totalProcessNominalMinutes', 0)} minutes",
        "",
        "### Répartition des types d'étapes",
    ]

    for typ, cnt in analytics.get("typeDistribution", {}).items():
        lines.append(f"- **{typ}** : {cnt}")

    lines.extend([
        "",
        "## 3. Résultats de validation formelle",
        f"Statut : **{'CONFORME' if validation.get('valid') else 'NON CONFORME'}** "
        f"({validation.get('summary', {}).get('errors', 0)} erreurs, "
        f"{validation.get('summary', {}).get('warnings', 0)} avertissements)",
        ""
    ])

    if not validation.get("findings"):
        lines.append("Aucune anomalie détectée dans le modèle.")
    else:
        lines.append("| Sévérité | Code | Nœud/Arête | Message |")
        lines.append("| :--- | :--- | :--- | :--- |")
        for f in validation.get("findings", []):
            target = f.get("nodeId") or f.get("edgeId") or "-"
            sev = f.get("severity", "info").upper()
            msg = f.get("message", "").replace("|", "\\|")
            lines.append(f"| {sev} | `{f.get('code')}` | `{target}` | {msg} |")

    lines.extend([
        "",
        "## 4. Points d'attention et goulots d'étranglement potentiels",
    ])

    bottlenecks = analytics.get("bottleneckCandidates", [])
    if bottlenecks:
        for b in bottlenecks:
            lines.append(f"- **{b['label']}** (`{b['id']}`) : durée estimée de {b['duration']} min.")
    else:
        lines.append("Aucun goulot d'étranglement majeur identifié.")

    if analytics.get("missingOwnerNodes"):
        lines.append("\n### Étapes sans rôle responsable désigné :")
        for mo in analytics.get("missingOwnerNodes", []):
            lines.append(f"- {mo['label']} (`{mo['id']}`)")

    lines.extend([
        "",
        "## 5. Limites et recommandations pour la MOA",
        "1. Les durées sont indicatives et reposent sur des estimations initiales.",
        "2. Les règles métier doivent être formellement auditées avec les experts métier avant toute implémentation informatique.",
        "3. Les cas de test générés ont valeur de brouillons d'aide à la conception et requièrent une validation humaine."
    ])

    return "\n".join(lines)


def sanitize_csv_cell(value: Any) -> str:
    """Protect CSV cells against formula injection vulnerability (FR-10 / Security)."""
    text = str(value if value is not None else "")
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


def export_test_cases_csv(test_cases: list[dict[str, Any]]) -> str:
    """Export draft test cases as safe UTF-8 CSV with formula injection mitigation."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    headers = [
        "ID_Test",
        "Titre",
        "Priorite",
        "Statut",
        "Objectif",
        "Preconditions",
        "Etapes",
        "Resultat_Attendu",
        "Etapes_Sources",
        "Regles_Associees"
    ]
    writer.writerow(headers)

    for tc in test_cases:
        row = [
            sanitize_csv_cell(tc.get("id", "")),
            sanitize_csv_cell(tc.get("title", "")),
            sanitize_csv_cell(tc.get("priority", "medium")),
            sanitize_csv_cell(tc.get("status", "draft")),
            sanitize_csv_cell(tc.get("objective", "")),
            sanitize_csv_cell(" | ".join(tc.get("preconditions", []))),
            sanitize_csv_cell(" \n".join(tc.get("steps", []))),
            sanitize_csv_cell(tc.get("expectedResult", "")),
            sanitize_csv_cell(", ".join(tc.get("sourceNodeIds", []))),
            sanitize_csv_cell(", ".join(tc.get("ruleIds", [])))
        ]
        writer.writerow(row)

    return output.getvalue()
