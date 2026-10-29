---
feature: REVIEWER-APPROVAL-FLOW
stage: spec
status: accepted
branch: main
---

# Spec: reviewer approval flow

## Requirements

1. Production profiles use ask-destructive so allowed read-only and safe commands pass without review or elicitation.
2. A reviewer is called for deterministically approved destructive and privileged commands that still need a decision; safe commands under ask-all retain their existing review behavior.
3. A completed reviewer approval permits a destructive command without human elicitation. Reviewer denial, escalation or unavailability requires fresh human approval; privileged commands remain human-only.
4. Deterministic policy, OPA, quota, audit and reviewer-disabled behavior retain their existing gates.
5. Evaluation reports reflect the new production authorization path.
6. On the operator's later authorization, rebuild and restart the local Compose services with the Kimi settings from `.env.kimi`, preserving SSH settings, and verify runtime health and policy without executing remote SSH commands.

## Design

The production profile policy changes to ask-destructive. The tool pipeline skips review when deterministic policy already allows a read-only or safe command. The review merge accepts completed approvals for destructive operations; its existing denial and escalation branches continue to require fresh human approval. Privileged commands keep their existing human-only branch. See ADR-004.

## Affected modules

Production TOML, tool pipeline, reviewer decision merge, evaluation runner, tests and operator documentation. There is no matching document under docs/architecture/.

## Trade-offs and concerns

Reviewer mistakes on destructive commands can now execute high-impact operations without a human. This reverses the ADR-003 safety boundary at the user's request. The classifier's safe label is also imperfect: skipping review for safe commands removes a second contextual check. Runtime rollout requires a separate service restart.

## Related ADRs

ADR-004 supersedes the relevant approval boundary in ADR-003.

## Acceptance criteria

Tests prove read-only and safe bypass reviewer, destructive approve executes without prompt, destructive deny/escalate/unavailable requires fresh approval, and deterministic denials plus privileged behavior remain unchanged. Evaluation metrics distinguish the effective production gate. The local deployment reports healthy services, six `ask-destructive` profiles, and a completed synthetic review from the configured Kimi model.
