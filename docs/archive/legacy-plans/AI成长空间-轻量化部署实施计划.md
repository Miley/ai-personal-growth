# 轻量化 PWA 与阿里云代理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将新版应用发布为可添加到 iPhone 主屏幕的 GitHub Pages PWA，并把百炼密钥与模型调用迁移到阿里云函数计算。

**Architecture:** 前端构建后由 GitHub Pages 以 HTTPS 提供；浏览器仅调用一个公开但无密钥的 FC HTTP 触发器。FC 按 `action` 选择百炼模型，密钥、工作空间 ID、模型名和允许来源均从环境变量读取。无 FC 地址时，前端保留现有本地演示行为。

**Tech Stack:** React 19、TypeScript、Vite、vite-plugin-pwa、Vitest；阿里云函数计算 Node.js 20 HTTP 触发器、阿里云百炼 OpenAI 兼容接口；GitHub Actions Pages。

---

### Task 1: 定义无密钥的前端 AI 网关

**Files:**
- Create: `another-me-v2/src/lib/apiGateway.test.ts`
- Create: `another-me-v2/src/lib/apiGateway.ts`
- Modify: `another-me-v2/src/types.ts`
- Modify: `another-me-v2/src/lib/storage.ts`
- Modify: `another-me-v2/src/lib/ai.ts`
- Modify: `another-me-v2/src/lib/modelStudio.ts`

- [ ] **Step 1: 写失败测试，证明浏览器只向 FC 发送动作载荷。**

```ts
vi.stubEnv('VITE_AI_API_BASE', 'https://example.cn-hangzhou.fcapp.run')
await requestAi('chat', { text: '今天有点累。' })
expect(fetch).toHaveBeenCalledWith(
  'https://example.cn-hangzhou.fcapp.run',
  expect.objectContaining({ body: JSON.stringify({ action: 'chat', text: '今天有点累。' }) }),
)
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm test -- src/lib/apiGateway.test.ts`
Expected: FAIL because `requestAi` does not exist.

- [ ] **Step 3: 实现最小网关。**

```ts
export async function requestAi<T>(action: string, payload: object): Promise<T> {
  const response = await fetch(apiBaseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!response.ok) throw new Error('云端服务暂时不可用。')
  return response.json() as Promise<T>
}
```

- [ ] **Step 4: 将聊天、图片阅读与转写改为调用网关。** `GatewaySettings` 只保留非敏感的 `apiBaseUrl`；删除浏览器端 API Key、工作空间 ID、百炼 URL 和模型名。未配置 API 地址时继续返回现有演示内容或提示。
- [ ] **Step 5: 运行网关与既有 AI 测试。**

Run: `npm test -- src/lib/apiGateway.test.ts src/lib/ai.test.ts src/lib/modelStudio.test.ts`
Expected: PASS.

### Task 2: 添加函数计算的百炼代理

**Files:**
- Create: `another-me-v2/server/index.mjs`
- Create: `another-me-v2/server/index.test.ts`

- [ ] **Step 1: 写失败测试，证明只允许已知动作和允许来源。**

```ts
const result = await handler(event({ origin: 'https://person.github.io', body: { action: 'unknown' } }))
expect(result.statusCode).toBe(400)
expect(JSON.parse(result.body)).toEqual({ error: '不支持的请求。' })
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm test -- server/index.test.ts`
Expected: FAIL because FC handler does not exist.

- [ ] **Step 3: 实现 FC Node.js 20 handler。** 解析 HTTP trigger event；处理 `OPTIONS`；将 `ALLOWED_ORIGINS` 中的精确来源写入 CORS；拒绝超过 8 MB 的 JSON body；不打印 body、图片、录音或密钥。仅接受 `chat`、`reading`、`transcribe`。
- [ ] **Step 4: 为每个动作构造百炼请求。** `chat` 和 `reading` 调用 `https://{BAILIAN_WORKSPACE_ID}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions` 及 `BAILIAN_CHAT_MODEL`；`transcribe` 固定 `qwen3-asr-flash`。使用 `BAILIAN_API_KEY` 作为 Bearer token，并只将百炼的最终文本返回给前端。
- [ ] **Step 5: 运行 FC 测试。**

Run: `npm test -- server/index.test.ts`
Expected: PASS, including successful mocked chat proxy, rejected origin and rejected unknown action.

### Task 3: 改造设置与隐私文案

**Files:**
- Modify: `another-me-v2/src/components/Settings.tsx`
- Modify: `another-me-v2/src/lib/storage.test.ts`
- Modify: `another-me-v2/src/styles.css`

- [ ] **Step 1: 写失败测试，证明保存设置不会持久化百炼密钥字段。**

```ts
saveSettings({ apiBaseUrl: 'https://example.fcapp.run' })
expect(loadSettings()).toEqual({ apiBaseUrl: 'https://example.fcapp.run' })
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm test -- src/lib/storage.test.ts`
Expected: FAIL because the old settings structure still requires secret fields.

- [ ] **Step 3: 实现最小设置页。** 设置页仅提供“阿里云 AI 服务地址”输入和本地数据删除；说明百炼密钥由阿里云函数计算保存，浏览器不保存。保留“图片与录音只在主动发送时处理”的说明。
- [ ] **Step 4: 运行存储测试。**

Run: `npm test -- src/lib/storage.test.ts`
Expected: PASS.

### Task 4: 使前端成为可安装 PWA

**Files:**
- Modify: `another-me-v2/package.json`
- Modify: `another-me-v2/vite.config.ts`
- Modify: `another-me-v2/index.html`
- Create: `another-me-v2/public/app-icon.svg`
- Create: `another-me-v2/.github/workflows/deploy-pages.yml`

- [ ] **Step 1: 安装并配置 `vite-plugin-pwa`。** 设置 `display: 'standalone'`、`start_url`、中文应用名、主题色、SVG 图标和导航回退。
- [ ] **Step 2: 支持 GitHub 项目页路径。** `vite.config.ts` 读取 `VITE_BASE_PATH`，默认 `/`；工作流在构建时设置为 `/${{ github.event.repository.name }}/`。
- [ ] **Step 3: 加入 iOS 元数据。** 在 `index.html` 加入 Apple web app 名称、状态栏和 touch icon。
- [ ] **Step 4: 写 GitHub Pages workflow。** 仅在 `main` 推送和手动触发时运行，执行 `npm ci`、`npm run build`、上传 `dist` 并部署 Pages。
- [ ] **Step 5: 构建验证。**

Run: `npm run build && rg -n 'manifest|service-worker|app-icon' dist/index.html dist`
Expected: build succeeds and generated dist contains PWA assets.

### Task 5: 编写用户部署说明与集成验证

**Files:**
- Create: `another-me-v2/.env.example`
- Create: `another-me-v2/DEPLOY_ALIYUN.md`
- Modify: `AI成长空间-方案与实施计划.md`

- [ ] **Step 1: 写 `.env.example`。** 仅包含 `VITE_AI_API_BASE=https://your-function.cn-hangzhou.fcapp.run`，不放任何真实密钥。
- [ ] **Step 2: 写部署说明。** 明确 FC 区域中国北京、Node.js 20、handler `index.handler`、HTTP trigger 的 `POST, OPTIONS`、环境变量 `BAILIAN_API_KEY`、`BAILIAN_WORKSPACE_ID`、`BAILIAN_CHAT_MODEL=qwen3-vl-flash`、`ALLOWED_ORIGINS`。说明如何复制 FC URL 到 Pages 构建变量，及如何在 iPhone Safari 添加到主屏幕。
- [ ] **Step 3: 更新总方案。** 将“浏览器直接填百炼 Key”替换为“FC 服务端保管 Key”，并标记云资源创建仍需用户控制台授权。
- [ ] **Step 4: 运行完整验证。**

Run: `npm test && npm run build`
Expected: all tests pass and Vite build succeeds.

## 计划自检

- 覆盖：前端无密钥调用（Task 1/3）、FC 代理与 CORS（Task 2）、iPhone PWA（Task 4）、用户部署步骤（Task 5）。
- 安全：密钥不进入前端、仓库、构建产物或日志；媒体不落盘（Task 1/2/5）。
- 范围：不创建云资源、不推送 GitHub、不引入账号或云端记忆。
