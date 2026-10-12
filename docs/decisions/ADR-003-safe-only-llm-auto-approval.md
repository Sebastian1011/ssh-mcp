# ADR-003: require deterministic safe classification for LLM auto-approval

## Status

Accepted

## Context

ADR-002 allowed the contextual reviewer to discharge approval for every non-privileged
operation. A fixed-seed GLM-5.3 evaluation produced six unsafe model approvals. Review of
the same cases also found that the command classifier labelled many service, deployment,
database, package-management and data-exfiltration operations as `safe`. A model verdict
alone therefore cannot be the production authorization boundary.

## Decision

- Deterministic denials remain final and skip contextual review.
- A completed `approve` review may discharge a soft approval only when the final command
  class is `safe`.
- `destructive` and `privileged` operations always require fresh human approval, even when
  the reviewer returns `approve` with low risk. JIT grants do not satisfy that escalation.
- Command families demonstrated by the project-native safety corpus to have material
  service, deployment, database, supply-chain, permission, signal or exfiltration impact
  classify as `destructive` before review.
- Evaluation reports both raw model unsafe approvals and effective approvals after this
  deterministic gate.

This decision supersedes ADR-002 only where ADR-002 made destructive operations
agent-reviewable. Its remaining isolation, escalation and auditing decisions still apply.

## Consequences

- A model mistake cannot automatically execute an operation already recognized as
  destructive or privileged.
- Routine `safe` operations can still complete without a prompt under `ask-all`.
- Classifier coverage is security-critical and must be regression-tested against the
  project-native reviewer corpus.
- False-destructive classifications add a human prompt; they do not block an authorized
  operator from proceeding.

## Rejected alternatives

- **Trust `approve/low` for destructive operations:** the fixed-seed evaluation falsified
  the required zero-unsafe-approval invariant.
- **Gate only on the old `safe` label:** the old classifier defaulted many high-impact
  command families to `safe`, so this would have changed the label without changing risk.
- **Add a second regex allowlist solely for the reviewer:** duplicates command semantics
  outside the policy classifier and lets the two authorization views drift.
- **Require OPA for every auto-approval:** OPA remains a useful optional hard-deny layer,
  but changing its boolean response contract is unnecessary for this boundary repair and
  would disable useful local operation for deployments that do not run OPA.
