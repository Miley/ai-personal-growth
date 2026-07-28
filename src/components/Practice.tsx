import { useEffect, useMemo, useRef, useState } from 'react'
import { SCENARIOS } from '../data/scenarios'
import { createPracticeFeedback } from '../lib/learning'
import { transcribeAudio } from '../lib/modelStudio'
import type { GatewaySettings, PracticeLevel, PracticeScenario } from '../types'

const roundsByLevel: Record<PracticeLevel, number> = { quick: 1, standard: 5, deep: 8 }
const labels: Record<PracticeLevel, string> = { quick: '3 分钟', standard: '8 分钟', deep: '15 分钟' }

function partnerReply(scenario: PracticeScenario, round: number): string {
  const replies = [
    '嗯，是的。你平时遇到这种情况会怎么做？',
    '这倒是我没想到的。你说的那个细节让我有点好奇。',
    '听起来你有自己的判断。能再说具体一点吗？',
  ]
  return `${replies[(round - 1) % replies.length]}（${scenario.title} · 第 ${round + 1} 回合）`
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function Practice({ settings }: { settings: GatewaySettings }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [level, setLevel] = useState<PracticeLevel>('standard')
  const [round, setRound] = useState(0)
  const [partnerText, setPartnerText] = useState('')
  const [draft, setDraft] = useState('')
  const [lastUserText, setLastUserText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recordingNotice, setRecordingNotice] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scenario = useMemo(() => SCENARIOS.find((item) => item.id === scenarioId)!, [scenarioId])
  const totalRounds = roundsByLevel[level]
  const feedback = lastUserText ? createPracticeFeedback({ goal: scenario.goal, userText: lastUserText, partnerText }) : null

  useEffect(() => () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const start = () => {
    setRound(1)
    setPartnerText(scenario.partnerOpening)
    setDraft('')
    setLastUserText('')
    setRecordingNotice('')
  }

  const send = () => {
    if (!draft.trim() || recording || transcribing) return
    setLastUserText(draft.trim())
    setDraft('')
    setRecordingNotice('')
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

  const next = () => {
    const nextRound = round + 1
    if (nextRound > totalRounds) return
    setRound(nextRound)
    setPartnerText(partnerReply(scenario, round))
    setLastUserText('')
    setRecordingNotice('')
  }

  if (!round) {
    return (
      <section className="mode-page">
        <header className="mode-header">
          <span className="eyebrow">表达陪练</span>
          <h1>先让对话自然发生</h1>
          <p>不是录一段独白。每轮只练一个动作。</p>
        </header>
        <label className="field-label">今天的场景
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
            {SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <div className="scenario-card">
          <span>{scenario.category === 'social' ? '即兴聊天' : scenario.category === 'upward' ? '向上沟通' : '会议表达'}</span>
          <h2>{scenario.title}</h2>
          <p>{scenario.setup}</p>
          <strong>本轮目标：{scenario.goal}</strong>
        </div>
        <div className="level-choice">
          {(Object.keys(labels) as PracticeLevel[]).map((item) => (
            <button key={item} className={level === item ? 'selected' : ''} onClick={() => setLevel(item)}>
              {labels[item]}<small>{roundsByLevel[item]} 回合</small>
            </button>
          ))}
        </div>
        <button className="primary large" onClick={start}>开始这一轮</button>
      </section>
    )
  }

  return (
    <section className="mode-page">
      <div className="practice-progress">
        <span>{scenario.title}</span><strong>第 {round} / {totalRounds} 回合</strong>
      </div>
      <p className="goal">本轮目标：{scenario.goal}</p>
      <article className="partner-line"><span>练习对象</span><p>{partnerText}</p></article>
      {!feedback ? (
        <div className="practice-input">
          <label htmlFor="practice-draft">建议说 20–40 秒；录音会先转成文字，确认后再提交。</label>
          <textarea id="practice-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="点击“开始录音”，或直接输入你会怎么回应。" rows={4} />
          <div className="practice-actions">
            <button type="button" className={recording ? 'recording' : 'voice'} onClick={toggleRecording} disabled={transcribing}>
              {transcribing ? '正在转写…' : recording ? '结束录音' : '开始录音'}
            </button>
            <button type="button" className="primary" onClick={send} disabled={!draft.trim() || recording || transcribing}>提交本回合</button>
          </div>
          {recordingNotice && <p className="practice-notice" aria-live="polite">{recordingNotice}</p>}
        </div>
      ) : (
        <div className="feedback-card">
          <span className="eyebrow">只练一个点</span>
          <p>{feedback.goalStatus}</p>
          <p><strong>你的有效一句：</strong>“{feedback.effectiveQuote}”</p>
          <p>{feedback.missedDetail}</p>
          <div className="rehearsal">{feedback.rehearsal}</div>
          {round < totalRounds ? <button className="primary" onClick={next}>进入下一回合</button> : <button className="primary" onClick={() => setRound(0)}>完成练习</button>}
        </div>
      )}
    </section>
  )
}
