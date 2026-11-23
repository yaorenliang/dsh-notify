# dsh-notify

[English](./DETAIL.md) | 中文

给 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) 用的一体化通知插件：**浏览器系统通知与 Bark 手机推送，同一份判定**。

常见做法是装两个插件——一个弹浏览器通知，一个推手机。它们各自判定事件，于是必然漂移：手机说"第 12 轮结束"，浏览器说"完成"，一次授权来两条，子 agent 的动静两边都漏。`dsh-notify` 在宿主侧只判定一次，再把同一个事件分发给两条通道。

## 能力

- **浏览器通道**：系统通知 + 每种事件独立音效 + 点击跳回对应会话 + 同类合并（一阵连响只留一张卡片）。
- **Bark 通道**：APNs 推到手机，浏览器关着也能收到；可配分组、每种事件独立铃声，点击可选深链回界面。
- **一眼看出你问了什么**：标题是「状态标记 + 会话名」，正文是你最后一次提问（定时任务这种没有提问的回合回退到助手回答）。
- **统一事件模型**：`completed` / `failed` / `interrupted` / `approval` / `question`，一个逻辑事件最多送达一次。
- **默认安静**：子 agent 会话静默；你正在看的会话不打扰；过期的"在线"报告不会吞掉授权提醒。
- **一个设置页**：中英双语、贴合 Harness 视觉，两个通道各有测试按钮，密钥遮罩。
- **带鉴权的传输**：配置与实时流都走 Connection 的 `/api` 鉴权栅栏，不存在"谁都能改你 device key"的裸路由。

## 安装

```sh
dsh plugin --profile web add @yaorenliang/dsh-notify
```

刷新页面，打开 **设置 → 会话通知**，填入 Bark device key，打开需要的通道，分别点一次「测试」。插件随配置热生效，不用重启。

## 工作方式

```
宿主事件 ──► 分类器 ──► 投递策略 ──► ┬─► Bark（HTTPS）
 (turn/end,     (5 类事件，   (子会话、    └─► SSE ──► 浏览器卡片 + 声音
  approval/asked, 一件事只   在线状态、
  questions)      判一次)     按类型开关)
```

宿主监听 `session/event` 的 `turn/end`、`approval/request` 瀑布的授权请求、`user-questions/request` 的提问；只有记录的结束原因确实为完成时，这一轮才算 `completed`。

浏览器会持续上报「可见 / 聚焦」状态，报告有有效期；过期即视为「没人在看」，通知照发。

传输是一条 SSE 流加 `/api/dsh-notify/*` 下的若干 JSON 路由，全部经 `ctx.connection.fetch` 注册并由 Connection 鉴权。流打不开或被浏览器关掉时，改为用普通请求取宿主侧十分钟的回溯队列。

## 配置

宿主在活动 profile 目录下持有一个 JSON 文件（默认 `~/.dsh/profiles/web/dsh-notify.json`）。浏览器只能拿到脱敏投影：密钥显示为「已配置 + 末四位」，留空表示不修改，只有显式 `null` 才清除。

| 键 | 含义 |
|---|---|
| `bark.baseUrl` | 点击推送打开的界面根地址，如 `http://127.0.0.1:3080`；留空推送不带链接。 |
| `notifySubagents` | 由其他会话派生的子会话是否也提醒，默认关。 |
| `events.<kind>.enabled` | 每个事件类型在两条通道上的开关。 |
| `events.<kind>.sound` | 浏览器音效：`chime` / `fault` / `pop` / `alert`。 |
| `events.<kind>.barkSound` | Bark 铃声名；`system` 用设备默认。 |
| `browser.enabled` / `browser.volume` | 浏览器通道与音量（0–1）。 |
| `browser.currentSessionMode` | `hidden`（仅当页面可见时静默）、`unfocused`（仅聚焦时静默）、`always`。 |
| `bark.enabled` / `bark.serverUrl` / `bark.deviceKey` | Bark 通道与凭据。 |
| `bark.group` | Bark App 里显示的通知分组，默认 `DSH`。 |

## 环境要求

- DeepSeek Harness `>=0.2.2-rc.1 <0.3.0`，Node `>=20`。
- 手机通道需要 iOS 上的 Bark App（默认服务 `https://api.day.app`）。

## 许可

MIT © 姚壬亮
