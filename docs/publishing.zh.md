[English](./publishing.md) | 中文

# 发布

离开这台机器的东西只有两样：仓库和 npm 包。其余的一切——测试、构建、profile——都留在本地。

## 仓库

```sh
git push origin main
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

Release 在 GitHub 上由该 tag 创建，正文取 `CHANGELOG.md` 中对应的那一节。CI
（`.github/workflows/ci.yml`）在 Node 20 与 22 上跑类型检查、测试、构建，以及一次打包产物检查。

## 包

在 GitHub 上发布 Release 会启动 `.github/workflows/publish.yml`，它先跑 `pnpm verify`，再执行
`npm publish --access public`。全程不需要手打任何东西，也不存任何密钥：工作流出示 OIDC 身份，npm 一侧则
有一条 **trusted publisher** 连接，指名本仓库与本文件名。`npm stage publish` 始终允许；直接发布也已授权，
所以一次发版不需要再跑一趟网站。

tarball 里不带配置也不带密钥：device key 住在 profile 目录，运行时才生成，而任何本地发布都会由
`prepublishOnly` 再跑一次 `pnpm verify`。

包级发布权限被设为"要求双因素认证并禁止 bypass-2FA 令牌"，因此即使 npm 仍然认可一枚被盗的令牌，
它也发不出这个包。

### 为什么这样做而不用令牌

npm 发布要求第二个因素。存在三条路径：

1. **受信发布（当前采用）。** 来自 GitHub Actions 的 OIDC，不用令牌，不用 OTP。
   前提是账户级已配置 2FA，因为不配它 npm 会拒绝修改包设置——此处的账户用的是 Touch ID 安全密钥，
   恢复码存放于 `~/.dsh/secrets/npm_recovery_codes.txt`。
2. **细粒度 bypass 令牌。** 可用到 npm 于 2027 年 1 月停止支持用它发布为止。v0.1.0 就是这么发的：
   一枚 7 天有效期的令牌，放在仓库外一个 `600` 文件里，用过一次即吊销。
3. **发布时从验证器 App 取 OTP**，这需要有支持 TOTP 的因素；安全密钥喂不了命令行。

发布可能返回 `202` 而包仍在处理中，随后几分钟 registry 会给 `404`。对外宣布之前，用
`npm view <name> version` 和 `npm pack <name>@<version>` 核验。

## 发布之后

- 确认公开页面、tarball 内容（`tar -tzf`），以及两份 README 里的安装命令。
- 用户以 `dsh plugin --profile web add @yaorenliang/dsh-notify` 安装。profile 会热应用*新的* bundle；
  已经加载的插件会继续跑它启动时那份宿主代码，直到 DSH 重启。
- 前身插件不是依赖，也绝不会被碰到；不从它们导入任何东西（见 `docs/decisions.md` 的 D7）。

## 不要发布什么

- `~/.dsh/profiles/web/dsh-notify.json`（含 Bark device key）。
- 任何真实会话列表的截图；宣传图请用临时 profile。