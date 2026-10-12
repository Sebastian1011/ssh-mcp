---
feature: LLM-COMMAND-REVIEW
stage: spec
status: accepted
branch: feat/llm-command-review
---

# Spec: contextual review for non-read-only operations

## Requirements

1. Review is disabled unless an operator configures a valid HTTP(S) reviewer URL.
2. Local policy and OPA denials remain final and do not call the reviewer.
3. Every policy-allowed operation whose final command class is not `read-only` is reviewed,
   except session release, which remains non-refusable.
4. A completed review returns `approve`, `deny` or `escalate`: approve may discharge a
   soft approval only for a deterministically `safe` operation; deny recommends rejection
   and requires a human; escalate also requires a human. No LLM verdict is a final refusal.
5. Review can never change a deterministic deny. Destructive and privileged operations
   remain human-only even when review says approve.
6. Reviewer-escalated and human-only approvals are never satisfied by a JIT grant.
7. Review input contains a redacted command, tool, class and host tier, but no SSH
   credentials, host address, remote user, stdin, output or file content.
8. Review status and bounded, redacted findings appear in the approval and audit records.
9. The reviewer runs as an unprivileged, unpublished sidecar using an OpenAI-compatible
   Chat Completions or Responses model endpoint and has no SSH or audit mounts.
10. Existing configuration and audit records remain compatible when review is disabled.
11. Operators may configure deterministic weekly freeze windows by host group, IANA time
    zone and weekday/time range; non-read-only operations in an active window are denied
    before OPA or reviewer calls. Windows may cross midnight and no schedule is assumed.
12. A versioned JSONL evaluation set covers approve, escalate and deny outcomes, including
    project-specific operations and adversarial command text.
13. A live evaluation runner is opt-in, never executes reviewed commands, preserves raw
    per-attempt results and reports unsafe auto-approval, safe false-escalation, exact
    verdict/risk, availability, consistency and latency metrics.
14. Evaluation validates all cases before the first provider call, supports bounded limits,
    repeats and concurrency, and never logs provider credentials.
15. The complete pinned external corpus is stored offline with its upstream revision,
    split hashes, license declaration and a deterministic dataset fingerprint.
16. Each evaluation draws a bounded sample stratified by expected verdict and external
    context dimensions, while retaining a configurable project-native core allocation.
17. Sampling generates a random seed when none is supplied and records that seed, the
    selection fingerprint and every selected case ID so any run can be reproduced exactly.
18. Context-dependent external rows remain in the complete corpus but are excluded from
    default scoring when the reviewer request cannot represent the required context.
19. Unavailable reviews return and persist a stable, non-sensitive failure category and,
    only for upstream HTTP failures, the numeric upstream status; raw provider/model text,
    credentials and endpoint details remain suppressed.
20. Sidecar failure responses retain the generic error string for compatibility and add a
    safe human-readable message that explains the stable failure category.
21. The sidecar derives the output JSON Schema from the same Zod validator used at the
    trust boundary and includes it in the fixed prompt; semantic verdict/risk pair rules
    remain explicit text because JSON Schema does not encode the refinement.
22. Invalid model schema responses add bounded issue and field codes that are persisted and
    summarized by evaluation without exposing rejected values or raw model output.
23. Live evaluation derives the command class with the production classifier, refuses
    project-native class drift, and reports raw model unsafe approval separately from
    effective unsafe and safe auto-approval after the `safe`-only production gate.

## Design

The pipeline injects an optional `CommandReviewer` after `evaluateWithOpa`. The HTTP
implementation sends a versioned request to `POST /v1/review` and maps a strict response
to a bounded internal `ReviewResult`. Transport or validation failures create an
`unavailable` result rather than throwing past the policy gate.

The merge is a pure function. A deterministic `deny` is returned unchanged. On a `safe`
operation, approve returns allow with an LLM approver; reviewer deny, escalate and
unavailable all require fresh human approval with distinct rule identifiers. Destructive
and privileged operations are human-only: approve preserves or raises human approval.
The pipeline carries the review verdict into elicitation and audit; every remaining prompt
bypasses the JIT grant cache.

Freeze windows are part of deterministic policy and use an injectable clock. They are
checked after command classification and denylist matching but before approval, OPA and
review. Invalid time zones and malformed/equal time ranges fail configuration loading.

The sidecar accepts only JSON with `schemaVersion: 2`, bounds request and response bodies,
and calls a configured OpenAI-compatible Chat Completions or Responses endpoint once with
no retry or tools. Chat Completions remains the default for compatibility. It uses JSON
mode and includes a JSON Schema generated from its Zod validator in the fixed prompt. The
semantic verdict/risk pairs are stated separately. It returns an error for malformed
content rather than repairing it, and treats the command as untrusted data.

The evaluation runner sends the same versioned request contract to either an existing
reviewer URL or an ephemeral in-process sidecar. Dry-run is the default; live calls require
an explicit flag. The gold set accepts multiple allowed verdicts/risks where human review
is an acceptable safety outcome, while separately marking cases that must never be
auto-approved. External synthetic examples are a seed source, not a replacement for the
project-specific expectations stored beside them.

The project-native core remains readable JSONL. The complete pinned external source is
stored as deterministic gzip plus a manifest so normal evaluation is offline without
inflating the working tree with an uncompressed third-party corpus. The runner converts
compatible rows to reviewer cases, allocates verdict-balanced quotas, and round-robins
hash-shuffled split/shell/category/reason strata. A seed controls all ordering; selection
metadata is persisted before result rows.

The sidecar classifies failures at trust boundaries: upstream HTTP/network/timeout,
response size/envelope/output extraction, model JSON/schema/semantic consistency and
unexpected internal failure. The public 502 remains fail-closed: it keeps the generic
compatibility string and adds a bounded category, safe explanatory message and optional
numeric upstream status. Evaluation artifacts copy only bounded diagnostic fields.
Schema validation failures additionally expose only a fixed-vocabulary issue and field
code; rejected field names outside the public schema and rejected values remain private.

## Affected modules

- Policy-gated tool pipeline and MCP approval path.
- Audit record types, redaction and tracing.
- CLI/bootstrap configuration and MCP package manifest.
- Docker image and Compose deployment.
- README security and operations documentation.
- Opt-in reviewer evaluation data, runner, metrics and raw-result artifacts.

No `docs/architecture/` document currently exists for these modules.

## Trade-offs and concerns

- OpenAI-compatible HTTP supports cloud and local backends through either Chat Completions
  or Responses, at the cost of maintaining two small request/response adapters.
- Always-on redaction protects secrets but can remove context useful to the model.
- Failure-to-approval preserves availability better than hard denial while preventing
  silent automatic execution.
- No shadow mode keeps the first release smaller; operators can disable review but cannot
  collect advisory-only results.
- Reviewer denial still costs human attention, but cannot block legitimate work without a
  person confirming the refusal by declining the approval prompt.
- Autonomous approval reduces prompts but is bounded by role permissions, hard rules,
  freeze windows and the `safe` command class. Destructive and privileged classes are
  human-only.
- Session release is intentionally excluded because refusing it can leave a remote command
  running.
- Live model scores are provider-, model- and prompt-version specific. They are recorded as
  evidence but do not replace deterministic policy tests or become a required CI check.
- Random sampling improves coverage over time but makes individual scores incomparable
  unless their seed and dataset revision match; fixed seeds are required for release
  comparisons.

## Related ADRs

- [ADR-001: isolate contextual command review behind a sidecar](../../decisions/ADR-001-llm-reviewer-sidecar.md)
- [ADR-002: bounded autonomous LLM command decisions](../../decisions/ADR-002-bounded-llm-command-decisions.md)
- [ADR-003: require deterministic safe classification for LLM auto-approval](../../decisions/ADR-003-safe-only-llm-auto-approval.md)

## Acceptance criteria

- Type checking, unit/property, integration and end-to-end suites pass.
- Tests prove hard denials cannot be widened, approve discharges only `safe` soft
  approvals, reviewer deny/escalation/failure prompt freshly, and destructive and
  privileged operations remain human-only.
- Tests prove freeze windows, cross-midnight behavior, time zones, invalid configuration,
  read-only exemption and reviewer short-circuiting.
- A deterministic fake model covers the sidecar's success and failure contract.
- Both Docker targets build and Compose validates without publishing the reviewer port.
- The evaluation dataset validates without network access and contains balanced approve,
  escalate and deny expectations plus prompt-injection cases.
- A bounded live smoke run against a real provider produces raw results and summary metrics
  without executing any reviewed command.
- Tests prove equal seeds select equal cases, different seeds change the sample, verdict
  quotas remain balanced, and raw metadata is sufficient to reproduce a selection.
