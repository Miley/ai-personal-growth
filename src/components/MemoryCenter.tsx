import { useState } from 'react'
import { deleteMemory, loadMemories } from '../lib/storage'
import type { MemoryScope } from '../types'

const labels: Record<MemoryScope, string> = { companion: '同伴记忆', practice: '表达记录', english: '英语收藏' }

export function MemoryCenter({ version, onChanged }: { version: number; onChanged: () => void }) {
  const [scope, setScope] = useState<MemoryScope>('companion')
  const memories = loadMemories(scope)

  return (
    <section className="mode-page">
      <header className="mode-header"><span className="eyebrow">你的数据</span><h1>记忆与隐私</h1><p>这里仅展示你明确保存的文字。原始图片和录音不会出现在这里。</p></header>
      <div className="level-tabs">{(Object.keys(labels) as MemoryScope[]).map((item) => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{labels[item]}</button>)}</div>
      <div className="memory-list" key={`${scope}-${version}`}>
        {memories.length ? memories.map((memory) => <article key={memory.id}><p>{memory.text}</p><small>{new Date(memory.createdAt).toLocaleString('zh-CN')}</small><button onClick={() => { deleteMemory(memory.id); onChanged() }}>删除</button></article>) : <p className="empty">这里还没有内容。只有你主动点过“记住”或“收藏”的文字会出现在这里。</p>}
      </div>
    </section>
  )
}
