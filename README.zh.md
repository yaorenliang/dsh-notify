# dsh-notify

中文 | [English](./README.md)

给 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) 用的一体化通知插件：**浏览器系统通知与 Bark 手机推送，同一份判定**。

常见做法是装两个插件——一个弹浏览器通知，一个推手机。它们各自判定事件，于是必然漂移：手机说"第 12 轮结束"，浏览器说"完成"，一次授权来两条，子 agent 的动静两边都漏。`dsh-notify` 在宿主侧只判定一次，再把同一个事件分发给两条通道。

## 能力

- **浏览器通道**：系统通知 + 每种事件独立音效 + 点击跳回对应会话 + 同类合并（一阵连响只留一张卡片）。
- **Bark 通道**：APNs 推到手机，浏览器关着也能收到；可配分组、图标、每种事件独立铃声，点击深链回界面。
- **统一事件模型**：`completed` / `failed` / `interrupted` / `approval` / `question`，一个逻辑事件最多送达一次。
- **默认安静**：子 agent 会话静默；你正在看的会话不打扰；过期的"在线"报告不会吞掉授权提醒。
- **一个设置页**：中英双语、贴合 Harness 视觉，两个通道各有测试按钮，密钥遮罩。
- **带鉴权的传输**：配置与实时流都走 Connection 的 `/api` 鉴权栅栏，不存在"谁都能改你 device key"的裸路由。

## 安装

```sh
dsh plugin --profile web add dsh-notify
```

打开 **设置 → 通知**，填入 Bark device key，打开需要的通道，分别点一次「测试」。

从本地目录安装：

```sh
pnpm install
pnpm build
dsh plugin --profile web add ./dsh-notify
```

## 配置

宿主持有唯一一份 JSON：`$DSH_PROFILE_DIR/dsh-notify.json`（默认 `~/.dsh/profiles/web/dsh-notify.json`）。浏览器只会拿到脱敏投影：密钥显示为"已配置 + 后四位"，留空表示保留原值，只有显式 `null` 才会清除。

| 键 | 含义 |
|---|---|
| `prefix` | 标题前缀，渲染为 `[文本] `（最多 12 字）。 |
| `baseUrl` | 推送深链用的界面地址，如 `http://127.0.0.1:3080`；留空则不带链接。 |
| `notifySubagents` | 是否让子 agent 会话也提醒，默认关。 |
| `events.<kind>.enabled` | 每种事件的双通道开关。 |
| `events.<kind>.sound` | 浏览器音效：`chime` / `fault` / `pop` / `alert`。 |
| `events.<kind>.barkSound` | Bark 铃声名；`system` 表示设备默认。 |
| `browser.enabled` / `browser.volume` | 浏览器通道与音量（0–1）。 |
| `browser.currentSessionMode` | `hidden`（仅在标签页可见时安静）/ `unfocused`（仅在聚焦时安静）/ `always`。 |
| `bark.enabled` / `bark.serverUrl` / `bark.deviceKey` | Bark 通道与凭据。 |
| `bark.group` / `bark.icon` | 通知分组与可选图标。 |

## 工作原理

```
宿主事件 ──► 分类器 ──► 送达策略 ──► ┬─► Bark（HTTPS）
 (turn/end,     （5 种事件，    （子 agent、  └─► SSE ──► 浏览器卡片 + 音效
  approval/asked, 一次发生      在线状态、
  questions）    只算一次）      逐类开关）
```

- 宿主监听 `session/event` 取 `turn/end` 与 `approval/asked`，监听 `user-questions/request` 取提问；只有记录的原因确实是完成时，回合才算 `completed`。
- 在线状态由浏览器上报（可见、聚焦），会过期；过期视为"没人在看"，照常送达。
- 传输是一条 SSE 流加三条 JSON 路由，全部注册在 `/api/dsh-notify/*`，由 Connection 鉴权。

## 环境要求

- DeepSeek Harness `>=0.2.2-rc.1 <0.3.0`，Node `>=20`。
- 手机端需要 iOS 上的 Bark App（默认服务器 `https://api.day.app`）。

## 开发

```sh
pnpm install
pnpm test        # 事件模型、策略、配置、通道的单测
pnpm typecheck
pnpm build       # 宿主 ESM 入口 + 浏览器 lazy-CJS 产物
```

目录：`src/core` 纯逻辑（不碰宿主、不碰 DOM，vitest 直接跑），`src/host` 负责判定与投递，`src/client` 负责呈现。

## 许可

MIT © 姚壬亮
