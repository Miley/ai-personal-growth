import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSpeechFeedback } from '../lib/ai'
import { Practice } from './Practice'

const speechFeedback = {
  source: 'ai' as const,
  overall: '你的核心判断清楚，已经能让听众跟上。',
  strengths: ['第一句给出了观点', '使用了一个具体例子'],
  priority: {
    title: '让结尾更有行动感',
    evidence: '结尾停在了观点，没有告诉听众下一步。',
    action: '最后补一句明确的下一步建议。',
  },
  modelOpening: '我的建议是先做一周的小范围验证。',
  nextPractice: '只重练开头和结尾，各说一遍。',
}

vi.mock('../lib/ai', () => ({
  getSpeechFeedback: vi.fn(),
}))

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label))
  if (!result) throw new Error(`找不到按钮：${label}`)
  return result
}

describe('Practice', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    vi.mocked(getSpeechFeedback).mockResolvedValue(speechFeedback)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('shows one stable daily speech template before recall practice', () => {
    act(() => root.render(<Practice settings={{ apiBaseUrl: '' }} />))

    expect(container.textContent).toContain('今日演讲范本')
    expect(container.textContent).toContain('学习时只抓三件事')
    expect(button(container, '开始复述')).toBeTruthy()
  })

  it('submits a transcript and shows focused feedback', async () => {
    act(() => root.render(<Practice settings={{ apiBaseUrl: '' }} />))
    act(() => button(container, '开始复述').click())

    expect(button(container, '开始录音')).toBeTruthy()
    expect(button(container, '提交复述').disabled).toBe(true)

    const textarea = container.querySelector('textarea')!
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        textarea,
        '我的建议是先做小范围验证。这样风险可控，也能更快拿到真实反馈。',
      )
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(button(container, '提交复述').disabled).toBe(false)
    await act(async () => {
      button(container, '提交复述').click()
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain('让结尾更有行动感'))
    })
    expect(button(container, '再练一次')).toBeTruthy()
  })

  it('requests microphone access when voice recording starts', async () => {
    const stopTrack = vi.fn()
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    class FakeMediaRecorder {
      state = 'inactive'
      mimeType = 'audio/webm'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null

      start() {
        this.state = 'recording'
      }

      stop() {
        this.state = 'inactive'
        this.onstop?.()
      }
    }
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)

    act(() => root.render(<Practice settings={{ apiBaseUrl: '' }} />))
    act(() => button(container, '开始复述').click())
    await act(async () => {
      button(container, '开始录音').click()
      await Promise.resolve()
    })

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(button(container, '结束录音')).toBeTruthy()
  })
})
