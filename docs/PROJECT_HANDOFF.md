# 另一个我：项目交接与经验沉淀

最后更新：2026-07-14。后续有产品、架构或部署变化时，请优先更新本文件和 `DEPLOY_ALIYUN.md`。

## 产品目标

这是一个帮助个人持续成长的 iPhone PWA，而不是一个泛用聊天机器人。三个主题共用“低压力、可反复使用、反馈具体”的体验：

1. **表达能力**：即兴聊天与社交 → 向上沟通和说服 → 工作汇报/会议表达 → 正式演讲。
2. **另一个我**：私密但不黏人的 AI 同伴；支持文字、图片和语音输入，用于讲述经历、困惑与想法。
3. **英语**：以从易到难的阅读为主，服务旅行交流、阅读英语材料和陪 2 岁宝宝的日常输入；不把语音角色扮演作为主训练方式。

产品取舍：不强制每日打卡，不用单一、重复的 AI 评价；训练应有清晰的时长、不同的场景和可行动的反馈。

## 已部署架构

```text
iPhone Safari / 主屏幕 PWA
        │  静态前端 + 本地设置/记忆
        ▼
GitHub Pages
https://miley.github.io/ai-personal-growth/
        │  HTTPS POST
        ▼
阿里云函数计算（北京）another-me-ai
        │  服务端保存百炼 Key
        ▼
阿里云百炼 / Model Studio
qwen3-vl-flash
```

- GitHub 仓库：[Miley/ai-personal-growth](https://github.com/Miley/ai-personal-growth)，默认分支 `main`。
- GitHub Pages 由 `.github/workflows/deploy-pages.yml` 构建和发布；仓库变量 `AI_API_BASE` 保存函数公网地址（它不是密钥）。
- 函数计算位于**中国（北京）**，函数名 `another-me-ai`，HTTP Trigger 开放 `POST` 与 `OPTIONS`、无认证；公网地址为 `https://another-me-ai-xldfmbbsec.cn-beijing.fcapp.run`。
- 函数环境变量：`BAILIAN_API_KEY`、`BAILIAN_WORKSPACE_ID`、`BAILIAN_CHAT_MODEL=qwen3-vl-flash`、`ALLOWED_ORIGINS=https://miley.github.io,http://localhost:5173`。

## 数据与隐私边界

- 浏览器侧：对话偏好、训练状态等保存在本机浏览器；更换设备或清除站点数据会丢失这些本地内容。
- 云端：函数将当前请求转给百炼；不在函数中持久保存聊天正文、图片、录音或 API Key。
- 安全：公网函数地址不是秘密，也不等于用户鉴权。当前是个人自用的轻量方案；不要公开传播地址，并在阿里云配置预算和百炼用量告警。若要分享给多人，先加入登录、服务端限流和更严格的访问控制。

## 日常更新路径

### 仅更新前端

1. 修改 `src/`、`public/` 或 PWA 配置。
2. 在仓库根目录运行 `npm test -- --run` 和 `npm run build`。
3. 提交并推送 `main`；GitHub Actions 会部署到 GitHub Pages。
4. iPhone 若仍显示旧版本，关闭应用后重新打开，必要时在 Safari 刷新页面再“添加到主屏幕”。

### 更新 AI 代理

1. 修改 `server/index.mjs`；涉及响应头时同步检查 `server/index.test.ts`。
2. 运行 `npm test -- --run` 和 `npm run build`。
3. 在函数计算中上传 **`server` 文件夹**，入口仍为 `index.handler`，然后部署代码。
4. 用函数计算的测试事件确认返回 200；再用 iPhone 实测一次文字消息。

### 仅修改云端配置

- 模型、工作空间或 Key：在函数计算环境变量中修改；Key 绝不进入代码库。
- 前端调用地址：修改 GitHub 仓库 Actions Variable `AI_API_BASE`，然后重新触发或推送一次 Pages 部署。
- 跨域来源：修改函数变量 `ALLOWED_ORIGINS`，并同步检查 HTTP Trigger 的 CORS 规则。

## 已解决的关键问题：Safari “load failed”

症状：iPhone 发消息时显示 `load failed`，函数本身可返回 200。

根因：函数计算 HTTP Trigger 的默认 CORS 网关会添加 `Access-Control-*` 响应头；旧版 `server/index.mjs` 也添加了同名响应头，导致浏览器收到重复的 CORS 头。Safari 因此拒绝响应。

当前规则：

- HTTP Trigger 配置 CORS，放行 `POST`、`OPTIONS` 和生产域名。
- `server/index.mjs` 只返回 JSON，**不得**自己设置 `Access-Control-Allow-Origin`、`Access-Control-Allow-Methods` 或 `Access-Control-Allow-Headers`。
- `server/index.test.ts` 已有回归测试，确保函数响应不再写 CORS 头。

若再次出现 `load failed`，先检查 Trigger CORS 配置和响应中是否有重复的 `Access-Control-*` 头；不要为了“修复”而在函数和网关两边同时加头。

## 常见排查

| 现象 | 优先检查 |
| --- | --- |
| `load failed` | Trigger 的 CORS、生产域名、响应头是否重复、iPhone 是否使用旧 PWA 缓存。 |
| 函数 401/403 | Trigger 是否仍为无认证；函数环境变量和阿里云权限是否变更。 |
| 函数 5xx / AI 无回复 | `BAILIAN_API_KEY`、工作空间 ID、模型名和百炼用量/额度。 |
| 前端部署后无变化 | GitHub Actions 的 Pages 工作流结果、`AI_API_BASE` 变量、iPhone 的 PWA 缓存。 |
| 图片或语音无法用 | iPhone Safari 权限、网络连接，以及函数是否已部署最新 `server` 文件夹。 |

## 验证清单

在仓库根目录执行：

```bash
npm test -- --run
npm run build
git diff --check
```

上线后至少验证：

1. Pages 页面能打开。
2. 发送一条文字消息不出现 `load failed`。
3. 语音/图片权限可正常请求（如需使用）。
4. 仅在阿里云函数环境变量中存在真实的百炼 Key。

## 当前非目标与后续边界

- 不上 App Store、不要求域名或备案；以 GitHub Pages + iPhone 主屏幕安装为主。
- 不引入账号、云端对话数据库或多人协作，除非明确要跨设备同步或共享。
- 增加功能前先检验是否直接服务三条成长主线，避免为了“功能丰富”而损害轻量、私密和低压力体验。
