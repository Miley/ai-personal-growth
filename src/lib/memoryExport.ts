import type { MemoryExport } from '../types'

export async function exportMemoryFile(payload: MemoryExport): Promise<'shared' | 'downloaded'> {
  const file = new File(
    [JSON.stringify(payload, null, 2)],
    `another-me-memories-${payload.exportedAt.slice(0, 10)}.json`,
    { type: 'application/json' },
  )

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: '另一个我 · 记忆备份' })
    return 'shared'
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
