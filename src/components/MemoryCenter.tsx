import { useState } from 'react'
import { exportMemoryFile } from '../lib/memoryExport'
import { createMemoryExport, deleteMemory, loadMemories } from '../lib/storage'
import type { MemoryScope } from '../types'

const labels: Record<MemoryScope, string> = { companion: '同伴记忆', practice: '表达记录', english: '英语收藏' }

export function MemoryCenter({ version, onChanged }: { version: number; onChanged: () => void }) {
  const [scope, setScope] = useState<MemoryScope>('companion')
  const [exportStatus, setExportStatus] = useState('')
  const memories = loadMemories(scope)
  const exportPayload = createMemoryExport()

  async function handleExport() {
    setExportStatus('正在准备记忆文件…')
    try {
      const result = await exportMemoryFile(exportPayload)
      setExportStatus(result === 'shared' ? '记忆文件已分享。' : '记忆文件已下载。')
    } catch (error) {
      setExportStatus(error instanceof DOMException && error.name === 'AbortError'
        ? '已取消导出。'
        : '导出失败，请稍后重试。')
    }
  }

  return (
    <section className="mode-page">
      <header className="mode-header"><span className="eyebrow">你的数据</span><h1>记忆与隐私</h1><p>这里仅展示你明确保存的文字。原始图片和录音不会出现在这里。</p></header>
      <div className="memory-export">
        <div><strong>把记忆带到电脑</strong><p>导出全部已保存的文字记忆，不包含图片、录音或接口设置。可用隔空投送或“存储到文件”发送。</p></div>
        <button className="primary" disabled={!exportPayload.memories.length} onClick={handleExport}>导出记忆</button>
        {exportStatus && <small aria-live="polite">{exportStatus}</small>}
      </div>
      <div className="level-tabs">{(Object.keys(labels) as MemoryScope[]).map((item) => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{labels[item]}</button>)}</div>
      <div className="memory-list" key={`${scope}-${version}`}>
        {memories.length ? memories.map((memory) => <article key={memory.id}><p>{memory.text}</p><small>{new Date(memory.createdAt).toLocaleString('zh-CN')}</small><button onClick={() => { deleteMemory(memory.id); onChanged() }}>删除</button></article>) : <p className="empty">这里还没有内容。只有你主动点过“记住”或“收藏”的文字会出现在这里。</p>}
      </div>
    </section>
  )
}
