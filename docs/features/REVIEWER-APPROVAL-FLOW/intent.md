---
feature: REVIEWER-APPROVAL-FLOW
stage: intent
status: accepted
branch: main
---

# Intent: reduce routine SSH command approval work

## Problem

Production SSH requests currently send routine read-only and safe commands to a model because every profile uses ask-all. Destructive commands still require a human even when the reviewer approves, adding prompts to operations the user wants the reviewer to decide.

## Proposed outcome

Deterministically allowed read-only and safe commands run without a model request or human prompt. Destructive commands receive a model review; a completed approval permits execution, while denial, escalation or unavailable review requires a fresh human decision.

## Affected users and systems

Operators using the production ssh-mcp profiles, the MCP approval pipeline, reviewer evaluation and audit records.

## Constraints

Deterministic denials remain final. Privileged commands remain subject to the existing role limits and human gate. A reviewer failure must never turn into automatic execution. No GUI is requested as part of this change.

## Out of scope

Building a configuration editor and changing the classifier. The operator later authorized rebuilding and restarting the local Compose deployment and switching its reviewer to Kimi.

## Open questions

None.
