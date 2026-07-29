import { describe, expect, it } from 'vitest'
import {
  createLocalSpeechFeedback,
  filterReadingUnits,
  rotateDailyReadingUnits,
  rotateDailySpeechTemplates,
} from './learning'
import type { ReadingUnit, SpeechTemplate } from '../types'

const units: ReadingUnit[] = [
  {
    id: 'starter-parenting',
    level: 'starter',
    category: 'parenting',
    title: 'Good morning',
    minutes: 3,
    paragraphs: ['Good morning.'],
    notes: {},
    question: 'What time is it?',
    answerHint: 'morning',
  },
  {
    id: 'bridge-travel',
    level: 'bridge',
    category: 'travel',
    title: 'At the hotel',
    minutes: 5,
    paragraphs: ['I have a reservation.'],
    notes: {},
    question: 'Where is the guest?',
    answerHint: 'hotel',
  },
]

describe('learning helpers', () => {
  it('filters reading material by level without hiding other categories', () => {
    expect(filterReadingUnits(units, 'starter').map((unit) => unit.id)).toEqual(['starter-parenting'])
  })

  it('puts a different reading first on the next day', () => {
    const starterUnits: ReadingUnit[] = [
      units[0],
      { ...units[0], id: 'starter-everyday', category: 'everyday', title: 'At the coffee shop' },
      { ...units[0], id: 'starter-travel', category: 'travel', title: 'At the station' },
    ]

    const firstDay = rotateDailyReadingUnits(starterUnits, 'starter', new Date('2026-07-28T08:00:00+08:00'))
    const sameDay = rotateDailyReadingUnits(starterUnits, 'starter', new Date('2026-07-28T20:00:00+08:00'))
    const nextDay = rotateDailyReadingUnits(starterUnits, 'starter', new Date('2026-07-29T08:00:00+08:00'))

    expect(firstDay[0].id).toBe(sameDay[0].id)
    expect(nextDay[0].id).not.toBe(firstDay[0].id)
    expect(firstDay).toHaveLength(3)
  })

  it('keeps the same speech template for a local day and rotates on the next day', () => {
    const templates: SpeechTemplate[] = ['判断', '故事', '说服'].map((title, index) => ({
      id: `speech-${index}`,
      category: 'briefing',
      title,
      audience: '同事',
      minutes: 2,
      objective: '说清一个观点',
      paragraphs: [`${title}正文`],
      studyPoints: ['先给结论'],
      imitationFocus: '结论先行',
    }))

    const morning = rotateDailySpeechTemplates(templates, new Date('2026-07-29T08:00:00+08:00'))
    const evening = rotateDailySpeechTemplates(templates, new Date('2026-07-29T20:00:00+08:00'))
    const nextDay = rotateDailySpeechTemplates(templates, new Date('2026-07-30T08:00:00+08:00'))

    expect(morning[0].id).toBe(evening[0].id)
    expect(nextDay[0].id).not.toBe(morning[0].id)
  })

  it('creates a focused local fallback when the AI gateway is unavailable', () => {
    const feedback = createLocalSpeechFeedback('我建议先做小范围验证。原因有两点。第一，风险可控。第二，可以更快拿到反馈。')

    expect(feedback.source).toBe('local')
    expect(feedback.strengths).toHaveLength(2)
    expect(feedback.priority.action).toBeTruthy()
    expect(feedback.nextPractice).toMatch(/再说一次/)
  })
})
