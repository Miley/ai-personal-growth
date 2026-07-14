# AI 成长空间：轻量化 iPhone 部署设计

**目标：** 让用户无需域名、无需备案即可把“另一个我”添加到 iPhone 主屏幕；百炼密钥不得出现在浏览器。

## 已确认的选择

- 前端采用 PWA，而不是原生 iOS App。
- 静态前端通过 GitHub Pages 提供 HTTPS 访问；这只分发公开的 HTML、CSS 和 JavaScript，不存放用户的聊天、图片或录音。
- 私密 AI 请求通过阿里云函数计算（FC）代理，再由 FC 调用阿里云百炼。
- 用户不需要购买域名或办理 ICP 备案。
- 本轮不接入账号系统、云端长期记忆、推送通知或 App Store 发布。

## 架构

```text
iPhone Safari / 主屏幕 PWA
  ├─ 本地：界面、未确认的会话、确认后的文字记忆
  └─ HTTPS POST /api
            ↓
阿里云函数计算 FC
  ├─ 环境变量：百炼 API Key、工作空间 ID、允许的前端来源
  └─ 仅转发当次文字、图片或录音
            ↓
阿里云百炼
  ├─ 聊天/图片：qwen3-vl-flash
  └─ 转写：qwen3-asr-flash
```

## 请求边界

- 浏览器只请求 FC 的 `/chat`、`/reading-from-image`、`/transcribe` 三个接口；不再保存或发送百炼 API Key、工作空间 ID、模型地址。
- 图片和录音仅随当前请求发送，FC 不写入 OSS、数据库或日志正文。
- FC 只接受 GitHub Pages 的生产来源和本地开发来源；每个请求限制大小并限制为三种已定义操作。
- 长期记忆继续只保存在用户 iPhone 的浏览器中，且必须由用户显式确认。

## PWA 使用方式

1. GitHub Pages 通过 HTTPS 提供应用。
2. iPhone Safari 打开链接，点“分享”→“添加到主屏幕”。
3. 通过 Manifest、Service Worker、图标和 `display: standalone` 以独立应用窗口启动。
4. 首次语音或图片操作时，由 iOS 请求麦克风或相册权限。

## 文件与职责

- `another-me-v2/vite.config.ts`：PWA 构建与 GitHub Pages 路径配置。
- `another-me-v2/public/`：安装图标与 Manifest 所需静态资源。
- `another-me-v2/src/lib/ai.ts`：从直连百炼改为调用 FC API。
- `another-me-v2/src/lib/modelStudio.ts`：保留前端请求/响应类型与本地演示判断，删除密钥与百炼地址拼装。
- `another-me-v2/src/components/Settings.tsx`：删除工作空间 ID、模型和 API Key 输入，改为展示“云端已安全配置”的状态与本地隐私控制。
- `another-me-v2/server/`：FC 的 Node.js HTTP 处理器，按操作名调用百炼并处理 CORS、大小与响应。
- `another-me-v2/.github/workflows/deploy-pages.yml`：在推送主分支时构建并发布前端到 GitHub Pages。
- `another-me-v2/DEPLOY_ALIYUN.md`：用户在阿里云控制台配置 FC 环境变量和 HTTP 触发器的最小步骤。

## 成功标准

- 未配置百炼密钥的前端构建产物中不出现 `sk-`、工作空间 ID 或百炼 URL。
- 前端的三种 AI 操作只调用配置的 FC API 基址；本地未配置时仍能使用演示回复。
- FC 对无效操作、超出大小的媒体和非允许来源返回明确失败响应；有效请求会携带服务端密钥调用百炼。
- GitHub Pages 构建生成 Manifest 和 Service Worker；iPhone Safari 可将页面添加到主屏幕。
- 所有既有单元测试通过，前端构建与 FC 处理器测试通过。

## 不在本轮范围内

- 创建用户的阿里云函数、填写百炼密钥、开通账单或推送到用户的 GitHub 账户：这些都需要用户在控制台授权后执行。
- 将原始媒体或长期记忆同步到云端。
- App Store 上架、原生 iOS 壳、离线语音识别和推送提醒。
