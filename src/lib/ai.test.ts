import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReadingFromImage, getCompanionReply } from './ai'

afterEach(() => vi.restoreAllMocks())

describe('companion replies', () => {
  it('uses a reflective local fallback when no gateway is configured', async () => {
    const reply = await getCompanionReply('今天开会时我一直没说话。', undefined)

    expect(reply).toMatch(/听到/)
    expect(reply).toMatch(/想/)
  })

  it('creates a clearly labelled local reading draft when no image gateway is configured', async () => {
    const draft = await createReadingFromImage(undefined, undefined, 'starter')

    expect(draft.title).toBe('A Small Moment')
    expect(draft.body).toMatch(/simple English/)
  })

  it('sends companion requests to the configured function without a browser API key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: '你已经注意到自己当时沉默了。' })))

    await expect(getCompanionReply('今天开会时我一直没说话。', { apiBaseUrl: 'https://example.fcapp.run' })).resolves.toBe('你已经注意到自己当时沉默了。')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.fcapp.run',
      expect.objectContaining({
        body: JSON.stringify({ action: 'chat', text: '今天开会时我一直没说话。' }),
      }),
    )
  })
})
