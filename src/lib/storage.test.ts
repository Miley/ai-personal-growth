import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllLocalData,
  clearMemories,
  createMemoryExport,
  loadMemories,
  loadDailyReading,
  loadSettings,
  loadSpeechPracticeRecords,
  saveMemory,
  saveDailyReading,
  saveSettings,
  saveSpeechPracticeRecord,
} from './storage'
import type { ReadingUnit } from '../types'

const memory = {
  scope: 'companion' as const,
  text: '今天有点累，但晚饭时宝宝笑得很开心。',
}

const dailyReading: ReadingUnit = {
  id: 'daily-2026-07-30-starter',
  level: 'starter',
  category: 'everyday',
  title: 'The Extra Umbrella',
  minutes: 2,
  paragraphs: ['Mia sees an extra umbrella near the door.'],
  notes: { extra: '额外的' },
  question: 'What does Mia see?',
  answerHint: 'An extra umbrella.',
}

describe('memory storage', () => {
  beforeEach(() => localStorage.clear())

  it('keeps memories isolated by mode', () => {
    saveMemory(memory)
    saveMemory({ scope: 'english', text: 'take your time' })

    expect(loadMemories('companion')).toHaveLength(1)
    expect(loadMemories('companion')[0].text).toBe(memory.text)
    expect(loadMemories('practice')).toEqual([])
  })

  it('clears only the selected mode', () => {
    saveMemory(memory)
    saveMemory({ scope: 'english', text: 'take your time' })

    clearMemories('english')

    expect(loadMemories('english')).toEqual([])
    expect(loadMemories('companion')).toHaveLength(1)
  })

  it('persists only the non-secret function endpoint setting', () => {
    saveSettings({ apiBaseUrl: 'https://example.fcapp.run' })

    expect(loadSettings()).toEqual({ apiBaseUrl: 'https://example.fcapp.run' })
  })

  it('exports confirmed memories without gateway settings', () => {
    saveMemory(memory)
    saveMemory({ scope: 'english', text: 'take your time' })
    saveSettings({ apiBaseUrl: 'https://example.fcapp.run' })

    const exported = createMemoryExport('2026-07-14T08:00:00.000Z')

    expect(exported).toMatchObject({
      version: 1,
      source: 'iphone-pwa',
      exportedAt: '2026-07-14T08:00:00.000Z',
    })
    expect(exported.memories.map(({ scope, text }) => ({ scope, text }))).toEqual([
      { scope: 'english', text: 'take your time' },
      memory,
    ])
    expect(exported).not.toHaveProperty('apiBaseUrl')
    expect(exported).not.toHaveProperty('settings')
  })

  it('keeps only the latest speech practice for each day', () => {
    const base = {
      date: '2026-07-29',
      templateId: 'speech-1',
      templateTitle: '先把判断说清楚',
      feedback: {
        source: 'local' as const,
        overall: '结构已经成形。',
        strengths: ['有明确观点', '有具体依据'],
        priority: { title: '压缩开头', evidence: '开头铺垫较长', action: '第一句直接说结论。' },
        modelOpening: '我的建议是先做小范围验证。',
        nextPractice: '把开头再说一次。',
      },
    }

    saveSpeechPracticeRecord({ ...base, transcript: '第一次复述。' }, '2026-07-29T08:00:00.000Z')
    saveSpeechPracticeRecord({ ...base, transcript: '第二次复述。' }, '2026-07-29T09:00:00.000Z')

    expect(loadSpeechPracticeRecords()).toHaveLength(1)
    expect(loadSpeechPracticeRecords()[0].transcript).toBe('第二次复述。')
  })

  it('caches one generated reading for each day and level', () => {
    saveDailyReading('2026-07-30', 'starter', dailyReading)

    expect(loadDailyReading('2026-07-30', 'starter')).toEqual(dailyReading)
    expect(loadDailyReading('2026-07-31', 'starter')).toBeUndefined()
    expect(loadDailyReading('2026-07-30', 'bridge')).toBeUndefined()
  })

  it('clears speech practice records with the rest of the local data', () => {
    saveSpeechPracticeRecord({
      date: '2026-07-29',
      templateId: 'speech-1',
      templateTitle: '先把判断说清楚',
      transcript: '今天的复述。',
      feedback: {
        source: 'local',
        overall: '完成。',
        strengths: ['有开头', '有结尾'],
        priority: { title: '补依据', evidence: '依据偏少', action: '补一个事实。' },
        modelOpening: '我的判断是……',
        nextPractice: '再说一次。',
      },
    })

    clearAllLocalData()

    expect(loadSpeechPracticeRecords()).toEqual([])
    expect(loadDailyReading('2026-07-30', 'starter')).toBeUndefined()
  })
})
