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
})
