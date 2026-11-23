[English](./architecture.md) | 中文

# 架构

三层，单向流动。

```
              ┌───────────────────────────── Host ─────────────────────────────┐
 session/event ─┤ classifier ─► dispatcher ─┬─► Bark (HTTPS, fire and forget)   │
 approval/req  ─┤  (core)        (policy,    │                                    │
 questions     ─┘                 dedupe,    └─► SSE hub ──► /api/dsh-notify/stream
                                  limits)                                   │
                                                                            ▼
              ┌──────────────────────────── Browser ─────────────────────────────┐
              │ EventSource ─► sound + system notification ─► click opens session │
              │ settings page ─► config API ─► Host document                       │
              └───────────────────────────────────────────────────────────────────┘
```

## `src/core` —— 纯逻辑

不 import 宿主，不碰 DOM，也不读没有显式传进来的时钟。四个模块：

- `events.ts` —— 事件词表与回合结束判定。只有记录下来的原因确实为完成，这一轮才成为
  `completed`；`blocked`、`max-tokens`、`forked` 以及未知原因一律返回 `silent`，永远到不了任何通道。
- `render.ts` —— 插件自己写的每一句话，中英双语。判定只返回事实，文案住在这里。
- `policy.ts` —— 一个事件能不能打扰人：子 agent 静默、屏幕上正在看的会话、在线状态过期。
- `config.ts` —— 配置结构、默认值、防御性合并，以及脱敏投影。回传的掩码密钥保留已存的值；只有
  `null` 才会清除它。

## `src/host` —— 观测与投递

- `index.ts` —— 订阅 `session/event`、`approval/request` 与
  `user-questions/request`；持有静置窗口、路由表，以及提供标题与最后一段助手文本的会话记忆。
- `dispatcher.ts` —— 按 `kind:id` 折叠重复，套用 `policy`，再套用突发限流（每会话 6 次/分钟、
  全局 20 次/分钟），然后扇出。
- `bark.ts` —— 一个载荷、一次 POST、不重试：漏掉的推送是错过的时刻，不是丢失的事实。
- `sse.ts` —— 一组 sink、心跳，以及写失败即摘除的规则。
- `store.ts` —— 文档的原子写入与可自证的读取。
- `title.ts` —— 两条通道共用的那一种标题格式。

## `src/client` —— 呈现

- `stream.ts` / `api.ts` —— EventSource 与四条 JSON 路由。
- `notify.ts` —— Notification API 与合成音效（不带任何音频素材）。
- `model.ts` —— 设置页订阅的唯一一个外部 store。
- `settings/` —— 会话通知页面及其基础组件。
- `index.tsx` —— 接线：流 → 音效 + 卡片、在线状态上报、设置注册、经 `localStorage` 的跨标签页仲裁。

## 值得守住的不变量

1. 一次逻辑发生，每条通道最多产出一张卡片。
2. 浏览器从不判定，只负责显示。
3. 密钥不跨到浏览器、不进 SSE 载荷、不进日志。
4. `/api` 下的一切由 Connection 鉴权，而不是由本插件鉴权。