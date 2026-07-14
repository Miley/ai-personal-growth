import { useMemo, useState } from 'react'
import { SCENARIOS } from '../data/scenarios'
import { createPracticeFeedback } from '../lib/learning'
import type { PracticeLevel, PracticeScenario } from '../types'

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

export function Practice() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [level, setLevel] = useState<PracticeLevel>('standard')
  const [round, setRound] = useState(0)
  const [partnerText, setPartnerText] = useState('')
  const [draft, setDraft] = useState('')
  const [lastUserText, setLastUserText] = useState('')
  const scenario = useMemo(() => SCENARIOS.find((item) => item.id === scenarioId)!, [scenarioId])
  const totalRounds = roundsByLevel[level]
  const feedback = lastUserText ? createPracticeFeedback({ goal: scenario.goal, userText: lastUserText, partnerText }) : null

  const start = () => {
    setRound(1)
    setPartnerText(scenario.partnerOpening)
    setDraft('')
    setLastUserText('')
  }

  const send = () => {
    if (!draft.trim()) return
    setLastUserText(draft.trim())
    setDraft('')
  }

  const next = () => {
    const nextRound = round + 1
    if (nextRound > totalRounds) return
    setRound(nextRound)
    setPartnerText(partnerReply(scenario, round))
    setLastUserText('')
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
          <label htmlFor="practice-draft">建议 20–40 秒；说完再按发送。</label>
          <textarea id="practice-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="在这里输入你会怎么回应；也可以先口头说一遍，再写下关键句。" rows={4} />
          <button className="primary" onClick={send}>完成这一回合</button>
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
