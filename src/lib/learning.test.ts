import { describe, expect, it } from 'vitest'
import { createPracticeFeedback, filterReadingUnits, rotateDailyReadingUnits } from './learning'
import type { ReadingUnit } from '../types'

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

  it('creates one quote-based rehearsal point for a practice turn', () => {
    const feedback = createPracticeFeedback({
      goal: '接住对方刚说的细节，再追问一个具体点。',
      userText: '我也觉得周末过得很快。',
      partnerText: '我周末带孩子去看了一个小展，排队排得有点累。',
    })

    expect(feedback.effectiveQuote).toBe('我也觉得周末过得很快。')
    expect(feedback.rehearsal).toMatch(/排队/)
    expect(feedback.rehearsal).toMatch(/一个问题/)
  })
})
