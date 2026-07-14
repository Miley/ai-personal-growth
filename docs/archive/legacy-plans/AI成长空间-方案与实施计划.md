# AI 成长空间：方案与实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一个手机优先、私密优先的个人成长应用，提供多模态 AI 同伴、回合制表达陪练和以分级阅读为主的英语学习。

**Architecture:** 新版独立放在 `personal-growth/another-me-v2`，不修改已有 `presentation/mobile-app`。React + Vite 前端默认将数据保存在浏览器本地；文本、图片和音频仅在用户主动发起一次 AI 请求时发送到阿里云函数计算，再由函数调用百炼（中国北京）。三种模式共用本地存储与设置，但各自拥有独立的会话和记忆作用域。

**Tech Stack:** React 19、TypeScript、Vite、浏览器 localStorage、MediaRecorder、SpeechSynthesis、PWA；GitHub Pages 静态发布、阿里云函数计算代理、阿里云百炼 OpenAI 兼容聊天/视觉接口与 `qwen3-asr-flash` 语音转写。

---

## 已确认的产品决定

- 同伴支持文字、语音、图片、截图和链接；图片不会自动读取相册或进入长期记忆。
- 音频和图片可上传云端进行当次理解，默认不保留原始媒体；长期记忆只保存用户确认后的文字摘要。
- 表达训练优先解决社交开场与延续对话；不使用随机故事卡和固定三维 AI 评分。
- 英语以阅读为主，听力仅是逐句播放、慢速/正常语速和跟读的辅助；素材采用原创分级内容和用户主动导入的材料。
- 本轮云端服务固定为阿里云百炼（中国北京）。浏览器只填写或在构建时注入函数计算 URL；百炼工作空间 ID、对话/图片模型和 API Key 均由函数计算环境变量保存。语音转写固定使用 `qwen3-asr-flash`，无需单独填写端点。未配置时仍可体验本地演示对话、阅读、隐私与记忆流程。
- 当前是个人轻量化版：函数计算保护百炼 Key 不进入浏览器；未引入用户登录前，函数 URL 不应公开传播，且必须设置预算/用量告警。若公开给多人使用，必须先加用户登录与接口限流。

## 文件结构

- `another-me-v2/package.json`：独立应用脚本和依赖。
- `another-me-v2/src/types.ts`：领域类型，定义模式、会话、记忆、阅读单元和网关设置。
- `another-me-v2/src/data/reading.ts`：首批原创分级英语阅读内容。
- `another-me-v2/src/lib/storage.ts`：所有本地持久化和清除操作。
- `another-me-v2/src/lib/modelStudio.ts`：百炼中国北京端点、`qwen3-asr-flash` 请求编组和转写结果解析。
- `another-me-v2/src/lib/ai.ts`：百炼聊天/视觉调用、图片消息编组与无网关演示回复。
- `another-me-v2/src/components/Composer.tsx`：文字、图片和录音输入；仅本地预览媒体。
- `another-me-v2/src/components/Companion.tsx`：私密同伴会话和“记住此事”确认。
- `another-me-v2/src/components/Practice.tsx`：场景、回合目标、模拟角色回应与单点复练。
- `another-me-v2/src/components/Reader.tsx`：分级阅读、按需释义、听读和短复盘。
- `another-me-v2/src/components/MemoryCenter.tsx`：查看并删除被确认的记忆。
- `another-me-v2/src/components/Settings.tsx`：百炼工作空间、模型、密钥设置和隐私说明。
- `another-me-v2/src/App.tsx`：导航、模式切换和共享应用状态。
- `another-me-v2/src/styles.css`：手机优先视觉样式。

## Task 1: 建立独立应用与领域存储

**Files:**
- Create: `another-me-v2/package.json`
- Create: `another-me-v2/src/types.ts`
- Create: `another-me-v2/src/lib/storage.ts`
- Test: `another-me-v2/src/lib/storage.test.ts`

- [ ] 写出失败测试：保存记忆时必须归入明确模式，清除某模式不得清除其他模式。

```ts
expect(saveMemory({ scope: 'companion', text: '今天很累' })).toHaveLength(1)
expect(clearMemories('english')).toEqual([])
expect(loadMemories('companion')[0].text).toBe('今天很累')
```

- [ ] 用 `localStorage` 实现 `loadMemories`、`saveMemory`、`clearMemories` 和设置读写；每个记录带 `id`、`scope`、`createdAt` 和 `text`。
- [ ] 运行 `npm run test`，确认存储隔离测试通过。

## Task 2: 建立可配置 AI 网关与多模态输入

**Files:**
- Create: `another-me-v2/src/lib/ai.ts`
- Create: `another-me-v2/src/components/Composer.tsx`
- Test: `another-me-v2/src/lib/ai.test.ts`

- [ ] 写出失败测试：未配置百炼时返回演示回复；配置后请求体同时包含文字和可选图片 Data URL；浏览器录音必须以 Data URL 调用 `qwen3-asr-flash` 并解析转写文字。

```ts
expect(await reply({ text: '今天有点累' }, emptySettings)).toMatch(/听到/)
expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'POST' }))
```

- [ ] 实现 `reply(message, settings)`：使用百炼中国北京 OpenAI 兼容 `/chat/completions` 格式；没有设置时返回安全、非诊断性的本地演示回复。
- [ ] 实现输入组件：文本、图片选择、媒体录音；图片只产生本地预览，点击发送时才读为 Data URL；录音在完成百炼设置后以 Data URL 发送给 `qwen3-asr-flash`，未配置时保留为本地提示而不上传。
- [ ] 运行单元测试并手动确认取消图片后不残留预览。

## Task 3: 实现私密同伴与可控记忆

**Files:**
- Create: `another-me-v2/src/components/Companion.tsx`
- Modify: `another-me-v2/src/App.tsx`
- Test: `another-me-v2/src/components/Companion.test.tsx`

- [ ] 写出失败测试：同伴回复后，只有点击“记住”才调用 `saveMemory`；取消不写入长期记忆。
- [ ] 实现聊天时间线、图片缩略预览、AI 的“复述—追问—可选视角”提示和记忆确认卡片。
- [ ] 确保提示词禁止断言图片中他人身份或敏感特征，禁止把普通倾诉诊断为心理问题。
- [ ] 运行测试；刷新页面后确认会话与已确认记忆仍在，而原图不被持久化。

## Task 4: 实现回合制表达陪练

**Files:**
- Create: `another-me-v2/src/components/Practice.tsx`
- Create: `another-me-v2/src/data/scenarios.ts`
- Test: `another-me-v2/src/components/Practice.test.tsx`

- [ ] 写出失败测试：开始场景后显示目标、当前回合和总回合；完成回合后反馈只给出一个引用用户原话的复练点。
- [ ] 创建社交开场、延续聊天、向上沟通和会议表达四类场景；默认优先展示社交开场与延续聊天。
- [ ] 实现 3/8/15 分钟档位，对应 1、5、8 回合；每次显示“第 n / N 回合”和建议单回合时长。
- [ ] 实现演示角色回应和网关生成回应；反馈采用“是否完成目标—有效原话—遗漏信息—复练句”结构。
- [ ] 运行测试并手动走完“同事午饭前开场”的 5 回合流程。

## Task 5: 实现分级英语阅读与首批素材

**Files:**
- Create: `another-me-v2/src/data/reading.ts`
- Create: `another-me-v2/src/components/Reader.tsx`
- Test: `another-me-v2/src/components/Reader.test.tsx`

- [ ] 写出失败测试：阅读单元按 `starter`、`bridge`、`steady` 过滤；点按注释前不显示中文帮助；收藏短语保留来源文章。
- [ ] 编写首批原创内容：亲子生活、旅行实用、轻量世界阅读各两篇，覆盖 80–300 词的三个难度层。
- [ ] 实现按句/短语显示释义、收藏表达、一个理解问题和浏览器语音播放；不默认显示全文中文翻译。
- [ ] 实现“从图片生成我的小阅读”入口：在网关存在时发送图片和目标难度，未配置时生成明确标记为演示的短文。
- [ ] 运行测试，确认英文内容可筛选、可听读、可收藏且不依赖角色扮演。

## Task 6: 隐私中心、设置和集成验证

**Files:**
- Create: `another-me-v2/src/components/MemoryCenter.tsx`
- Create: `another-me-v2/src/components/Settings.tsx`
- Create: `another-me-v2/src/styles.css`
- Modify: `another-me-v2/src/App.tsx`

- [ ] 实现明确的“默认不保存原始图片/音频”“模式记忆隔离”“删除全部本地数据”说明和操作。
- [ ] 将同伴、表达、英语、记忆、设置接入底部导航；在窄屏幕上完成触控布局。
- [ ] 运行 `npm run build`，期望 TypeScript 编译和 Vite 打包成功。
- [ ] 在浏览器验证：发送图片但不保存、确认一条同伴记忆、完成一次陪练、读完一篇英文、删除一条记忆。

## 不在本轮范围内

- 后台代理、用户登录、多人或社区功能；这些需要选择云服务与账户体系后再建设。
- 全双工实时通话；本轮使用可见、可复盘的回合制语音输入。
- 自动扫描相册、自动长期记忆和复制任何第三方课程/文章。

## 计划自检

- 覆盖：同伴（Task 2–3）、图片（Task 2/5）、表达（Task 4）、英语阅读与素材（Task 5）、隐私与设置（Task 6）。
- 范围：将后端账户和实时通话留在独立的后续阶段，避免假装已具备安全密钥管理。
- 一致性：所有模式均通过 `scope` 隔离持久化，云端调用均通过 `reply` 且需用户主动发送。
