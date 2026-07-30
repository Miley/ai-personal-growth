import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handler } from './index.mjs'

const origin = 'https://miley.github.io'

function event(body: object, requestOrigin = origin, method = 'POST') {
  return JSON.stringify({
    headers: { origin: requestOrigin },
    body: JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method } },
  })
}

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = origin
  process.env.BAILIAN_API_KEY = 'sk-server-only'
  process.env.BAILIAN_WORKSPACE_ID = 'ws-example'
  process.env.BAILIAN_CHAT_MODEL = 'qwen3-vl-flash'
})

afterEach(() => vi.restoreAllMocks())

describe('Function Compute AI proxy', () => {
  it('rejects unknown actions without calling Model Studio', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    const result = await handler(event({ action: 'unknown' }))

    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ error: '不支持的请求。' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects requests from origins outside the allow list', async () => {
    const result = await handler(event({ action: 'chat', text: '你好' }, 'https://other.example'))

    expect(result.statusCode).toBe(403)
    expect(JSON.parse(result.body)).toEqual({ error: '来源未获授权。' })
  })

  it('leaves CORS response headers to the Function Compute gateway', async () => {
    const result = await handler(event({ action: 'unknown' }))

    expect(result.headers).not.toHaveProperty('Access-Control-Allow-Origin')
    expect(result.headers).not.toHaveProperty('Access-Control-Allow-Methods')
    expect(result.headers).not.toHaveProperty('Access-Control-Allow-Headers')
  })

  it('uses the server key to proxy a chat request and returns only text', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '我听见你了。' } }],
    })))

    const result = await handler(event({ action: 'chat', text: '今天有点累。' }))

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ text: '我听见你了。' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ws-example.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sk-server-only' }) }),
    )
  })

  it('returns structured coaching for a speech retelling', async () => {
    const modelFeedback = {
      overall: '观点清楚，结构已经成形。',
      strengths: ['开头给出了判断', '理由之间有层次'],
      priority: {
        title: '让结尾更明确',
        evidence: '结尾没有给出下一步。',
        action: '补一句希望听众采取的行动。',
      },
      modelOpening: '我的建议是先做一周的小范围验证。',
      nextPractice: '只重练开头和结尾。',
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelFeedback) } }],
    })))

    const result = await handler(event({
      action: 'speech-feedback',
      template: {
        title: '先把判断说清楚',
        objective: '提出一个可执行建议',
        imitationFocus: '结论先行',
      },
      transcript: '我建议先做小范围验证，因为风险可控。',
    }))

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual(modelFeedback)
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(payload.messages[1].content).toContain('我建议先做小范围验证')
    expect(payload.messages[0].content).toContain('只指出一个最优先改进点')
  })

  it('generates a structured English reading for the requested date and level', async () => {
    const dailyReading = {
      title: 'The Extra Umbrella',
      category: 'everyday',
      minutes: 2,
      paragraphs: ['Mia sees an extra umbrella near the door.', 'She takes it to her neighbor before the rain starts.'],
      notes: { extra: '额外的', neighbor: '邻居' },
      question: 'Why does Mia visit her neighbor?',
      answerHint: 'She wants to bring the umbrella before it rains.',
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(dailyReading)}\n\`\`\`` } }],
    })))

    const result = await handler(event({ action: 'daily-reading', date: '2026-07-30', level: 'starter' }))

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual(dailyReading)
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(payload.messages[1].content).toContain('2026-07-30')
    expect(payload.messages[1].content).toContain('starter')
    expect(payload.messages[0].content).toContain('只返回合法 JSON')
  })
})
