# ADR-004: permit reviewer approval for destructive commands

## Status

Accepted

## Context

Production profiles used `ask-all`, so routine read-only and safe commands consumed model calls. ADR-003 required human approval for every destructive command, including those the reviewer approved. The operator requested fewer prompts and lower model cost: allow deterministic read-only and safe commands immediately, and allow the reviewer to approve destructive commands.

ADR-003 documented six unsafe model approvals in a fixed-seed GLM-5.3 evaluation. Permitting reviewer approval for destructive commands accepts that false approval risk. The reviewer evaluation's production auto-approval metric must now expose it rather than masking it behind a safe-only gate.

An offline replay of the existing Kimi v5 holdout results against this gate found 38 of 117 completed `mustNotApprove` cases would be automatically allowed: 36 classified `safe`, one `read-only`, and one model-approved `destructive`. Nineteen of these cases use POSIX shell syntax, including audit-log mutation and credential export. These are corpus labels and a classifier/reviewer simulation, not proof of successful execution on a configured host; some commands are platform-specific or may fail input validation. They show why this change must not be treated as a proven safe production rollout.

## Decision

- Production profiles use `ask-destructive`.
- Commands allowed by deterministic policy as read-only or safe skip reviewer and human approval. Denylist, role/read-only restrictions, freeze windows, optional OPA and quota still apply first.
- Authorized destructive commands go to reviewer. A completed `approve` permits execution; `deny`, `escalate` and unavailable review require fresh human approval. Earlier JIT grants never satisfy these escalations.
- Privileged commands retain their role restrictions and human-only approval. Deterministic denials remain final.
- Evaluation reports the effective auto-approval rate for this gate, including false reviewer approvals of destructive commands and direct approval of safe/read-only commands. Its model-only sample is not a complete simulation of role bindings, OPA or all runtime profile settings.

This supersedes ADR-003's safe-only reviewer approval boundary. Its classifier hardening remains in force.

## Consequences

Routine allowed commands incur no model cost or approval delay. A model false approval of an authorized destructive command can execute without a human. The classifier's `safe` fallback also runs without contextual review. Operators must use deterministic policy restrictions for commands that must never be automated, and review measured unsafe approvals before production rollout.
