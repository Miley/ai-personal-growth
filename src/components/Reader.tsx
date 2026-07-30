import { useEffect, useMemo, useState } from 'react'
import { READING_UNITS } from '../data/reading'
import { createReadingFromImage, getDailyReading, type GeneratedReading } from '../lib/ai'
import { rotateDailyReadingUnits } from '../lib/learning'
import { loadDailyReading, saveDailyReading, saveMemory } from '../lib/storage'
import type { GatewaySettings, ReadingLevel, ReadingUnit } from '../types'

const levelLabels: Record<ReadingLevel, string> = { starter: '起步', bridge: '过渡', steady: '稳定阅读' }
const categoryLabels: Record<ReadingUnit['category'], string> = { everyday: '日常', parenting: '亲子', travel: '旅行', world: '世界' }

function sameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function speak(text: string) {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.82
  window.speechSynthesis.speak(utterance)
}

export function Reader({ onMemoryChanged, settings }: { onMemoryChanged: () => void; settings: GatewaySettings }) {
  const [level, setLevel] = useState<ReadingLevel>('starter')
  const [today, setToday] = useState(() => new Date())
  const dateKey = localDateKey(today)
  const fallbackUnits = useMemo(() => rotateDailyReadingUnits(READING_UNITS, level, today), [level, today])
  const [dailyReading, setDailyReading] = useState<ReadingUnit>()
  const [dailyStatus, setDailyStatus] = useState<'loading' | 'generated' | 'fallback'>('loading')
  const displayUnits = useMemo(() => {
    const first = dailyReading || fallbackUnits[0]
    return [first, ...fallbackUnits.filter((unit) => unit.id !== first.id)]
  }, [dailyReading, fallbackUnits])
  const [activeId, setActiveId] = useState(fallbackUnits[0].id)
  const [note, setNote] = useState<string>()
  const [answer, setAnswer] = useState('')
  const [imageReading, setImageReading] = useState<GeneratedReading>()
  const [imageLoading, setImageLoading] = useState(false)
  const active = displayUnits.find((item) => item.id === activeId) || displayUnits[0]

  useEffect(() => {
    const refreshDate = () => {
      const current = new Date()
      setToday((previous) => sameDay(previous, current) ? previous : current)
    }
    const timer = window.setInterval(refreshDate, 60_000)
    window.addEventListener('focus', refreshDate)
    document.addEventListener('visibilitychange', refreshDate)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshDate)
      document.removeEventListener('visibilitychange', refreshDate)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fallback = fallbackUnits[0]
    const cached = loadDailyReading(dateKey, level)
    setNote(undefined)
    setAnswer('')
    if (cached) {
      setDailyReading(cached)
      setDailyStatus('generated')
      setActiveId(cached.id)
      return () => { cancelled = true }
    }

    setDailyReading(undefined)
    setDailyStatus('loading')
    setActiveId(fallback.id)
    getDailyReading(dateKey, level, settings)
      .then((reading) => {
        if (cancelled) return
        saveDailyReading(dateKey, level, reading)
        setDailyReading(reading)
        setDailyStatus('generated')
        setActiveId(reading.id)
      })
      .catch(() => {
        if (cancelled) return
        setDailyStatus('fallback')
      })
    return () => { cancelled = true }
  }, [dateKey, fallbackUnits, level, settings])

  const chooseLevel = (nextLevel: ReadingLevel) => {
    setLevel(nextLevel)
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
      <div className="daily-reading-note"><strong>今日阅读</strong><span>{today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · {dailyStatus === 'loading' ? '正在生成今日新文章…' : dailyStatus === 'generated' ? '每天首次打开生成一篇新文章，当天保持不变。' : '今日新文章生成失败，暂时显示本地备用内容。'}</span></div>
      <label className="image-reading-button">从一张照片生成我的小阅读<input type="file" accept="image/*" onChange={(event) => createFromImage(event.target.files?.[0])} /></label>
      {imageLoading && <p className="image-reading-status">正在生成；图片只用于本次请求，不会保存。</p>}
      {imageReading && <article className="image-reading"><span className="eyebrow">我的照片阅读</span><h2>{imageReading.title}</h2><p>{imageReading.body}</p></article>}
      <div className="reading-list">
        {displayUnits.map((unit, index) => <button key={unit.id} className={active.id === unit.id ? 'active' : ''} onClick={() => { setActiveId(unit.id); setNote(undefined); setAnswer('') }}><span>{index === 0 ? `${dailyStatus === 'generated' ? '今日新文章' : '今日备用'} · ${categoryLabels[unit.category]}` : `更多练习 · ${categoryLabels[unit.category]}`}</span>{unit.title}<small>{unit.minutes} 分钟</small></button>)}
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
