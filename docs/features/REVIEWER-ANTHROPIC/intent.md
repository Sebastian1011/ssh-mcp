---
feature: REVIEWER-ANTHROPIC
stage: intent
status: accepted
branch: main
---

# Intent: evaluate the reviewer with Kimi through Anthropic Messages

## Problem

The reviewer cannot call an Anthropic-compatible model endpoint. Operators cannot run the existing quality evaluation against Kimi using the requested protocol.

## Proposed outcome

Operators can select the Anthropic API type for the reviewer and run the existing evaluation set with Kimi K2.7 Code. Results include the same accuracy, recall, and availability measures as other model runs.

## Affected users and systems

- Operators configuring the reviewer sidecar and running its opt-in evaluation.
- The sidecar's model request and response boundary.

## Constraints

- Existing Chat Completions and Responses configurations continue to work.
- The reviewer receives only the existing redacted input and never executes evaluated commands.
- Credentials, provider response bodies, and raw model output remain absent from logs and reports.
- Live evaluation is opt-in and uses the existing fixed sample selection for comparison.

## Out of scope

- Changing review policy, model prompt, or evaluation labels.
- Deploying Kimi to production.

## Open questions

None.
