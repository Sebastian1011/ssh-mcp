---
feature: HTTP-SESSION-EVICTION
stage: intent
status: accepted
branch: main
---

# Intent: HTTP MCP 会话泄漏导致 503

## Problem

HTTP transport 对并发 MCP 会话设了 64 的上限(`MAX_SESSIONS`),会话条目只在客户端
显式发 DELETE 或 transport 关闭时移除。实际上大多数客户端(Claude Code / mcp-remote)
在退出或崩溃时不会发 DELETE,会话条目只进不出。生产容器从 2026-10-23 跑到 2026-10-29
攒满 64 个泄漏会话,所有新客户端 initialize 被拒:

```
ssh-mcp (503): "Error POSTing to endpoint: Server is at its session limit (64).
Close an existing session and retry."
```

唯一的恢复手段是重启容器。

## Proposed outcome

空闲超过一定时长的 MCP 会话由服务器主动关闭并释放条目:长期运行的服务器不再因
泄漏而耗尽会话上限;被淘汰的客户端按既有契约收到 404 "Session not found or
expired. Re-initialize" 并重新初始化。活跃会话不受影响。

## Affected users and systems

- 所有通过 HTTP transport 接入 ssh-mcp 的 MCP 客户端(Claude Code / mcp-remote)。
- 模块:`src/transport/http.ts`(会话表与 `MAX_SESSIONS` 检查所在)。

## Constraints

- 不能破坏既有 404/`Re-initialize` 契约——淘汰后的客户端必须能重新 initialize。
- 活跃会话(持续发请求)绝不能被淘汰。
- 扫描逻辑不能占住进程退出(unref)。
- stdio transport 不受影响。

## Out of scope

- 不新增 CLI 配置项(先用固定默认值;有需求再加)。
- 不改动 SSH shell 层已有的 `sessionIdleTimeoutMs`(那是另一层会话)。
- 不做按客户端来源的会话配额。

## Open questions

None — 空闲阈值取 1 小时(见 spec 权衡)。
