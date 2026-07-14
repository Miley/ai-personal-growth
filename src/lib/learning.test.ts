import { describe, expect, it } from 'vitest'
import { createPracticeFeedback, filterReadingUnits } from './learning'
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
