const bodyLimitBytes = 8 * 1024 * 1024

const companionPrompt = '你是一个温和、清醒、私密的 AI 同伴。先复述和澄清用户的经历，再给一个可选视角。不要诊断心理问题，不要假装真人，不要替用户做决定。回复使用简洁中文。'

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) }
}

function parseEvent(event) {
  const parsed = JSON.parse(Buffer.isBuffer(event) ? event.toString('utf8') : event)
  const rawBody = parsed.isBase64Encoded ? Buffer.from(parsed.body || '', 'base64').toString('utf8') : parsed.body || ''
  if (Buffer.byteLength(rawBody, 'utf8') > bodyLimitBytes) throw new Error('payload-too-large')
  return {
    origin: parsed.headers?.origin || parsed.headers?.Origin || '',
    method: parsed.requestContext?.http?.method || 'POST',
    body: rawBody ? JSON.parse(rawBody) : {},
  }
}

function modelStudioUrl() {
  const workspaceId = process.env.BAILIAN_WORKSPACE_ID
  if (!workspaceId || !process.env.BAILIAN_API_KEY) throw new Error('server-not-configured')
  return `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`
}

async function callModel(payload) {
  const result = await fetch(modelStudioUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BAILIAN_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await result.json().catch(() => null)
  if (!result.ok) throw new Error('model-request-failed')
  return data
}

function resultText(data) {
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('empty-model-result')
  return text.trim()
}

function parseJsonResult(data) {
  const text = resultText(data).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(text)
  if (
    !parsed
    || typeof parsed.overall !== 'string'
    || !Array.isArray(parsed.strengths)
    || parsed.strengths.length < 2
    || !parsed.strengths.every((item) => typeof item === 'string')
    || typeof parsed.priority?.title !== 'string'
    || typeof parsed.priority?.evidence !== 'string'
    || typeof parsed.priority?.action !== 'string'
    || typeof parsed.modelOpening !== 'string'
    || typeof parsed.nextPractice !== 'string'
  ) {
    throw new Error('invalid-speech-feedback')
  }
  return {
    overall: parsed.overall,
    strengths: parsed.strengths.slice(0, 2),
    priority: {
      title: parsed.priority.title,
      evidence: parsed.priority.evidence,
      action: parsed.priority.action,
    },
    modelOpening: parsed.modelOpening,
    nextPractice: parsed.nextPractice,
  }
}

function parseDailyReading(data) {
  const text = resultText(data).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(text)
  const categories = ['everyday', 'parenting', 'travel', 'world']
  if (
    !parsed
    || typeof parsed.title !== 'string'
    || !categories.includes(parsed.category)
    || typeof parsed.minutes !== 'number'
    || parsed.minutes <= 0
    || !Array.isArray(parsed.paragraphs)
    || parsed.paragraphs.length < 1
    || !parsed.paragraphs.every((item) => typeof item === 'string' && item.trim())
    || !parsed.notes
    || typeof parsed.notes !== 'object'
    || Array.isArray(parsed.notes)
    || Object.keys(parsed.notes).length < 1
    || !Object.entries(parsed.notes).every(([word, meaning]) => word.trim() && typeof meaning === 'string' && meaning.trim())
    || typeof parsed.question !== 'string'
    || typeof parsed.answerHint !== 'string'
  ) {
    throw new Error('invalid-daily-reading')
  }
  return {
    title: parsed.title.trim(),
    category: parsed.category,
    minutes: parsed.minutes,
    paragraphs: parsed.paragraphs.map((item) => item.trim()),
    notes: parsed.notes,
    question: parsed.question.trim(),
    answerHint: parsed.answerHint.trim(),
  }
}

function dailyTopic(date, level) {
  const categories = ['everyday', 'parenting', 'travel', 'world']
  const seed = `${date}:${level}`.split('').reduce((total, character) => total + character.charCodeAt(0), 0)
  return categories[seed % categories.length]
}

async function handleAction(body) {
  if (body.action === 'chat') {
    const content = [{ type: 'text', text: String(body.text || '') }]
    if (typeof body.imageDataUrl === 'string') content.push({ type: 'image_url', image_url: { url: body.imageDataUrl } })
    const data = await callModel({
      model: process.env.BAILIAN_CHAT_MODEL || 'qwen3-vl-flash',
      messages: [{ role: 'system', content: companionPrompt }, { role: 'user', content }],
      max_tokens: 400,
    })
    return { text: resultText(data) }
  }

  if (body.action === 'reading') {
    const level = String(body.level || 'starter')
    const data = await callModel({
      model: process.env.BAILIAN_CHAT_MODEL || 'qwen3-vl-flash',
      messages: [
        {
          role: 'system',
          content: `Create an original English reading from the user's image. Level: ${level}. Return exactly two lines: first line is a short title, second line is 80-180 words of English. Do not infer identities, relationships, health, or other sensitive attributes from people in the image.`,
        },
        { role: 'user', content: [{ type: 'text', text: 'Make a calm, useful reading from this image.' }, { type: 'image_url', image_url: { url: body.imageDataUrl } }] },
      ],
      max_tokens: 450,
    })
    const [title, ...bodyLines] = resultText(data).split('\n').filter(Boolean)
    if (!title || !bodyLines.length) throw new Error('invalid-reading-result')
    return { title: title.replace(/^#+\s*/, ''), body: bodyLines.join(' ') }
  }

  if (body.action === 'daily-reading') {
    const date = String(body.date || '')
    const level = String(body.level || '')
    const levelRules = {
      starter: '90-130 English words, CEFR A1-A2, short sentences, 2 paragraphs, about 2-3 minutes',
      bridge: '140-200 English words, CEFR A2-B1, 2-3 paragraphs, about 4-5 minutes',
      steady: '220-320 English words, CEFR B1-B2, 3-4 paragraphs, about 7-8 minutes',
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !levelRules[level]) throw new Error('invalid-daily-reading-request')
    const topic = dailyTopic(date, level)
    const prompt = `You create one original, calm English reading for an adult learner each day.
Rules:
1. Follow the requested level and word range exactly.
2. Use a fresh, concrete situation. Do not mention that it was AI-generated.
3. The requested category is ${topic}. Allowed category values: everyday, parenting, travel, world.
4. Avoid current news, unverifiable facts, sensitive personal inferences, diagnosis, or advice.
5. Include 3-5 useful English words or phrases with concise Chinese meanings.
6. Add one comprehension question and a short English answer hint.
7. 只返回合法 JSON，不要 Markdown：
{"title":"...","category":"${topic}","minutes":2,"paragraphs":["...","..."],"notes":{"word":"中文释义"},"question":"...","answerHint":"..."}`
    const data = await callModel({
      model: process.env.BAILIAN_CHAT_MODEL || 'qwen3-vl-flash',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Date: ${date}\nLevel: ${level}\nRequirements: ${levelRules[level]}` },
      ],
      max_tokens: level === 'steady' ? 1000 : 700,
    })
    return parseDailyReading(data)
  }

  if (body.action === 'transcribe') {
    const data = await callModel({
      model: 'qwen3-asr-flash',
      messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: body.audioDataUrl } }] }],
      stream: false,
      asr_options: { enable_itn: true },
    })
    return { text: resultText(data) }
  }

  if (body.action === 'speech-feedback') {
    const transcript = String(body.transcript || '').trim()
    if (!transcript) throw new Error('invalid-speech-feedback-request')
    const template = body.template && typeof body.template === 'object' ? body.template : {}
    const coachingPrompt = `你是一位克制、具体的中文演讲教练。学员先学习一篇范本，再用自己的语言复述。你的目标是帮助学员逐步提高，不追求逐字复刻，也不评价人格。

反馈规则：
1. 先给一个简短总体判断。
2. 指出两个已经做好的地方，必须基于本次复述的具体表达。
3. 只指出一个最优先改进点，引用或描述可核对的证据，并给一个能立即执行的动作。
4. 给一个更有力的示范开头，但保留学员原意。
5. 给下一次只需练习一个动作的任务。
6. 不打分，不使用空泛鼓励，不一次列出多个缺点。

只返回合法 JSON，不要 Markdown：
{"overall":"...","strengths":["...","..."],"priority":{"title":"...","evidence":"...","action":"..."},"modelOpening":"...","nextPractice":"..."}`
    const userPrompt = `范本标题：${String(template.title || '')}
训练目标：${String(template.objective || '')}
模仿重点：${String(template.imitationFocus || '')}
范本正文：
${String(template.sample || '')}

学员复述：
${transcript}`
    const data = await callModel({
      model: process.env.BAILIAN_CHAT_MODEL || 'qwen3-vl-flash',
      messages: [
        { role: 'system', content: coachingPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 700,
    })
    return parseJsonResult(data)
  }

  throw new Error('unsupported-action')
}

export async function handler(event) {
  let request
  try {
    request = parseEvent(event)
  } catch (error) {
    return response(error.message === 'payload-too-large' ? 413 : 400, { error: error.message === 'payload-too-large' ? '媒体文件过大。' : '请求格式无效。' })
  }

  const originAllowed = allowedOrigins().includes(request.origin)
  if (!originAllowed) return response(403, { error: '来源未获授权。' })
  if (request.method === 'OPTIONS') return response(204, {}, request.origin)
  if (request.method !== 'POST') return response(405, { error: '仅支持 POST 请求。' }, request.origin)

  try {
    return response(200, await handleAction(request.body), request.origin)
  } catch (error) {
    if (error.message === 'unsupported-action') return response(400, { error: '不支持的请求。' }, request.origin)
    if (error.message === 'server-not-configured') return response(503, { error: '云端服务尚未配置。' }, request.origin)
    return response(502, { error: '云端服务暂时不可用。' }, request.origin)
  }
}
