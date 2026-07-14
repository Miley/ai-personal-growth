# 另一个我：轻量化部署

这个版本由 GitHub Pages 提供可安装的 HTTPS 网页，阿里云函数计算负责调用百炼。浏览器不保存百炼 API Key。

## 1. 创建百炼 API Key

1. 在阿里云百炼控制台选择**中国（北京）**工作空间。
2. 在 API Key 页面创建 Key，并立即复制保存。
3. 不要把该 Key 填到应用设置、GitHub 变量、仓库文件或聊天窗口。

## 2. 创建函数计算代理

1. 在阿里云函数计算选择**中国（北京）**，创建函数，运行时选 **Node.js 20**。
2. 上传仓库中的 `server` 文件夹，Handler 填 `index.handler`。
3. 在函数配置的环境变量中填写：

```text
BAILIAN_API_KEY=你的百炼_API_Key
BAILIAN_WORKSPACE_ID=你的百炼工作空间_ID
BAILIAN_CHAT_MODEL=qwen3-vl-flash
ALLOWED_ORIGINS=https://你的GitHub用户名.github.io,http://localhost:5173
```

4. 创建 HTTP Trigger：允许 `POST` 和 `OPTIONS`，认证方式选“无认证”，在 Trigger 中开启 CORS 并保留公网 URL。
5. 部署后复制 Trigger 的 HTTPS URL；它是前端唯一需要的服务端地址。

函数计算的 CORS 网关会处理浏览器预检。`server/index.mjs` 只返回 JSON，**不要**自行设置任何 `Access-Control-*` 响应头；网关和函数同时设置会产生重复响应头，Safari 可能显示 `load failed`。函数不记录图片、录音、聊天正文或密钥，并且只支持聊天、图片阅读和语音转写三种请求。

> 注意：`ALLOWED_ORIGINS` 只限制浏览器跨域调用，不能代替用户登录或真正的接口鉴权。当前适合个人自用；请在阿里云设置预算告警和百炼用量告警。不要公开传播函数 URL。若未来分享给多人，应先加用户登录与服务端限流。

## 3. 发布 PWA 到 GitHub Pages

1. 将整个 `another-me-v2` 目录创建为一个新的 GitHub 仓库并推送到 `main` 分支。
2. 在仓库 Settings → Pages 中选择 **GitHub Actions** 作为 Source。
3. 在仓库 Settings → Secrets and variables → Actions → Variables 中新建：

```text
AI_API_BASE=第 2 步复制的函数 HTTPS URL
```

4. 推送 `main` 后，`.github/workflows/deploy-pages.yml` 会构建并发布站点。
5. 在 Actions 的部署结果中复制 `https://你的GitHub用户名.github.io/仓库名/`。

`AI_API_BASE` 是公开的函数 URL，不是百炼 Key；百炼 Key 只能留在函数计算环境变量中。

## 4. 在 iPhone 使用

1. 用 iPhone Safari 打开 GitHub Pages 链接。
2. 点击底部“分享”按钮，选择“添加到主屏幕”。
3. 名称显示为“Another-Me”；从主屏幕打开即可像独立应用一样使用。
4. 第一次使用语音或图片时，允许麦克风或照片权限。

## 本地开发

复制 `.env.example` 为 `.env.local`，将函数 URL 填入 `VITE_AI_API_BASE`，然后运行：

```bash
npm run dev
```

本地服务默认允许 `http://localhost:5173`。如果 Vite 使用了其他端口，需要同步修改函数的 `ALLOWED_ORIGINS`。
