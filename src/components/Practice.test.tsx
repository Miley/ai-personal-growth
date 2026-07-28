import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Practice } from './Practice'

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
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('shows voice recording and an explicit gated submit action in every round', () => {
    act(() => root.render(<Practice settings={{ apiBaseUrl: '' }} />))
    act(() => button(container, '开始这一轮').click())

    expect(button(container, '开始录音')).toBeTruthy()
    expect(button(container, '提交本回合').disabled).toBe(true)

    const textarea = container.querySelector('textarea')!
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        textarea,
        '我先说结论，再补充一个具体原因。',
      )
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(button(container, '提交本回合').disabled).toBe(false)
    act(() => button(container, '提交本回合').click())
    expect(button(container, '进入下一回合')).toBeTruthy()
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
    act(() => button(container, '开始这一轮').click())
    await act(async () => {
      button(container, '开始录音').click()
      await Promise.resolve()
    })

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(button(container, '结束录音')).toBeTruthy()
  })
})
