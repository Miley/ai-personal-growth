import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MemoryExport } from '../types'
import { exportMemoryFile } from './memoryExport'

const payload: MemoryExport = {
  version: 1,
  exportedAt: '2026-07-14T08:00:00.000Z',
  source: 'iphone-pwa',
  memories: [{
    id: 'memory-1',
    scope: 'companion',
    text: '今天有点累。',
    createdAt: '2026-07-14T07:00:00.000Z',
  }],
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

describe('memory export file', () => {
  it('shares a dated pretty-printed JSON file when iOS file sharing is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })

    await expect(exportMemoryFile(payload)).resolves.toBe('shared')

    const file = share.mock.calls[0][0].files[0] as File
    expect(file.name).toBe('another-me-memories-2026-07-14.json')
    expect(file.type).toBe('application/json')
    expect(await readFile(file)).toBe(JSON.stringify(payload, null, 2))
    expect(share).toHaveBeenCalledWith({ files: [file], title: '另一个我 · 记忆备份' })
  })

  it('downloads the same JSON file when file sharing is unavailable', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:memory-export')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await expect(exportMemoryFile(payload)).resolves.toBe('downloaded')

    const file = createObjectURL.mock.calls[0][0] as File
    expect(file.name).toBe('another-me-memories-2026-07-14.json')
    expect(file.type).toBe('application/json')
    expect(await readFile(file)).toBe(JSON.stringify(payload, null, 2))
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:memory-export')
  })
})
