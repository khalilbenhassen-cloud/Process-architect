# Implementation plan

## Milestone 0 — Repository foundations
- Create frontend and backend directories.
- Add formatting, linting, type checking and CI.
- Add `.env.example`, `.gitignore`, license and contribution guide.
- Define shared JSON schema and sample data.

Exit criteria: project starts locally; CI runs; no secrets tracked.

## Milestone 1 — Domain engine
- Implement Pydantic domain models.
- Implement process validation.
- Implement deterministic path simulation with cycle/step-limit protection.
- Implement analytics.
- Add unit tests for valid model, missing start/end, broken edge, bad decision labels, unreachable nodes, cycles and invalid duration.

Exit criteria: domain functions run without frontend or AI dependencies.

## Milestone 2 — Process editor
- Build responsive React UI.
- Add React Flow canvas, node palette, edge labels and properties inspector.
- Create/save/load process through API.
- Implement undo/redo if feasible; if deferred, document it.
- Add sample process.

Exit criteria: user can model and persist the sample process.

## Milestone 3 — Analysis and test design
- Add validation drawer and click-to-focus findings.
- Add simulation path selector and results.
- Generate draft test cases from branches/rules.
- Add traceability view and exports.

Exit criteria: demo scenario can be modelled, analysed, simulated and exported.

## Milestone 4 — MCP integration
- Implement tools in `mcp-server/server.py`.
- Reuse domain logic where practical; avoid a second divergent implementation.
- Expose read-only resources for product instructions and sample process.
- Validate inputs and test tool handlers.
- Document client configuration and permissions.

Exit criteria: compatible MCP client can list tools, validate a supplied process JSON, analyse it and draft test cases.

## Milestone 5 — Portfolio polish
- Add screenshot/GIF of workflow.
- Add architecture and sequence diagrams.
- Add a sample analysis report and sample test CSV.
- Add accessibility and responsive checks.
- Add GitHub Actions CI for backend and frontend.
- Write a French case study: problem, approach, trade-offs, results, limitations.

## Suggested 3-week schedule
Week 1: domain models, validation, simulation, unit tests.
Week 2: diagram editor, save/load, sample workflow.
Week 3: test generation, exports, MCP tools, README and screenshots.

## Prioritisation rule
If time is limited, prioritise a reliable end-to-end scenario over breadth: create sample process → validate → simulate one branch → generate tests → export report.
