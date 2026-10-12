---
feature: PROD-COMPOSE-DEPLOY
stage: spec
status: accepted
branch: feat/llm-command-review
---

# Spec: Local production Compose service

## Requirements

- Start one authenticated HTTP MCP service from the generated six-profile configuration.
- Bind host port 3000 only on loopback and keep the audit log across container restarts.
- Reuse the current SSH agent without copying private keys into the container.
- Start an isolated LLM reviewer, configure the MCP service to use it, and keep the reviewer off host ports and away from SSH material.
- Validate service health, MCP discovery, and one read-only command on a non-root profile.
- Validate an actual reviewer-to-model request without executing a remote command.

## Design

`prod_config/compose.yaml` mounts the private configuration, a token file, the agent socket, and an audit directory into the MCP service. It runs as the host user's UID, with a read-only root filesystem. HTTP reads its token from `SSH_MCP_BEARER_TOKEN_FILE`; the existing CLI flag remains available. A separate reviewer container receives only model settings from the ignored `prod_config/compose.env`, has no host port or sensitive mounts, and must become healthy before the MCP service starts. The Compose project remains `ssh-mcp` after the file move.

## Affected modules

Compose deployment, HTTP startup in `src/index.ts`, and local deployment documentation.

## Trade-offs and concerns

The agent socket's path may change with the login session; recreate the container when it does. The `_tmux` profiles still cannot auto-run `RemoteCommand`. Host key trust remains the application's process-local TOFU behavior because the source files do not contain pins. Reviewer health does not prove model connectivity, so a synthetic live request is checked separately. All deployed profiles are read-only and `ask-all`: review approval can remove the prompt for read-only commands, while any denial, escalation or reviewer outage requires fresh human approval.

## Related ADRs

ADR-001, ADR-002, and ADR-003 govern sidecar isolation and reviewer authority.

## Acceptance criteria

- The TypeScript build and Compose config validation pass.
- Compose reports both containers healthy and `/health` reports `configured: true`.
- Authenticated MCP discovery lists all six profiles.
- A read-only remote command succeeds on `sh_zx_zy`, or a precise external authentication/network blocker is reported.
- A synthetic, non-executing review request reaches the configured model and returns a completed verdict, or a precise provider blocker is reported.
