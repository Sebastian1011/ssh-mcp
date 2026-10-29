---
feature: HTTP-SESSION-EVICTION
stage: spec
status: accepted
branch: main
---

# Spec: HTTP MCP 空闲会话淘汰

## Requirements

1. 空闲超过阈值(默认 1 小时)的 MCP 会话被服务器关闭,`transports` 表中的条目
   随之移除——被淘汰会话占用的名额可被新客户端使用。
2. "空闲"以该会话最后一次被路由到(任意方法的请求)计;每次请求刷新活跃时间。
   新会话在 `onsessioninitialized` 时记为活跃。
3. 淘汰路径有两条,互补:
   - 定时扫描(每 5 分钟,`unref`),保证无流量时表也会收缩;
   - 新 `initialize` 到达时先扫描再检查 `MAX_SESSIONS`,保证 503 只在真有 64 个
     *活跃*会话时出现。
4. 被淘汰会话的后续请求走既有 404 `-32001` "Session not found or expired.
   Re-initialize" 路径,客户端重新 initialize 即可恢复。
5. 阈值可注入(`HttpTransportOpts.sessionIdleMs`),0 关闭淘汰;默认值以常量导出。
6. 活跃会话绝不被淘汰:只要请求间隔小于阈值,`lastActive` 持续刷新。

## Design

`transports` 从 `Map<string, StreamableHTTPServerTransport>` 改为
`Map<string, { transport, lastActive }>`:

- `resolveTransport` 命中已有会话时更新 `lastActive`(覆盖 POST / GET / DELETE);
- 关闭仍通过 SDK 的 `close()`(触发 `onsessionclosed` → 删条目),不自己从表里
  摘,保证 `onclose` 兜底逻辑不变;
- 扫描函数遍历表,对 `now - lastActive > idleMs` 的条目 `await transport.close()`
  并记一行日志(与现有 `console.error` 服务器消息风格一致);
- 定时器 `setInterval(...).unref()`,不阻止进程/测试退出。

## Affected modules

- `src/transport/http.ts` — 会话表、淘汰逻辑、`MAX_SESSIONS` 检查。
- `test/unit/transport/http.test.ts` — 新增淘汰行为测试。

## Trade-offs and concerns

- **空闲判定只看请求,不看挂着的 SSE 流**:一个客户端打开 GET SSE 后长时间不发
  请求,仍会被淘汰。淘汰会关掉它的 SSE 流,客户端需重连。接受此代价的原因:
  SDK transport 不暴露"流是否打开",而泄漏恰恰来自这种"挂着流但客户端早已消失"
  的场景;客户端恢复路径(404 → re-initialize)本就是既有契约。
- **阈值 1 小时,而非更长/更短**:更短会打断读代码超过一小时的活跃 Claude Code
  会话;更长则 64 上限释放太慢(需 >16 次客户端重启/窗口才耗尽,1 小时已足够)。
  取 1 小时;`sessionIdleMs` 保留注入点,将来要调再加 CLI 项。
- **定时扫描 + 惰性扫描都保留**:只留惰性(在 initialize 时扫)在有新流量前表不
  收缩,内存和日志上看着是"泄漏没修";只留定时则 503 可能在扫描间隙出现。两者
  各一行调用,不复杂。

## Related ADRs

None — 单模块内的资源回收策略,无跨模块架构决策。

## Acceptance criteria

1. 空闲超过阈值的会话在下次扫描后不可用(404),且新 initialize 不再被 503 挡。
2. 请求间隔小于阈值的会话在同窗口内仍可用(非 404)。
3. 既有单测全绿:`npx vitest run test/unit/transport/`。
4. 构建通过:`npm run build`。
