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

  if (body.action === 'transcribe') {
    const data = await callModel({
      model: 'qwen3-asr-flash',
      messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: body.audioDataUrl } }] }],
      stream: false,
      asr_options: { enable_itn: true },
    })
    return { text: resultText(data) }
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
