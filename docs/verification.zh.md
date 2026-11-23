[English](./verification.md) | 中文

# 验收

对这个插件来说"能用"意味着什么，以及如何在不读源码的前提下逐条核对。自动部分用
`pnpm verify` 跑；手工部分每台机器跑一次。

## 自动部分

```sh
pnpm install
pnpm typecheck     # tsc --noEmit，退出码 0
pnpm test          # vitest，全量用例
pnpm build         # lib/index.js + lib/client.js + lib/types
```

测试套件覆盖四层：

| 文件 | 证明了什么 |
|---|---|
| `test/core.test.ts` | 回合结束判定的白名单、双语文案渲染、送达策略、配置合并与密钥掩码。 |
| `test/host.test.ts` | Bark 载荷组装、传输失败上报、SSE 帧编码与扇出。 |
| `test/dispatcher.test.ts` | 一个事件 → 两条通道、重复折叠及其过期、子 agent 静默、组装出的标题、每会话突发限流，以及一条只报告自己实际送达了什么的通道。 |
| `test/render.test.tsx` | 设置页渲染成标记：几条安静规则的先后、通道只在启用时才展开、五行事件各带两个音效选择器、没有高级区块，以及一个从不出现的 device key。 |
| `test/client-model.test.ts` | 设置页的 store 面对假宿主：加载、patch 写入、忙态切换，以及被拒绝的推送会把原因暴露出来而不是读成成功。 |
| `test/plugin.test.ts` | 真实 `apply()` 面对一个会执行 Cordis inject 守卫的假宿主：五条路由、脱敏配置的往返、一个完成的回合在其静置窗口之后经 SSE 传出且正文是人自己那句提问、注入上下文被当作没有提问、一次被下一轮取消的完成、未知结局保持静默、一条永远继续的授权 waterfall、跨两个标签页的在线状态。 |

## 对着运行中的宿主，不用浏览器

```sh
node scripts/accept.mjs          # 状态 + 脱敏配置，不发通知
node scripts/accept.mjs --test   # 另外触发一张浏览器卡片与一次推送
```

脚本取宿主刚打出的启动令牌，换成会话 cookie，再请求插件自己的路由。退出码 0 表示宿主已加载该插件、
路由在 Connection 的栅栏后应答，并且（带 `--test` 时）两条通道都接受了一条消息。

## 实机宿主证据（2026-11-13）

对着 3080 端口上运行中的 web profile，带属主的浏览器会话：

```json
{"ok":true,"browsers":3,"channels":{"browser":true,"bark":true},
 "presence":{"visible":false,"focused":false,"sessionId":null,"at":1794581572181}}
```

`browsers: 3` 数的是已连接的标签页，而这个响应形状只有本插件才会产出。安装该包会热应用 profile 的
bundle，因此刷新页面之后路由与设置页就出现了，不需要重启。

## 手工部分，在已安装的宿主上

1. **宿主已加载** —— 设置面板侧边栏出现 **Notifications**。
2. **配置** —— 填入 Bark device key，启用 Bark，点 **Test**；
   手机收到"DeepSeek Harness / This is a test notification from dsh-notify."
3. **浏览器通道** —— 启用它，授予通知权限，把标签页切到后台后点 **Test**；出现一张系统卡片。
4. **真实回合** —— 随便问 agent 一句短的；在回答后约一秒内只出现一张卡片，标题是会话名。
5. **子 agent 静默** —— 起一个会派活的任务；只有主会话的完成会送达。
6. **不重复** —— 一次权限请求只产出一张授权卡片。
7. **密钥留在本地** —— 在插件已安装的 `lib/` 里搜 device key，找不到任何东西；设置里的输入框显示圆点加后四位。
8. **传输受鉴权** —— `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3080/api/dsh-notify/state`
   在没有浏览器会话时返回 `401`。

## 回滚

- 停用插件：从 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 里去掉 `dsh-notify`，或执行
  `dsh plugin --profile web remove @yaorenliang/dsh-notify`。
- 前身的文档 `push-notify-config.json` 从未被修改，所以重新启用 `dsh-push-notify` 即可恢复它的行为。
- 插件自己的文档位于 `~/.dsh/profiles/web/dsh-notify.json`。