# Hackathon Demo Flows

## 1. Voice → Code → Test → Pull Request

1. **Voice Capture (Frontend)**: Web Speech transcript -> `/api/agents/intent`.
2. **Intent Parser Agent**: classify as `generate_code`.
3. **Retrieval Agent**: `/api/agents/retrieve` -> top contextual chunks.
4. **CodeGen Agent**: `/api/agents/generate` -> candidate code + rationale.
5. **File Manager Agent**: Await user approval -> `/api/agents/file` write to sandbox.
6. **Runner Agent**: `/api/agents/run` -> `npm test` (logs stream via Socket.IO).
7. **Git Agent**: create branch + PR summary (future step) -> show link in UI.

## 2. Debug and Fix Flow

1. User voice: "Tests failing" -> Intent `debug_issue` (same endpoint).
2. Runner Agent reproduces failure -> logs stream to UI.
3. Retrieval Agent fetches failing test file + logs.
4. CodeGen Agent suggests fix diff.
5. File Manager applies patch after approval.
6. Runner Agent re-runs tests; on success notify Git Agent for commit.

## 3. Repo Knowledge Assistant (RAG)

1. Intent recognized as `retrieve_info`.
2. Retrieval Agent returns context chunks.
3. CodeGen Agent switches to explanation mode summarizing context.
4. UI displays citations and provides "Generate follow-up" quick actions.

Each flow is implemented as a watsonx Orchestrate playbook referencing the HTTP tools defined in `/api/agents/*` and the Socket.IO stream channel for live telemetry.
