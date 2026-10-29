---
feature: REVIEWER-ANTHROPIC
stage: spec
status: accepted
branch: main
---

# Spec: Anthropic Messages reviewer protocol

## Requirements

1. `LLM_PROTOCOL=anthropic` sends a non-streaming Messages request to `<LLM_BASE_URL>/v1/messages` with the Anthropic version and API key headers.
2. The request carries the existing system prompt and redacted user payload, supplies `max_tokens` and the existing JSON Schema as structured-output format, and has no tools.
3. The sidecar extracts a single text response while ignoring thinking blocks, then applies the existing strict review schema and failure categories.
4. Chat Completions and Responses behavior remains compatible.
5. `.env.kimi` contains the Anthropic endpoint for the account region and protocol while retaining its existing model and key.
6. The opt-in evaluation runs against Kimi on the same fixed selection as the prior DeepSeek run, with raw outcomes and aggregate metrics recorded locally.

## Design

Add a third wire-format branch in the reviewer sidecar. Use standard Anthropic Messages headers and response envelopes. Keep request validation, model-review parsing, output bounds, and fail-closed handling shared across all protocols. The evaluator continues to use its existing env-file and sidecar path.

## Affected modules

- `src/reviewer/sidecar.ts`: protocol request and response handling.
- `test/unit/reviewer/sidecar.test.ts`: wire-format and failure tests.
- `README.md`: operator configuration example.
- `.env.kimi`: local opt-in evaluation configuration.

The repository has no `docs/architecture/` directory. The sidecar boundary is described in ADR-001, as superseded by ADR-002.

## Trade-offs and concerns

Anthropic Messages uses `output_config.format` with a JSON Schema instead of OpenAI's `json_object` response format. The shared strict validator still rejects invalid output. Kimi may emit long thinking content, so response and timeout limits can affect availability.

## Related ADRs

ADR-001 and ADR-002 govern the sidecar and review authority. No new architectural decision is introduced.

## Acceptance criteria

- Unit tests prove URL, headers, request shape, thinking-block extraction, and malformed-envelope handling.
- Build and reviewer tests pass.
- A live Kimi smoke call works, then the fixed 300-case evaluation completes or exposes a concrete provider limitation.
