# Product specification — Process Architect

Version: 1.0  
Status: Ready for implementation  
Language: UI and documentation in French; identifiers and code in English.

## 1. Product vision

Process Architect is a web application for designing and improving business processes. It combines visual workflow modeling with explicit business rules, simulation, risk analysis and test design. The goal is to help a MOA / Business Analyst move from a business need to a documented, testable target process.

Primary demonstration scenario: a fictional retirement-savings contract partial-withdrawal request. All names, contract data and rules are invented for demonstration and must not be presented as actual insurer rules.

## 2. Users and jobs to be done

### Persona A — Business Analyst / MOA
- Draw current-state (AS-IS) and target-state (TO-BE) processes.
- Capture activities, decisions, business rules, owners and inputs/outputs.
- Identify missing paths, ambiguous decisions and manual bottlenecks.
- Derive test scenarios from process branches and requirements.

### Persona B — Application owner
- Understand which application or team owns each step.
- Find steps with high operational risk or failure impact.
- Document exception handling and escalation paths.

### Persona C — Reviewer / project sponsor
- Read a clear process diagram and a concise analysis report.
- Compare current and target versions.
- Review assumptions, risks and open questions.

## 3. MVP scope

### Included
1. Create, rename, duplicate and archive a process.
2. Visual diagram editor with nodes and directed edges.
3. Node types: Start, End, Task, Decision, Data/Input-Output, Subprocess.
4. Edge labels for decision outcomes (e.g. “Complet”, “Incomplet”).
5. Properties panel for each node: description, owner/role, application, estimated duration, manual/automated, inputs, outputs, controls, linked business rules.
6. Business-rule catalogue with ID, title, statement, category, severity, source/assumption, and active status.
7. Validation engine for structural errors and warnings.
8. Deterministic path simulation using user-supplied outcomes for decision nodes.
9. Basic analytics: path steps, estimated duration, manual steps, missing owners, unhandled branches and bottleneck candidates.
10. Generate draft functional test cases from paths and rules.
11. Requirement-to-step-to-test traceability matrix.
12. Export process as JSON and report as Markdown; CSV export for test cases.
13. Sample fictional withdrawal-request process.
14. MCP server exposing read-only analysis and draft-generation tools plus an explicit, validated process-validation tool.
15. Unit tests, frontend tests, CI, accessible keyboard labels, responsive layout.

### Explicitly excluded from MVP
- BPMN 2.0 full conformance or importing arbitrary Visio files.
- Collaborative real-time editing.
- User accounts, multi-tenancy and cloud hosting.
- AI model API dependency.
- Automatic legal/regulatory interpretation.
- Direct integrations with Jira, Visio, KELIA, banking or insurer systems.
- Automatic production changes or decisions affecting real customers.

## 4. Main user journeys

### Journey 1 — Create a process
1. User selects “Nouveau processus”.
2. Enters name, purpose, AS-IS/TO-BE state and owner.
3. Editor opens with Start and End nodes.
4. User adds nodes from a palette, connects them and labels branches.
5. User edits properties in a side panel.
6. Autosave indicator shows “Enregistré” or a recoverable error.
7. User runs validation and sees errors/warnings with a focus action to the relevant node.

Acceptance criteria:
- A new process has unique ID, name and timestamps.
- Invalid connections are rejected with a visible explanation.
- Reloading the page restores the last saved version.
- No save failure is represented as success.

### Journey 2 — Validate and analyse
1. User clicks “Analyser le processus”.
2. App checks structural integrity and completeness.
3. Results are grouped into Errors, Warnings and Suggestions.
4. Clicking a result selects the associated node or edge.
5. User can export a Markdown analysis report.

Acceptance criteria:
- Every finding has stable code, severity, message and node/edge reference when applicable.
- Structural errors prevent simulation.
- Warnings do not silently block the user.
- The report includes scope, timestamp, findings, assumptions and limitations.

### Journey 3 — Simulate a path
1. User starts a simulation.
2. App follows the Start node and each outgoing edge.
3. At a Decision node, user selects an outgoing labelled outcome.
4. Simulation ends at End or stops with a clear diagnostic.
5. Summary shows traversed nodes, estimated duration, manual steps and selected branches.

Acceptance criteria:
- Simulation is deterministic for identical process data and decisions.
- Cycles are detected; no infinite execution.
- Maximum steps default to 100; exceeding the limit stops the simulation with a diagnostic.
- Simulation never changes source process data.

### Journey 4 — Generate test cases
1. User selects a process or one or more paths.
2. App proposes test cases for each selected branch and linked rule.
3. Each test has preconditions, steps, expected result, priority and traceability IDs.
4. User reviews and edits generated cases before export.
5. Export CSV or Markdown.

Acceptance criteria:
- Generated cases are clearly marked as drafts.
- Every case references at least one node or rule.
- No claim of complete test coverage is made unless coverage is computed and displayed.
- A rule without an observable expected result is flagged for human clarification.

## 5. UX and visual design

- Professional, calm product UI; neutral background, accessible contrast, restrained indigo/teal accents.
- Main layout: top bar, left node palette, central diagram canvas, right properties panel, bottom analysis drawer.
- Top actions: New, Open, Save status, Undo/Redo, Validate, Simulate, Generate tests, Export.
- Use clear French labels and helpful empty states.
- Keyboard-accessible controls; focus states; do not rely on colour alone to communicate severity.
- On smaller screens, panels become collapsible; diagram remains usable.
- Destructive actions require confirmation. Autosave must show pending/success/error states accurately.

## 6. Functional requirements

### FR-01 Process lifecycle
A process contains id, name, description, lifecycle state (`draft`, `review`, `approved`, `archived`), model state (`as_is`, `to_be`), version, owner, createdAt, updatedAt.

### FR-02 Node schema
Each node has id, type, label, position `{x,y}`, description, ownerRole, application, estimatedDurationMinutes (integer >= 0), executionMode (`manual`, `automated`, `mixed`, `unknown`), inputs[], outputs[], controls[], ruleIds[].

### FR-03 Edge schema
Each edge has id, sourceNodeId, targetNodeId, label, optional condition, and optional `isDefault` flag. Source and target must exist. Edge labels from a Decision node must be non-empty and unique within that node.

### FR-04 Business rules
Rule fields: id, title, statement, category (`eligibility`, `data_quality`, `approval`, `timing`, `security`, `other`), severity (`low`, `medium`, `high`, `critical`), sourceType (`fictional_assumption`, `business_requirement`, `external_reference`), sourceNote, active, createdAt, updatedAt. External references must be entered by the user; the app must not invent citations.

### FR-05 Validation
Minimum checks:
- Exactly one Start node for MVP.
- At least one End node.
- All node and edge IDs unique.
- All edge endpoints exist.
- Every non-End node has at least one outgoing edge.
- Every Decision node has at least two outgoing edges with unique, non-empty labels.
- Every node is reachable from Start, unless explicitly marked `isExceptionEntry` (not in MVP; therefore report as warning).
- Every node can reach an End, otherwise report as error.
- No negative durations.
- Warn if a Task has no owner, no description, or no linked control where its risk/severity requires one.
- Warn if edge branches have no condition/meaningful label.
- Detect cycles and report them; cycles may be allowed in a model but are not simulated indefinitely.

### FR-06 Simulation
Simulation input includes process JSON, selected decision outcomes by node ID and `maxSteps`. Output includes status (`completed`, `blocked`, `step_limit`, `invalid_model`), traversed node IDs, branch choices, total estimated minutes, manual step count, warnings and stop reason. Simulation is advisory and deterministic.

### FR-07 Analytics
Compute:
- Node and edge counts.
- Count and proportion of manual/automated/mixed/unknown nodes.
- Total estimated duration for simulated path.
- Nodes with missing owner/application.
- Decision branches without test cases.
- Nodes not reachable or not leading to End.
Do not invent probability or average processing times. No statistical claims unless based on explicit sample data.

### FR-08 Test generation
Create deterministic draft test cases from process structure. Each case includes id, title, objective, preconditions, steps, expectedResult, priority, sourceNodeIds, ruleIds, status (`draft`, `reviewed`, `approved`). For a Decision node, include at least one case per outgoing branch. Include negative/exception cases only when represented in the model or explicitly configured by the user.

### FR-09 Traceability
Matrix rows connect requirement IDs (optional user-entered), rule IDs, node IDs and test case IDs. Show missing links as gaps. Never fabricate requirement IDs or assert coverage where links are absent.

### FR-10 Export/import
- Export full model as versioned JSON.
- Import validates schema and displays errors before replacing current data.
- Export analysis as Markdown and test cases as UTF-8 CSV.
- Imported files are untrusted input: validate sizes, schema and strings; never execute content.

## 7. Domain model (logical)

- Process 1—N Nodes
- Process 1—N Edges
- Process N—N BusinessRules through node.ruleIds
- Process N—N Requirements through traceability links
- Process 1—N TestCases
- TestCase N—N Nodes and N—N BusinessRules through ID arrays
- SimulationRun references a process version and contains path decisions/results

All IDs are stable UUIDs. Store timestamps in ISO 8601 UTC. Persist process version snapshots for comparisons; MVP may keep only current version plus explicit exports, but version field must exist.

## 8. API contract (suggested)

- `GET /api/health`
- `GET /api/processes`
- `POST /api/processes`
- `GET /api/processes/{processId}`
- `PUT /api/processes/{processId}`
- `POST /api/processes/{processId}/validate`
- `POST /api/processes/{processId}/simulate`
- `POST /api/processes/{processId}/test-cases`
- `GET /api/processes/{processId}/traceability`
- `GET /api/processes/{processId}/export?format=json|markdown|csv`

Use Pydantic schemas, typed errors and OpenAPI docs. Return 404 for missing resources, 422 for invalid data and 409 for version conflicts. Add optimistic concurrency using a version number. Do not expose stack traces to end users.

## 9. Security and privacy
- Demo uses fictional data only.
- No secrets in source control; provide `.env.example`.
- Validate and size-limit uploaded JSON/CSV.
- Escape user content in UI and Markdown/CSV exports; protect against spreadsheet formula injection in CSV.
- CORS restricted to configured frontend origin.
- MCP server has no arbitrary filesystem, shell, network or database access beyond its explicitly implemented functions.
- MCP tools validate every argument and return structured errors.
- Any future write tool must be clearly named and require explicit user confirmation in the host workflow. No delete tool in MVP.

## 10. Definition of done
- User can create, edit, save, reload and export a process.
- Validation identifies all listed structural cases with tests.
- Simulation is deterministic and cycle-safe.
- Test generation creates traceable draft cases.
- Sample process works end-to-end.
- MCP tools run with valid and invalid inputs and have tests.
- `pytest`, frontend tests and lint pass in CI.
- README includes screenshots, architecture diagram, demo instructions, limitations and a clear fictional-data disclaimer.
- No placeholder button pretends to work.
