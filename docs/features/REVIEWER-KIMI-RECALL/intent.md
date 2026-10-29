---
feature: REVIEWER-KIMI-RECALL
stage: intent
status: accepted
branch: main
---

# Intent: improve Kimi reviewer risk recall

## Problem

On a fixed 300-case evaluation, Kimi K2.7 Code approved 30 of 200 cases labeled `escalate` or `deny`. Five of 117 cases marked `mustNotApprove` were approved, and three pass the evaluator's current safe-class auto-approval gate. Operators need better detection of state-changing and security-sensitive commands without making routine bounded operations require approval unnecessarily.

## Proposed outcome

The reviewer identifies more genuinely risky operations and sends them to human review. Its safe-operation utility and response availability remain measurable. A separate sample checks whether gains extend beyond cases inspected during tuning.

## Affected users and systems

- Operators using Kimi K2.7 Code as the reviewer model.
- The reviewer prompt, version metadata, and opt-in quality evaluation.

## Constraints

- Deterministic policy remains authoritative. The reviewer never executes commands or makes a final deny.
- Existing response schema, redaction, tool prohibition, and fail-closed behavior remain intact.
- Do not optimize solely for noisy labels in the synthetic external corpus.
- Keep provider credentials out of committed files and verification output.

## Out of scope

- Changing SSH execution behavior or deploying a new reviewer configuration.
- Rewriting the command classifier as part of prompt calibration.

## Open questions

None. The operator prefers to retain at least 70% safe auto-approval.
