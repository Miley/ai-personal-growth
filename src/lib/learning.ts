import type { ReadingLevel, ReadingUnit } from '../types'

export function filterReadingUnits(units: ReadingUnit[], level: ReadingLevel): ReadingUnit[] {
  return units.filter((unit) => unit.level === level)
}

export function rotateDailyReadingUnits(
  units: ReadingUnit[],
  level: ReadingLevel,
  date = new Date(),
): ReadingUnit[] {
  const matches = filterReadingUnits(units, level)
  if (matches.length < 2) return matches

  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const start = dayNumber % matches.length
  return [...matches.slice(start), ...matches.slice(0, start)]
}

interface PracticeFeedbackInput {
  goal: string
  userText: string
  partnerText: string
}

export interface PracticeFeedback {
  goalStatus: string
  effectiveQuote: string
  missedDetail: string
  rehearsal: string
}

function firstDetail(text: string): string {
  const clauses = text.split(/[，。！？]/).map((clause) => clause.trim()).filter(Boolean)
  return clauses[clauses.length - 1] || text
}

export function createPracticeFeedback(input: PracticeFeedbackInput): PracticeFeedback {
  const detail = firstDetail(input.partnerText)
  return {
    goalStatus: `本轮目标：${input.goal}`,
    effectiveQuote: input.userText.trim(),
    missedDetail: `对方提到了“${detail}”，这是一个可以继续聊的具体点。`,
    rehearsal: `重来一次：接住“${detail}”，再问对方一个问题。`,
  }
}
