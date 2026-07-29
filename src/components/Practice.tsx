import { useEffect, useMemo, useRef, useState } from 'react'
import { SPEECH_TEMPLATES } from '../data/speeches'
import { getSpeechFeedback } from '../lib/ai'
import { rotateDailySpeechTemplates } from '../lib/learning'
import { transcribeAudio } from '../lib/modelStudio'
import { loadSpeechPracticeRecords, saveSpeechPracticeRecord } from '../lib/storage'
import type { GatewaySettings, SpeechFeedback, SpeechPracticeRecord } from '../types'

type PracticePhase = 'study' | 'practice' | 'feedback'

const categoryLabels = {
  briefing: '工作汇报',
  persuasion: '观点说服',
  story: '复盘叙事',
  reflection: '主题演讲',
} as const

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function Practice({ settings }: { settings: GatewaySettings }) {
  const template = useMemo(() => rotateDailySpeechTemplates(SPEECH_TEMPLATES)[0], [])
  const [phase, setPhase] = useState<PracticePhase>('study')
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState<SpeechFeedback | null>(null)
  const [records, setRecords] = useState<SpeechPracticeRecord[]>(loadSpeechPracticeRecords)
  const [showReference, setShowReference] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [recordingNotice, setRecordingNotice] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const beginPractice = () => {
    setPhase('practice')
    setDraft('')
    setFeedback(null)
    setShowReference(false)
    setRecordingNotice('')
  }

  const submit = async () => {
    const transcript = draft.trim()
    if (!transcript || recording || transcribing || feedbackLoading) return

    setFeedbackLoading(true)
    setRecordingNotice('正在分析这次复述…')
    const nextFeedback = await getSpeechFeedback(template, transcript, settings)
    const nextRecords = saveSpeechPracticeRecord({
      date: localDateKey(),
      templateId: template.id,
      templateTitle: template.title,
      transcript,
      feedback: nextFeedback,
    })
    setFeedback(nextFeedback)
    setRecords(nextRecords)
    setPhase('feedback')
    setRecordingNotice('')
    setFeedbackLoading(false)
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => chunks.push(event.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        setTranscribing(true)
        setRecordingNotice('正在把录音转成文字…')
        try {
          const transcript = await transcribeAudio(await readAsDataUrl(audio), settings)
          setDraft((current) => [current.trim(), transcript].filter(Boolean).join('\n'))
          setRecordingNotice('转写完成，可以修改后提交。')
        } catch {
          setRecordingNotice('转写失败，请检查网络后重试；也可以直接输入文字。')
        } finally {
          setTranscribing(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setRecordingNotice('正在录音，再点一次结束。')
    } catch {
      setRecordingNotice('无法使用麦克风，请在浏览器设置中允许录音权限。')
    }
  }

  if (phase === 'study') {
    return (
      <section className="mode-page">
        <header className="mode-header">
          <span className="eyebrow">今日演讲范本</span>
          <h1>{template.title}</h1>
          <p>先理解它为什么有效，再用自己的语言复述。不需要逐字背诵。</p>
        </header>

        <div className="speech-meta">
          <span>{categoryLabels[template.category]}</span>
          <span>{template.minutes} 分钟</span>
          <span>听众：{template.audience}</span>
        </div>

        <article className="speech-card">
          {template.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>

        <section className="study-guide">
          <span className="eyebrow">学习时只抓三件事</span>
          <ol>
            {template.studyPoints.map((point) => <li key={point}>{point}</li>)}
          </ol>
          <p><strong>今天重点模仿：</strong>{template.imitationFocus}</p>
        </section>

        <button className="primary large" onClick={beginPractice}>开始复述</button>

        {records.length > 0 && (
          <section className="practice-history">
            <span className="eyebrow">最近训练</span>
            {records.slice(0, 3).map((record) => (
              <article key={record.id}>
                <div><strong>{record.templateTitle}</strong><small>{record.date}</small></div>
                <p>上次重点：{record.feedback.priority.title}</p>
              </article>
            ))}
          </section>
        )}
      </section>
    )
  }

  if (phase === 'feedback' && feedback) {
    return (
      <section className="mode-page">
        <header className="mode-header">
          <span className="eyebrow">本次反馈</span>
          <h1>今天只改一个点</h1>
          <p>{feedback.overall}</p>
        </header>

        {feedback.source === 'local' && <p className="feedback-source">云端暂时不可用，本次使用本地基础反馈；训练记录仍已保存在本机。</p>}

        <section className="feedback-section">
          <h2>已经做好的</h2>
          <ul>{feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="feedback-priority">
          <span className="eyebrow">最优先改进</span>
          <h2>{feedback.priority.title}</h2>
          <p>{feedback.priority.evidence}</p>
          <strong>{feedback.priority.action}</strong>
        </section>

        <section className="feedback-section">
          <h2>示范开头</h2>
          <blockquote>{feedback.modelOpening}</blockquote>
        </section>

        <section className="next-practice">
          <span className="eyebrow">下一次只练这个</span>
          <p>{feedback.nextPractice}</p>
        </section>

        <div className="feedback-actions">
          <button className="primary" onClick={beginPractice}>再练一次</button>
          <button onClick={() => setPhase('study')}>返回范本</button>
        </div>
      </section>
    )
  }

  return (
    <section className="mode-page">
      <header className="mode-header">
        <span className="eyebrow">复述练习</span>
        <h1>不用背，讲出你的版本</h1>
        <p>建议说 90–180 秒。保留范本的结构，也可以换成你熟悉的工作情境。</p>
      </header>

      <div className="practice-focus"><strong>今天重点：</strong>{template.imitationFocus}</div>

      <button className="reference-toggle" onClick={() => setShowReference((current) => !current)}>
        {showReference ? '收起范本' : '需要时查看范本'}
      </button>
      {showReference && (
        <article className="speech-card compact">
          {template.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
      )}

      <div className="practice-input">
        <label htmlFor="practice-draft">录音会先转成文字，你确认后才会提交分析。</label>
        <textarea
          id="practice-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="点击“开始录音”，或直接输入你的复述。"
          rows={7}
        />
        <div className="practice-actions">
          <button type="button" className={recording ? 'recording' : 'voice'} onClick={toggleRecording} disabled={transcribing || feedbackLoading}>
            {transcribing ? '正在转写…' : recording ? '结束录音' : '开始录音'}
          </button>
          <button type="button" className="primary" onClick={submit} disabled={!draft.trim() || recording || transcribing || feedbackLoading}>
            {feedbackLoading ? '分析中…' : '提交复述'}
          </button>
        </div>
        {recordingNotice && <p className="practice-notice" aria-live="polite">{recordingNotice}</p>}
      </div>
    </section>
  )
}
