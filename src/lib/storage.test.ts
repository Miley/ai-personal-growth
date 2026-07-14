import { beforeEach, describe, expect, it } from 'vitest'
import { clearMemories, loadMemories, loadSettings, saveMemory, saveSettings } from './storage'

const memory = {
  scope: 'companion' as const,
  text: '今天有点累，但晚饭时宝宝笑得很开心。',
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
})
