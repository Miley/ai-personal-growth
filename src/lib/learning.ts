import type { ReadingLevel, ReadingUnit, SpeechFeedback, SpeechTemplate } from '../types'

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

export function rotateDailySpeechTemplates(
  templates: SpeechTemplate[],
  date = new Date(),
): SpeechTemplate[] {
  if (templates.length < 2) return templates

  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const start = dayNumber % templates.length
  return [...templates.slice(start), ...templates.slice(0, start)]
}

function containsAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word))
}

export function createLocalSpeechFeedback(transcript: string): SpeechFeedback {
  const text = transcript.trim()
  const hasPosition = containsAny(text, ['建议', '认为', '判断', '核心', '结论', '需要'])
  const hasStructure = containsAny(text, ['第一', '第二', '首先', '其次', '最后', '所以', '因此'])
  const isBrief = text.length < 90
  const priority = isBrief
    ? {
        title: '把理由说完整',
        evidence: '这次复述已经有观点，但展开还比较短。',
        action: '保留现在的第一句，再补一个具体理由和一个例子。',
      }
    : !hasPosition
      ? {
          title: '让观点更早出现',
          evidence: '听众需要从多句话里自己寻找你的核心判断。',
          action: '把“我的建议是……”或“我最想说明的是……”放到第一句。',
        }
      : {
          title: '让结尾推动行动',
          evidence: '主要观点已经表达出来，结尾还可以更明确。',
          action: '最后补一句“接下来我建议……”并说清一个具体动作。',
        }

  return {
    source: 'local',
    overall: isBrief ? '你已经开口并给出了核心内容，下一步是把它讲完整。' : '这次复述已经形成一段完整表达。',
    strengths: [
      hasPosition ? '表达里出现了明确判断，听众能知道你的立场。' : '你没有照抄范本，已经开始用自己的语言组织内容。',
      hasStructure ? '使用了连接词，内容之间有可辨认的层次。' : '句子整体简洁，没有堆叠太多背景。',
    ],
    priority,
    modelOpening: hasPosition ? text.split(/[。！？]/)[0] : `我最想说明的是：${text.split(/[。！？]/)[0] || '先把核心观点说出来'}。`,
    nextPractice: `只围绕“${priority.title}”再说一次，控制在 60–90 秒。`,
  }
}
