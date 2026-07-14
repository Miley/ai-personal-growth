import { useState } from 'react'
import { getCompanionReply } from '../lib/ai'
import { saveMemory } from '../lib/storage'
import type { ChatMessage, GatewaySettings } from '../types'
import { Composer } from './Composer'

interface Props {
  settings: GatewaySettings
  onMemoryChanged: () => void
}

export function Companion({ settings, onMemoryChanged }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '我在。你可以从一件今天发生的小事、一个困惑，或一张图片开始。',
      createdAt: new Date().toISOString(),
    },
  ])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [candidateMemory, setCandidateMemory] = useState<string>()

  const send = async (imageDataUrl?: string) => {
    const text = draft.trim() || '我想和你分享这张图片。'
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', text, imageDataUrl, createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, userMessage])
    setThinking(true)
    try {
      const reply = await getCompanionReply(text, settings, imageDataUrl)
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: 'assistant', text: reply, createdAt: new Date().toISOString(),
      }])
      setCandidateMemory(text)
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: 'assistant', text: error instanceof Error ? error.message : '这次没有连上。', createdAt: new Date().toISOString(),
      }])
    } finally {
      setThinking(false)
    }
  }

  const remember = () => {
    if (!candidateMemory) return
    saveMemory({ scope: 'companion', text: candidateMemory })
    setCandidateMemory(undefined)
    onMemoryChanged()
  }

  return (
    <section className="mode-page companion-page">
      <header className="mode-header">
        <span className="eyebrow">私密同伴</span>
        <h1>和她聊聊</h1>
        <p>她会先听和追问。是否记住，由你决定。</p>
      </header>
      <div className="chat-thread">
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            {message.imageDataUrl && <img src={message.imageDataUrl} alt="本次对话图片" />}
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      {candidateMemory && (
        <div className="memory-candidate">
          <strong>要把这件事记住吗？</strong>
          <p>只会保存文字摘要，不保存原图或原始录音。</p>
          <button className="primary" onClick={remember}>记住</button>
          <button onClick={() => setCandidateMemory(undefined)}>这次不用</button>
        </div>
      )}
      <Composer value={draft} onChange={setDraft} onSend={send} disabled={thinking} settings={settings} />
    </section>
  )
}
