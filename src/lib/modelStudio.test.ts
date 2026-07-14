import { afterEach, describe, expect, it, vi } from 'vitest'
import { transcribeAudio } from './modelStudio'
import type { GatewaySettings } from '../types'

const settings: GatewaySettings = {
  apiBaseUrl: 'https://example.fcapp.run',
}

afterEach(() => vi.restoreAllMocks())

describe('Model Studio requests', () => {
  it('sends browser audio through the function endpoint and returns its transcript', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      text: '今天的会议我想补充一点。',
    }), { status: 200 }))

    await expect(transcribeAudio('data:audio/webm;base64,AQID', settings)).resolves.toBe('今天的会议我想补充一点。')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.fcapp.run',
      expect.objectContaining({ body: JSON.stringify({ action: 'transcribe', audioDataUrl: 'data:audio/webm;base64,AQID' }) }),
    )
  })
})
