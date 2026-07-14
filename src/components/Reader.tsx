import { useMemo, useState } from 'react'
import { READING_UNITS } from '../data/reading'
import { createReadingFromImage, type GeneratedReading } from '../lib/ai'
import { filterReadingUnits } from '../lib/learning'
import { saveMemory } from '../lib/storage'
import type { GatewaySettings, ReadingLevel, ReadingUnit } from '../types'

const levelLabels: Record<ReadingLevel, string> = { starter: '起步', bridge: '过渡', steady: '稳定阅读' }

function speak(text: string) {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.82
  window.speechSynthesis.speak(utterance)
}

export function Reader({ onMemoryChanged, settings }: { onMemoryChanged: () => void; settings: GatewaySettings }) {
  const [level, setLevel] = useState<ReadingLevel>('starter')
  const units = useMemo(() => filterReadingUnits(READING_UNITS, level), [level])
  const [activeId, setActiveId] = useState(units[0].id)
  const [note, setNote] = useState<string>()
  const [answer, setAnswer] = useState('')
  const [imageReading, setImageReading] = useState<GeneratedReading>()
  const [imageLoading, setImageLoading] = useState(false)
  const active = (READING_UNITS.find((item) => item.id === activeId) || units[0]) as ReadingUnit

  const chooseLevel = (nextLevel: ReadingLevel) => {
    setLevel(nextLevel)
    setActiveId(filterReadingUnits(READING_UNITS, nextLevel)[0].id)
    setNote(undefined)
    setAnswer('')
  }

  const savePhrase = (phrase: string) => {
    saveMemory({ scope: 'english', text: `《${active.title}》：${phrase}` })
    onMemoryChanged()
  }

  const createFromImage = async (file?: File) => {
    if (!file) return
    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setImageLoading(true)
    try {
      setImageReading(await createReadingFromImage(imageDataUrl, settings, level))
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <section className="mode-page reader-page">
      <header className="mode-header">
        <span className="eyebrow">英语阅读</span>
        <h1>先读下去，再慢慢懂</h1>
        <p>不预先铺满翻译；只在真正卡住时点开帮助。</p>
      </header>
      <div className="level-tabs">
        {(Object.keys(levelLabels) as ReadingLevel[]).map((item) => <button key={item} onClick={() => chooseLevel(item)} className={level === item ? 'active' : ''}>{levelLabels[item]}</button>)}
      </div>
      <label className="image-reading-button">从一张照片生成我的小阅读<input type="file" accept="image/*" onChange={(event) => createFromImage(event.target.files?.[0])} /></label>
      {imageLoading && <p className="image-reading-status">正在生成；图片只用于本次请求，不会保存。</p>}
      {imageReading && <article className="image-reading"><span className="eyebrow">我的照片阅读</span><h2>{imageReading.title}</h2><p>{imageReading.body}</p></article>}
      <div className="reading-list">
        {units.map((unit) => <button key={unit.id} className={active.id === unit.id ? 'active' : ''} onClick={() => { setActiveId(unit.id); setNote(undefined); setAnswer('') }}><span>{unit.category === 'parenting' ? '亲子' : unit.category === 'travel' ? '旅行' : '世界'}</span>{unit.title}<small>{unit.minutes} 分钟</small></button>)}
      </div>
      <article className="reading-card">
        <div className="reading-title"><div><span className="eyebrow">{levelLabels[active.level]} · {active.minutes} 分钟</span><h2>{active.title}</h2></div><button onClick={() => speak(active.paragraphs.join(' '))}>听读</button></div>
        {active.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <div className="word-notes"><strong>遇到卡住的词再点：</strong>{Object.entries(active.notes).map(([word, meaning]) => <button key={word} onClick={() => setNote(`${word}：${meaning}`)}>{word}</button>)}</div>
        {note && <div className="inline-note">{note}</div>}
        <div className="phrase-save"><button onClick={() => savePhrase(Object.keys(active.notes)[0])}>收藏一个表达</button><span>会附带原文来源保存。</span></div>
        <div className="reading-question"><strong>{active.question}</strong><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="用中文或简单英文回答都可以" rows={2} />{answer && <p>提示：{active.answerHint}</p>}</div>
      </article>
    </section>
  )
}
