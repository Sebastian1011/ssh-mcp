---
feature: PROD-COMPOSE-DEPLOY
stage: intent
status: accepted
branch: feat/llm-command-review
---

# Intent: Run the supplied broker profiles as a local Compose service

## Problem

The supplied profiles load in a local process, but the existing Compose app is a stdio test-oriented service with different mounts. It does not provide a reachable, authenticated endpoint for this deployment.

## Proposed outcome

A local Compose deployment starts the MCP service and isolated LLM reviewer with all six profiles, has a persistent audit log, and can be checked through MCP and a synthetic model review.

## Affected users and systems

The workstation operator and the local Docker daemon; the service can reach the two configured broker SSH endpoints.

## Constraints

Keep HTTP on loopback, keep credentials out of command arguments and Git, and preserve the supplied source files. Use the existing read-only, ask-all profile policy. The reviewer must not receive SSH credentials or configuration.

## Out of scope

Public exposure, remote mutations, and converting unsupported OpenSSH directives.

## Open questions

None.
