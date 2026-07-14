import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestAi } from './apiGateway'

afterEach(() => vi.restoreAllMocks())

describe('AI gateway', () => {
  it('sends only the action payload to the configured function endpoint', async () => {
    vi.stubEnv('VITE_AI_API_BASE', 'https://example.cn-hangzhou.fcapp.run')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: '收到。' })))

    await expect(requestAi<{ text: string }>('chat', { text: '今天有点累。' })).resolves.toEqual({ text: '收到。' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.cn-hangzhou.fcapp.run',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'chat', text: '今天有点累。' }),
      }),
    )
  })
})
