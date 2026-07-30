import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReadingFromImage, getCompanionReply, getDailyReading, getSpeechFeedback } from './ai'
import type { SpeechTemplate } from '../types'

const speechTemplate: SpeechTemplate = {
  id: 'small-test',
  category: 'persuasion',
  title: '先做小范围验证',
  audience: '管理者',
  minutes: 2,
  objective: '提出一个可执行建议',
  paragraphs: ['我的建议是先做一次小范围验证。'],
  studyPoints: ['结论先行'],
  imitationFocus: '结论先行，再用行动收束',
}

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

  it('requests structured speech coaching from the configured gateway', async () => {
    const cloudFeedback = {
      overall: '结构清楚。',
      strengths: ['观点出现得早', '理由具体'],
      priority: { title: '补行动', evidence: '结尾停在理由', action: '最后提出一个下一步。' },
      modelOpening: '我的建议是先做一周验证。',
      nextPractice: '只重练结尾。',
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(cloudFeedback)))

    await expect(getSpeechFeedback(
      speechTemplate,
      '我的建议是先做小范围验证，因为风险可控。',
      { apiBaseUrl: 'https://example.fcapp.run' },
    )).resolves.toEqual({ ...cloudFeedback, source: 'ai' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.fcapp.run',
      expect.objectContaining({
        body: expect.stringContaining('"action":"speech-feedback"'),
      }),
    )
  })

  it('requests and validates the new reading for a specific day and level', async () => {
    const generated = {
      title: 'The Extra Umbrella',
      category: 'everyday',
      minutes: 2,
      paragraphs: ['Mia sees an extra umbrella near the door.', 'She takes it to her neighbor before the rain starts.'],
      notes: { extra: '额外的', neighbor: '邻居' },
      question: 'Why does Mia visit her neighbor?',
      answerHint: 'She wants to bring the umbrella before it rains.',
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(generated)))

    await expect(getDailyReading('2026-07-30', 'starter', { apiBaseUrl: 'https://example.fcapp.run' })).resolves.toEqual({
      ...generated,
      id: 'daily-2026-07-30-starter',
      level: 'starter',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.fcapp.run',
      expect.objectContaining({
        body: JSON.stringify({ action: 'daily-reading', date: '2026-07-30', level: 'starter' }),
      }),
    )
  })

  it('rejects an invalid daily reading instead of caching broken content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ title: 'Incomplete' })))

    await expect(getDailyReading('2026-07-30', 'starter', { apiBaseUrl: 'https://example.fcapp.run' })).rejects.toThrow('每日阅读格式无效')
  })

  it('falls back to focused local feedback when cloud coaching fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('unavailable', { status: 502 }))

    const feedback = await getSpeechFeedback(
      speechTemplate,
      '我建议先做小范围验证。第一，风险可控。第二，可以更快获得反馈。',
      { apiBaseUrl: 'https://example.fcapp.run' },
    )

    expect(feedback.source).toBe('local')
    expect(feedback.priority.title).toBeTruthy()
  })
})
