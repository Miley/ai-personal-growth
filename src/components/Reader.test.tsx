import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDailyReading } from '../lib/ai'
import { saveDailyReading } from '../lib/storage'
import type { ReadingUnit } from '../types'
import { Reader } from './Reader'

vi.mock('../lib/ai', () => ({
  createReadingFromImage: vi.fn(),
  getDailyReading: vi.fn(),
}))

const generatedReading: ReadingUnit = {
  id: 'daily-test-starter',
  level: 'starter',
  category: 'everyday',
  title: 'The Extra Umbrella',
  minutes: 2,
  paragraphs: ['Mia sees an extra umbrella near the door.'],
  notes: { extra: '额外的' },
  question: 'What does Mia see?',
  answerHint: 'An extra umbrella.',
}

function todayKey(): string {
  const today = new Date()
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')
}

describe('Reader', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    vi.mocked(getDailyReading).mockResolvedValue(generatedReading)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  it('shows the generated article as today’s new reading and keeps local material as extra practice', async () => {
    await act(async () => {
      root.render(<Reader onMemoryChanged={vi.fn()} settings={{ apiBaseUrl: 'https://example.fcapp.run' }} />)
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain('The Extra Umbrella'))
    })

    expect(container.textContent).toContain('今日新文章')
    expect(container.textContent).toContain('更多练习')
    expect(container.textContent).toContain('当天保持不变')
    expect(getDailyReading).toHaveBeenCalledOnce()
  })

  it('reuses today’s cached article without requesting the cloud again', async () => {
    saveDailyReading(todayKey(), 'starter', generatedReading)

    await act(async () => {
      root.render(<Reader onMemoryChanged={vi.fn()} settings={{ apiBaseUrl: 'https://example.fcapp.run' }} />)
    })

    expect(container.textContent).toContain('The Extra Umbrella')
    expect(container.textContent).toContain('今日新文章')
    expect(getDailyReading).not.toHaveBeenCalled()
  })

  it('labels the local fallback when daily generation is unavailable', async () => {
    vi.mocked(getDailyReading).mockRejectedValue(new Error('offline'))

    await act(async () => {
      root.render(<Reader onMemoryChanged={vi.fn()} settings={{ apiBaseUrl: 'https://example.fcapp.run' }} />)
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain('本地备用内容'))
    })

    expect(container.textContent).toContain('今日备用')
  })
})
